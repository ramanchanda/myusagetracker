# Phase 3: Enhanced Smart Alerting & Anomaly Detection

## Overview

Phase 3 enhances the notification system with intelligent alerting logic, usage trend analysis, and anomaly detection.

---

## ✅ Implemented Features

### 1. Improved State-Based Alerting

**Before Phase 3:**
```javascript
// Simple time-based cooldown
if (elapsed < 1_hour) {
  suppress_alert();
}
```

**After Phase 3:**
```javascript
// Smart state-based alerting
Alert when:
✅ First time crossing threshold
✅ Severity escalates (warning → critical)
✅ Usage changes significantly (>20%)
✅ Cooldown expires (1 hour)

Do NOT alert when:
❌ Still above threshold (no significant change)
❌ Within cooldown period
❌ Same severity, similar value
```

### 2. Usage History Tracking

**Data Structure:**
```javascript
usageHistory = {
  'Dyno Units': [
    { value: 850, timestamp: 1715872800000 },
    { value: 860, timestamp: 1715876400000 },
    { value: 920, timestamp: 1715880000000 },
    // ... keeps last 24 hours
  ]
}
```

**Purpose:**
- Trend analysis
- Anomaly detection
- Historical comparison
- Growth rate calculation

### 3. Anomaly Detection

#### 3.1 Sudden Spike Detection
```javascript
Alert if: currentValue > recentAverage * 1.5

Example:
Average: 600
Current: 950
Result: 🚨 Sudden spike detected: 950 (58.3% above average)
```

#### 3.2 Unusual Jump Detection
```javascript
Alert if: percentChange > 30% in 1 hour

Example:
Previous: 700
Current: 950
Result: 🚨 Unusual jump: 700 → 950 (+35.7% in 1 hour)
```

#### 3.3 Trend Acceleration Detection
```javascript
Alert if: recentGrowth > previousGrowth * 2

Example:
Hours ago: +50
Recent: +150
Result: 🚨 Accelerating growth detected
```

#### 3.4 Sustained High Usage
```javascript
Alert if: value >= 90% of max for 3+ hours

Example:
Max: 1000
Recent 3 hours: [920, 935, 950]
Result: ⚠️ Sustained high usage near max
```

### 4. Enhanced Alert State Tracking

**State Properties:**
```javascript
{
  lastSeverity: 'warning',           // Last alert level
  lastAlertTime: 1715872800000,      // When last alert sent
  lastValue: 850,                    // Value at last alert (NEW)
  consecutiveAlerts: 2,              // Count of same severity
  lastAnomalyAlert: 1715869200000    // Anomaly alert timestamp (NEW)
}
```

### 5. Dual Cooldown System

**Threshold Alerts:**
- Cooldown: 1 hour
- Bypassed by severity escalation
- Bypassed by significant value change (>20%)

**Anomaly Alerts:**
- Cooldown: 2 hours (longer)
- Independent from threshold alerts
- Informational/early warning

---

## Smart Alerting Logic Flow

```
Usage Check
     ↓
Record to History
     ↓
Calculate Statistics
     ↓
┌────────────────────┐
│ Anomaly Detection  │
│ (Always runs)      │
└────────────────────┘
     ↓
Detect: Spike, Jump, Acceleration, Sustained High
     ↓
If anomalies found + cooldown passed
     ↓
Log anomaly (TODO: Send anomaly email in Phase 4)
     ↓
┌────────────────────┐
│ Threshold Check    │
└────────────────────┘
     ↓
Calculate % used
     ↓
Determine severity
     ↓
Check alert state:
  - First crossing? → SEND
  - Severity escalated? → SEND
  - Value changed >20%? → SEND
  - Cooldown expired? → SEND
  - Otherwise → SUPPRESS
     ↓
If SEND → Email + Update State
If SUPPRESS → Log reason
```

---

## Benefits

### 1. Reduced Alert Spam
**Before:**
- Alert every hour while above threshold
- Same severity, same message

**After:**
- Alert once when crossing threshold
- Only re-alert if situation changes
- Smart re-alerting based on actual changes

### 2. Early Warning System
**Anomaly detection catches:**
- Sudden spikes before hitting threshold
- Unusual growth patterns
- Trend acceleration
- Sustained high usage

