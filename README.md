# 📊 Heroku Usage Tracker & Notification System

A production-grade web application for tracking Heroku resource usage across Enterprise accounts with intelligent notifications, license management, and comprehensive monitoring.

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

---

## ✨ Features

### 📈 **Usage Tracking**
- **Enterprise Account Monitoring** - Monthly and daily usage tracking
- **Multi-Resource Tracking** - Dyno Units, Connect Rows, Data Add-ons, General Add-ons, Private/Shield Spaces
- **Personal Apps Support** - Track personal Heroku apps separately
- **Team & App Breakdown** - Detailed usage by team and application
- **Trend Analysis** - Historical usage comparison and cost tracking

### 🔔 **Intelligent Notifications**
- **License-Based Alerting** - Monitor usage against licensed capacity per enterprise account
- **Threshold Alerts** - Configurable warning (default 80%), critical (95%), and limit (100%) alerts
- **Smart Cooldown System** - Prevents spam with configurable cooldown periods
- **Anomaly Detection** - Detects unusual usage spikes and sends alerts
- **Scheduled Summaries** - Daily, weekly, monthly usage reports via clock dyno
- **Professional Email Templates** - Branded HTML emails with responsive design
- **Multi-Provider Email** - Mailgun API (primary) + SMTP fallback
- **Database-Backed Configuration** - Persistent notification settings and history

### 🎫 **License Management**
- **Per-Account Licensing** - Configure licensed capacity for each enterprise account
- **Resource Limits** - Set limits for Dyno Units, Connect Rows, Data Add-ons, General Add-ons
- **Utilization Monitoring** - Track usage vs. licensed capacity in real-time
- **Overage Detection** - Automatic alerts when usage exceeds licensed limits
- **Admin-Only Controls** - Secure license configuration restricted to admin users

### 🎨 **Interactive Dashboard**
- **Real-time Visualization** - Charts and graphs with Recharts
- **Multiple Report Types** - Monthly summary, daily breakdown, 12-month trend analysis
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Modern UI** - Heroku-branded purple theme with neutral accents
- **Role-Based Access** - Admin and general user roles with different permissions
- **Browser Printing** - Print-optimized dashboard views
- **Notification Management Center** - Comprehensive notification configuration and monitoring

---

## 🏗️ Architecture

### **Backend**
- **Node.js + Express** - RESTful API server (web dyno)
- **PostgreSQL** - Database for configuration, licenses, notification history, login tracking
- **Heroku Platform API** - Enterprise monthly/daily usage endpoints
- **Node-cron** - Scheduled monitoring tasks (clock dyno)
- **Mailgun + Nodemailer** - Multi-provider email delivery
- **Express Session** - Server-side session management

### **Frontend**
- **React** - Component-based UI
- **React Router** - Client-side routing
- **Recharts** - Data visualization (charts, graphs, trends)
- **Axios** - HTTP client for API calls
- **Lucide React** - Modern icon library

### **Database Schema**
- `notification_config` - Email and schedule configuration
- `enterprise_license_config` - Per-account licensed capacity
- `notification_history` - Alert and summary history
- `login_history` - User authentication audit trail

### **Core Services**
- `notificationOrchestrator.js` - Central notification coordinator (threshold evaluation, license monitoring, smart alerting)
- `emailService.js` - Multi-provider email delivery (Mailgun API + SMTP)
- `databaseService.js` - PostgreSQL connection pool and query management
- `enterpriseUsageService.js` - Enterprise usage data from Heroku API
- `dailyUsageService.js` - Daily usage tracking and aggregation
- `configService.js` - Database-backed configuration management
- `enterpriseLicenseService.js` - License configuration and validation
- `notificationHistoryDB.js` - Notification persistence and retrieval
- `loginHistoryService.js` - Authentication audit logging

### **Workers**
- `scheduler.js` - Clock dyno for scheduled tasks (real-time alerts, daily/weekly/monthly summaries)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20.x or higher
- PostgreSQL database (Heroku Postgres add-on recommended)
- Heroku Enterprise account with billing access
- Heroku API token (OAuth token recommended)
- Mailgun account (or SMTP credentials)

### Local Development

```bash
# Clone repository
git clone <your-repo-url>
cd usage-track-notify

# Install dependencies
npm install
cd client && npm install && cd ..

# Create .env file
cp .env.example .env
# Edit .env with your credentials

# Run development server
npm run dev

# In another terminal, run React app
npm run client

# Access dashboard
open http://localhost:3000
```

