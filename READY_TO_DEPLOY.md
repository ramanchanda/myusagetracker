# 🚀 Ready to Deploy - Quick Start Guide

Your Heroku Usage Tracker is **ready for deployment**! Choose your preferred method below.

---

## 🎯 Three Ways to Deploy

### 1. ⚡ ONE-CLICK DEPLOY (Easiest - 5 minutes)

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

**Steps:**
1. Click the button above
2. Choose app name (or auto-generate)
3. Fill in environment variables (see below)
4. Click "Deploy App"
5. Done! 🎉

**Required Information:**
- Heroku API Key: Run `heroku auth:token` 
- Your Heroku account email
- Notification email for alerts
- Gmail/SMTP credentials

---

### 2. 🤖 AUTOMATED SCRIPT (Recommended - 10 minutes)

```bash
cd "/Users/rchanda/Heroku POC/usage-track-notify"
./deploy-to-heroku.sh
```

**What it does:**
- Checks prerequisites (Heroku CLI, Git)
- Creates Heroku app
- Prompts for all configuration
- Sets environment variables
- Deploys your app
- Opens dashboard in browser

**Perfect for:** First-time deployment, guided setup

---

### 3. 📝 MANUAL DEPLOYMENT (Full control - 15 minutes)

Follow the detailed guide in `DEPLOYMENT_GUIDE.md`

```bash
# Quick manual deploy
heroku create
heroku config:set HEROKU_API_KEY=$(heroku auth:token)
heroku config:set HEROKU_ACCOUNT_EMAIL=your@email.com
# ... set other variables ...
git push heroku main
heroku open
```

**Perfect for:** Experienced users, custom setup

---

## 🔑 What You'll Need

### 1. Heroku API Key
```bash
heroku auth:token
```
Copy the output - this is your `HEROKU_API_KEY`

### 2. Gmail App Password (for notifications)
1. Visit: https://myaccount.google.com/apppasswords
2. Select "Mail" and your device
3. Click "Generate"
4. Copy the 16-character password
5. This is your `SMTP_PASS`

### 3. Configuration Values

| Variable | Where to Get It | Example |
|----------|----------------|---------|
| `HEROKU_API_KEY` | `heroku auth:token` | `abc123...` |
| `HEROKU_ACCOUNT_EMAIL` | Your Heroku login email | `you@example.com` |
| `NOTIFICATION_EMAIL` | Where to receive alerts | `alerts@example.com` |
| `SMTP_HOST` | Your email provider | `smtp.gmail.com` |
| `SMTP_PORT` | Usually 587 | `587` |
| `SMTP_USER` | Your email address | `you@gmail.com` |
| `SMTP_PASS` | Gmail App Password | `abcd efgh ijkl mnop` |
| `DYNO_THRESHOLD` | Alert at X% usage | `80` |
| `CONNECT_THRESHOLD` | Alert at X% usage | `80` |

---

## ✅ Before You Deploy - Quick Checklist

- [ ] Heroku CLI installed (`brew install heroku` on Mac)
- [ ] Heroku account created
- [ ] Git installed
- [ ] Gmail App Password generated (or other SMTP ready)
- [ ] You have 10 minutes for deployment

---

## 🧪 Test Locally First (Optional)

Want to test before deploying?

```bash
cd "/Users/rchanda/Heroku POC/usage-track-notify"
./test-local.sh
```

This will:
- Check your `.env` file
- Verify environment variables
- Test Heroku API connection
- Start local server on port 3001
- Open http://localhost:3001

---

## 📦 What Gets Deployed

### Backend (Node.js/Express)
- REST API for Heroku usage data
- Scheduled monitoring (every 6 hours)
- Email notification service
- Health check endpoints

### Frontend (React)
- Real-time dashboard
- Usage cards with color coding
- Bar charts for visualization
- Add-ons table
- Auto-refresh every 5 minutes

### Services
- **Heroku API Integration**: Fetches dyno, connect, add-on data
- **Cron Scheduler**: Automated checks every 6 hours
- **Email Alerts**: Notifies when thresholds exceeded

---

## 💰 Cost Estimate

### Minimum Setup
- **Eco Dyno**: $5/month
- **Gmail**: Free
- **Total**: **$5/month**

### Production Setup
- **Basic Dyno**: $7/month (always on)
- **SendGrid Free**: Free tier
- **Total**: **$7/month**

---

## 🎉 After Deployment

### Your app will be live at:
```
https://your-app-name.herokuapp.com
```

### Test it:
```bash
# Health check
curl https://your-app-name.herokuapp.com/api/health

# Usage data
curl https://your-app-name.herokuapp.com/api/usage/summary

# Test email notification
curl -X POST https://your-app-name.herokuapp.com/api/test-notification
```

### Dashboard Features:
- **Usage Cards**: Visual display of Dynos, Connect, Add-ons
- **Color Coding**: Green (healthy), Yellow (warning), Red (critical)
- **Charts**: Bar graphs showing usage vs remaining
- **Add-ons Table**: Searchable, sortable list with costs
- **Auto-Refresh**: Updates every 5 minutes
- **Test Button**: Send test notification email

---

