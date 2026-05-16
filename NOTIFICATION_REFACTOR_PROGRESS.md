# 🔄 Notification System Refactor Progress

## Overview

Incremental refactoring of the notification system from event-driven (dashboard refresh) to scheduled orchestration architecture using Heroku clock and worker processes.

---

## ✅ PHASE 1: DECOUPLE FROM DASHBOARD (COMPLETE)

### Objective
Remove notification triggering from dashboard refresh events and centralize through orchestrator.

### Changes Made

#### 1. Created Centralized Orchestrator
**File:** `server/services/notificationOrchestrator.js`

**Features:**
- Single entry point for ALL notification operations
- Smart state-based alerting (not just time-based cooldown)
- Tracks alert state per resource:
  - `lastSeverity` - Previous alert level
  - `lastAlertTime` - When last alert was sent
  - `consecutiveAlerts` - Count of repeated alerts
- Alert logic:
  - ✅ Alert on first threshold crossing
  - ✅ Alert when severity escalates (warning → critical)
  - ✅ Alert after cooldown expires (1 hour)
  - ❌ Suppress redundant alerts while above threshold
  - ✅ Auto-clear state when usage returns to normal

**Key Functions:**
```javascript
runThresholdEvaluation()    // Main scheduled check
sendScheduledSummary()       // Daily/weekly/monthly summaries
sendTestNotification()       // Manual test
getAlertStates()            // Monitor alert states
resetAlertState()           // Reset for testing
```

#### 2. Decoupled Dashboard Endpoints
**File:** `server/index.js`

**Before:**
```javascript
app.get('/api/enterprise/structure', async (req, res) => {
  const structure = await enterpriseUsageService.getEnterpriseStructure();
  autoThresholdMonitor.autoCheckThresholds(structure); // ❌ Triggers notifications
  res.json(structure);
});
```

**After:**
```javascript
app.get('/api/enterprise/structure', async (req, res) => {
  const structure = await enterpriseUsageService.getEnterpriseStructure();
  // Dashboard now ONLY fetches and returns data
  res.json(structure);
});
```

**Endpoints Updated:**
- `/api/enterprise/structure` - No longer triggers notifications
- `/api/enterprise/all-accounts` - No longer triggers notifications

#### 3. Routed Manual Endpoints Through Orchestrator

All manual notification endpoints now use orchestrator:

| Endpoint | Old | New |
|----------|-----|-----|
| `POST /api/notifications/check-thresholds` | `thresholdMonitor.monitorEnterpriseThresholds()` | `orchestrator.runThresholdEvaluation()` |
| `POST /api/notifications/send-summary` | `thresholdMonitor.sendScheduledSummary()` | `orchestrator.sendScheduledSummary()` |
| `POST /api/notifications/send-test` | `enhancedNotificationService.sendTestNotification()` | `orchestrator.sendTestNotification()` |
| `GET /api/notifications/cooldown-status` | `autoThresholdMonitor.getCooldownStatus()` | `orchestrator.getAlertStates()` |
| `POST /api/notifications/reset-cooldown` | `autoThresholdMonitor.resetCooldown()` | `orchestrator.resetAlertState()` |

#### 4. Updated Scheduled Jobs

**Hourly Cron:**
```javascript
// Before
cron.schedule('0 * * * *', async () => {
  await thresholdMonitor.monitorEnterpriseThresholds();
});

// After
cron.schedule('0 * * * *', async () => {
  await notificationOrchestrator.runThresholdEvaluation();
});
```

### Benefits Achieved

✅ **Dashboard Performance** - No email sending on UI requests
✅ **Separation of Concerns** - Data fetching vs notification logic
✅ **Better Alert Logic** - State-based (not just time-based)
✅ **Centralized Control** - Single point for all notifications
✅ **Easier Testing** - Can test notifications independently
✅ **Foundation for Queueing** - Ready to add async queue in Phase 3

### Testing

```bash
# Test manual threshold check (via orchestrator)
curl -X POST http://localhost:3001/api/notifications/check-thresholds

# Check alert states
curl http://localhost:3001/api/notifications/cooldown-status

# Reset alert state for testing
curl -X POST http://localhost:3001/api/notifications/reset-cooldown \
  -H "Content-Type: application/json" \
  -d '{"resourceType": "Dyno Units"}'

# Dashboard refresh (no longer triggers notifications)
curl http://localhost:3001/api/enterprise/structure
```