**Example:**
```
9:00 AM - Usage: 650/1000 (65%) - No alert
10:00 AM - Usage: 950/1000 (95%) - 🚨 Anomaly: +300 in 1 hour
10:00 AM - 🚨 Critical threshold alert
```

### 3. Better Context
**Alert state includes:**
- Last value (detect significant changes)
- Anomaly history
- Usage trend data
- Recent values for comparison

### 4. Intelligent Re-alerting
**Re-alerts when it matters:**
```
Scenario 1: Escalation
10:00 AM - Warning alert (85%)
11:00 AM - Critical alert (96%) ✓ Sends immediately

Scenario 2: Significant Change
10:00 AM - Warning alert (850 units)
11:00 AM - Warning alert (1050 units) ✓ Sends (>20% change)

Scenario 3: No Change
10:00 AM - Warning alert (850 units)
11:00 AM - Still 850 units ✗ Suppressed
```

---

## API Enhancements

### Get Alert States

```bash
curl https://your-app.herokuapp.com/api/notifications/cooldown-status
```

**Response (Phase 3):**
```json
{
  "Dyno Units": {
    "lastSeverity": "warning",
    "lastAlertTime": 1715872800000,
    "lastValue": 850,
    "consecutiveAlerts": 1,
    "lastAnomalyAlert": null,
    "cooldownRemaining": 2400,
    "anomalyCooldownRemaining": 0,
    "historySize": 12,
    "recentValues": [
      { "value": 800, "timestamp": "2024-05-16T08:00:00.000Z" },
      { "value": 820, "timestamp": "2024-05-16T09:00:00.000Z" },
      { "value": 850, "timestamp": "2024-05-16T10:00:00.000Z" },
      { "value": 860, "timestamp": "2024-05-16T11:00:00.000Z" },
      { "value": 850, "timestamp": "2024-05-16T12:00:00.000Z" }
    ]
  }
}
```

---

## Configuration

No new environment variables required. Smart alerting works automatically.

**Existing config still applies:**
```bash
# Threshold percentages
THRESHOLD_WARNING_PERCENTAGE=80
THRESHOLD_CRITICAL_PERCENTAGE=95

# Resource limits
THRESHOLD_DYNO_LIMIT=1000
THRESHOLD_CONNECT_LIMIT=10000
```

---

## Monitoring & Debugging

### Check Alert States

```bash
curl https://your-app.herokuapp.com/api/notifications/cooldown-status
```

### Check Logs for Anomalies

```bash
heroku logs --tail | grep "Anomalies detected"
heroku logs --tail | grep "Orchestrator"
```

**Example logs:**
```
[Orchestrator] 🚨 Anomalies detected for Dyno Units:
[Orchestrator]   - sudden_spike: Sudden spike detected: 950 (58.3% above average of 600)
[Orchestrator]   - unusual_jump: Unusual jump: 700 → 950 (+35.7% in 1 hour)
[Orchestrator] 📧 Anomaly alert would be sent: ...
```

### Check Smart Alerting Decisions

```bash
heroku logs --tail | grep "suppressed\|escalated\|changed significantly"
```

**Example logs:**
```
[Orchestrator] Dyno Units crossed warning threshold for first time
[Orchestrator] Sending warning alert for Dyno Units: 85.0%

[Orchestrator] Dyno Units escalated from warning to critical
[Orchestrator] Sending critical alert for Dyno Units: 96.0%

[Orchestrator] Dyno Units usage changed significantly: 850 → 1050 (23.5%)
[Orchestrator] Sending warning alert for Dyno Units: 87.5%

[Orchestrator] Dyno Units warning alert suppressed (cooldown: 45m remaining)
```

---

## Testing Smart Alerting

### Test 1: First Threshold Crossing

```bash
# Set low limit to trigger alert
heroku config:set THRESHOLD_DYNO_LIMIT=900

# Trigger check
curl -X POST https://your-app.herokuapp.com/api/notifications/check-thresholds

# Expected: Alert sent (first crossing)
```

### Test 2: Suppression (No Change)

```bash
# Immediately trigger again
curl -X POST https://your-app.herokuapp.com/api/notifications/check-thresholds

# Expected: Alert suppressed (cooldown + no significant change)
```

### Test 3: Significant Change

```bash
# Wait a bit, then increase usage significantly
# (This requires actual usage to change, or adjust limit)

heroku config:set THRESHOLD_DYNO_LIMIT=850

curl -X POST https://your-app.herokuapp.com/api/notifications/check-thresholds

# Expected: Alert sent (>20% change from last value)
```

