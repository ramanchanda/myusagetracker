# Simplified Threshold Configuration - Version v120

## ✅ What Changed

**SIMPLIFIED**: Global WARNING and CRITICAL percentages now apply to ALL resources!

### Before (24 Config Vars)
```bash
# Each resource had its own WARNING and CRITICAL percentages
THRESHOLD_DYNO_WARNING=80
THRESHOLD_DYNO_CRITICAL=95
THRESHOLD_CONNECT_WARNING=80
THRESHOLD_CONNECT_CRITICAL=95
THRESHOLD_DATA_ADDONS_WARNING=80
THRESHOLD_DATA_ADDONS_CRITICAL=95
THRESHOLD_GENERAL_ADDONS_WARNING=80
THRESHOLD_GENERAL_ADDONS_CRITICAL=95
THRESHOLD_PRIVATE_SPACES_WARNING=80
THRESHOLD_PRIVATE_SPACES_CRITICAL=100
THRESHOLD_SHIELD_SPACES_WARNING=80
THRESHOLD_SHIELD_SPACES_CRITICAL=100
```

### After (2 Config Vars) ✨
```bash
# One global percentage for all resources
THRESHOLD_WARNING_PERCENTAGE=80
THRESHOLD_CRITICAL_PERCENTAGE=95
```

**Result**: Reduced from **24 percentage config vars** to just **2**!

## 📋 Complete Config Vars List

### Email Configuration (4 vars)
```bash
NOTIFICATION_EMAIL_ENABLED=true
NOTIFICATION_RECIPIENTS=admin@example.com,team@example.com
NOTIFICATION_FROM_NAME=Heroku Usage Monitor
NOTIFICATION_FROM_EMAIL=noreply@example.com
```

### Global Thresholds (2 vars) ⭐ NEW
```bash
THRESHOLD_WARNING_PERCENTAGE=80
THRESHOLD_CRITICAL_PERCENTAGE=95
```

### Resource Limits (6 vars)
```bash
THRESHOLD_DYNO_LIMIT=1000
THRESHOLD_CONNECT_LIMIT=10000
THRESHOLD_DATA_ADDONS_LIMIT=500
THRESHOLD_GENERAL_ADDONS_LIMIT=300
THRESHOLD_PRIVATE_SPACES_LIMIT=5
THRESHOLD_SHIELD_SPACES_LIMIT=3
```

### Resource Enabled Flags (6 vars)
```bash
THRESHOLD_DYNO_ENABLED=true
THRESHOLD_CONNECT_ENABLED=true
THRESHOLD_DATA_ADDONS_ENABLED=true
THRESHOLD_GENERAL_ADDONS_ENABLED=true
THRESHOLD_PRIVATE_SPACES_ENABLED=true
THRESHOLD_SHIELD_SPACES_ENABLED=true
```

### Schedule Configuration (8 vars)
```bash
SCHEDULE_REALTIME_ENABLED=true
SCHEDULE_REALTIME_INTERVAL=60
SCHEDULE_DAILY_ENABLED=false
SCHEDULE_DAILY_TIME=09:00
SCHEDULE_WEEKLY_ENABLED=false
SCHEDULE_WEEKLY_DAY=Monday
SCHEDULE_MONTHLY_ENABLED=false
SCHEDULE_MONTHLY_DAY=1
```

**Total Config Vars**: **26** (down from 44!)

## 🎯 How It Works

### Global Percentages Apply to All Resources

When you set:
```bash
THRESHOLD_WARNING_PERCENTAGE=80
THRESHOLD_CRITICAL_PERCENTAGE=95
```

**All resources inherit these values:**
- Dyno Units: Warning at 80%, Critical at 95%
- Connect Rows: Warning at 80%, Critical at 95%
- Data Add-ons: Warning at 80%, Critical at 95%
- General Add-ons: Warning at 80%, Critical at 95%
- Private Spaces: Warning at 80%, Critical at 95%
- Shield Spaces: Warning at 80%, Critical at 95%

