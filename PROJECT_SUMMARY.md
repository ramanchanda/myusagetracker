# Project Summary

## 🎯 Project Overview

**Heroku Usage Tracker & Notification System** is a full-stack web application that monitors Heroku resource usage and sends email alerts when usage exceeds defined thresholds.

## ✨ Key Features

### 📊 Dashboard
- Real-time usage statistics for Dynos, Connect hours, and Add-ons
- Visual charts with color-coded status indicators (green/yellow/red)
- Auto-refresh every 5 minutes
- Responsive design (mobile & desktop)

### 🔔 Notifications
- Email alerts when usage exceeds thresholds
- Scheduled monitoring every 6 hours
- Test notification feature
- Customizable alert thresholds

### 💎 Resource Tracking
- **Dynos**: Monitor dyno hours usage vs quota
- **Connect**: Track Heroku Connect hours
- **Add-ons**: List all add-ons with costs and status
- **Apps**: View all Heroku applications

## 🏗️ Technical Stack

### Backend
- **Runtime**: Node.js 20.x
- **Framework**: Express.js
- **Scheduling**: node-cron
- **Email**: Nodemailer
- **HTTP Client**: Axios
- **Security**: Helmet, CORS

### Frontend
- **Framework**: React 18
- **Charts**: Recharts
- **HTTP Client**: Axios
- **Styling**: Custom CSS

### Deployment
- **Platform**: Heroku
- **CI/CD**: Git-based deployment
- **Environment**: Config Vars

## 📁 Project Structure

```
usage-track-notify/
├── server/                      # Backend (Node.js/Express)
│   ├── index.js                # Main server file
│   └── services/
│       ├── herokuService.js    # Heroku API integration
│       ├── notificationService.js # Email notifications
│       └── usageMonitor.js     # Usage monitoring & alerts
│
├── client/                     # Frontend (React)
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── App.js              # Main app component
│       ├── App.css
│       ├── index.js
│       ├── index.css
│       └── components/
│           ├── Dashboard.js    # Main dashboard
│           ├── UsageCard.js    # Usage metric cards
│           ├── UsageChart.js   # Bar charts
│           └── AddonsList.js   # Add-ons table
│
├── package.json                # Root dependencies
├── Procfile                    # Heroku deployment config
├── app.json                    # Heroku app manifest
├── .env.example                # Environment variables template
├── .gitignore
├── setup-heroku.sh            # Automated setup script
│
└── Documentation/
    ├── README.md              # Main documentation
    ├── QUICKSTART.md          # 5-minute setup guide
    ├── DEPLOYMENT.md          # Detailed deployment
    ├── HEROKU_CONFIG.md       # Config vars reference
    └── ARCHITECTURE.md        # System architecture
```

## 🚀 Quick Start

### Prerequisites
- Heroku account
- Heroku CLI installed
- Gmail account (or SMTP provider)
- Node.js 20.x

### Deploy in 5 Minutes

1. **Create Heroku app:**
   ```bash
   heroku create your-app-name
   ```

2. **Set config vars** (via dashboard or CLI):
   ```bash
   heroku config:set HEROKU_API_KEY=$(heroku auth:token)
   heroku config:set HEROKU_ACCOUNT_EMAIL=your@email.com
   heroku config:set NOTIFICATION_EMAIL=alerts@example.com
   heroku config:set SMTP_HOST=smtp.gmail.com
   heroku config:set SMTP_PORT=587
   heroku config:set SMTP_USER=your.email@gmail.com
   heroku config:set SMTP_PASS=your_app_password
   heroku config:set DYNO_THRESHOLD=80
   heroku config:set CONNECT_THRESHOLD=80
   heroku config:set NODE_ENV=production
   ```

3. **Deploy:**
   ```bash
   git push heroku main
   heroku ps:scale web=1
   heroku open
   ```

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `HEROKU_API_KEY` | Yes | Heroku API authentication token |
| `HEROKU_ACCOUNT_EMAIL` | Yes | Your Heroku account email |
| `NOTIFICATION_EMAIL` | Yes | Email to receive alerts |
| `SMTP_HOST` | Yes | SMTP server hostname |
| `SMTP_PORT` | Yes | SMTP server port |
| `SMTP_USER` | Yes | SMTP username |
| `SMTP_PASS` | Yes | SMTP password |
| `DYNO_THRESHOLD` | Yes | Alert threshold for dynos (%) |
| `CONNECT_THRESHOLD` | Yes | Alert threshold for connect (%) |
| `NODE_ENV` | Yes | Environment (production/development) |

### Get Heroku API Key
```bash
heroku auth:token
```

### Get Gmail App Password
1. Go to https://myaccount.google.com/apppasswords
2. Generate new app password
3. Use that as `SMTP_PASS`

## 📡 API Endpoints

### Usage Data
- `GET /api/health` - Health check
- `GET /api/usage/dynos` - Dyno usage statistics
- `GET /api/usage/addons` - Add-on usage and costs
- `GET /api/usage/connect` - Connect hours usage
- `GET /api/usage/summary` - Complete usage summary
- `GET /api/apps` - List all Heroku apps
- `POST /api/test-notification` - Send test email

### Example Response
```json
{
  "dynos": {
    "totalApps": 5,
    "used": 450,
    "limit": 1000,
    "usagePercentage": "45.00",
    "remaining": 550
  },
  "connect": {
    "connectUsed": 200,
    "connectLimit": 500,
    "usagePercentage": "40.00",
    "remaining": 300
  },
  "addons": {
    "totalAddons": 8,
    "totalMonthlyCost": "75.00"
  }
}
```

