# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Heroku Platform                         │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │                Web Dyno (Node.js)                  │    │
│  │                                                    │    │
│  │  ┌──────────────┐         ┌──────────────┐       │    │
│  │  │   Express    │         │   Node-Cron  │       │    │
│  │  │   REST API   │◄────────┤   Scheduler  │       │    │
│  │  └──────┬───────┘         └──────────────┘       │    │
│  │         │                                         │    │
│  │         │                                         │    │
│  │  ┌──────▼───────────────────────────────┐        │    │
│  │  │         Services Layer               │        │    │
│  │  │                                      │        │    │
│  │  │  ┌────────────────┐                 │        │    │
│  │  │  │ herokuService  │                 │        │    │
│  │  │  │  - getDynos    │                 │        │    │
│  │  │  │  - getAddons   │                 │        │    │
│  │  │  │  - getConnect  │                 │        │    │
│  │  │  └────────┬───────┘                 │        │    │
│  │  │           │                         │        │    │
│  │  │  ┌────────▼──────────┐             │        │    │
│  │  │  │ usageMonitor      │             │        │    │
│  │  │  │  - checkAndNotify │             │        │    │
│  │  │  └────────┬──────────┘             │        │    │
│  │  │           │                         │        │    │
│  │  │  ┌────────▼──────────┐             │        │    │
│  │  │  │ notificationSvc   │             │        │    │
│  │  │  │  - sendEmail      │             │        │    │
│  │  │  │  - sendAlert      │             │        │    │
│  │  │  └───────────────────┘             │        │    │
│  │  └──────────────────────────────────┘        │    │
│  │                                               │    │
│  │  ┌──────────────────────────────────┐        │    │
│  │  │      Static Files (React)        │        │    │
│  │  │      Dashboard UI                │        │    │
│  │  └──────────────────────────────────┘        │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                  │                       │
                  │                       │
         ┌────────▼────────┐    ┌────────▼────────┐
         │  Heroku API     │    │   SMTP Server   │
         │  Platform API   │    │   (Gmail/etc)   │
         └─────────────────┘    └─────────────────┘
```

## Data Flow

### 1. User Dashboard Request

```
User Browser
    │
    ├──► GET /api/usage/summary
    │
    ▼
Express API
    │
    ├──► herokuService.getDynoUsage()
    │     │
    │     └──► Heroku API: GET /account, /apps, /formation
    │
    ├──► herokuService.getAddonUsage()
    │     │
    │     └──► Heroku API: GET /apps/:id/addons
    │
    └──► herokuService.getConnectUsage()
          │
          └──► Heroku API: GET /account
    │
    ▼
Aggregate & Return JSON
    │
    ▼
User Dashboard (React)
    │
    └──► Render Charts & Cards
```

### 2. Scheduled Monitoring (Every 6 hours)

```
Node-Cron Trigger
    │
    ▼
usageMonitor.checkAndNotify()
    │
    ├──► Fetch Usage Data
    │     │
    │     └──► herokuService (calls Heroku API)
    │
    ├──► Check Thresholds
    │     │
    │     └──► Compare usage % vs DYNO_THRESHOLD
    │
    └──► If exceeded:
          │
          └──► notificationService.sendOverageAlert()
                │
                └──► SMTP Server → Email to Admin
```

### 3. Manual Test Notification

```
User clicks "Test Notification"
    │
    ▼
POST /api/test-notification
    │
    ▼
notificationService.sendTestNotification()
    │
    └──► SMTP Server
          │
          └──► Email sent to NOTIFICATION_EMAIL
