# 🧪 Notification System Testing Guide

## Step-by-Step Testing Instructions

---

## 🔍 Step 1: Check Configuration

### **Via Heroku CLI:**
```bash
# Check all notification-related config vars
heroku config | grep NOTIFICATION
heroku config | grep MAILGUN
heroku config | grep SMTP
heroku config | grep THRESHOLD
```

### **Expected Output:**
```
NOTIFICATION_EMAIL_ENABLED: true
NOTIFICATION_RECIPIENTS: your@email.com
NOTIFICATION_FROM_NAME: Heroku Usage Monitor
MAILGUN_API_KEY: key-xxxxx
MAILGUN_DOMAIN: mg.yourdomain.com
```

### **Via API:**
```bash
curl http://localhost:3001/api/notifications/config
# OR on Heroku:
curl https://your-app.herokuapp.com/api/notifications/config
```

---

## 📧 Step 2: Test Email Configuration

### **Method 1: Using UI (Easiest)**

1. **Open your app:**
   ```
   http://localhost:3001  (local)
   https://your-app.herokuapp.com  (Heroku)
   ```

2. **Click:** `📧 Notification Settings` button (top right)

3. **Go to:** `🧪 Testing` tab

4. **Click:** `Send Test Email` button

5. **Check:** Email inbox for all recipients

**Expected Email:**
```
Subject: ✅ Heroku Usage Monitor - Test Notification
Body: "This is a test notification..."
```

### **Method 2: Using API (curl)**

```bash
# Local
curl -X POST http://localhost:3001/api/notifications/send-test

# Heroku
curl -X POST https://your-app.herokuapp.com/api/notifications/send-test
```

**Expected Response:**
```json
{
  "sent": true,
  "recipients": ["your@email.com"],
  "method": "mailgun-api"
}
```

**If Failed:**
```json
{
  "sent": false,
  "reason": "Email notifications disabled"
}
```

---

## ⚠️ Step 3: Test Threshold Alerts

### **Method 1: Manual Trigger (via UI)**

1. Open: `📧 Notification Settings`
2. Go to: `🧪 Testing` tab
3. Click: `Check Thresholds Now` button
4. Watch for alert emails

### **Method 2: Manual API Call**

```bash
curl -X POST http://localhost:3001/api/notifications/check-thresholds
```

**Response if thresholds exceeded:**
```json
{
  "checked": true,
  "alertsTriggered": 2,
  "alerts": [
    {
      "resourceType": "Dyno Units",
      "currentValue": 950,
      "limit": 1000,
      "percentUsed": "95.0",
      "severity": "critical",
      "alerted": true
    }
  ]
}
```

### **Method 3: Simulate High Usage (Best for Testing)**

**Set Low Threshold Limits:**
```bash
# Set very low limits so current usage exceeds them
heroku config:set THRESHOLD_DYNO_LIMIT=10
heroku config:set THRESHOLD_CONNECT_LIMIT=100
heroku config:set THRESHOLD_DATA_ADDONS_LIMIT=5
```

**Trigger Check:**
```bash
# Wait 30 seconds for config to reload, then:
curl -X POST https://your-app.herokuapp.com/api/notifications/check-thresholds
```

**Check Email:** You should receive critical alerts!

**Reset After Testing:**
```bash
heroku config:set THRESHOLD_DYNO_LIMIT=1000
heroku config:set THRESHOLD_CONNECT_LIMIT=10000
heroku config:set THRESHOLD_DATA_ADDONS_LIMIT=500
```

---

## 🔄 Step 4: Test Automatic Monitoring

### **Test Event-Driven Alerts:**

**The automatic system triggers when you access usage data.**

1. **Open Dashboard:**
   ```
   https://your-app.herokuapp.com
   ```

2. **Click Refresh Button** (or reload page)

3. **Watch Server Logs:**
   ```bash
   heroku logs --tail | grep "Auto Monitor"
   ```

4. **Expected Output:**
   ```
   [Auto Monitor] Threshold exceeded for Dyno Units: 85.0% (warning)
   [Auto Monitor] ✓ 1 alert(s) triggered
   ```

5. **Check Email Inbox**

### **Test Different Alert Levels:**

