# Quick Start Guide - Notification Service

## 🚀 Your notification service is now deployed!

App URL: https://myusagetracker-0684662c08ff.herokuapp.com/

## Step 1: Add Mailgun Addon

Since you're using Mailgun, add the addon to your Heroku app:

```bash
heroku addons:create mailgun:starter -a myusagetracker
```

This will automatically configure these environment variables:
- `MAILGUN_SMTP_SERVER`
- `MAILGUN_SMTP_PORT`
- `MAILGUN_SMTP_LOGIN`
- `MAILGUN_SMTP_PASSWORD`

**No additional Heroku config vars needed!** The app auto-detects Mailgun.

## Step 2: Access Notification Settings

1. Open your app: https://myusagetracker-0684662c08ff.herokuapp.com/
2. Click the **"📧 Notification Settings"** button in the top-right header
3. You'll see a beautiful configuration interface with 3 tabs

## Step 3: Configure Email Settings (Tab 1)

1. **Enable Email Notifications** ✓ Check the box
2. **From Name**: Enter "Heroku Usage Monitor" (or your preferred name)
3. **From Email**: Leave empty (will use Mailgun SMTP user) or enter a custom email
4. **Recipients**: Enter email addresses separated by commas
   - Example: `admin@example.com, team@example.com`
5. Click **"Send Test Email"** to verify setup

## Step 4: Configure Thresholds (Tab 2)

Set your usage limits and alert percentages:

### Recommended Settings:

**Dyno Units**
- ✓ Enabled
- Limit: 1000
- Warning: 80%
- Critical: 95%

**Connect Rows**
- ✓ Enabled
- Limit: 10000
- Warning: 80%
- Critical: 95%

**Data Add-ons**
- ✓ Enabled
- Limit: 500
- Warning: 80%
- Critical: 95%

**General Add-ons**
- ✓ Enabled
- Limit: 300
- Warning: 80%
- Critical: 95%

**Private Spaces**
- ✓ Enabled
- Limit: 5
- Warning: 80%
- Critical: 100%

**Shield Spaces**
- ✓ Enabled
- Limit: 3
- Warning: 80%
- Critical: 100%

Adjust these based on your actual usage patterns.

## Step 5: Configure Schedule (Tab 3)

### Real-time Alerts (Recommended)
- ✓ Enable Real-time Threshold Alerts
- Check Interval: 60 minutes (default)

### Daily Summary (Optional)
- ✓ Enable if you want daily email reports
- Time: 09:00 UTC (adjust for your timezone)

### Weekly Summary (Optional)
- ✓ Enable if you want weekly reports
- Day: Monday
- Time: 09:00 UTC

### Monthly Summary (Optional)
- ✓ Enable if you want monthly reports
- Day of Month: 1
- Time: 09:00 UTC

## Step 6: Save Configuration

Click the **"Save Configuration"** button at the bottom.

Your settings are saved to `server/config/notificationConfig.json` and will persist across deployments.

## ✅ That's it! You're all set!

### What happens now?

1. **Real-time Monitoring**: The app checks your usage every hour
2. **Threshold Alerts**: You'll get emails when usage exceeds warning/critical levels
3. **Scheduled Summaries**: Daily/weekly/monthly reports sent per your schedule
4. **Alert Cooldown**: 1-hour cooldown prevents email spam

### Test Your Setup

1. Click "Send Test Email" in the Email Settings tab
2. Check your inbox for the test notification
3. Click "Check Thresholds Now" in the Thresholds tab to trigger a manual check

### View Alert History

Access: `GET /api/notifications/history?limit=50`

Or check the browser console when you click "Check Thresholds Now"

## 📧 Email Templates

You'll receive beautiful HTML emails with:
- **Threshold Alerts**: Color-coded (orange for warning, red for critical)
- **Usage Summaries**: Comprehensive resource breakdown with percentages
- **Test Notifications**: Simple confirmation that everything is working

## 🔧 Troubleshooting

### Emails not sending?

1. Verify Mailgun addon is attached:
   ```bash
   heroku addons -a myusagetracker
   ```

2. Check Mailgun config vars:
   ```bash
   heroku config -a myusagetracker | grep MAILGUN
   ```

3. Check server logs:
   ```bash
   heroku logs --tail -a myusagetracker
   ```

4. Test email configuration via API:
   ```bash
   curl -X POST https://myusagetracker-0684662c08ff.herokuapp.com/api/notifications/test-email
   ```

### No threshold alerts?

1. Check if usage actually exceeds your configured thresholds
2. Verify thresholds are enabled for each resource type
3. Manually trigger: Click "Check Thresholds Now" button
4. Check alert history to see if alerts were sent

### Configuration not saving?

1. Check browser console for errors
2. Verify you clicked "Save Configuration"
3. Check server logs for permission issues

## 📊 Manual Operations

All available via the UI or API:

- **Test Email**: POST `/api/notifications/send-test`
- **Check Thresholds**: POST `/api/notifications/check-thresholds`
- **Send Summary**: POST `/api/notifications/send-summary`
- **View History**: GET `/api/notifications/history`

## 🎯 Next Steps

1. Monitor your first few alerts to calibrate thresholds
2. Adjust warning/critical percentages based on your needs
3. Set up scheduled summaries for team visibility
4. Review alert history periodically

## 📚 Full Documentation

See `NOTIFICATION_SETUP.md` for:
- Complete API reference
- Custom SMTP setup
- Advanced configuration
- Security best practices
- Troubleshooting guide

---

**Need Help?**

Check Heroku logs for detailed error messages:
```bash
heroku logs --tail -a myusagetracker
```

The notification service logs all operations including:
- Email sending attempts
- Threshold checks
- Configuration changes
- Alert triggers