---

## ✅ PHASE 2: ADD HEROKU CLOCK PROCESS (COMPLETE)

### Objective
Create dedicated clock process for scheduled notifications, separate from web dyno.

### Tasks

#### 1. Create Clock Worker Script
**File:** `server/workers/scheduler.js`

```javascript
const cron = require('node-cron');
const notificationOrchestrator = require('../services/notificationOrchestrator');

// Hourly threshold evaluation
cron.schedule('0 * * * *', async () => {
  await notificationOrchestrator.runThresholdEvaluation();
});

// Daily summary at 9 AM
cron.schedule('0 9 * * *', async () => {
  await notificationOrchestrator.sendScheduledSummary('daily');
});

// Weekly summary (Monday 9 AM)
cron.schedule('0 9 * * 1', async () => {
  await notificationOrchestrator.sendScheduledSummary('weekly');
});

// Monthly summary (1st of month, 9 AM)
cron.schedule('0 9 1 * *', async () => {
  await notificationOrchestrator.sendScheduledSummary('monthly');
});

console.log('[Clock] Scheduler started');
```

#### 2. Update Procfile
**File:** `Procfile`

```
web: node server/index.js
clock: node server/workers/scheduler.js
```

#### 3. Remove Cron from Web Process
Remove cron jobs from `server/index.js` since clock process will handle them.

#### 4. Deploy and Scale

```bash
git push heroku main
heroku ps:scale clock=1
heroku logs --tail --ps clock
```

### Benefits
- ✅ Web dyno focuses only on HTTP requests
- ✅ Clock dyno dedicated to scheduling
- ✅ Better resource isolation
- ✅ Easier to monitor scheduled jobs
- ✅ Can scale independently

---

## 📋 PHASE 3: ADD LIGHTWEIGHT QUEUE (FUTURE)

### Objective
Make email sending fully async with in-memory queue.

### Tasks

1. Create `server/services/notificationQueue.js`
2. Queue structure:
   ```javascript
   {
     id: 'uuid',
     type: 'threshold-alert',
     payload: {...},
     attempts: 0,
     maxAttempts: 3,
     createdAt: timestamp
   }
   ```
3. Deduplication logic
4. Retry logic
5. Update orchestrator to queue events instead of sending directly

### Benefits
- ✅ API requests return immediately
- ✅ Email failures don't affect API
- ✅ Automatic retries
- ✅ Deduplication
- ✅ Better observability

---

## 📋 PHASE 4: ADD EMAIL WORKER (FUTURE)

### Objective
Process notification queue in background worker.

### Tasks

1. Create `server/workers/emailWorker.js`
2. Continuously poll queue
3. Process events:
   - Build email template
   - Send via Mailgun
   - Update status
   - Retry on failure
4. Update Procfile:
   ```
   web: node server/index.js
   clock: node server/workers/scheduler.js
   worker: node server/workers/emailWorker.js
   ```

### Benefits
- ✅ Fully async email delivery
- ✅ Can scale workers independently
- ✅ Better error handling
- ✅ Improved reliability

---

## 📋 PHASE 5: SMART ALERTING (FUTURE)

Already partially implemented in Phase 1! Need to enhance:

1. ✅ State tracking per resource (done)
2. ✅ Alert on threshold crossing (done)
3. ✅ Alert on severity escalation (done)
4. ⏳ Alert state persistence (in-memory only)
5. ⏳ Historical trend awareness
6. ⏳ Anomaly detection

---

## 📋 PHASE 6: ADD PERSISTENCE (FUTURE)

### Objective
Store notification history in database or file.

### Options
- JSON file (simple)
- SQLite (embedded DB)
- PostgreSQL (if already available)
- Heroku Postgres addon

### Schema
```sql
CREATE TABLE notification_history (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(50),
  resource_type VARCHAR(50),
  severity VARCHAR(20),
  recipients TEXT[],
  provider VARCHAR(20),
  status VARCHAR(20),
  created_at TIMESTAMP,
  sent_at TIMESTAMP,
  error_message TEXT
);
```

