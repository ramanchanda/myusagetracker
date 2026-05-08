# Testing Checklist

Use this checklist to verify your Heroku Usage Tracker deployment is working correctly.

## Pre-Deployment Testing (Local)

### 1. Environment Setup
- [ ] `.env` file created with all required variables
- [ ] Heroku API key obtained (`heroku auth:token`)
- [ ] Gmail App Password generated (if using Gmail)
- [ ] Dependencies installed (`npm install` in root and client)

### 2. Run Local Tests
```bash
./test-local.sh
```

**Verify:**
- [ ] All environment variables are set
- [ ] Heroku API connection successful
- [ ] Server starts on http://localhost:3001
- [ ] Dashboard loads in browser

### 3. Test API Endpoints (Local)
```bash
# Health check
curl http://localhost:3001/api/health

# Usage summary
curl http://localhost:3001/api/usage/summary

# Test notification
curl -X POST http://localhost:3001/api/test-notification
```

**Expected Results:**
- [ ] Health check returns `{"status":"ok"}`
- [ ] Usage summary returns JSON with dynos, connect, addons
- [ ] Test notification email received at NOTIFICATION_EMAIL

---

## Deployment Testing

### Option A: Automated Deployment
```bash
./deploy-to-heroku.sh
```

Follow the prompts and the script will handle everything.

### Option B: Manual Deployment
Follow steps in `DEPLOYMENT_GUIDE.md`

---

## Post-Deployment Testing

### 1. Basic Connectivity
```bash
# Get your app URL
heroku open

# Or get it with:
heroku info -s | grep web_url
```

**Verify:**
- [ ] App loads without errors
- [ ] No "Application Error" page

### 2. Health Check
```bash
APP_URL=https://your-app-name.herokuapp.com
curl ${APP_URL}/api/health
```

**Expected:** `{"status":"ok"}`
- [ ] Health check passes

### 3. Dashboard Functionality

**Open your app URL and verify:**
- [ ] Dashboard loads
- [ ] Three usage cards displayed (Dynos, Connect, Add-ons)
- [ ] Bar charts render correctly
- [ ] Add-ons table shows data
- [ ] Color coding works (green/yellow/red)
- [ ] "Test Notification" button visible

### 4. API Endpoints
```bash
APP_URL=https://your-app-name.herokuapp.com

# Test each endpoint
curl ${APP_URL}/api/usage/dynos
curl ${APP_URL}/api/usage/connect
curl ${APP_URL}/api/usage/addons
curl ${APP_URL}/api/usage/summary
curl ${APP_URL}/api/apps
```

**Verify each returns:**
- [ ] Valid JSON response
- [ ] Correct data structure
- [ ] No error messages

### 5. Email Notifications

**Test notification:**
```bash
curl -X POST ${APP_URL}/api/test-notification
```

**Verify:**
- [ ] Request returns success message
- [ ] Email received at NOTIFICATION_EMAIL
- [ ] Email has correct subject: "Test Notification - Heroku Usage Tracker"
- [ ] Email body is formatted correctly

### 6. Configuration Verification
```bash
heroku config
```

**Verify all variables are set:**
- [ ] HEROKU_API_KEY
- [ ] HEROKU_ACCOUNT_EMAIL
- [ ] NOTIFICATION_EMAIL
- [ ] SMTP_HOST
- [ ] SMTP_PORT
- [ ] SMTP_USER
- [ ] SMTP_PASS
- [ ] DYNO_THRESHOLD
- [ ] CONNECT_THRESHOLD
- [ ] NODE_ENV=production

### 7. Logs Check
```bash
heroku logs --tail
```

**Look for:**
- [ ] No error messages
- [ ] "Server running on port" message
- [ ] Successful API calls
- [ ] Cron schedule initialized message

### 8. Scheduled Monitoring

**Wait for next scheduled check (default: every 6 hours at 12am, 6am, 12pm, 6pm)**

Or trigger manually by restarting:
```bash
heroku restart
```

**Check logs for:**
- [ ] Scheduled monitoring message
- [ ] Usage data fetched successfully
- [ ] Threshold checks performed
- [ ] Email sent if thresholds exceeded

---

## Functional Testing

### Usage Cards
**For each card (Dynos, Connect, Add-ons):**
- [ ] Displays correct title
- [ ] Shows current usage value
- [ ] Shows limit value
- [ ] Shows percentage
- [ ] Shows "remaining" value
- [ ] Progress bar matches percentage
- [ ] Color is correct based on percentage:
  - 0-74%: Green
  - 75-89%: Yellow
  - 90-100%: Red

### Charts
- [ ] Bar chart displays for Dynos
- [ ] Bar chart displays for Connect
- [ ] Chart colors match card status
- [ ] Chart labels are readable
- [ ] Chart scales appropriately

### Add-ons Table
- [ ] Table displays all add-ons
- [ ] Search functionality works
- [ ] Sorting by name works
- [ ] Sorting by app works
- [ ] Sorting by cost works
- [ ] Status badges display correctly
- [ ] Total cost calculates correctly

### Auto-Refresh
- [ ] Dashboard refreshes every 5 minutes
- [ ] Data updates without page reload
- [ ] Loading state displays during refresh
- [ ] No console errors during refresh

---

## Error Handling

### Test Error Scenarios

**1. Invalid API Key:**
```bash
heroku config:set HEROKU_API_KEY=invalid_key
heroku restart
```
- [ ] Dashboard shows error message
- [ ] Error is logged
- [ ] App doesn't crash

**2. Invalid SMTP Credentials:**
```bash
heroku config:set SMTP_PASS=wrong_password
curl -X POST ${APP_URL}/api/test-notification
```
- [ ] Error message returned
- [ ] Error logged to Heroku logs
- [ ] App continues to function

