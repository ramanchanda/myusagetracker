# 🎯 START HERE - Heroku Usage Tracker

Welcome! This guide will get you started in **5 minutes**.

---

## ⚡ Fastest Way to Deploy

### Option 1: Heroku Button (Easiest!)

You'll need to push this to GitHub first, then add the button. For now, use Option 2 or 3.

---

### Option 2: Automated Script (Recommended)

```bash
cd "/Users/rchanda/Heroku POC/usage-track-notify"
./deploy-to-heroku.sh
```

The script will:
- ✅ Check prerequisites
- ✅ Create your Heroku app
- ✅ Prompt for configuration
- ✅ Deploy everything
- ✅ Open your dashboard

**That's it!** The script handles everything.

---

### Option 3: Manual Deployment

See `DEPLOYMENT_GUIDE.md` for complete manual steps.

---

## 🔑 What You Need (2 minutes to gather)

### 1. Get Heroku API Key
```bash
heroku auth:token
```
Copy the output.

### 2. Get Gmail App Password
1. Visit: https://myaccount.google.com/apppasswords
2. Generate new password
3. Copy the 16-character code

**That's all you need!**

---

## 🧪 Want to Test Locally First?

```bash
cd "/Users/rchanda/Heroku POC/usage-track-notify"

# Create .env file
cp .env.example .env

# Edit .env with your credentials
nano .env  # or use your favorite editor

# Run test script
./test-local.sh
```

Opens at: http://localhost:3001

---

## 📋 Quick Checklist

Before deploying, make sure you have:

- [ ] Heroku account created
- [ ] Heroku CLI installed (`brew install heroku`)
- [ ] Heroku API token (from `heroku auth:token`)
- [ ] Gmail App Password (from google.com/apppasswords)
- [ ] Email address for receiving alerts

**Got all that?** You're ready to deploy!

---

## 🚀 Deploy Now!

### Step 1: Run the deployment script
```bash
cd "/Users/rchanda/Heroku POC/usage-track-notify"
./deploy-to-heroku.sh
```

### Step 2: Follow the prompts
The script will ask for:
- App name (or press Enter for auto-generated)
- Notification email
- SMTP credentials
- Alert thresholds

### Step 3: Wait 2-3 minutes
The script deploys everything automatically.

### Step 4: Open your dashboard
The script opens it for you automatically!

---

## ✅ After Deployment

### Your dashboard shows:
- **Dyno Usage**: Hours used vs quota
- **Connect Usage**: Connect hours used vs quota
- **Add-ons**: All add-ons with costs

### Test the notification:
1. Click "Test Notification" button on dashboard
2. Check your email
3. You should receive a test email

### Monitor automatically:
- Checks run every 6 hours (12am, 6am, 12pm, 6pm)
- Emails sent when usage exceeds thresholds
- Dashboard auto-refreshes every 5 minutes

---

## 💰 Cost

**$5/month** (Eco dyno + free Gmail)

That's it!

---

## 🆘 Need Help?

### Common Issues:

**"heroku: command not found"**
```bash
brew install heroku
```

**"Failed to fetch usage data"**
```bash
# Refresh your API key
heroku config:set HEROKU_API_KEY=$(heroku auth:token)
heroku restart
```

**"Email not working"**
- Make sure you're using Gmail **App Password**, not regular password
- Regenerate at: https://myaccount.google.com/apppasswords

---

## 📚 More Information

| File | What It's For |
|------|---------------|
| `READY_TO_DEPLOY.md` | Complete overview and all deployment options |
| `DEPLOYMENT_GUIDE.md` | Step-by-step deployment instructions |
| `TESTING_CHECKLIST.md` | Full testing procedures |
| `README.md` | Project overview and features |
| `ARCHITECTURE.md` | Technical architecture details |

---

## 🎯 Quick Commands

```bash
# Deploy
./deploy-to-heroku.sh

# Test locally
./test-local.sh

# View logs
heroku logs --tail

# Open dashboard
heroku open

# Check status
heroku ps

# Restart
heroku restart
```

---

## 🎉 That's It!

You're ready to deploy. The automated script makes it super easy.

**Ready?**

```bash
cd "/Users/rchanda/Heroku POC/usage-track-notify"
./deploy-to-heroku.sh
```

**Good luck! 🚀**

---

## 📞 Questions?

1. Check `DEPLOYMENT_GUIDE.md` for detailed instructions
2. Check `TESTING_CHECKLIST.md` for testing procedures
3. Run `heroku logs --tail` to see what's happening
4. Review the error messages - they usually tell you what's wrong

---

**Pro Tip:** Bookmark your dashboard URL after deployment. You'll want quick access to check your Heroku usage!