```

## Component Breakdown

### Backend (Node.js/Express)

#### API Routes (`server/index.js`)
- `GET /api/health` - Health check
- `GET /api/usage/dynos` - Dyno usage
- `GET /api/usage/addons` - Add-ons list & costs
- `GET /api/usage/connect` - Connect hours
- `GET /api/usage/summary` - All usage data
- `GET /api/apps` - List Heroku apps
- `POST /api/test-notification` - Test email

#### Services

**herokuService** (`server/services/herokuService.js`)
- Interfaces with Heroku Platform API
- Fetches account info, apps, formations, add-ons
- Calculates usage percentages
- Returns structured data

**usageMonitor** (`server/services/usageMonitor.js`)
- Runs scheduled checks
- Compares usage vs thresholds
- Triggers alerts when exceeded
- Generates daily reports

**notificationService** (`server/services/notificationService.js`)
- Sends email via SMTP
- Formats HTML email templates
- Handles test notifications
- Daily summary emails

### Frontend (React)

#### Components

**App** (`client/src/App.js`)
- Main application wrapper
- Fetches data from API
- Auto-refresh every 5 minutes
- Error handling

**Dashboard** (`client/src/components/Dashboard.js`)
- Main dashboard layout
- Orchestrates child components
- Passes data to cards/charts

**UsageCard** (`client/src/components/UsageCard.js`)
- Displays resource usage
- Color-coded status (green/yellow/red)
- Progress bars
- Used/Limit/Remaining stats

**UsageChart** (`client/src/components/UsageChart.js`)
- Bar chart visualization
- Powered by Recharts
- Shows usage vs remaining

**AddonsList** (`client/src/components/AddonsList.js`)
- Searchable table
- Sortable columns
- Add-on details & costs

## External Dependencies

### Heroku Platform API

**Endpoints Used:**
- `GET /account` - Account info, quotas
- `GET /apps` - List all apps
- `GET /apps/:id/formation` - Dyno formations
- `GET /apps/:id/addons` - App add-ons

**Authentication:**
- Bearer token (API key)
- Set via `HEROKU_API_KEY` env var

### SMTP Server

**Supported Providers:**
- Gmail (smtp.gmail.com:587)
- SendGrid (smtp.sendgrid.net:587)
- Mailgun (smtp.mailgun.org:587)
- AWS SES
- Any SMTP provider

**Configuration:**
- Host, Port, User, Password
- Set via SMTP_* env vars

## Monitoring & Scheduling

### Cron Schedule

Default: Every 6 hours
```javascript
cron.schedule('0 */6 * * *', ...)
```

**Cron Expression Breakdown:**
- `0` - At minute 0
- `*/6` - Every 6 hours
- `*` - Every day
- `*` - Every month
- `*` - Every day of week

**Runs at:** 12:00 AM, 6:00 AM, 12:00 PM, 6:00 PM

### Dashboard Refresh

Auto-refresh: Every 5 minutes
```javascript
setInterval(fetchUsageData, 5 * 60 * 1000)
```

## Environment Configuration

### Required Variables

```env
HEROKU_API_KEY        # Heroku authentication
HEROKU_ACCOUNT_EMAIL  # Account identifier
NOTIFICATION_EMAIL    # Alert recipient
SMTP_HOST            # Email server
SMTP_PORT            # Email port
SMTP_USER            # Email username
SMTP_PASS            # Email password
DYNO_THRESHOLD       # Alert threshold %
CONNECT_THRESHOLD    # Alert threshold %
NODE_ENV             # Environment mode
```

## Security Measures

1. **API Key Protection**
   - Stored in environment variables
   - Never exposed in client-side code
   - Not committed to version control

2. **CORS**
   - Enabled for API endpoints
   - Configurable origins

3. **Helmet**
   - Security headers
   - XSS protection
   - Content security policy

4. **HTTPS**
   - Automatic on Heroku
   - Enforced in production

5. **Rate Limiting** (Future)
   - API call throttling
   - Prevent abuse

## Deployment Architecture

```
GitHub Repository
    │
    └──► Push to Heroku Git
          │
          ▼
    Heroku Build Process
          │
          ├──► Install Node.js dependencies
          │     npm install
          │
          ├──► Build React frontend
          │     cd client && npm install && npm run build
          │
          └──► Start Express server
                npm start (runs server/index.js)
          │
          ▼
    Web Dyno Running
          │
          ├──► Serves React static files
          │
          ├──► Handles API requests
          │
          └──► Runs cron scheduler
```

## Scaling Considerations

### Current Setup (Single Dyno)
- Suitable for: Small to medium teams
- Cost: $5-7/month (Eco/Basic dyno)
- Handles: ~100 requests/minute

### Scaling Options

**Horizontal Scaling:**
```bash
heroku ps:scale web=2
```
- Multiple dynos
- Load balanced automatically
- Higher availability

**Vertical Scaling:**
```bash
heroku ps:resize web=standard-2x
```
- More powerful dynos
- Better performance
- Higher cost

**Caching:**
- Add Redis for caching API responses
- Reduce Heroku API calls
- Faster dashboard loads

**Database:**
- Add Postgres for historical data
- Store usage trends
- Generate reports

## Monitoring & Observability

### Logs
```bash
heroku logs --tail
```

### Metrics
- Response times
- Error rates
- API call frequency
- Email delivery status

### Alerts
- Email notifications
- Slack integration (future)
- PagerDuty (future)

## Future Enhancements

1. **Database Integration**
   - Store historical usage data
   - Trend analysis
   - Forecasting

2. **Advanced Notifications**
   - Slack webhooks
   - SMS alerts
   - PagerDuty integration

3. **Multi-Account Support**
   - Track multiple Heroku accounts
   - Team dashboards
   - Role-based access

4. **Custom Reports**
   - Weekly/monthly summaries
   - Cost optimization suggestions
   - Usage predictions

5. **API Rate Limiting**
   - Protect against abuse
   - Fair usage policies

6. **User Authentication**
   - Login system
   - User management
   - Access control
