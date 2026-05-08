# Complete Deployment Guide

## 🚀 Option 1: One-Click Heroku Button (EASIEST!)

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

Click the button above and follow these steps:

1. **Click "Deploy to Heroku"** button
2. **Choose an app name** (or let Heroku generate one)
3. **Fill in the required environment variables:**

### Required Configuration

#### Heroku API Settings
- **HEROKU_API_KEY**: Get your API token
  ```bash
  heroku auth:token
  ```
- **HEROKU_ACCOUNT_EMAIL**: Your Heroku account email (e.g., `you@example.com`)

#### Email Settings for Notifications
- **NOTIFICATION_EMAIL**: Email to receive alerts (e.g., `alerts@example.com`)
- **SMTP_HOST**: Leave as `smtp.gmail.com` (or change for other providers)
- **SMTP_PORT**: Leave as `587`
- **SMTP_USER**: Your Gmail address (e.g., `your.email@gmail.com`)
- **SMTP_PASS**: Gmail App Password (NOT your regular password!)

**How to get Gmail App Password:**
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and your device
3. Click "Generate"
4. Copy the 16-character password
5. Use this as your SMTP_PASS

#### Threshold Settings (Optional)
- **DYNO_THRESHOLD**: `80` (alert when 80% used)
- **CONNECT_THRESHOLD**: `80`

4. **Click "Deploy App"**
5. **Wait 2-3 minutes** for deployment
6. **Click "View"** to open your dashboard!

---

## 🛠️ Option 2: Manual Deployment (Full Control)