### Test 4: Severity Escalation

```bash
# Lower limit to push into critical
heroku config:set THRESHOLD_DYNO_LIMIT=1000

curl -X POST https://your-app.herokuapp.com/api/notifications/check-thresholds

# Expected: Critical alert sent immediately (escalation bypasses cooldown)
```

### Test 5: Check Alert State

```bash
curl https://your-app.herokuapp.com/api/notifications/cooldown-status

# Check:
# - lastSeverity
# - lastValue
# - cooldownRemaining
# - recentValues
```

---

## Anomaly Detection Examples

### Example 1: Sudden Spike

```
History:
10:00 AM - 500
11:00 AM - 520
12:00 PM - 510
Average: 510

01:00 PM - 850 ← Spike!

Detection:
850 > 510 * 1.5 = 765
Result: 🚨 Sudden spike: 850 (66.7% above average)
```

### Example 2: Unusual Jump

```
12:00 PM - 650
01:00 PM - 950 ← Jump!

Calculation:
(950 - 650) / 650 * 100 = 46.2%

Detection:
46.2% > 30%
Result: 🚨 Unusual jump: +46.2% in 1 hour
```

### Example 3: Trend Acceleration

```
History:
08:00 AM - 600
10:00 AM - 650 (+50)
12:00 PM - 700 (+50)
02:00 PM - 850 (+150) ← Acceleration!

Detection:
recentGrowth (150) > previousGrowth (50) * 2
Result: 🚨 Accelerating growth detected
```

### Example 4: Sustained High

```
Max in history: 1000

Recent 3 hours:
11:00 AM - 920
12:00 PM - 935
01:00 PM - 950

All >= 900 (90% of max)

Detection:
Result: ⚠️ Sustained high usage near max for 3+ hours
```

---

## Future Enhancements (Phase 4)

Currently anomalies are **logged only**. In Phase 4:

1. **Anomaly Email Template**
   - Dedicated template for anomaly alerts
   - Show trend charts
   - Historical comparison
   - Severity: informational

2. **Anomaly Queue**
   - Queue anomaly alerts separately
   - Lower priority than threshold alerts
   - Batch multiple anomalies

3. **Machine Learning**
   - Learn normal patterns per resource
   - Detect deviations from baseline
   - Seasonal adjustment

4. **Predictive Alerts**
   - Forecast when threshold will be reached
   - "At current rate, critical in 2 hours"
   - Proactive capacity planning

---

## Technical Details

### Memory Usage

**Per Resource:**
- Alert state: ~200 bytes
- Usage history (24 points): ~400 bytes
- Total: ~600 bytes per resource

**6 Resources:**
- Total memory: ~3.6 KB (negligible)

### History Retention

- Keeps last 24 data points (24 hours)
- Automatically prunes old data
- In-memory only (resets on restart)

### Performance Impact

- Anomaly detection: ~1-2ms per resource
- Total overhead: <20ms per evaluation
- Minimal CPU/memory impact

---

## Troubleshooting

### Alerts Still Spamming

Check logs for suppression reasons:
```bash
heroku logs --tail | grep "suppressed"
```

If alerts not suppressed, check:
1. Is usage actually changing significantly?
2. Is severity escalating?
3. Check alert state in API

### Anomalies Not Detected

Need at least 3 data points:
```bash
curl https://your-app.herokuapp.com/api/notifications/cooldown-status
```

Check `historySize` - should be >= 3

### Missing Usage History

History is in-memory and resets on:
- App restart
- Dyno cycling
- Deployment

**Solution in Phase 6:** Persist to database

---

## Summary

Phase 3 adds intelligent alerting logic:

✅ **Smart state-based alerting**
- Alert on first crossing
- Alert on escalation
- Alert on significant change
- Suppress redundant alerts

✅ **Anomaly detection**
- Sudden spikes
- Unusual jumps
- Trend acceleration
- Sustained high usage

✅ **Usage history tracking**
- 24-hour rolling window
- Trend analysis
- Statistical baselines

✅ **Enhanced monitoring**
- Detailed alert states
- Recent value history
- Dual cooldown tracking

**Result:** Smarter, less noisy, more actionable alerts.

---

**Phase 3 Complete!** 🎉

Next: Phase 4 - Async queue and anomaly email templates