## 📊 What Gets Monitored

### Dyno Usage
- Total dyno hours used vs quota
- Per-app dyno consumption
- Usage percentage

### Heroku Connect
- Connect hours used vs quota
- Usage percentage

### Add-ons
- All add-ons across all apps
- Monthly costs per add-on
- Total add-on costs
- Add-on status

---

## 🔔 Email Notifications

### When You'll Get Alerted
- Dyno usage ≥ 80% (or your threshold)
- Connect usage ≥ 80% (or your threshold)

### Email Includes
- Resource type
- Current usage
- Limit/quota
- Percentage used
- Remaining quota
- Timestamp

### Notification Schedule
Default: Every 6 hours (12am, 6am, 12pm, 6pm)

You'll only get emails when thresholds are exceeded.

---

## 🛠️ Useful Commands

### View Your App
```bash
heroku open
```

### Check Logs
```bash
heroku logs --tail
```

### View Configuration
```bash
heroku config
```

### Restart App
```bash
heroku restart
```

### Update Threshold
```bash
heroku config:set DYNO_THRESHOLD=90
```

### Get Fresh API Key
```bash
heroku config:set HEROKU_API_KEY=$(heroku auth:token)
```

---

## 🐛 Troubleshooting

### "Application Error" Page
```bash
heroku logs --tail
heroku restart
```

### "Failed to fetch usage data"
```bash
# Refresh API key
heroku config:set HEROKU_API_KEY=$(heroku auth:token)
heroku restart
```

### "Email not sending"
```bash
# Check SMTP settings
heroku config | grep SMTP

# Regenerate Gmail App Password
# Visit: https://myaccount.google.com/apppasswords
```

---

## 📚 Documentation Available

1. **DEPLOYMENT_GUIDE.md** - Complete deployment instructions
2. **TESTING_CHECKLIST.md** - Full testing procedures
3. **README.md** - Project overview and features
4. **ARCHITECTURE.md** - System architecture details
5. **QUICKSTART.md** - 5-minute setup guide

---

## 🎯 Next Steps

### Right After Deployment:
1. ✅ Visit your dashboard URL
2. ✅ Click "Test Notification" button
3. ✅ Check your email for test notification
4. ✅ Verify all usage cards display data
5. ✅ Check Heroku logs: `heroku logs --tail`

### Within 24 Hours:
1. ✅ Wait for first scheduled check (every 6 hours)
2. ✅ Monitor logs for successful runs
3. ✅ Verify email arrives if threshold exceeded
4. ✅ Bookmark your dashboard URL

### Ongoing:
1. ✅ Check dashboard weekly
2. ✅ Review email alerts
3. ✅ Adjust thresholds as needed
4. ✅ Monitor costs in Heroku dashboard

---

## 🚀 Ready to Deploy?

### Choose Your Method:

**Fastest (5 min):**
```
Click the Heroku Button at the top of this file
```

**Easiest (10 min):**
```bash
./deploy-to-heroku.sh
```

**Manual (15 min):**
```
See DEPLOYMENT_GUIDE.md
```

---

## 💡 Pro Tips

1. **Use Gmail App Password** - Don't use your regular Gmail password
2. **Start with 80% thresholds** - Adjust based on your needs
3. **Test locally first** - Run `./test-local.sh` to verify setup
4. **Bookmark dashboard** - Add to your team's monitoring tools
5. **Set calendar reminder** - Rotate API keys every 90 days

---

## 📞 Need Help?

### Check These First:
1. View logs: `heroku logs --tail`
2. Check config: `heroku config`
3. Test health: `curl https://your-app.herokuapp.com/api/health`
4. Review DEPLOYMENT_GUIDE.md
5. Check TESTING_CHECKLIST.md

### Common Issues:
- **App won't start**: Check logs, verify all config vars set
- **No data showing**: Verify HEROKU_API_KEY is correct
- **No emails**: Check SMTP credentials, test Gmail App Password

---

## ✨ You're All Set!

Your Heroku Usage Tracker is production-ready. Pick a deployment method above and you'll be monitoring your Heroku resources in minutes!

**Questions?** Check the documentation files in this directory.

**Ready?** Let's deploy! 🚀

---

## 📋 Quick Reference Card

```
╔══════════════════════════════════════════════════════╗
║         HEROKU USAGE TRACKER - QUICK REF            ║
╠══════════════════════════════════════════════════════╣
║ Deploy:  ./deploy-to-heroku.sh                      ║
║ Test:    ./test-local.sh                            ║
║ Open:    heroku open                                ║
║ Logs:    heroku logs --tail                         ║
║ Config:  heroku config                              ║
║ Restart: heroku restart                             ║
╠══════════════════════════════════════════════════════╣
║ Get API Key: heroku auth:token                      ║
║ Gmail Setup: myaccount.google.com/apppasswords      ║
╠══════════════════════════════════════════════════════╣
║ Cost: $5-7/month (Eco/Basic dyno + free email)     ║
║ Monitoring: Every 6 hours automatically             ║
║ Dashboard: Auto-refresh every 5 minutes             ║
╚══════════════════════════════════════════════════════╝
```

**Good luck! 🍀**