### Alert Calculation

For each resource:
```
Warning Threshold = Limit × (WARNING_PERCENTAGE / 100)
Critical Threshold = Limit × (CRITICAL_PERCENTAGE / 100)
```

**Example with Dyno Units:**
```bash
THRESHOLD_DYNO_LIMIT=1000
THRESHOLD_WARNING_PERCENTAGE=80
THRESHOLD_CRITICAL_PERCENTAGE=95
```

Results in:
- ⚠️ Warning Alert at: 1000 × 80% = **800 dyno units**
- 🚨 Critical Alert at: 1000 × 95% = **950 dyno units**

## 📊 Updated UI

### Notification Configuration → Thresholds Tab

**NEW: Global Alert Percentages Panel** (Highlighted in yellow/orange)
```
┌─────────────────────────────────────┐
│ Global Alert Percentages            │
│ These percentages apply to ALL      │
│ resources below                     │
│                                     │
│  ⚠️ Warning Threshold    🚨 Critical│
│       80%                   95%     │
│  THRESHOLD_WARNING_   THRESHOLD_    │
│  PERCENTAGE          CRITICAL_      │
│                      PERCENTAGE     │
└─────────────────────────────────────┘
```

**Resource Limits** (Individual cards for each resource)
```
┌────────────────────────────────┐
│ Dyno Units              ✓ Enabled│
├────────────────────────────────┤
│ Usage Limit: 1,000             │
│ Config Var: THRESHOLD_DYNO_LIMIT│
│                                │
│ Alert percentages:             │
│ ⚠️ 80% (Warning) · 🚨 95% (Critical)│
└────────────────────────────────┘
```

## 🚀 Setting Up Config Vars

### Method 1: Heroku Dashboard
1. Go to https://dashboard.heroku.com/apps/herokuusagetracker/settings
2. Click "Reveal Config Vars"
3. Add the variables

### Method 2: Heroku CLI
```bash
# Set global percentages
heroku config:set THRESHOLD_WARNING_PERCENTAGE=80 -a herokuusagetracker
heroku config:set THRESHOLD_CRITICAL_PERCENTAGE=95 -a herokuusagetracker

# Set resource limits
heroku config:set THRESHOLD_DYNO_LIMIT=1000 -a herokuusagetracker
heroku config:set THRESHOLD_CONNECT_LIMIT=10000 -a herokuusagetracker
heroku config:set THRESHOLD_DATA_ADDONS_LIMIT=500 -a herokuusagetracker
heroku config:set THRESHOLD_GENERAL_ADDONS_LIMIT=300 -a herokuusagetracker
heroku config:set THRESHOLD_PRIVATE_SPACES_LIMIT=5 -a herokuusagetracker
heroku config:set THRESHOLD_SHIELD_SPACES_LIMIT=3 -a herokuusagetracker

# Enable resources
heroku config:set THRESHOLD_DYNO_ENABLED=true -a herokuusagetracker
heroku config:set THRESHOLD_CONNECT_ENABLED=true -a herokuusagetracker
heroku config:set THRESHOLD_DATA_ADDONS_ENABLED=true -a herokuusagetracker
heroku config:set THRESHOLD_GENERAL_ADDONS_ENABLED=true -a herokuusagetracker
heroku config:set THRESHOLD_PRIVATE_SPACES_ENABLED=true -a herokuusagetracker
heroku config:set THRESHOLD_SHIELD_SPACES_ENABLED=true -a herokuusagetracker

# Enable email notifications
heroku config:set NOTIFICATION_EMAIL_ENABLED=true -a herokuusagetracker
heroku config:set NOTIFICATION_RECIPIENTS=your-email@example.com -a herokuusagetracker
heroku config:set NOTIFICATION_FROM_NAME="Heroku Usage Monitor" -a herokuusagetracker

# Enable realtime alerts
heroku config:set SCHEDULE_REALTIME_ENABLED=true -a herokuusagetracker
heroku config:set SCHEDULE_REALTIME_INTERVAL=60 -a herokuusagetracker
```

