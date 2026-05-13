# Notification Service Setup Guide

## Overview
The notification service provides comprehensive email alerts for Heroku resource usage with configurable thresholds and schedules.

## Features
- ✅ Email notifications via MailtoGo or custom SMTP
- ✅ Threshold monitoring for 6 resource types
- ✅ Configurable warning and critical alert levels
- ✅ Daily/Weekly/Monthly usage summaries
- ✅ Real-time threshold alerts
- ✅ Alert history tracking
- ✅ Beautiful HTML email templates
- ✅ Web-based configuration UI

## Quick Start with Mailgun (Recommended)

### 1. Add Mailgun Addon to Heroku
```bash
heroku addons:create mailgun:starter -a myusagetracker
```

This automatically sets these environment variables:
- `MAILGUN_SMTP_SERVER`
- `MAILGUN_SMTP_PORT`
- `MAILGUN_SMTP_LOGIN`
- `MAILGUN_SMTP_PASSWORD`
- `MAILGUN_DOMAIN`
- `MAILGUN_API_KEY`

The notification service will automatically detect and use these settings.

## Alternative: MailtoGo

### 1. Add MailtoGo Addon to Heroku
```bash
heroku addons:create mailtogo:free -a myusagetracker
```

This automatically sets these environment variables:
- `MAILTOGO_SMTP_HOST`
- `MAILTOGO_SMTP_PORT`
- `MAILTOGO_SMTP_USER`
- `MAILTOGO_SMTP_PASSWORD`

### 2. Access the Configuration UI
1. Open your app: `https://your-app-url.herokuapp.com/`
2. Click the **"📧 Notification Settings"** button in the top-right header
3. Or navigate directly to: `https://your-app-url.herokuapp.com/notifications`

### 3. Configure Email Settings
- Enable email notifications
- Add recipient email addresses (comma-separated)
- Set "From Name" (e.g., "Heroku Usage Monitor")
- Click "Send Test Email" to verify setup

### 4. Configure Thresholds
Set limits for each resource type:

**Example Configuration:**
- **Dyno Units**: Limit 1000, Warning 80%, Critical 95%
- **Connect Rows**: Limit 10000, Warning 80%, Critical 95%
- **Data Add-ons**: Limit 500, Warning 80%, Critical 95%
- **General Add-ons**: Limit 300, Warning 80%, Critical 95%
- **Private Spaces**: Limit 5, Warning 80%, Critical 100%
- **Shield Spaces**: Limit 3, Warning 80%, Critical 100%

### 5. Configure Notification Schedule
- **Real-time Alerts**: Enable and set check interval (default: 60 minutes)
- **Daily Summary**: Enable and set time (UTC)
- **Weekly Summary**: Enable and select day + time
- **Monthly Summary**: Enable and select day of month + time

### 6. Save Configuration
Click "Save Configuration" to apply all changes.

## Alternative: Custom SMTP Setup

If you don't want to use MailtoGo, you can use any SMTP provider:

### Environment Variables
Set these in Heroku config vars or `.env`:
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### For Gmail:
1. Enable 2-factor authentication
2. Generate an app-specific password
3. Use the app password in `SMTP_PASS`

### For SendGrid:
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

## API Endpoints

### Configuration Management
```bash
# Get full configuration
GET /api/notifications/config

# Update configuration
PUT /api/notifications/config
Body: { emailConfig, thresholds, triggerSchedule }

# Get email configuration
GET /api/notifications/email-config

# Update email configuration
PUT /api/notifications/email-config
Body: { enabled, recipients, fromName, fromEmail }
```

### Threshold Management
```bash
# Get all thresholds
GET /api/notifications/thresholds

# Update all thresholds
PUT /api/notifications/thresholds
Body: { dynoUnits, connectRows, dataAddons, etc. }

# Update single threshold
PUT /api/notifications/thresholds/dynoUnits
Body: { enabled, limit, warningPercentage, criticalPercentage }
```

### Testing & Monitoring
```bash
# Test email configuration
POST /api/notifications/test-email

# Send test notification
POST /api/notifications/send-test

# Manually check thresholds
POST /api/notifications/check-thresholds

# Manually send summary
POST /api/notifications/send-summary
Body: { period: "daily" | "weekly" | "monthly" }
```

### Alert History
```bash
# Get alert history
GET /api/notifications/history?limit=50

# Clear alert history
DELETE /api/notifications/history
```

## Automated Monitoring

### Cron Jobs
The service runs two scheduled tasks:

1. **Threshold Monitoring** (every hour)
   - Checks all enabled thresholds
   - Sends alerts if warning/critical levels exceeded
   - 1-hour cooldown per resource to prevent spam

2. **Legacy Check** (every 6 hours)
   - Backward compatibility with old monitoring system

