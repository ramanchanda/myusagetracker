# Heroku Usage Tracker & Notification System

A comprehensive web application that tracks Heroku resource usage (Dynos, Connect, Add-ons) and sends notifications when usage exceeds defined thresholds.

## 🚀 Quick Deploy

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

**Click the button above for one-click deployment!** Get up and running in 5 minutes.

---

## Features

- **Real-time Dashboard**: Visual representation of Heroku resource usage
- **Usage Tracking**: Monitor Dyno hours, Connect hours, and Add-ons
- **Overage Alerts**: Email notifications when usage exceeds thresholds
- **Scheduled Monitoring**: Automatic checks every 6 hours
- **Add-ons Management**: Detailed view of all add-ons with cost tracking
- **Visual Charts**: Usage graphs with color-coded status indicators
- **Responsive Design**: Works on desktop and mobile devices

## Architecture

- **Backend**: Node.js + Express
- **Frontend**: React
- **API Integration**: Heroku Platform API
- **Notifications**: Email via SMTP (Nodemailer)
- **Scheduling**: Node-cron for automated checks

## Prerequisites

- Node.js 20.x or higher
- Heroku account with API access
- SMTP credentials (Gmail, SendGrid, etc.)

## Setup Instructions

### 1. Clone and Install

```bash
cd usage-track-notify
npm install
cd client && npm install && cd ..
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Heroku API Configuration
HEROKU_API_KEY=your_heroku_api_key_here
HEROKU_ACCOUNT_EMAIL=your_heroku_email@example.com

# Notification Configuration
NOTIFICATION_EMAIL=alerts@example.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Usage Thresholds (percentages)
DYNO_THRESHOLD=80
CONNECT_THRESHOLD=80
ADDON_THRESHOLD=80

# App Configuration
PORT=3001
NODE_ENV=development
```

### 3. Get Heroku API Key

```bash
heroku auth:token
```

Copy the token and set it as `HEROKU_API_KEY` in your `.env` file.

### 4. Configure Email Notifications

#### Gmail Setup:
1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the app password as `SMTP_PASS`

#### Other SMTP Providers:
- SendGrid, Mailgun, AWS SES, etc. can also be used
- Update `SMTP_HOST`, `SMTP_PORT`, and credentials accordingly

### 5. Run Locally

**Development Mode:**

```bash
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Frontend
npm run client
```

Access the dashboard at: http://localhost:3000

**Production Mode:**

```bash
npm start
```

Access at: http://localhost:3001

## Deploy to Heroku

### 1. Initialize Git Repository

```bash
git init
git add .
git commit -m "Initial commit"
```

### 2. Create Heroku App

```bash
heroku create your-app-name
```

### 3. Set Environment Variables

```bash
heroku config:set HEROKU_API_KEY=your_api_key
heroku config:set HEROKU_ACCOUNT_EMAIL=your_email@example.com
heroku config:set NOTIFICATION_EMAIL=alerts@example.com
heroku config:set SMTP_HOST=smtp.gmail.com
heroku config:set SMTP_PORT=587
heroku config:set SMTP_USER=your_email@gmail.com
heroku config:set SMTP_PASS=your_app_password
heroku config:set DYNO_THRESHOLD=80
heroku config:set CONNECT_THRESHOLD=80
heroku config:set NODE_ENV=production
```

### 4. Deploy

```bash
git push heroku main
```

### 5. Open Your App

```bash
heroku open
```

## API Endpoints

### Usage Data

- `GET /api/health` - Health check
- `GET /api/usage/dynos` - Dyno usage statistics
- `GET /api/usage/addons` - Add-on usage and costs
- `GET /api/usage/connect` - Connect hours usage
- `GET /api/usage/summary` - Complete usage summary
- `GET /api/apps` - List all Heroku apps
- `POST /api/test-notification` - Send test email notification

### Example Response

```json
{
  "dynos": {
    "totalApps": 5,
    "used": 450,
    "limit": 1000,
    "usagePercentage": "45.00",
    "remaining": 550,
    "dynos": [...]
  },
  "addons": {
    "totalAddons": 8,
    "totalMonthlyCost": "75.00",
    "addons": [...]
  },
  "connect": {
    "connectUsed": 200,
    "connectLimit": 500,
    "usagePercentage": "40.00",
    "remaining": 300
  }
}
```

## Monitoring & Notifications

### Scheduled Checks

The app automatically checks usage every 6 hours. Modify in `server/index.js`:

```javascript
// Every 6 hours
cron.schedule('0 */6 * * *', async () => {
  await usageMonitor.checkAndNotify();
});

// Every day at 9 AM
cron.schedule('0 9 * * *', async () => {
  await usageMonitor.checkAndNotify();
});
```

### Threshold Configuration

Set thresholds in `.env`:

```env
DYNO_THRESHOLD=80      # Alert at 80% usage
CONNECT_THRESHOLD=75   # Alert at 75% usage
ADDON_THRESHOLD=90     # Alert at 90% usage
```

### Email Notifications

Notifications are sent when:
- Dyno usage exceeds `DYNO_THRESHOLD`
- Connect usage exceeds `CONNECT_THRESHOLD`
- Manual test notification is triggered

## Customization

### Adjust Monitoring Frequency

Edit `server/index.js`:

```javascript
// Check every hour
cron.schedule('0 * * * *', async () => {
  await usageMonitor.checkAndNotify();
});

// Check every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  await usageMonitor.checkAndNotify();
});
```

### Add Slack Notifications

Install Slack SDK:

```bash
npm install @slack/webhook
```

Update `server/services/notificationService.js` to include Slack webhooks.

### Custom Dashboard Themes

Modify color schemes in component CSS files:
- `client/src/App.css` - Main app styling
- `client/src/components/*.css` - Component styles

## Troubleshooting

### "Failed to fetch usage data"

- Verify `HEROKU_API_KEY` is correct
- Check Heroku API key has not expired
- Ensure your account has access to the apps

### Email Notifications Not Working

- Verify SMTP credentials
- Check firewall/security settings
- For Gmail, ensure App Password is used (not regular password)
- Test with `POST /api/test-notification`

### Dashboard Not Loading

- Check backend is running (`npm start` or `npm run dev`)
- Verify PORT is not in use
- Check browser console for errors

## Security Best Practices

1. **Never commit `.env` file** - It contains sensitive credentials
2. **Use environment variables** for all secrets
3. **Rotate API keys regularly**
4. **Use HTTPS in production**
5. **Limit API key permissions** to read-only if possible

## License

MIT

## Support

For issues and questions, please open an issue on the GitHub repository.
