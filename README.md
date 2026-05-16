# 📊 Heroku Usage Tracker & Notification System

A production-grade web application for tracking Heroku resource usage across Enterprise accounts with intelligent notifications, PDF reports, and comprehensive monitoring.

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
- **Threshold Alerts** - Automatic warnings at 80%, critical alerts at 95%, limit alerts at 100%
- **Cooldown System** - Prevents spam (1 alert per hour per resource/severity)
- **Event-Driven Monitoring** - Triggers on usage changes >5%
- **Scheduled Summaries** - Daily, weekly, monthly usage reports
- **Professional Email Templates** - Branded HTML emails with responsive design
- **Multi-Provider Email** - Mailgun API (primary) + SMTP fallback

### 📄 **PDF Reports**
- **Printable Dashboards** - Export usage data as professional PDFs
- **Monthly Reports** - Comprehensive enterprise usage reports
- **Daily Reports** - Date-wise usage breakdown
- **Email Delivery** - Send PDF reports as attachments

### 🎨 **Interactive Dashboard**
- **Real-time Visualization** - Charts and graphs with Recharts
- **Multiple Report Types** - Monthly summary, daily breakdown, trend analysis
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Dark Mode UI** - Modern purple-themed interface

---

## 🏗️ Architecture

### **Backend**
- **Node.js + Express** - RESTful API server
- **Heroku Platform API** - Enterprise monthly/daily usage endpoints
- **Puppeteer** - Server-side PDF generation
- **Node-cron** - Scheduled monitoring tasks
- **Mailgun + Nodemailer** - Multi-provider email delivery

### **Frontend**
- **React** - Component-based UI
- **React Router** - Client-side routing
- **Recharts** - Data visualization
- **Axios** - HTTP client

### **Services**
- `herokuService.js` - Heroku API integration
- `enterpriseUsageService.js` - Enterprise usage data
- `personalUsageService.js` - Personal apps usage
- `dailyUsageService.js` - Daily usage tracking
- `emailService.js` - Centralized email delivery
- `enhancedNotificationService.js` - High-level notifications
- `thresholdMonitor.js` - Manual threshold checking
- `autoThresholdMonitor.js` - Event-driven monitoring
- `configService.js` - Configuration management
- `puppeteerPdfService.js` - PDF generation

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20.x or higher
- Heroku Enterprise account
- Heroku API key
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
# Heroku API Configuration
HEROKU_API_KEY=your_heroku_api_key_here
HEROKU_ENTERPRISE_ACCOUNT=your_enterprise_account_id  # Optional

# Email Configuration (Mailgun)
MAILGUN_API_KEY=key-xxxxxxxxxxxxx
MAILGUN_DOMAIN=mg.yourdomain.com
NOTIFICATION_FROM_EMAIL=notifications@yourdomain.com
NOTIFICATION_FROM_NAME=Heroku Usage Tracker
NOTIFICATION_RECIPIENTS=admin@company.com,ops@company.com
NOTIFICATION_EMAIL_ENABLED=true

# Optional: SMTP Fallback
MAILGUN_SMTP_SERVER=smtp.mailgun.org
MAILGUN_SMTP_PORT=587
MAILGUN_SMTP_LOGIN=postmaster@mg.yourdomain.com
MAILGUN_SMTP_PASSWORD=xxxxxxxxxxxxx

# Optional: Branding
ENTERPRISE_ACCOUNT_NAME=Acme Corporation
DASHBOARD_URL=https://your-app.herokuapp.com

# Threshold Configuration
THRESHOLD_DYNO_LIMIT=1000
THRESHOLD_CONNECT_LIMIT=10000
THRESHOLD_DATA_ADDONS_LIMIT=500
THRESHOLD_GENERAL_ADDONS_LIMIT=300
THRESHOLD_WARNING_PERCENTAGE=80
THRESHOLD_CRITICAL_PERCENTAGE=95

# App Configuration
PORT=3001
NODE_ENV=production
```

### Threshold Configuration

You can configure thresholds globally or per-resource:

**Global Thresholds:**
```bash
heroku config:set THRESHOLD_WARNING_PERCENTAGE=80
heroku config:set THRESHOLD_CRITICAL_PERCENTAGE=95
```

**Per-Resource Thresholds:**
```bash
heroku config:set THRESHOLD_DYNO_LIMIT=1000
heroku config:set THRESHOLD_DYNO_WARNING=80
heroku config:set THRESHOLD_DYNO_CRITICAL=95
heroku config:set THRESHOLD_DYNO_ENABLED=true