**80% Warning Alert:**
```bash
# Set limit so current usage = 82%
heroku config:set THRESHOLD_DYNO_LIMIT=1200
# If you have ~1000 dyno units, this triggers WARNING
```

**95% Critical Alert:**
```bash
# Set limit so current usage = 96%
heroku config:set THRESHOLD_DYNO_LIMIT=1000
# If you have ~960 dyno units, this triggers CRITICAL
```

**100% Limit Reached:**
```bash
# Set limit equal to or below current usage
heroku config:set THRESHOLD_DYNO_LIMIT=900
# If you have 950 units, this triggers CRITICAL (100%+)
```

---

## 🔍 Step 5: Test Cooldown System

**Cooldown prevents spam - alerts sent max once per hour per resource/severity.**

### **Test Cooldown:**

1. **Trigger alert (first time):**
   ```bash
   curl -X POST https://your-app.herokuapp.com/api/notifications/check-thresholds
   ```
   ✅ Email sent

2. **Trigger again immediately:**
   ```bash
   curl -X POST https://your-app.herokuapp.com/api/notifications/check-thresholds
   ```
   ❌ No email (cooldown active)

3. **Check cooldown status:**
   ```bash
   curl https://your-app.herokuapp.com/api/notifications/cooldown-status
   ```
   
   **Response:**
   ```json
   {
     "Dyno Units_critical": {
       "lastAlert": "2026-05-15T14:30:00.000Z",
       "cooldownRemaining": 58,
       "canAlert": false
     }
   }
   ```

4. **Reset cooldown (for testing):**
   ```bash
   curl -X POST https://your-app.herokuapp.com/api/notifications/reset-cooldown \
     -H "Content-Type: application/json" \
     -d '{"resourceType": "Dyno Units", "severity": "critical"}'
   ```

5. **Try again:**
   ```bash
   curl -X POST https://your-app.herokuapp.com/api/notifications/check-thresholds
   ```
   ✅ Email sent (cooldown reset)

---

## 📊 Step 6: Test Usage Summaries

### **Manual Summary:**

```bash
curl -X POST https://your-app.herokuapp.com/api/notifications/send-summary \
  -H "Content-Type: application/json" \
  -d '{"period": "daily"}'
```

**Period options:**
- `"daily"` → Daily summary
- `"weekly"` → Weekly summary  
- `"monthly"` → Monthly summary

**Expected Email:**
```
Subject: 📊 Heroku Daily Usage Summary
Body: Resource usage cards with current values
```

---

## 🐛 Step 7: Debugging

### **Check Logs:**

**Heroku:**
```bash
# Watch all logs
heroku logs --tail

# Filter for notifications
heroku logs --tail | grep -i "notification\|email\|alert"

# Filter for auto-monitor
heroku logs --tail | grep "Auto Monitor"

# Filter for threshold
heroku logs --tail | grep -i threshold
```

**Local:**
```bash
# In terminal running npm start
# Look for console output like:
[Config] Reading from environment variables
[Auto Monitor] Threshold exceeded for...
Email sent via Mailgun API...
```

### **Check Alert History:**

**Via UI:**
1. Go to: `📧 Notification Settings`
2. Click: `📜 Alert History` tab
3. View: Last 50 alerts

**Via API:**
```bash
curl https://your-app.herokuapp.com/api/notifications/history
```

**Response:**
```json
[
  {
    "timestamp": "2026-05-15T14:30:00.000Z",
    "resourceType": "Dyno Units",
    "severity": "critical",
    "message": "Dyno Units usage at 95.0% (950/1000)",
    "alerted": true
  }
]
```

---

## ✅ Complete Test Checklist

### **Email Configuration Tests:**
- [ ] Test email sends successfully
- [ ] All recipients receive email
- [ ] Email has correct subject/body
- [ ] Email has correct sender name
- [ ] No email when disabled

### **Threshold Alert Tests:**
- [ ] Warning alert (80%) triggers
- [ ] Critical alert (95%) triggers
- [ ] 100% limit alert triggers
- [ ] Alert email has correct severity color
- [ ] Alert email shows correct percentages
- [ ] Alert logged to history

