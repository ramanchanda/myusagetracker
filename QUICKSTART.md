# Quick Start Guide

Get your Heroku Usage Tracker up and running in 5 minutes!

## Prerequisites

- Heroku account
- Heroku CLI installed (`brew tap heroku/brew && brew install heroku`)
- Gmail account (or other SMTP provider)
- Node.js 20.x installed

## Step-by-Step Setup

### 1️⃣ Deploy to Heroku

```bash
# Login to Heroku
heroku login

# Create new app (or use existing)
heroku create your-app-name

# Add git remote if using existing app
heroku git:remote -a your-app-name
```

### 2️⃣ Set Environment Variables

You have **two options**:

#### Option A: Use Heroku Dashboard (Easiest)

1. Go to https://dashboard.heroku.com/apps/your-app-name
2. Click **Settings** tab
3. Click **Reveal Config Vars**
4. Add these variables one by one:

```
HEROKU_API_KEY → (get from: heroku auth:token)
HEROKU_ACCOUNT_EMAIL → your@email.com
NOTIFICATION_EMAIL → alerts@example.com
SMTP_HOST → smtp.gmail.com
SMTP_PORT → 587
SMTP_USER → your.email@gmail.com
SMTP_PASS → your_gmail_app_password
DYNO_THRESHOLD → 80
CONNECT_THRESHOLD → 80
NODE_ENV → production
```

**Get Gmail App Password:**
- Go to https://myaccount.google.com/apppasswords
- Generate a new app password
- Use that 16-character password as `SMTP_PASS`

#### Option B: Use CLI (Faster)

```bash
# Run the interactive setup script
./setup-heroku.sh
```

Or manually:

```bash
heroku config:set \
  HEROKU_API_KEY=$(heroku auth:token) \
  HEROKU_ACCOUNT_EMAIL=your@email.com \
  NOTIFICATION_EMAIL=alerts@example.com \
  SMTP_HOST=smtp.gmail.com \
  SMTP_PORT=587 \
  SMTP_USER=your.email@gmail.com \
  SMTP_PASS=your_app_password \
  DYNO_THRESHOLD=80 \
  CONNECT_THRESHOLD=80 \
  NODE_ENV=production
```

### 3️⃣ Deploy the App

```bash
# Initialize git if needed
git init
git add .
git commit -m "Initial deployment"

# Push to Heroku
git push heroku main

# If you're on master branch
git push heroku master:main
```

### 4️⃣ Start the App

```bash
# Scale web dyno
heroku ps:scale web=1

# Open in browser
heroku open
```

### 5️⃣ Test It Works

1. **Dashboard loads** - You should see your usage statistics
2. **Click "Test Notification"** - Check your email for test message
3. **View logs** to verify everything is running:
   ```bash
   heroku logs --tail
   ```

## Common Issues & Solutions

### ❌ "Failed to fetch usage data"

**Fix:** Check your Heroku API key
```bash
heroku config:set HEROKU_API_KEY=$(heroku auth:token)
```

### ❌ "Email notifications not working"

**Fix:** Verify Gmail app password
1. Go to https://myaccount.google.com/apppasswords
2. Generate new app password
3. Update config:
   ```bash
   heroku config:set SMTP_PASS=your_new_app_password
   ```

### ❌ "Application error"

**Fix:** Check logs for details
```bash
heroku logs --tail
```

## Verify Everything Works

Run these checks:

```bash
# 1. Check health endpoint
curl https://your-app-name.herokuapp.com/api/health

# 2. Check usage data
curl https://your-app-name.herokuapp.com/api/usage/summary

# 3. Send test notification
curl -X POST https://your-app-name.herokuapp.com/api/test-notification

# 4. View logs
heroku logs --tail
```

## What Happens Next?

✅ **Automatic Monitoring:**
- App checks usage every 6 hours
- Sends email alerts when thresholds are exceeded
- Dashboard refreshes every 5 minutes

✅ **Dashboard Features:**
- Real-time usage statistics
- Visual charts and progress bars
- Add-ons cost tracking
- Color-coded alerts (green/yellow/red)

✅ **Email Notifications:**
- Sent when Dyno usage > 80% (or your threshold)
- Sent when Connect usage > 80% (or your threshold)
- Can test anytime from dashboard

## Customization

### Change Alert Thresholds

```bash
# Alert at 90% instead of 80%
heroku config:set DYNO_THRESHOLD=90
heroku config:set CONNECT_THRESHOLD=85
```

### Change Monitoring Frequency

Edit `server/index.js` line with cron schedule:

```javascript
// Every 3 hours instead of 6
cron.schedule('0 */3 * * *', async () => {
  await usageMonitor.checkAndNotify();
});
```

Then redeploy:
```bash
git add .
git commit -m "Update monitoring frequency"
git push heroku main
```

## Useful Commands

```bash
# View all settings
heroku config

# Restart app
heroku restart

# View logs
heroku logs --tail

# Check dyno status
heroku ps

# Open dashboard
heroku open

# SSH into dyno
heroku run bash
```

## Local Development

Want to test locally first?

```bash
# Install dependencies
npm install
cd client && npm install && cd ..

# Create .env file
cp .env.example .env
# Edit .env with your credentials

# Run backend (terminal 1)
npm run dev

# Run frontend (terminal 2)
cd client && npm start
```

Visit http://localhost:3000

## Cost Estimate

Using **Eco Dyno** ($5/month):
- ✅ Perfect for this app
- Sleeps after 30 min of inactivity
- Wakes up on request
- 1000 hours/month included

**Total Monthly Cost: $5**

## Need Help?

📖 **Full Documentation:**
- `README.md` - Complete guide
- `DEPLOYMENT.md` - Detailed deployment steps
- `HEROKU_CONFIG.md` - Config vars reference

💬 **Support:**
- Check logs: `heroku logs --tail`
- Test endpoints: See "Verify Everything Works" above
- Heroku status: https://status.heroku.com

## Success Checklist

- [ ] App deployed to Heroku
- [ ] Config vars set (10 required variables)
- [ ] Dashboard loads and shows data
- [ ] Test notification email received
- [ ] No errors in logs
- [ ] Monitoring schedule active (check logs for "Running scheduled usage check...")

🎉 **Congratulations!** Your Heroku Usage Tracker is live!