---

## ⚙️ Configuration

### Required Environment Variables

```bash
# Database (REQUIRED)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Security (REQUIRED in production)
APP_SESSION_SECRET=your-secure-random-string-here

# Authentication (REQUIRED)
APP_ADMIN_USERNAME=admin
APP_ADMIN_PASSWORD=your-secure-admin-password
APP_GENERAL_USERNAME=general
APP_GENERAL_PASSWORD=your-secure-general-password

# Heroku API Configuration (REQUIRED)
HEROKU_API_TOKEN=your_heroku_oauth_token_here

# Email Configuration - Mailgun (REQUIRED)
MAILGUN_API_KEY=key-xxxxxxxxxxxxx
MAILGUN_DOMAIN=mg.yourdomain.com

# Email Configuration - SMTP Fallback (Optional)
MAILGUN_SMTP_SERVER=smtp.mailgun.org
MAILGUN_SMTP_PORT=587
MAILGUN_SMTP_LOGIN=postmaster@mg.yourdomain.com
MAILGUN_SMTP_PASSWORD=xxxxxxxxxxxxx

# App Configuration
PORT=3001
NODE_ENV=production
SESSION_TIMEOUT_MINUTES=480  # Default: 8 hours

# CORS Configuration (Optional)
CORS_ORIGIN=https://your-app.herokuapp.com

# Scheduler Configuration (Optional - managed in UI)
SCHEDULE_REALTIME_ENABLED=true
SCHEDULE_REALTIME_INTERVAL=60  # minutes
SCHEDULE_DAILY_ENABLED=true
SCHEDULE_DAILY_TIME=09:00  # UTC
SCHEDULE_WEEKLY_ENABLED=false
SCHEDULE_WEEKLY_DAY=Monday
SCHEDULE_WEEKLY_TIME=09:00  # UTC
SCHEDULE_MONTHLY_ENABLED=false
SCHEDULE_MONTHLY_DAY=1
SCHEDULE_MONTHLY_TIME=09:00  # UTC

# Database Configuration (Optional)
LOG_ALL_QUERIES=false  # Set to true for debugging
```

**Note:** Most configuration is now managed through the database-backed Notification Management Center UI. Environment variables serve as fallback defaults.

### License & Threshold Configuration

**License configuration is now managed per enterprise account through the UI:**

1. Log in as admin user
2. Navigate to **Notification Management** > **Licenses** tab
3. Click **Edit Configuration** for an enterprise account
4. Set licensed capacity for each resource:
   - Dyno Units
   - Connect Rows
   - Data Add-ons
   - General Add-ons
5. Configure threshold percentages (warning, critical)
6. Save configuration

Configuration is stored in PostgreSQL (`enterprise_license_config` table) and persists across deployments.

---

## 📧 Email Notification Setup

### 1. Get Mailgun Account

1. Sign up at https://mailgun.com
2. Add your domain: https://app.mailgun.com/app/sending/domains
3. Get API key: https://app.mailgun.com/app/account/security/api_keys

### 2. Configure DNS Records

Add these DNS records to your domain provider:

```
Type: TXT
Name: mg.yourdomain.com
Value: v=spf1 include:mailgun.org ~all

Type: TXT
Name: k1._domainkey.mg.yourdomain.com
Value: <provided by Mailgun>

Type: TXT
Name: _dmarc.mg.yourdomain.com
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com
```

### 3. Set Environment Variables

```bash
heroku config:set MAILGUN_API_KEY="key-xxxxxxxxxxxxx"
heroku config:set MAILGUN_DOMAIN="mg.yourdomain.com"
heroku config:set NOTIFICATION_FROM_EMAIL="notifications@yourdomain.com"
heroku config:set NOTIFICATION_RECIPIENTS="admin@company.com"
heroku config:set NOTIFICATION_EMAIL_ENABLED=true
```

### 4. Test Email Configuration

```bash
curl -X POST https://your-app.herokuapp.com/api/notifications/send-test
```

**See `EMAIL_DELIVERABILITY_GUIDE.md` for complete email setup instructions.**

---

## 🌐 Heroku Deployment

### 1. Create Heroku App

```bash
heroku create your-app-name
```

### 2. Add PostgreSQL Database

```bash
heroku addons:create heroku-postgresql:mini
```

### 3. Set Environment Variables