## 🎨 Dashboard Features

### Usage Cards
- Color-coded status indicators:
  - 🟢 Green (0-74%): Healthy
  - 🟡 Yellow (75-89%): Warning
  - 🔴 Red (90-100%): Critical
- Progress bars with percentage
- Used/Limit/Remaining statistics

### Charts
- Bar charts showing usage vs remaining
- Visual comparison of resources
- Responsive design

### Add-ons List
- Searchable table
- Sortable columns (name, app, cost)
- Status badges
- Monthly cost tracking

## 📧 Notifications

### Email Alerts
Sent automatically when:
- Dyno usage ≥ DYNO_THRESHOLD%
- Connect usage ≥ CONNECT_THRESHOLD%

### Email Template Includes:
- Resource type
- Current usage
- Limit
- Usage percentage
- Remaining quota
- Timestamp

### Scheduling
Default: Every 6 hours (12 AM, 6 AM, 12 PM, 6 PM)

Customize in `server/index.js`:
```javascript
// Every 3 hours
cron.schedule('0 */3 * * *', ...)

// Every day at 9 AM
cron.schedule('0 9 * * *', ...)
```

## 💰 Cost Estimate

### Heroku Hosting
- **Eco Dyno**: $5/month (sleeps after inactivity)
- **Basic Dyno**: $7/month (always on)
- **Standard-1X**: $25/month (more power)

### Email (SMTP)
- **Gmail**: Free (with app password)
- **SendGrid**: Free tier (100 emails/day)
- **Mailgun**: Free tier (5000 emails/month)

**Total: $5-7/month** (recommended for small teams)

## 🔒 Security

### Best Practices Implemented
- ✅ Environment variables for secrets
- ✅ HTTPS enforced (automatic on Heroku)
- ✅ Helmet.js for security headers
- ✅ CORS enabled
- ✅ API keys never in client code
- ✅ .gitignore for sensitive files

### Security Checklist
- [ ] Use app-specific passwords for email
- [ ] Rotate API keys regularly
- [ ] Never commit .env file
- [ ] Use read-only API keys if possible
- [ ] Enable 2FA on Heroku account

## 🧪 Testing

### Health Check
```bash
curl https://your-app.herokuapp.com/api/health
```

### Usage Data
```bash
curl https://your-app.herokuapp.com/api/usage/summary
```

### Test Notification
```bash
curl -X POST https://your-app.herokuapp.com/api/test-notification
```

### View Logs
```bash
heroku logs --tail
```

## 🐛 Troubleshooting

### "Failed to fetch usage data"
```bash
# Verify API key
heroku config:get HEROKU_API_KEY

# Reset if needed
heroku config:set HEROKU_API_KEY=$(heroku auth:token)
```

### "Email notifications not working"
```bash
# Check SMTP settings
heroku config | grep SMTP

# Verify Gmail app password
# Regenerate at: https://myaccount.google.com/apppasswords
```

### "Application error"
```bash
# Check logs
heroku logs --tail

# Verify all config vars are set
heroku config
```

## 📚 Documentation

- **README.md** - Complete documentation
- **QUICKSTART.md** - 5-minute setup guide
- **DEPLOYMENT.md** - Detailed deployment instructions
- **HEROKU_CONFIG.md** - Config vars reference
- **ARCHITECTURE.md** - System architecture diagrams

## 🎯 Use Cases

1. **Small Teams**: Monitor shared Heroku account usage
2. **Agencies**: Track client app resources
3. **Startups**: Prevent unexpected overage charges
4. **Developers**: Monitor personal app quotas
5. **Cost Management**: Track add-on costs

## 🔮 Future Enhancements

### Planned Features
- [ ] Historical data storage (PostgreSQL)
- [ ] Usage trends & forecasting
- [ ] Slack notifications
- [ ] SMS alerts
- [ ] Multi-account support
- [ ] Custom reports (weekly/monthly)
- [ ] Cost optimization suggestions
- [ ] User authentication
- [ ] API rate limiting
- [ ] Dark mode

### Database Schema (Future)
```sql
usage_history (
  id, timestamp, resource_type,
  used, limit, percentage, created_at
)
```

## 🤝 Contributing

### Development Setup
```bash
# Clone repo
git clone <repo-url>
cd usage-track-notify

# Install dependencies
npm install
cd client && npm install && cd ..

# Create .env file
cp .env.example .env
# Edit .env with your credentials

# Run locally
# Terminal 1: Backend
npm run dev

# Terminal 2: Frontend
npm run client
```

### Local URLs
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## 📄 License

MIT License - Feel free to use and modify!

## 🙏 Credits

Built with:
- Express.js
- React
- Recharts
- Nodemailer
- Node-cron
- Heroku Platform API

## 📞 Support

### Getting Help
1. Check documentation in this repo
2. View Heroku logs: `heroku logs --tail`
3. Test endpoints with curl
4. Check Heroku status: https://status.heroku.com

### Common Commands
```bash
# View config
heroku config

# Restart app
heroku restart

# View logs
heroku logs --tail

# Open dashboard
heroku open

# Get API key
heroku auth:token
```

---

**Version**: 1.0.0  
**Last Updated**: April 2026  
**Status**: Production Ready ✅
