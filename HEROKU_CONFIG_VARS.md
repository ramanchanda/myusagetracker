# Heroku Config Vars for Notification Service

## Why Config Vars?

Heroku's filesystem is **ephemeral** - it resets on every:
- App restart
- New deployment
- Dyno cycling

To persist notification configuration, you must set **Config Vars** (environment variables).

## Mailgun Setup (Required)

The notification service uses **Mailgun API** (not SMTP) for better reliability.

### Get Your Mailgun Credentials

```bash
# After adding Mailgun addon
heroku addons:create mailgun:starter -a myusagetracker

# Get your API credentials
heroku config:get MAILGUN_API_KEY -a myusagetracker
heroku config:get MAILGUN_DOMAIN -a myusagetracker
```

These are automatically set when you add the Mailgun addon:
- `MAILGUN_API_KEY` - Your API key
- `MAILGUN_DOMAIN` - Your sandbox domain (e.g., sandbox123...mailgun.org)

### Important: Authorize Recipients

Since Mailgun starts in **sandbox mode**, you MUST authorize recipients:

1. Open Mailgun dashboard:
   ```bash
   heroku addons:open mailgun -a myusagetracker
   ```

2. Go to **"Authorized Recipients"**
3. Click **"Add Recipient"**
4. Enter each email address you want to send to
5. Each recipient will receive a confirmation email
6. They must click the verification link
7. Status changes to "Verified" ✓

**Only verified emails will receive notifications!**

## Quick Setup

### Option 1: Via Heroku Dashboard (Easiest)

1. Open your app dashboard: https://dashboard.heroku.com/apps/myusagetracker
2. Click **Settings** tab
3. Click **Reveal Config Vars**
4. Add the variables below

### Option 2: Via CLI (Faster for bulk setup)

Use the commands provided in the Notification Settings UI after clicking "Save Configuration".

### Option 3: One-line Command

```bash
heroku config:set \
  NOTIFICATION_EMAIL_ENABLED=true \
  NOTIFICATION_RECIPIENTS="your-email@example.com,team@example.com" \
  NOTIFICATION_FROM_NAME="Heroku Usage Monitor" \
  THRESHOLD_DYNO_ENABLED=true \
  THRESHOLD_DYNO_LIMIT=1000 \
  THRESHOLD_DYNO_WARNING=80 \
  THRESHOLD_DYNO_CRITICAL=95 \
  THRESHOLD_CONNECT_ENABLED=true \
  THRESHOLD_CONNECT_LIMIT=10000 \
  THRESHOLD_CONNECT_WARNING=80 \
  THRESHOLD_CONNECT_CRITICAL=95 \
  THRESHOLD_DATA_ADDONS_ENABLED=true \
  THRESHOLD_DATA_ADDONS_LIMIT=500 \
  THRESHOLD_DATA_ADDONS_WARNING=80 \
  THRESHOLD_DATA_ADDONS_CRITICAL=95 \
  THRESHOLD_GENERAL_ADDONS_ENABLED=true \
  THRESHOLD_GENERAL_ADDONS_LIMIT=300 \
  THRESHOLD_GENERAL_ADDONS_WARNING=80 \
  THRESHOLD_GENERAL_ADDONS_CRITICAL=95 \
  THRESHOLD_PRIVATE_SPACES_ENABLED=true \
  THRESHOLD_PRIVATE_SPACES_LIMIT=5 \
  THRESHOLD_PRIVATE_SPACES_WARNING=80 \
  THRESHOLD_PRIVATE_SPACES_CRITICAL=100 \
  THRESHOLD_SHIELD_SPACES_ENABLED=true \
  THRESHOLD_SHIELD_SPACES_LIMIT=3 \
  THRESHOLD_SHIELD_SPACES_WARNING=80 \
  THRESHOLD_SHIELD_SPACES_CRITICAL=100 \
  SCHEDULE_REALTIME_ENABLED=true \
  SCHEDULE_REALTIME_INTERVAL=60 \
  -a myusagetracker
```

## Complete Config Vars Reference

### Email Configuration

| Variable | Type | Example | Description |
|----------|------|---------|-------------|
| `NOTIFICATION_EMAIL_ENABLED` | boolean | `true` | Enable/disable email notifications |
| `NOTIFICATION_RECIPIENTS` | string | `"admin@example.com,team@example.com"` | Comma-separated list of email recipients (must be authorized in Mailgun sandbox) |
| `NOTIFICATION_FROM_NAME` | string | `"Heroku Usage Monitor"` | Name shown in email "From" field |
| `NOTIFICATION_FROM_EMAIL` | string | `"noreply@example.com"` | Email address in "From" field (optional, uses Mailgun default) |

### Dyno Units Threshold