## 🔄 Migration Guide

If you had the old individual percentage config vars, you can remove them:

```bash
# Remove old vars (no longer used)
heroku config:unset THRESHOLD_DYNO_WARNING -a herokuusagetracker
heroku config:unset THRESHOLD_DYNO_CRITICAL -a herokuusagetracker
heroku config:unset THRESHOLD_CONNECT_WARNING -a herokuusagetracker
heroku config:unset THRESHOLD_CONNECT_CRITICAL -a herokuusagetracker
heroku config:unset THRESHOLD_DATA_ADDONS_WARNING -a herokuusagetracker
heroku config:unset THRESHOLD_DATA_ADDONS_CRITICAL -a herokuusagetracker
heroku config:unset THRESHOLD_GENERAL_ADDONS_WARNING -a herokuusagetracker
heroku config:unset THRESHOLD_GENERAL_ADDONS_CRITICAL -a herokuusagetracker
heroku config:unset THRESHOLD_PRIVATE_SPACES_WARNING -a herokuusagetracker
heroku config:unset THRESHOLD_PRIVATE_SPACES_CRITICAL -a herokuusagetracker
heroku config:unset THRESHOLD_SHIELD_SPACES_WARNING -a herokuusagetracker
heroku config:unset THRESHOLD_SHIELD_SPACES_CRITICAL -a herokuusagetracker

# Add new global vars
heroku config:set THRESHOLD_WARNING_PERCENTAGE=80 -a herokuusagetracker
heroku config:set THRESHOLD_CRITICAL_PERCENTAGE=95 -a herokuusagetracker
```

## ✨ Benefits

1. **Simpler Configuration**: Only 2 percentage vars instead of 12
2. **Consistent Alerts**: Same warning/critical levels across all resources
3. **Easier Maintenance**: Change one var to update all resources
4. **Less Clutter**: Fewer config vars to manage in Heroku
5. **Clearer Intent**: Global percentages make sense for most use cases

## 📖 Examples

### Conservative Monitoring (Alert Early)
```bash
THRESHOLD_WARNING_PERCENTAGE=70   # Alert at 70% of limit
THRESHOLD_CRITICAL_PERCENTAGE=85  # Critical at 85% of limit
```

### Standard Monitoring (Recommended)
```bash
THRESHOLD_WARNING_PERCENTAGE=80   # Alert at 80% of limit
THRESHOLD_CRITICAL_PERCENTAGE=95  # Critical at 95% of limit
```

### Aggressive Monitoring (Alert Late)
```bash
THRESHOLD_WARNING_PERCENTAGE=90   # Alert at 90% of limit
THRESHOLD_CRITICAL_PERCENTAGE=98  # Critical at 98% of limit
```

## 🧪 Testing

After setting config vars, test the configuration:

```bash
# View current config
curl https://herokuusagetracker-7fb7cd593de9.herokuapp.com/api/notifications/config

# Test email
curl -X POST https://herokuusagetracker-7fb7cd593de9.herokuapp.com/api/notifications/send-test

# Check thresholds
curl -X POST https://herokuusagetracker-7fb7cd593de9.herokuapp.com/api/notifications/check-thresholds
```

## 🎯 Default Values

If config vars are not set, defaults are used:
- `THRESHOLD_WARNING_PERCENTAGE`: **80**
- `THRESHOLD_CRITICAL_PERCENTAGE`: **95**
- All resource limits: As defined in `getDefaultConfig()`

## 📚 Documentation

See also:
- `HEROKU_CONFIG_VARS.md` - Complete reference (updated)
- `NOTIFICATION_SETUP.md` - Setup guide
- `QUICK_START.md` - Quick start guide

---

**Version**: v120
**Date**: May 13, 2026
**Status**: ✅ Deployed and Active