heroku config:set THRESHOLD_CONNECT_LIMIT=10000
heroku config:set THRESHOLD_DATA_ADDONS_LIMIT=500
heroku config:set THRESHOLD_GENERAL_ADDONS_LIMIT=300
```

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

### 2. Add Buildpacks

```bash
heroku buildpacks:add --index 1 https://github.com/heroku/heroku-buildpack-apt
heroku buildpacks:add --index 2 heroku/nodejs
```

### 3. Set Environment Variables

```bash
heroku config:set HEROKU_API_KEY=your_api_key
heroku config:set MAILGUN_API_KEY=key-xxxxxxxxxxxxx
heroku config:set MAILGUN_DOMAIN=mg.yourdomain.com
heroku config:set NOTIFICATION_FROM_EMAIL=notifications@yourdomain.com
heroku config:set NOTIFICATION_RECIPIENTS=admin@company.com
heroku config:set NOTIFICATION_EMAIL_ENABLED=true
heroku config:set ENTERPRISE_ACCOUNT_NAME="Your Company"
heroku config:set NODE_ENV=production
```

### 4. Deploy

```bash
git push heroku main
```

### 5. Open Dashboard

```bash
heroku open
```

---

## 📡 API Endpoints

### Usage Data

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/enterprise/structure` | GET | Enterprise monthly usage |
| `/api/enterprise/all-accounts` | GET | All enterprise accounts usage |
| `/api/enterprise/daily-usage` | GET | Daily usage breakdown |
| `/api/enterprise/trend-summary` | GET | Historical trend analysis |
| `/api/personal/structure` | GET | Personal apps usage |
| `/api/enterprise/teams` | GET | List teams |
| `/api/enterprise/accounts` | GET | List enterprise accounts |

### Notifications

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/notifications/config` | GET | Get notification configuration |
| `/api/notifications/send-test` | POST | Send test email |
| `/api/notifications/check-thresholds` | POST | Manually check thresholds |
| `/api/notifications/cooldown-status` | GET | Check cooldown status |
| `/api/notifications/history` | GET | Get alert history |
| `/api/notifications/send-summary` | POST | Send usage summary |

### PDF Export

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/pdf/export` | POST | Generate PDF report |

---

## 📊 Notification System

### Alert Types

1. **Warning Alerts** (80% threshold)
   - Yellow-themed email
   - Sent when usage reaches 80% of limit
   - Includes usage details and recommendations

2. **Critical Alerts** (95% threshold)
   - Red-themed email
   - Urgent action required
   - Sent when usage reaches 95% of limit

3. **Limit Alerts** (100% threshold)
   - Critical severity
   - Immediate attention needed
   - Sent when usage reaches or exceeds limit

4. **Usage Summaries**
   - Daily, weekly, or monthly reports
   - Comprehensive resource breakdown
   - Total cost calculation

5. **PDF Reports**
   - Professional report delivery
   - Attached to email
   - Includes dashboard link

### Monitoring Modes

**Event-Driven (Automatic)**
- Triggers when usage changes >5%
- Monitors during dashboard refresh
- Cooldown prevents spam (1 hour)

**Scheduled (Cron)**
- Runs every hour (configurable)
- Checks all thresholds
- Sends summaries on schedule

**Manual**
- Via API: `POST /api/notifications/check-thresholds`
- Via UI: "Check Thresholds Now" button
- Useful for testing

---

## 🎨 Email Templates

All emails use professional branded templates:

- **Base Template** - Consistent branding, responsive design
- **Threshold Alert** - Color-coded by severity (yellow/red)
- **Usage Summary** - Resource breakdown with charts
- **Test Notification** - Configuration verification
- **PDF Report** - Report delivery with attachment

Templates include:
- Enterprise account name
- Dashboard links
- Timestamp
- Professional footer
- Mobile-responsive design

---

## 📄 PDF Reports

### Generate PDF

```javascript
POST /api/pdf/export
Content-Type: application/json

{
  "month": "2026-01",
  "accountId": "enterprise-account-id"  // Optional
}
```

### Email PDF Report

```javascript
const enhancedNotificationService = require('./services/enhancedNotificationService');

await enhancedNotificationService.sendPDFReport(pdfBuffer, {
  reportType: 'Monthly Usage Report',
  reportPeriod: 'January 2026',
  summary: 'Total usage: $1,234.56'
});
```

---

## 🔧 Monitoring & Debugging

### Check Logs

```bash
# All logs
heroku logs --tail

# Email service logs
heroku logs --tail | grep "\[Email"

# Notification logs
heroku logs --tail | grep "notification"

# Auto-monitor logs
heroku logs --tail | grep "Auto Monitor"
```

### Test Notifications