**3. Network Issues:**
- [ ] App handles API timeouts gracefully
- [ ] Dashboard shows error state
- [ ] Retry mechanism works

**Reset after testing:**
```bash
heroku config:set HEROKU_API_KEY=your_real_key
heroku config:set SMTP_PASS=your_real_password
heroku restart
```

---

## Performance Testing

### Response Times
```bash
# Measure API response time
time curl ${APP_URL}/api/usage/summary
```

**Expected:**
- [ ] Health check: < 500ms
- [ ] Usage summary: < 3 seconds
- [ ] Dashboard load: < 5 seconds

### Load Testing (Optional)
```bash
# Install Apache Bench
brew install httpd

# Test with 100 requests
ab -n 100 -c 10 ${APP_URL}/api/health
```

**Verify:**
- [ ] No failed requests
- [ ] Consistent response times
- [ ] No memory leaks

---

## Security Testing

### 1. Environment Variables
```bash
# Check that secrets aren't exposed
curl ${APP_URL}/api/health

# View page source in browser
```

**Verify:**
- [ ] API keys not in client-side code
- [ ] No sensitive data in responses
- [ ] No .env file accessible

### 2. Headers
```bash
curl -I ${APP_URL}
```

**Verify security headers present:**
- [ ] X-Content-Type-Options
- [ ] X-Frame-Options
- [ ] X-XSS-Protection
- [ ] Strict-Transport-Security

### 3. HTTPS
- [ ] App automatically redirects to HTTPS
- [ ] No mixed content warnings
- [ ] Valid SSL certificate

---

## Mobile Testing

**Test on mobile devices:**
- [ ] Dashboard responsive on iPhone
- [ ] Dashboard responsive on Android
- [ ] Cards stack vertically
- [ ] Charts render correctly
- [ ] Table scrolls horizontally
- [ ] Buttons are tappable
- [ ] Text is readable

---

## Browser Compatibility

**Test in multiple browsers:**
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari
- [ ] Mobile Safari
- [ ] Mobile Chrome

---

## Monitoring Setup

### 1. Set Up Alerts
```bash
# Add alerting for app errors (optional)
heroku addons:create papertrail:choklad
```

### 2. Configure Thresholds
```bash
# Adjust based on your needs
heroku config:set DYNO_THRESHOLD=85
heroku config:set CONNECT_THRESHOLD=75
```

### 3. Test Threshold Alerts

**Wait for usage to exceed threshold, or manually test by:**
- [ ] Setting threshold very low (e.g., 1%)
- [ ] Waiting for next scheduled check
- [ ] Verifying email alert received
- [ ] Reset threshold to normal value

---

## Production Readiness Checklist

### Pre-Launch
- [ ] All tests pass
- [ ] Email notifications work
- [ ] Dashboard loads quickly
- [ ] No console errors
- [ ] Logs are clean
- [ ] Config vars are correct
- [ ] Thresholds are appropriate
- [ ] Documentation is up to date

### Security
- [ ] Using app-specific passwords (not regular passwords)
- [ ] 2FA enabled on Heroku account
- [ ] API keys have minimal permissions
- [ ] HTTPS enforced
- [ ] No secrets in code

### Monitoring
- [ ] Health check working
- [ ] Logs are being reviewed
- [ ] Scheduled checks running
- [ ] Email delivery confirmed
- [ ] Error alerts configured (optional)

### Documentation
- [ ] Team knows how to access dashboard
- [ ] Team knows how to interpret alerts
- [ ] Emergency contacts documented
- [ ] Escalation procedure defined

---

## Troubleshooting Tests

### If Dashboard Shows "Failed to fetch usage data"
```bash
# Check API key
heroku config:get HEROKU_API_KEY

# Test API manually
curl -H "Accept: application/vnd.heroku+json; version=3" \
     -H "Authorization: Bearer $(heroku config:get HEROKU_API_KEY)" \
     https://api.heroku.com/account

# Refresh key if needed
heroku config:set HEROKU_API_KEY=$(heroku auth:token)
heroku restart
```

### If Emails Not Sending
```bash
# Verify SMTP settings
heroku config | grep SMTP

# Check logs for errors
heroku logs --tail | grep -i smtp

# Test with curl
curl -X POST ${APP_URL}/api/test-notification -v
```

### If App Won't Start
```bash
# Check logs
heroku logs --tail

# Verify Procfile
cat Procfile

# Check buildpack
heroku buildpacks

# Restart
heroku restart
```

---

## Maintenance Schedule

### Daily
- [ ] Check app is accessible
- [ ] Review error logs

### Weekly
- [ ] Verify email alerts working
- [ ] Review usage trends
- [ ] Check for Heroku platform updates

### Monthly
- [ ] Review costs
- [ ] Update dependencies if needed
- [ ] Rotate API keys
- [ ] Test disaster recovery

---

## Sign-Off

**Testing completed by:** ___________________  
**Date:** ___________________  
**All critical tests passed:** [ ] Yes [ ] No  
**Ready for production:** [ ] Yes [ ] No  

**Notes:**
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________

---

## Quick Reference

### Useful Commands
```bash
# View app
heroku open

# View logs
heroku logs --tail

# View config
heroku config

# Restart app
heroku restart

# Test health
curl https://your-app.herokuapp.com/api/health

# Test notification
curl -X POST https://your-app.herokuapp.com/api/test-notification
```

### Important URLs
- **Dashboard:** `https://your-app-name.herokuapp.com`
- **API Health:** `https://your-app-name.herokuapp.com/api/health`
- **Gmail App Passwords:** https://myaccount.google.com/apppasswords
- **Heroku Dashboard:** https://dashboard.heroku.com
- **Heroku Status:** https://status.heroku.com

---

**Happy Testing! 🧪**