```bash
# Security (CRITICAL)
heroku config:set APP_SESSION_SECRET=$(openssl rand -hex 32)

# Authentication
heroku config:set APP_ADMIN_USERNAME=admin
heroku config:set APP_ADMIN_PASSWORD=your-secure-password
heroku config:set APP_GENERAL_USERNAME=general
heroku config:set APP_GENERAL_PASSWORD=your-secure-password

# Heroku API
heroku config:set HEROKU_API_TOKEN=your_heroku_oauth_token

# Email Configuration
heroku config:set MAILGUN_API_KEY=key-xxxxxxxxxxxxx
heroku config:set MAILGUN_DOMAIN=mg.yourdomain.com

# App Configuration
heroku config:set NODE_ENV=production
```

### 4. Scale Clock Dyno (for scheduled notifications)

```bash
heroku ps:scale clock=1
```

### 5. Deploy

```bash
git push heroku main
```

### 6. Run Database Migrations

```bash
heroku run npm run migrate
```

### 7. Open Dashboard

```bash
heroku open
```

### 8. Configure Notifications

1. Log in with admin credentials
2. Navigate to **Notification Management**
3. Configure email settings in **Email Setup** tab
4. Configure schedules in **Schedule** tab
5. Configure licenses in **Licenses** tab
6. Test configuration with **Send Test Email** button

---

## 📡 API Endpoints

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/login` | POST | User login |
| `/api/logout` | POST | User logout |
| `/api/check-auth` | GET | Check authentication status |

### Health & Info

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Application health check |
| `/api/db-health` | GET | Database health check |

### Usage Data

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/enterprise/structure` | GET | Enterprise monthly usage |
| `/api/enterprise/all-accounts` | GET | All enterprise accounts usage |
| `/api/enterprise/daily-usage` | GET | Daily usage breakdown (requires start/end dates) |
| `/api/enterprise/trend-summary` | GET | 12-month historical trend analysis |
| `/api/enterprise/accounts` | GET | List enterprise accounts |
| `/api/enterprise/team/:teamId/apps` | GET | Get apps for specific team |

### Notifications

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/notifications/config` | GET | Get notification configuration |
| `/api/notifications/config` | POST | Update notification configuration (admin only) |
| `/api/notifications/send-test` | POST | Send test email |
| `/api/notifications/license-audit` | POST | Run license capacity audit (admin only) |
| `/api/notifications/history` | GET | Get notification history (paginated) |

### License Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/licenses` | GET | Get all license configurations |
| `/api/licenses` | POST | Create/update license configuration (admin only) |
| `/api/licenses/:accountId` | GET | Get license config for specific account |

---

## 📊 Notification System

### Alert Types

1. **License Capacity Alerts**
   - Monitors usage against per-account licensed capacity
   - Configurable warning (default 80%), critical (95%), and limit (100%) thresholds
   - Includes usage details, licensed capacity, and utilization percentage
   - Smart cooldown system prevents alert spam

2. **Anomaly Detection Alerts**
   - Detects unusual usage spikes (>20% increase)
   - Sent when anomaly detected AND cooldown expired
   - Includes comparison to previous usage

3. **Scheduled Summaries**
   - Daily, weekly, or monthly usage reports
   - Comprehensive resource breakdown by enterprise account
   - Configurable schedule via UI (stored in database)
   - Sent via clock dyno scheduler

4. **Test Notifications**
   - Verify email configuration
   - Test Mailgun API and SMTP fallback
   - Available in Notification Management UI

### Monitoring Architecture

**Clock Dyno Scheduler** (`Procfile: clock`)
- Dedicated dyno for scheduled tasks
- Runs independently from web dyno
- Dynamic scheduling based on database configuration
- Configurable intervals: real-time alerts (default 60 minutes), daily/weekly/monthly summaries
- Restart required after schedule changes: `heroku ps:restart clock`

**Smart Alerting Features**
- **Cooldown System**: Prevents duplicate alerts (configurable per resource/severity)
- **Anomaly Detection**: Detects unusual usage patterns
- **License Monitoring**: Compares usage to licensed capacity
- **Database Persistence**: All alerts logged to `notification_history` table
- **Multi-Provider Email**: Mailgun API with SMTP fallback for reliability

### Configuration Management

All notification settings are stored in PostgreSQL:
- Email configuration (`notification_config` table)
- Schedule configuration (real-time, daily, weekly, monthly)
- License configurations per enterprise account (`enterprise_license_config` table)
- Notification history with status tracking (`notification_history` table)