### Alert Cooldown
- Prevents notification spam
- 1 hour cooldown per resource per severity level
- Example: If "Dyno Units Warning" sent, no more warnings for 1 hour

## Email Templates

### Threshold Alert Email
- Color-coded by severity (warning: orange, critical: red)
- Shows current usage, limit, percentage
- Includes recommended actions
- Professional HTML design

### Usage Summary Email
- Shows all resource usage with percentages
- Color-coded status indicators
- Total cost calculation
- Available for daily/weekly/monthly periods

### Test Notification
- Simple success confirmation
- Verifies email configuration
- Shows delivery timestamp

## Configuration File

Location: `server/config/notificationConfig.json`

```json
{
  "emailConfig": {
    "enabled": false,
    "provider": "mailtogo",
    "recipients": [],
    "fromName": "Heroku Usage Monitor",
    "fromEmail": ""
  },
  "thresholds": {
    "dynoUnits": {
      "enabled": true,
      "limit": 1000,
      "warningPercentage": 80,
      "criticalPercentage": 95
    },
    ...
  },
  "triggerSchedule": {
    "realtimeAlerts": {
      "enabled": true,
      "checkIntervalMinutes": 60
    },
    "dailySummary": {
      "enabled": false,
      "time": "09:00",
      "timezone": "UTC"
    },
    ...
  }
}
```

## Troubleshooting

### Emails Not Sending
1. Check if email notifications are enabled in config
2. Verify recipient emails are configured
3. Test SMTP connection: `POST /api/notifications/test-email`
4. Check Heroku logs: `heroku logs --tail -a myusagetracker`
5. Verify MailtoGo addon is attached: `heroku addons -a myusagetracker`

### No Threshold Alerts
1. Verify thresholds are enabled for each resource
2. Check if usage actually exceeds threshold percentages
3. Verify real-time alerts are enabled in schedule
4. Check alert history: `GET /api/notifications/history`
5. Manual trigger: `POST /api/notifications/check-thresholds`

### Mailgun Connection Issues
```bash
# Verify Mailgun config
heroku config -a myusagetracker | grep MAILGUN

# Should see:
# MAILGUN_SMTP_SERVER
# MAILGUN_SMTP_PORT
# MAILGUN_SMTP_LOGIN
# MAILGUN_SMTP_PASSWORD
```

### MailtoGo Connection Issues
```bash
# Verify MailtoGo config
heroku config -a myusagetracker | grep MAILTOGO

# Should see:
# MAILTOGO_SMTP_HOST
# MAILTOGO_SMTP_PORT
# MAILTOGO_SMTP_USER
# MAILTOGO_SMTP_PASSWORD
```

### Provider Detection Order
The service checks for email providers in this order:
1. Mailgun (MAILGUN_SMTP_SERVER)
2. MailtoGo (MAILTOGO_SMTP_HOST)
3. Custom SMTP (SMTP_HOST)

### Configuration Not Saving
1. Check file permissions on `server/config/notificationConfig.json`
2. Ensure Node.js has write access to config directory
3. Check server logs for error messages
4. Verify JSON syntax if manually editing config file

## Best Practices

### Threshold Configuration
- Start with higher warning percentages (80-85%) to avoid alert fatigue
- Set critical thresholds at 90-95% for urgent alerts
- Adjust based on your actual usage patterns
- Review and update limits quarterly

### Email Recipients
- Add multiple email addresses for redundancy
- Use team distribution lists
- Consider separate lists for warnings vs critical alerts
- Test delivery to all recipients

### Alert Cooldown
- Default 1-hour cooldown is recommended
- Prevents inbox flooding during sustained high usage
- Critical alerts will still send after cooldown expires
- Consider longer cooldowns during known high-usage periods

### Monitoring Schedule
- Enable real-time alerts for immediate threshold notifications
- Daily summaries at start of business day (e.g., 09:00 UTC)
- Weekly summaries on Monday morning
- Monthly summaries on 1st of month
- All times in UTC - adjust for your timezone

## Security Notes

- Configuration file contains no sensitive data (emails only)
- SMTP credentials stored in environment variables only
- Never commit `.env` files to version control
- Use app-specific passwords for Gmail/Google accounts
- MailtoGo credentials managed by Heroku addon
- Alert history kept for last 100 alerts only

## Support

For issues or questions:
1. Check Heroku logs: `heroku logs --tail`
2. Review configuration: `GET /api/notifications/config`
3. Test email setup: `POST /api/notifications/send-test`
4. Check alert history: `GET /api/notifications/history`

## Future Enhancements

Potential features for future versions:
- [ ] Slack/Teams webhook integration
- [ ] SMS notifications via Twilio
- [ ] PagerDuty integration
- [ ] Custom email templates
- [ ] Per-team notification preferences
- [ ] Anomaly detection (ML-based)
- [ ] Cost optimization recommendations
- [ ] Mobile app notifications
