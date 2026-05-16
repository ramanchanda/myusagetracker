# Phase 2 Deployment Guide

## Heroku Clock Process Implementation

---

## What Changed

### New Files
- ✅ `server/workers/scheduler.js` - Dedicated clock process
- ✅ `server/workers/emailWorker.js` - Placeholder for Phase 4
- ✅ `Procfile` - Updated with clock and worker processes

### Updated Files
- ✅ `server/index.js` - Removed cron jobs from web process

---

## Architecture Change

### Before Phase 2:
```
Web Dyno
├── HTTP Request Handling
├── Cron Jobs (hourly threshold checks)
└── All in one process
```

### After Phase 2:
```
Web Dyno
└── HTTP Request Handling ONLY

Clock Dyno
├── Hourly threshold evaluation
├── Daily summaries
├── Weekly summaries
└── Monthly summaries

Worker Dyno (Phase 4 placeholder)
└── Email queue processing (not yet implemented)
```

---

## Deployment Steps

### 1. Local Testing (Optional)

Test the scheduler locally before deploying:

```bash
# Terminal 1: Start web server
npm start

# Terminal 2: Start clock process
node server/workers/scheduler.js
```

You should see:
```
[Clock] Heroku Clock Process Starting...
[Clock] ✓ All scheduled jobs registered
[Clock] ✓ Clock process ready
[Clock] Scheduled jobs:
[Clock]   - Hourly threshold evaluation: 0 * * * *
[Clock]   - Daily summary: 0 9 * * *
[Clock]   - Weekly summary: 0 9 * * 1 (Monday)
[Clock]   - Monthly summary: 0 9 1 * * (1st of month)
[Clock]   - Health check: */15 * * * * (every 15 min)
```

### 2. Commit Changes

```bash
git add -A
git commit -m "PHASE 2: Add Heroku clock process for scheduled notifications"
git push origin main
```

### 3. Deploy to Heroku

```bash
git push heroku main
```

Wait for build to complete.

### 4. Scale Clock Process

By default, the clock process is **not running**. You need to scale it:

```bash
# Enable clock process (1 dyno)
heroku ps:scale clock=1

# Check dyno status
heroku ps
```

Expected output:
```
=== web (Basic): npm start (1)
web.1: up 2024/05/16 10:00:00 (~ 5m ago)

=== clock (Basic): node server/workers/scheduler.js (1)
clock.1: up 2024/05/16 10:05:00 (~ 1m ago)
```

### 5. Monitor Clock Process

```bash
# Watch clock process logs
heroku logs --tail --ps clock

# Or watch all logs with clock filter
heroku logs --tail | grep "\[Clock\]"
```

You should see:
```
[Clock] Heroku Clock Process Starting...
[Clock] ✓ Clock process ready
[Clock] ❤️  Health Check - 2024-05-16T10:15:00.000Z
```

---

## Scheduled Jobs

### Hourly Threshold Evaluation
- **Schedule:** `0 * * * *` (every hour at :00)
- **Function:** `notificationOrchestrator.runThresholdEvaluation()`
- **Checks:** Only runs if `config.triggerSchedule.realtimeAlerts.enabled = true`

### Daily Summary
- **Schedule:** `0 9 * * *` (daily at 9:00 AM)
- **Function:** `notificationOrchestrator.sendScheduledSummary('daily')`
- **Checks:** Only runs if `config.triggerSchedule.dailySummary.enabled = true`

### Weekly Summary
- **Schedule:** `0 9 * * 1` (Monday at 9:00 AM)
- **Function:** `notificationOrchestrator.sendScheduledSummary('weekly')`
- **Checks:** Only runs if `config.triggerSchedule.weeklySummary.enabled = true`

### Monthly Summary
- **Schedule:** `0 9 1 * *` (1st of month at 9:00 AM)
- **Function:** `notificationOrchestrator.sendScheduledSummary('monthly')`
- **Checks:** Only runs if `config.triggerSchedule.monthlySummary.enabled = true`

### Health Check
- **Schedule:** `*/15 * * * *` (every 15 minutes)
- **Purpose:** Verify clock process is running and log last execution times

---

## Configuration

### Enable/Disable Scheduled Jobs

```bash
# Enable hourly threshold checks
heroku config:set SCHEDULE_REALTIME_ENABLED=true

# Enable daily summaries
heroku config:set SCHEDULE_DAILY_ENABLED=true

# Enable weekly summaries
heroku config:set SCHEDULE_WEEKLY_ENABLED=true

# Enable monthly summaries
heroku config:set SCHEDULE_MONTHLY_ENABLED=true
```

### Customize Schedule Times

To change schedule times, you need to modify `server/workers/scheduler.js` and redeploy:

```javascript
// Example: Change daily summary from 9 AM to 6 AM
cron.schedule('0 6 * * *', async () => {
  // Daily summary code
});
```

### Set Timezone

```bash
# Set to your timezone (default is UTC)
heroku config:set TZ=America/New_York

# Restart clock process
heroku ps:restart clock
```

---

## Monitoring & Debugging

### Check Clock Process Status

```bash
# Is clock running?
heroku ps

# Should show:
# clock.1: up 2024/05/16 10:00:00
```