| Variable | Type | Example | Description |
|----------|------|---------|-------------|
| `THRESHOLD_DYNO_ENABLED` | boolean | `true` | Enable dyno units monitoring |
| `THRESHOLD_DYNO_LIMIT` | number | `1000` | Maximum dyno units allowed |
| `THRESHOLD_DYNO_WARNING` | number | `80` | Percentage for warning alert (0-100) |
| `THRESHOLD_DYNO_CRITICAL` | number | `95` | Percentage for critical alert (0-100) |

### Connect Rows Threshold

| Variable | Type | Example | Description |
|----------|------|---------|-------------|
| `THRESHOLD_CONNECT_ENABLED` | boolean | `true` | Enable connect rows monitoring |
| `THRESHOLD_CONNECT_LIMIT` | number | `10000` | Maximum connect rows allowed |
| `THRESHOLD_CONNECT_WARNING` | number | `80` | Percentage for warning alert |
| `THRESHOLD_CONNECT_CRITICAL` | number | `95` | Percentage for critical alert |

### Data Add-ons Threshold

| Variable | Type | Example | Description |
|----------|------|---------|-------------|
| `THRESHOLD_DATA_ADDONS_ENABLED` | boolean | `true` | Enable data add-ons monitoring |
| `THRESHOLD_DATA_ADDONS_LIMIT` | number | `500` | Maximum data add-ons credits |
| `THRESHOLD_DATA_ADDONS_WARNING` | number | `80` | Percentage for warning alert |
| `THRESHOLD_DATA_ADDONS_CRITICAL` | number | `95` | Percentage for critical alert |

### General Add-ons Threshold

| Variable | Type | Example | Description |
|----------|------|---------|-------------|
| `THRESHOLD_GENERAL_ADDONS_ENABLED` | boolean | `true` | Enable general add-ons monitoring |
| `THRESHOLD_GENERAL_ADDONS_LIMIT` | number | `300` | Maximum general add-ons credits |
| `THRESHOLD_GENERAL_ADDONS_WARNING` | number | `80` | Percentage for warning alert |
| `THRESHOLD_GENERAL_ADDONS_CRITICAL` | number | `95` | Percentage for critical alert |

### Private Spaces Threshold

| Variable | Type | Example | Description |
|----------|------|---------|-------------|
| `THRESHOLD_PRIVATE_SPACES_ENABLED` | boolean | `true` | Enable private spaces monitoring |
| `THRESHOLD_PRIVATE_SPACES_LIMIT` | number | `5` | Maximum private spaces allowed |
| `THRESHOLD_PRIVATE_SPACES_WARNING` | number | `80` | Percentage for warning alert |
| `THRESHOLD_PRIVATE_SPACES_CRITICAL` | number | `100` | Percentage for critical alert |

### Shield Spaces Threshold

| Variable | Type | Example | Description |
|----------|------|---------|-------------|
| `THRESHOLD_SHIELD_SPACES_ENABLED` | boolean | `true` | Enable shield spaces monitoring |
| `THRESHOLD_SHIELD_SPACES_LIMIT` | number | `3` | Maximum shield spaces allowed |
| `THRESHOLD_SHIELD_SPACES_WARNING` | number | `80` | Percentage for warning alert |
| `THRESHOLD_SHIELD_SPACES_CRITICAL` | number | `100` | Percentage for critical alert |

### Real-time Alerts Schedule

| Variable | Type | Example | Description |
|----------|------|---------|-------------|
| `SCHEDULE_REALTIME_ENABLED` | boolean | `true` | Enable hourly threshold monitoring |
| `SCHEDULE_REALTIME_INTERVAL` | number | `60` | Check interval in minutes (15-1440) |

### Daily Summary Schedule

| Variable | Type | Example | Description |
|----------|------|---------|-------------|
| `SCHEDULE_DAILY_ENABLED` | boolean | `false` | Enable daily summary emails |
| `SCHEDULE_DAILY_TIME` | string | `"09:00"` | Time in UTC (24-hour format) |

### Weekly Summary Schedule

| Variable | Type | Example | Description |
|----------|------|---------|-------------|
| `SCHEDULE_WEEKLY_ENABLED` | boolean | `false` | Enable weekly summary emails |
| `SCHEDULE_WEEKLY_DAY` | string | `"Monday"` | Day of week |
| `SCHEDULE_WEEKLY_TIME` | string | `"09:00"` | Time in UTC (24-hour format) |

### Monthly Summary Schedule

| Variable | Type | Example | Description |
|----------|------|---------|-------------|
| `SCHEDULE_MONTHLY_ENABLED` | boolean | `false` | Enable monthly summary emails |
| `SCHEDULE_MONTHLY_DAY` | number | `1` | Day of month (1-28) |
| `SCHEDULE_MONTHLY_TIME` | string | `"09:00"` | Time in UTC (24-hour format) |