---

## 📋 PHASE 7: PDF REPORTING (FUTURE)

### Tasks
1. Add PDF generation to scheduled summaries
2. Attach PDF to email via queue
3. Support daily/weekly/monthly PDF reports
4. Optional: Store PDFs in S3 or similar

---

## 🎯 Current Status

**COMPLETED:**
- ✅ Phase 1: Decouple from Dashboard

**IN PROGRESS:**
- 🔄 Phase 2: Add Heroku Clock Process (next)

**PENDING:**
- ⏳ Phase 3: Add Lightweight Queue
- ⏳ Phase 4: Add Email Worker
- ⏳ Phase 5: Enhanced Smart Alerting
- ⏳ Phase 6: Add Persistence
- ⏳ Phase 7: PDF Reporting

---

## 🚀 How to Continue

### To Implement Phase 2:

```bash
# 1. Create scheduler worker
vim server/workers/scheduler.js

# 2. Update Procfile
vim Procfile

# 3. Remove cron from server/index.js
vim server/index.js

# 4. Test locally
node server/workers/scheduler.js

# 5. Deploy to Heroku
git add -A
git commit -m "PHASE 2: Add Heroku clock process"
git push heroku main
heroku ps:scale clock=1

# 6. Monitor
heroku logs --tail --ps clock
```

### To Test Phase 1:

```bash
# 1. Start server
npm start

# 2. Dashboard refresh (should NOT trigger notifications)
curl http://localhost:3001/api/enterprise/structure

# 3. Manual threshold check (should trigger via orchestrator)
curl -X POST http://localhost:3001/api/notifications/check-thresholds

# 4. Check alert states
curl http://localhost:3001/api/notifications/cooldown-status

# 5. Check logs for "[Orchestrator]" messages
```

---

## 📊 Architecture Comparison

### Before (Event-Driven)
```
Dashboard Refresh
      ↓
Fetch Usage Data
      ↓
Auto Threshold Check
      ↓
Direct Email Send
      ↓
Response (slow)
```

### After Phase 1 (Orchestrated)
```
Dashboard Refresh          Scheduled Job (hourly)
      ↓                           ↓
Fetch Usage Data          Orchestrator.runThresholdEvaluation()
      ↓                           ↓
Response (fast)           Fetch Usage Data
                                  ↓
                          Smart Alert Logic
                                  ↓
                          Direct Email Send
```

### After Phase 4 (Fully Async)
```
Dashboard Refresh          Clock Process (scheduled)
      ↓                           ↓
Fetch Usage Data          Orchestrator.runThresholdEvaluation()
      ↓                           ↓
Response (fast)           Fetch Usage Data
                                  ↓
                          Smart Alert Logic
                                  ↓
                          Queue Notification Event
                                  ↓
                          Worker Process
                                  ↓
                          Email Service → Mailgun
```

---

## 🔍 Monitoring

### Check Orchestrator Status

```bash
# View alert states
curl http://localhost:3001/api/notifications/cooldown-status

# Example response:
{
  "Dyno Units": {
    "lastSeverity": "warning",
    "lastAlertTime": 1715872800000,
    "consecutiveAlerts": 1,
    "cooldownRemaining": 2400
  }
}
```

### Check Logs

```bash
# Local
grep "Orchestrator" logs/app.log

# Heroku
heroku logs --tail | grep Orchestrator

# Example logs:
[Orchestrator] Starting threshold evaluation...
[Orchestrator] Dyno Units crossed warning threshold for first time
[Orchestrator] Sending warning alert for Dyno Units: 85.0%
[Orchestrator] Evaluation complete in 1234ms: 1 alert(s) sent, 0 suppressed
```

---

## 📝 Notes

- Phase 1 maintains backward compatibility
- All existing endpoints still work
- Dashboard functionality unchanged
- Smart alerting automatically prevents spam
- Ready for queueing in Phase 3
- No database required yet (in-memory state)

---

**Last Updated:** 2026-05-16
**Current Phase:** Phase 1 Complete
**Next Step:** Implement Phase 2 - Heroku Clock Process