### View Clock Logs

```bash
# Live logs
heroku logs --tail --ps clock

# Last 100 lines
heroku logs -n 100 --ps clock

# Search for specific job
heroku logs --tail --ps clock | grep "Hourly"
heroku logs --tail --ps clock | grep "Daily"
```

### Check Last Execution Times

Health check logs show last execution:
```
[Clock] Last runs:
[Clock]   - Hourly: 2024-05-16T10:00:00.000Z
[Clock]   - Daily: 2024-05-16T09:00:00.000Z
[Clock]   - Weekly: 2024-05-13T09:00:00.000Z
[Clock]   - Monthly: 2024-05-01T09:00:00.000Z
```

### Verify Jobs Are Running

```bash
# Wait for next hour (or 15 min health check)
heroku logs --tail --ps clock

# You should see:
[Clock] ❤️  Health Check - ...
[Clock] Status: Running
```

---

## Troubleshooting

### Clock Process Not Starting

**Check build logs:**
```bash
heroku logs --tail | grep "clock"
```

**Common issues:**
- Syntax error in scheduler.js
- Missing node-cron dependency
- Wrong path in Procfile

**Fix:**
```bash
# Test locally first
node server/workers/scheduler.js

# If works locally, check Heroku logs for errors
heroku logs -n 500 --ps clock
```

### Jobs Not Running

**Check if clock is scaled:**
```bash
heroku ps
```

**Should show:**
```
clock.1: up ...
```

**If not:**
```bash
heroku ps:scale clock=1
```

**Check if jobs are enabled:**
```bash
curl https://your-app.herokuapp.com/api/notifications/config
```

Look for:
```json
{
  "triggerSchedule": {
    "realtimeAlerts": {
      "enabled": true  // Should be true for hourly checks
    },
    "dailySummary": {
      "enabled": true  // Should be true for daily summaries
    }
  }
}
```

### Clock Process Crashing

**View crash logs:**
```bash
heroku logs -n 500 --ps clock | grep "error\|Error\|crash"
```

**Common causes:**
- Database connection issues
- API rate limits
- Email service errors
- Configuration errors

**Clock process is designed to keep running even if jobs fail.**

---

## Cost Implications

### Dyno Usage

**Before Phase 2:**
- 1 web dyno

**After Phase 2:**
- 1 web dyno
- 1 clock dyno (NEW)
- 1 worker dyno (placeholder, can be set to 0 for now)

### Cost Estimate

- **Free Tier:** 1000 free dyno hours/month (shared across all dynos)
- **Hobby Tier:** $7/dyno/month
- **Basic Tier:** $7/dyno/month (for clock, $15 for web with autoscaling)

**Recommendation for Phase 2:**
```bash
# Set clock to 1, worker to 0 (not needed until Phase 4)
heroku ps:scale web=1 clock=1 worker=0
```

**Cost:**
- Free tier: Uses ~720 dyno hours/month for clock (leaves 280 for web)
- Hobby tier: +$7/month for clock dyno

---

## Scaling Recommendations

### Development
```bash
heroku ps:scale web=1 clock=1 worker=0
```

### Production (Small)
```bash
heroku ps:scale web=1 clock=1 worker=0
```

### Production (Medium)
```bash
heroku ps:scale web=2 clock=1 worker=0
```

### Production (Large - after Phase 4)
```bash
heroku ps:scale web=2 clock=1 worker=2
```

---

## Verification Checklist

After deployment, verify:

- [ ] `heroku ps` shows clock.1 running
- [ ] `heroku logs --tail --ps clock` shows startup messages
- [ ] Health check logs appear every 15 minutes
- [ ] Wait for next hour and verify threshold check runs
- [ ] Check `heroku logs --ps clock | grep "Hourly"`
- [ ] Verify web dyno no longer has cron job logs
- [ ] Test manual threshold check still works: `curl -X POST https://your-app/api/notifications/check-thresholds`

---

## Rollback Plan

If issues occur, you can quickly disable the clock process:

```bash
# Stop clock process
heroku ps:scale clock=0

# Temporarily re-enable cron in web process (requires code change)
# 1. Uncomment cron jobs in server/index.js
# 2. git commit and push
# 3. Or restart from Phase 1 commit
```

---

## Next Steps

Phase 2 is complete when:
- ✅ Clock process is running on Heroku
- ✅ Scheduled jobs execute at correct times
- ✅ Web dyno no longer runs cron jobs
- ✅ Logs show clear separation of concerns

**Then proceed to Phase 3:** Add notification queue for async email processing

---

## Quick Commands Reference

```bash
# Deploy
git push heroku main

# Scale clock
heroku ps:scale clock=1

# View logs
heroku logs --tail --ps clock

# Check status
heroku ps

# Enable jobs
heroku config:set SCHEDULE_REALTIME_ENABLED=true
heroku config:set SCHEDULE_DAILY_ENABLED=true

# Restart clock
heroku ps:restart clock

# Stop clock
heroku ps:scale clock=0
```

---

**Phase 2 Complete!** 🎉

Clock process now handles all scheduled notifications independently from web requests.