## Workflow

### 1. Configure via UI (Recommended)

1. Go to https://myusagetracker-0684662c08ff.herokuapp.com/notifications
2. Configure your settings
3. Click "Save Configuration"
4. Copy the Heroku commands shown
5. Run them in your terminal

### 2. Direct Config Var Setup

If you prefer, set Config Vars directly via Dashboard or CLI, then restart the app.

## Verify Configuration

After setting Config Vars:

```bash
# View all notification config vars
heroku config -a myusagetracker | grep -E "NOTIFICATION|THRESHOLD|SCHEDULE"

# Restart app to apply changes
heroku restart -a myusagetracker

# Check if config is loaded
heroku logs --tail -a myusagetracker | grep "notification config"
```

You should see:
```
Reading notification config from environment variables (Heroku Config Vars)
```

## Important Notes

### Mailgun Recipients

**Critical:** Recipients in `NOTIFICATION_RECIPIENTS` must be:
1. Added as "Authorized Recipients" in Mailgun dashboard
2. Verified by clicking the confirmation link
3. Match exactly (including email case)

If using Mailgun sandbox:
```bash
# Open Mailgun dashboard
heroku addons:open mailgun -a myusagetracker

# Add recipients in "Authorized Recipients" section
# Verify each email address
```

### Boolean Values

Use lowercase strings:
- ✓ `true`
- ✓ `false`
- ✗ `TRUE`, `True`, `1`, `0`

### Comma-separated Values

No spaces after commas:
- ✓ `"email1@example.com,email2@example.com"`
- ✗ `"email1@example.com, email2@example.com"` (space after comma)

### Time Format

Use 24-hour format with leading zeros:
- ✓ `"09:00"` for 9 AM
- ✓ `"14:30"` for 2:30 PM
- ✗ `"9:00"`, `"2:30 PM"`

## Testing

After setting Config Vars:

```bash
# Test email configuration
curl -X POST https://myusagetracker-0684662c08ff.herokuapp.com/api/notifications/send-test

# Manually check thresholds
curl -X POST https://myusagetracker-0684662c08ff.herokuapp.com/api/notifications/check-thresholds

# View current config
curl https://myusagetracker-0684662c08ff.herokuapp.com/api/notifications/config
```

## Updating Configuration

### Via UI:
1. Change settings in UI
2. Click "Save Configuration"
3. Run the new Heroku commands shown

### Via CLI:
```bash
# Update a single variable
heroku config:set THRESHOLD_DYNO_LIMIT=2000 -a myusagetracker

# Update multiple variables
heroku config:set THRESHOLD_DYNO_LIMIT=2000 THRESHOLD_CONNECT_LIMIT=20000 -a myusagetracker
```

### Via Dashboard:
1. Go to Settings → Config Vars
2. Edit the variable
3. Save

App automatically restarts when Config Vars change.

## Backup Configuration

Save your current config:

```bash
# Export all notification config vars
heroku config -a myusagetracker | grep -E "NOTIFICATION|THRESHOLD|SCHEDULE" > notification-config-backup.txt
```

Restore from backup:

```bash
# Convert backup to commands and run
# (manual process - edit the file to add 'heroku config:set' prefix to each line)
```

## Troubleshooting

### Config not applying?

```bash
# Check if config vars are set
heroku config -a myusagetracker | grep NOTIFICATION

# Restart app
heroku restart -a myusagetracker

# Check logs for config loading
heroku logs --tail -a myusagetracker
```

### Emails not sending?

1. Verify `NOTIFICATION_EMAIL_ENABLED=true`
2. Check recipients are in Mailgun authorized list
3. Verify Mailgun credentials exist:
   ```bash
   heroku config -a myusagetracker | grep MAILGUN
   ```

### Thresholds not triggering?

1. Check threshold enabled: `THRESHOLD_DYNO_ENABLED=true`
2. Verify real-time alerts enabled: `SCHEDULE_REALTIME_ENABLED=true`
3. Check if usage exceeds threshold percentage
4. View logs for threshold checks:
   ```bash
   heroku logs --tail -a myusagetracker | grep -i threshold
   ```

## Security

- Config Vars are **encrypted** in Heroku
- Never commit Config Vars to git
- Don't share Config Var values publicly
- Rotate Mailgun credentials if exposed

## Support

For issues:
1. Check Heroku logs: `heroku logs --tail -a myusagetracker`
2. Verify Config Vars are set correctly
3. Test email connectivity: POST `/api/notifications/send-test`
4. Check Mailgun dashboard for delivery issues