### Prerequisites
- Heroku account
- Heroku CLI installed ([Download](https://devcenter.heroku.com/articles/heroku-cli))
- Git installed
- Node.js 20.x installed

### Step-by-Step Deployment

#### 1. Initialize Git Repository
```bash
cd /Users/rchanda/Heroku\ POC/usage-track-notify

# Initialize git if not already done
git init

# Add all files
git add .

# Make initial commit
git commit -m "Initial commit: Heroku Usage Tracker"
```

#### 2. Create Heroku App
```bash
# Login to Heroku
heroku login

# Create new app (replace 'your-app-name' or omit for auto-generated name)
heroku create your-app-name

# Or just:
heroku create
```

#### 3. Get Your Heroku API Key
```bash
heroku auth:token
```
Copy the token displayed - you'll need it in the next step.

#### 4. Set Environment Variables
```bash
# Set Heroku API credentials
heroku config:set HEROKU_API_KEY=your_token_from_step_3
heroku config:set HEROKU_ACCOUNT_EMAIL=your@email.com

# Set notification email
heroku config:set NOTIFICATION_EMAIL=alerts@example.com

# Set SMTP credentials (Gmail example)
heroku config:set SMTP_HOST=smtp.gmail.com
heroku config:set SMTP_PORT=587
heroku config:set SMTP_USER=your.email@gmail.com
heroku config:set SMTP_PASS=your_app_password

# Set usage thresholds
heroku config:set DYNO_THRESHOLD=80
heroku config:set CONNECT_THRESHOLD=80

# Set environment
heroku config:set NODE_ENV=production
```

**Quick Copy-Paste Template:**
```bash
heroku config:set \
  HEROKU_API_KEY=paste_token_here \
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

#### 5. Deploy to Heroku
```bash
# Push code to Heroku
git push heroku main

# If your branch is 'master':
git push heroku master
```

#### 6. Scale the Web Dyno
```bash
# Start one web dyno
heroku ps:scale web=1
```

#### 7. Open Your App
```bash
# Open in browser
heroku open
```

Your dashboard should now be live! 🎉

---

## 📧 Email Configuration (Detailed)

### Option A: Gmail (Recommended for Testing)

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Click "Generate"
   - Copy the 16-character password

3. **Configure:**
   ```bash
   heroku config:set SMTP_HOST=smtp.gmail.com
   heroku config:set SMTP_PORT=587
   heroku config:set SMTP_USER=your.email@gmail.com
   heroku config:set SMTP_PASS=abcd-efgh-ijkl-mnop
   ```

### Option B: SendGrid (Better for Production)

1. **Create SendGrid account** (free tier: 100 emails/day)
2. **Create API key** in SendGrid dashboard
3. **Configure:**
   ```bash
   heroku config:set SMTP_HOST=smtp.sendgrid.net
   heroku config:set SMTP_PORT=587
   heroku config:set SMTP_USER=apikey
   heroku config:set SMTP_PASS=your_sendgrid_api_key
   ```

### Option C: Mailgun

1. **Create Mailgun account** (free tier: 5000 emails/month)
2. **Get SMTP credentials** from dashboard
3. **Configure:**
   ```bash
   heroku config:set SMTP_HOST=smtp.mailgun.org
   heroku config:set SMTP_PORT=587
   heroku config:set SMTP_USER=your_mailgun_user
   heroku config:set SMTP_PASS=your_mailgun_password
   ```

---

## ✅ Testing Your Deployment

### 1. Check App Health
```bash
# View recent logs
heroku logs --tail

# Check app status
heroku ps

# Verify all config vars are set
heroku config
```

### 2. Test API Endpoints
```bash
# Get your app URL
APP_URL=$(heroku info -s | grep web_url | cut -d= -f2)

# Test health endpoint
curl ${APP_URL}api/health

# Test usage summary
curl ${APP_URL}api/usage/summary

# Test notification
curl -X POST ${APP_URL}api/test-notification
```

### 3. Access Dashboard
```bash
heroku open
```

You should see:
- Usage cards for Dynos, Connect, Add-ons
- Bar charts showing usage
- Add-ons table with costs

---

## 🔍 Troubleshooting

### Issue: "Application Error"

**Solution:**
```bash
# Check logs for errors
heroku logs --tail

# Restart the app
heroku restart

# Verify buildpack
heroku buildpacks
```

### Issue: "Failed to fetch usage data"

**Possible causes:**
1. Invalid HEROKU_API_KEY
2. Wrong HEROKU_ACCOUNT_EMAIL
3. API key expired

**Solution:**
```bash
# Get fresh API key
heroku auth:token

# Update config
heroku config:set HEROKU_API_KEY=new_token_here

# Restart
heroku restart
```

### Issue: "Email notifications not working"

**Solution:**
```bash
# Verify SMTP settings
heroku config | grep SMTP

# Test notification manually
curl -X POST https://your-app.herokuapp.com/api/test-notification

# Check logs for SMTP errors
heroku logs --tail | grep SMTP
```

### Issue: "Cannot find module" errors

**Solution:**
```bash
# Clear build cache
heroku plugins:install heroku-builds
heroku builds:cache:purge

# Redeploy
git commit --allow-empty -m "Rebuild"
git push heroku main
```

---

## 📊 Monitoring & Maintenance

### View Real-Time Logs
```bash
heroku logs --tail
```

### Check Resource Usage
```bash
# View dyno usage
heroku ps

# View app metrics
heroku addons:create heroku-metrics:free
```

### Restart App
```bash
heroku restart
```

### Update Environment Variables
```bash
# View current config
heroku config

# Update specific variable
heroku config:set DYNO_THRESHOLD=90

# Remove variable
heroku config:unset VARIABLE_NAME
```

---

## 🔄 Updating Your Deployment

### Deploy New Changes
```bash
# Make your changes
# ...

# Commit changes
git add .
git commit -m "Description of changes"

# Deploy
git push heroku main

# View deployment
heroku open
```

### Rollback to Previous Version
```bash
# View releases
heroku releases

# Rollback to previous version
heroku rollback
```

---

## 💰 Cost Estimate

### Minimum Setup (Recommended)
- **Eco Dyno**: $5/month
- **Email (Gmail)**: Free
- **Total**: **$5/month**

### Basic Setup (Always On)
- **Basic Dyno**: $7/month
- **Email (SendGrid Free)**: Free
- **Total**: **$7/month**

### Production Setup
- **Standard-1X Dyno**: $25/month
- **Postgres Mini** (for history): $5/month
- **SendGrid Essentials**: $15/month (40k emails)
- **Total**: **$45/month**

---

## 🎯 Next Steps After Deployment

1. **Test the dashboard** - Visit your app URL
2. **Send a test notification** - Click "Test Notification" button
3. **Verify email delivery** - Check your NOTIFICATION_EMAIL inbox
4. **Monitor logs** - Watch for scheduled checks (every 6 hours)
5. **Adjust thresholds** - Fine-tune DYNO_THRESHOLD and CONNECT_THRESHOLD

---

## 🔐 Security Checklist

- [ ] Never commit `.env` file to git
- [ ] Use app-specific passwords (not regular passwords)
- [ ] Rotate API keys every 90 days
- [ ] Enable 2FA on Heroku account
- [ ] Use HTTPS only (automatic on Heroku)
- [ ] Review logs regularly for suspicious activity
- [ ] Limit API key permissions if possible

---

## 📞 Getting Help

### Heroku Resources
- **Heroku Status**: https://status.heroku.com
- **Support**: https://help.heroku.com
- **Documentation**: https://devcenter.heroku.com

### Debug Commands
```bash
# View environment
heroku config

# View running processes
heroku ps

# View logs
heroku logs --tail

# Restart app
heroku restart

# Run one-off commands
heroku run bash
```

---

## 🎉 Success!

Your Heroku Usage Tracker is now live! You'll receive:
- Real-time dashboard at your app URL
- Email alerts when usage exceeds thresholds
- Scheduled checks every 6 hours

**Enjoy monitoring your Heroku resources!** 🚀