Configuration is managed through the **Notification Management Center** UI (admin access required).

---

## 🎨 Email Templates

All emails use professional branded templates located in `/server/templates/emails/`:

- **License Alert** (`licenseAlertEmail.js`) - License capacity threshold alerts with color-coded severity
- **Threshold Alert** (`thresholdAlertEmail.js`) - Resource usage threshold alerts
- **Anomaly Detection** (`anomalyDetectionEmail.js`) - Unusual usage spike notifications
- **Usage Summary** (`usageSummaryEmail.js`) - Daily/weekly/monthly usage reports
- **Test Email** (`testEmail.js`) - Configuration verification

All templates include:
- Enterprise account branding
- Dashboard links
- Timestamp and timezone
- Professional footer
- Mobile-responsive HTML design
- Color-coded severity indicators (warning: yellow, critical: red)

---

## 🔧 Monitoring & Debugging

### Check Logs

```bash
# All logs
heroku logs --tail

# Web dyno logs (API server)
heroku logs --tail --dyno web

# Clock dyno logs (scheduler)
heroku logs --tail --dyno clock

# Email service logs
heroku logs --tail | grep "\[Email Service\]"

# Notification orchestrator logs
heroku logs --tail | grep "\[Notification Orchestrator\]"

# Database logs
heroku logs --tail | grep "\[Database Service\]"

# Scheduler logs
heroku logs --tail | grep "\[Scheduler\]"
```

### Test Notifications

```bash
# Send test email (requires authentication)
curl -X POST https://your-app.herokuapp.com/api/notifications/send-test \
  --cookie "connect.sid=your-session-cookie"

# Run license capacity audit (admin only)
curl -X POST https://your-app.herokuapp.com/api/notifications/license-audit \
  --cookie "connect.sid=your-session-cookie"

# View notification history
curl https://your-app.herokuapp.com/api/notifications/history \
  --cookie "connect.sid=your-session-cookie"
```

**Tip:** Use the browser-based Notification Management Center UI for easier testing.

---

## 🛠️ Troubleshooting

### Email Not Sending

**Check configuration via UI:**
1. Log in as admin
2. Go to Notification Management > Email Setup tab
3. Check that all fields are configured
4. Click "Send Test Email" button

**Check configuration via API:**
```bash
curl https://your-app.herokuapp.com/api/notifications/config \
  --cookie "connect.sid=your-session-cookie"
```

**Common issues:**
- `MAILGUN_API_KEY` not set or invalid
- `MAILGUN_DOMAIN` not verified in Mailgun
- Recipients not configured in UI
- Email notifications disabled in UI
- DNS records not configured (SPF, DKIM, DMARC)

**Solution:** 
- Verify Mailgun domain in Mailgun dashboard
- Configure DNS records (SPF, DKIM, DMARC)
- Update configuration in Notification Management UI
- See `EMAIL_DELIVERABILITY_GUIDE.md` for complete setup

### Alerts Not Triggering

**Common issues:**
1. **Clock dyno not running:**
   ```bash
   heroku ps
   # Should show: clock.1: up
   ```
   Fix: `heroku ps:scale clock=1`

2. **License not configured:**
   - Go to Notification Management > Licenses tab
   - Configure licensed capacity for enterprise accounts

3. **Schedule disabled:**
   - Check Notification Management > Schedule tab
   - Enable "Real-time Alerts"
   - Restart clock dyno: `heroku ps:restart clock`

4. **Cooldown active:**
   - Check Recent Activity in Notification Management
   - Cooldown prevents duplicate alerts (default: 1 hour)

5. **Usage below threshold:**
   - Default thresholds: 80% warning, 95% critical
   - Adjust thresholds in Licenses configuration

### Database Connection Issues

**Check database health:**
```bash
curl https://your-app.herokuapp.com/api/db-health
```

**Common issues:**
- `DATABASE_URL` not set (should be automatic with Heroku Postgres)
- Connection pool exhausted
- Database not provisioned

**Solution:**
```bash
# Check if database is provisioned
heroku addons | grep postgresql

# Check database credentials
heroku config | grep DATABASE_URL

# Run migrations if needed
heroku run npm run migrate
```

### Session/Authentication Issues

**Common issues:**
- Session secret not set in production
- Session cookie not being set
- CORS issues with session cookies

**Solution:**
```bash
# Ensure session secret is set
heroku config:set APP_SESSION_SECRET=$(openssl rand -hex 32)

# Check CORS origin
heroku config:set CORS_ORIGIN=https://your-app.herokuapp.com

# Restart web dyno
heroku ps:restart web
```