```bash
# Send test email
curl -X POST https://your-app.herokuapp.com/api/notifications/send-test

# Check thresholds
curl -X POST https://your-app.herokuapp.com/api/notifications/check-thresholds

# Get cooldown status
curl https://your-app.herokuapp.com/api/notifications/cooldown-status

# View alert history
curl https://your-app.herokuapp.com/api/notifications/history
```

---

## 🛠️ Troubleshooting

### Email Not Sending

**Check configuration:**
```bash
curl https://your-app.herokuapp.com/api/notifications/config
```

**Common issues:**
- `MAILGUN_API_KEY` not set or invalid
- `MAILGUN_DOMAIN` not verified in Mailgun
- `NOTIFICATION_RECIPIENTS` not configured
- `NOTIFICATION_EMAIL_ENABLED` is false
- DNS records not configured (SPF, DKIM, DMARC)

**Solution:** See `EMAIL_DELIVERABILITY_GUIDE.md`

### Threshold Alerts Not Triggering

**Check thresholds:**
```bash
curl https://your-app.herokuapp.com/api/notifications/thresholds
```

**Common issues:**
- Thresholds set too high
- Usage below threshold percentage
- Cooldown active (wait 1 hour)
- Realtime alerts disabled

**Solution:**
```bash
# Lower threshold for testing
heroku config:set THRESHOLD_DYNO_LIMIT=10

# Check cooldown status
curl https://your-app.herokuapp.com/api/notifications/cooldown-status

# Reset cooldown
curl -X POST https://your-app.herokuapp.com/api/notifications/reset-cooldown \
  -H "Content-Type: application/json" \
  -d '{"resourceType": "Dyno Units", "severity": "warning"}'
```

### PDF Generation Failing

**Check logs:**
```bash
heroku logs --tail | grep -i "pdf\|puppeteer"
```

**Common issues:**
- Chromium not installed (check Aptfile)
- Memory limit exceeded
- Timeout during generation

**Solution:**
- Ensure `heroku-buildpack-apt` is installed
- Check `Aptfile` includes required libraries
- Increase dyno size if needed

---

## 📚 Documentation

- `EMAIL_DELIVERABILITY_GUIDE.md` - Complete email setup guide
- `TESTING_GUIDE.md` - Notification testing instructions
- `HEROKU_CONFIG_VARS.md` - Environment variables reference
- `PDF_LAYOUT_FIXES.md` - PDF generation documentation

---

## 🔐 Security

- **Never commit `.env`** - Contains sensitive credentials
- **Use Config Vars** - Store secrets in Heroku Config Vars
- **Rotate API keys** - Regularly update Heroku API key
- **Use HTTPS** - Always use HTTPS in production
- **Limit permissions** - Use read-only API keys when possible
- **Validate inputs** - All user inputs are validated
- **Secure email** - Use authenticated SMTP/API

---

## 🎯 Production Readiness Checklist

### Before Going Live

- [ ] Heroku API key configured
- [ ] Mailgun domain verified (SPF, DKIM, DMARC)
- [ ] Custom sender email configured
- [ ] Recipients list configured
- [ ] Notifications enabled
- [ ] Thresholds configured appropriately
- [ ] Test email sent successfully
- [ ] Threshold alerts tested
- [ ] PDF export tested
- [ ] Enterprise account name set
- [ ] Dashboard URL set
- [ ] Logs monitored for 24 hours
- [ ] Scheduled tasks verified
- [ ] Email deliverability checked

---

## 🚀 Advanced Usage

### Scheduled Report Delivery

Configure in notification settings:

```javascript
const configService = require('./services/configService');

await configService.updateTriggerSchedule({
  dailySummary: {
    enabled: true,
    time: "09:00",
    timezone: "America/New_York"
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
});
```

### Custom Monitoring Frequency

Edit `server/index.js`:

```javascript
// Every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  const config = await configService.getConfig();
  if (config.triggerSchedule.realtimeAlerts.enabled) {
    await thresholdMonitor.monitorEnterpriseThresholds();
  }
});
```

---

## 📈 Roadmap

- [ ] Slack notifications
- [ ] Webhook support
- [ ] Custom alert rules
- [ ] Budget tracking
- [ ] Cost forecasting
- [ ] Multi-account dashboards
- [ ] Historical data export
- [ ] API rate limit monitoring

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
- [Email Setup Guide](EMAIL_DELIVERABILITY_GUIDE.md)
- [Testing Guide](TESTING_GUIDE.md)
- [Heroku Platform API Docs](https://devcenter.heroku.com/articles/platform-api-reference)
- [Mailgun Documentation](https://documentation.mailgun.com/)