### **Automatic Monitoring Tests:**
- [ ] Alert triggers on dashboard load
- [ ] Alert triggers on refresh
- [ ] Alert triggers on API call
- [ ] Logs show "Auto Monitor" messages
- [ ] No alerts when below threshold

### **Cooldown Tests:**
- [ ] Second alert blocked (within 1 hour)
- [ ] Cooldown status shows remaining time
- [ ] Reset cooldown works
- [ ] Alert sent after cooldown expires

### **Configuration Tests:**
- [ ] Config API returns correct values
- [ ] Environment variables loaded
- [ ] Thresholds update correctly
- [ ] Recipients update correctly

---

## 🎯 Quick Test Script

**Save as `test-notifications.sh`:**

```bash
#!/bin/bash

APP_URL="${1:-http://localhost:3001}"

echo "🧪 Testing Notification System"
echo "================================"
echo "App URL: $APP_URL"
echo ""

echo "1️⃣ Testing Configuration..."
curl -s "$APP_URL/api/notifications/config" | grep -q "emailConfig" && echo "✅ Config OK" || echo "❌ Config Failed"

echo ""
echo "2️⃣ Sending Test Email..."
curl -s -X POST "$APP_URL/api/notifications/send-test" | grep -q "sent" && echo "✅ Test Email Sent" || echo "❌ Test Email Failed"

echo ""
echo "3️⃣ Checking Thresholds..."
curl -s -X POST "$APP_URL/api/notifications/check-thresholds" | grep -q "checked" && echo "✅ Threshold Check OK" || echo "❌ Threshold Check Failed"

echo ""
echo "4️⃣ Checking Cooldown Status..."
curl -s "$APP_URL/api/notifications/cooldown-status" && echo "✅ Cooldown API OK" || echo "❌ Cooldown API Failed"

echo ""
echo "5️⃣ Getting Alert History..."
curl -s "$APP_URL/api/notifications/history" | grep -q "\[" && echo "✅ History OK" || echo "❌ History Failed"

echo ""
echo "================================"
echo "✅ Testing Complete!"
echo ""
echo "Check your email inbox for:"
echo "  - Test notification"
echo "  - Threshold alerts (if any triggered)"
```

**Run it:**
```bash
chmod +x test-notifications.sh

# Local
./test-notifications.sh http://localhost:3001

# Heroku
./test-notifications.sh https://your-app.herokuapp.com
```

---

## 📝 Expected Test Results

### **Successful Test:**
```
✅ Test email received in inbox
✅ Alert emails received (if thresholds exceeded)
✅ Logs show notification activity
✅ Alert history populated
✅ Cooldown prevents spam
✅ Config values correct
```

### **Common Issues & Fixes:**

| Issue | Cause | Fix |
|-------|-------|-----|
| No test email | Email disabled | `heroku config:set NOTIFICATION_EMAIL_ENABLED=true` |
| No recipients | Not configured | `heroku config:set NOTIFICATION_RECIPIENTS="your@email.com"` |
| SMTP error | Wrong credentials | Check SMTP settings |
| No threshold alerts | Below limits | Lower threshold limits for testing |
| Alerts not sending | Cooldown active | Wait 1 hour or reset cooldown |
| 404 errors | API not running | Check `heroku logs` |

---

## 🔄 Reset Everything (Clean Slate)

```bash
# Clear alert history
curl -X DELETE https://your-app.herokuapp.com/api/notifications/history

# Reset all cooldowns (requires multiple calls for each resource)
curl -X POST https://your-app.herokuapp.com/api/notifications/reset-cooldown \
  -H "Content-Type: application/json" \
  -d '{"resourceType": "Dyno Units", "severity": "warning"}'

# Restart app
heroku restart
```

---

## 📞 Need Help?

**Check logs first:**
```bash
heroku logs --tail
```

**Common log messages:**

✅ **Success:**
```
[Config] Reading from environment variables
Email sent via Mailgun API: Test Notification
[Auto Monitor] ✓ 1 alert(s) triggered
```

❌ **Errors:**
```
Email notifications are disabled
No recipients configured
Error sending email via SMTP: authentication failed
```

---

**Ready to test?** Start with Step 1 and work your way through! 🚀