### Scheduler Not Running

**Check clock dyno status:**
```bash
heroku ps
# Should show: clock.1: up
```

**Check scheduler logs:**
```bash
heroku logs --tail --dyno clock
```

**Common issues:**
- Clock dyno not scaled: `heroku ps:scale clock=1`
- Configuration error in database
- Node-cron not initialized

**Apply schedule changes:**
```bash
# After changing schedule in UI, restart clock dyno
heroku ps:restart clock
```

---

## 📚 Documentation

- `AUDIT_COMPLETE.md` - Comprehensive application audit and production readiness report
- `DATABASE_MIGRATION_GUIDE.md` - Database schema and migration instructions
- `MULTI_ENTERPRISE_SETUP.md` - Multi-account enterprise configuration guide
- `TESTING_GUIDE.md` - Notification testing instructions

---

## 🔐 Security

- **Never commit `.env`** - Contains sensitive credentials (`.gitignore` configured)
- **Session Secret Required** - App exits if `APP_SESSION_SECRET` not set in production
- **Use Config Vars** - Store all secrets in Heroku Config Vars
- **Strong Passwords** - Use secure passwords for admin and general users
- **Session Management** - 8-hour session timeout (configurable via `SESSION_TIMEOUT_MINUTES`)
- **Database Security** - All queries use parameterized statements (SQL injection protection)
- **CORS Protection** - Configurable CORS origin, credentials support
- **Request Size Limits** - 10MB limit prevents DoS attacks
- **Login History** - All authentication attempts logged with hashed IPs
- **Role-Based Access** - Admin-only routes protected with middleware
- **HTTPS Only** - Always use HTTPS in production
- **Rotate API Tokens** - Regularly update Heroku OAuth token
- **Audit Logging** - Security events logged to database

---

## 🎯 Production Readiness Checklist

### Before Going Live

**Infrastructure:**
- [ ] PostgreSQL database provisioned (`heroku addons:create heroku-postgresql:mini`)
- [ ] Database migrations run (`heroku run npm run migrate`)
- [ ] Clock dyno scaled (`heroku ps:scale clock=1`)

**Security:**
- [ ] `APP_SESSION_SECRET` set with strong random value
- [ ] Admin username and password configured
- [ ] General user username and password configured
- [ ] CORS origin configured for production domain
- [ ] HTTPS enabled (automatic on Heroku)

**Heroku API:**
- [ ] `HEROKU_API_TOKEN` configured (OAuth token recommended)
- [ ] Token has billing access to enterprise accounts
- [ ] Enterprise accounts accessible via API

**Email Configuration:**
- [ ] Mailgun domain verified (SPF, DKIM, DMARC DNS records)
- [ ] `MAILGUN_API_KEY` configured
- [ ] `MAILGUN_DOMAIN` configured
- [ ] Email settings configured in Notification Management UI
- [ ] Test email sent successfully
- [ ] SMTP fallback configured (optional but recommended)

**Notification Configuration:**
- [ ] License limits configured for each enterprise account (Licenses tab)
- [ ] Email recipients configured
- [ ] Schedule configured (real-time, daily, weekly, monthly)
- [ ] Clock dyno restarted after schedule changes

**Testing:**
- [ ] Login tested (both admin and general users)
- [ ] Enterprise usage data loading correctly
- [ ] Daily/monthly reports displaying
- [ ] Test email sent successfully
- [ ] License audit run manually (via UI)
- [ ] Recent Activity showing notification history
- [ ] Browser print functionality tested

**Monitoring:**
- [ ] Logs monitored for 24 hours (`heroku logs --tail`)
- [ ] Database health check passing (`/api/db-health`)
- [ ] Application health check passing (`/api/health`)
- [ ] Clock dyno running (`heroku ps`)
- [ ] Scheduled tasks executing (check clock dyno logs)

**Documentation:**
- [ ] `AUDIT_COMPLETE.md` reviewed for recommendations
- [ ] Team trained on Notification Management UI
- [ ] Email recipients notified of alert types
- [ ] Escalation procedures documented

---

## 🚀 Advanced Usage

### Scheduled Report Delivery

Configure schedules through the **Notification Management** UI:

1. Log in as admin
2. Navigate to **Schedule** tab
3. Configure each schedule type:
   - **Real-time Alerts**: Enable/disable, set interval (minutes)
   - **Daily Summary**: Enable/disable, set time (UTC)
   - **Weekly Summary**: Enable/disable, set day of week and time
   - **Monthly Summary**: Enable/disable, set day of month and time
4. Click **Save Configuration**
5. Restart clock dyno to apply changes: `heroku ps:restart clock`

Configuration is stored in PostgreSQL and persists across deployments.

### Programmatic Configuration (Advanced)

You can also configure via API or database:

```javascript
const configService = require('./services/configService');

// Update schedule configuration
await configService.updateConfig({
  triggerSchedule: {
    realtimeAlerts: {
      enabled: true,
      checkIntervalMinutes: 60
    },
    dailySummary: {
      enabled: true,
      time: "09:00"
    },
    weeklySummary: {
      enabled: true,
      dayOfWeek: "Monday",
      time: "09:00"
    },
    monthlySummary: {
      enabled: true,
      dayOfMonth: 1,
      time: "09:00"
    }
  }
});
```

**Note:** After programmatic changes, restart clock dyno: `heroku ps:restart clock`

### Multiple Enterprise Accounts

The application supports multiple enterprise accounts:

1. Ensure Heroku API token has access to all accounts
2. Configure licenses separately for each account (Licenses tab)
3. All accounts are monitored in a single clock dyno
4. Notification history tracked per account

### Custom Email Templates

Edit email templates in `/server/templates/emails/`:

- `licenseAlertEmail.js` - License capacity alerts
- `thresholdAlertEmail.js` - Threshold alerts
- `anomalyDetectionEmail.js` - Anomaly notifications
- `usageSummaryEmail.js` - Usage summaries
- `testEmail.js` - Test emails

After editing templates, restart web dyno: `heroku ps:restart web`

---

## 📈 Optimization Opportunities

Based on the comprehensive audit (see `AUDIT_COMPLETE.md`), the following optimizations are recommended:

**High Priority:**
- [ ] Implement Redis-based session store for horizontal scaling
- [ ] Add API response caching (Redis) to reduce Heroku API calls
- [ ] Implement React Query for frontend request deduplication
- [ ] Add rate limiting middleware to prevent abuse
- [ ] Split large components (NotificationManagementCenter, EnterpriseView)

**Medium Priority:**
- [ ] Split `server/index.js` into modular route files
- [ ] Implement job queue (Bull/BullMQ) for background processing
- [ ] Add structured logging (Winston/Pino) with correlation IDs
- [ ] Implement request validation middleware (Joi/Zod)
- [ ] Add frontend code splitting for faster initial load

**Future Enhancements:**
- [ ] Slack notifications integration
- [ ] Webhook support for external systems
- [ ] Custom alert rules engine
- [ ] Budget tracking and cost forecasting
- [ ] Historical data retention policies
- [ ] API rate limit monitoring
- [ ] APM integration (New Relic, Datadog)
- [ ] Circuit breaker for Heroku API calls

---

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a pull request.

---

## 📄 License

MIT

---

## 💬 Support

For issues and questions, please open an issue on the GitHub repository.

**Quick Links:**
- [Audit Report](AUDIT_COMPLETE.md) - Comprehensive audit and production readiness
- [Database Guide](DATABASE_MIGRATION_GUIDE.md) - Database schema and migrations
- [Multi-Enterprise Setup](MULTI_ENTERPRISE_SETUP.md) - Multiple account configuration
- [Testing Guide](TESTING_GUIDE.md) - Notification testing procedures
- [Heroku Platform API Docs](https://devcenter.heroku.com/articles/platform-api-reference)
- [Mailgun Documentation](https://documentation.mailgun.com/)

---

## 🏆 Application Status

**Current Version:** Production-Ready ✅

**Last Audit:** May 2026

**Code Quality:**
- ~15,000 lines of application code
- Comprehensive security hardening
- Database-backed configuration
- Production-grade error handling
- Extensive logging and monitoring

**Recent Improvements:**
- ✅ Removed ~8,000 lines of dead code
- ✅ Security enhancements (session validation, CORS, input limits)
- ✅ Database optimization (connection pooling, query timeouts)
- ✅ Frontend optimization (CSS cleanup, reduced bundle size)
- ✅ License management system per enterprise account
- ✅ Smart notification system with anomaly detection
- ✅ Clock dyno scheduler with dynamic configuration

See `AUDIT_COMPLETE.md` for detailed analysis and optimization recommendations.
