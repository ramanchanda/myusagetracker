# Heroku Config Vars Setup Guide

You can set environment variables directly in Heroku's dashboard or via CLI.

## Method 1: Heroku Dashboard (Recommended for Beginners)

1. Go to https://dashboard.heroku.com/apps
2. Select your app
3. Click on **Settings** tab
4. Scroll to **Config Vars** section
5. Click **Reveal Config Vars**
6. Add each variable:

### Required Config Vars

| Key | Value | Description |
|-----|-------|-------------|
| `HEROKU_API_KEY` | Get from `heroku auth:token` | Your Heroku API authentication token |
| `HEROKU_ACCOUNT_EMAIL` | your@email.com | Your Heroku account email address |
| `NOTIFICATION_EMAIL` | alerts@yourdomain.com | Email to receive notifications |
| `SMTP_HOST` | smtp.gmail.com | SMTP server hostname |
| `SMTP_PORT` | 587 | SMTP server port |
| `SMTP_USER` | your.email@gmail.com | SMTP username (usually your email) |
| `SMTP_PASS` | your_app_password | SMTP password or app-specific password |
| `DYNO_THRESHOLD` | 80 | Alert threshold for dyno usage (%) |
| `CONNECT_THRESHOLD` | 80 | Alert threshold for connect usage (%) |
| `NODE_ENV` | production | Application environment |

### Screenshot Guide

1. **Navigate to Config Vars:**
   ```
   Dashboard → Your App → Settings → Reveal Config Vars
   ```

2. **Add Each Variable:**
   - Enter the KEY in the left field
   - Enter the VALUE in the right field
   - Click "Add"
   - Repeat for all variables

## Method 2: Heroku CLI (Quick Setup)

### Option A: Interactive Script

```bash
./setup-heroku.sh
```

The script will prompt you for all required values and set them automatically.

### Option B: Manual CLI Commands

```bash
# Get your Heroku API token
heroku auth:token

# Set all config vars at once
heroku config:set \
  HEROKU_API_KEY=your_token_here \
  HEROKU_ACCOUNT_EMAIL=your@email.com \
  NOTIFICATION_EMAIL=alerts@example.com \
  SMTP_HOST=smtp.gmail.com \
  SMTP_PORT=587 \
  SMTP_USER=your.email@gmail.com \
  SMTP_PASS=your_app_password \
  DYNO_THRESHOLD=80 \
  CONNECT_THRESHOLD=80 \
  NODE_ENV=production

# Or set them individually
heroku config:set HEROKU_API_KEY=your_token_here
heroku config:set HEROKU_ACCOUNT_EMAIL=your@email.com
# ... continue for each variable
```

### Verify Configuration

```bash
# View all config vars
heroku config

# View specific variable
heroku config:get HEROKU_API_KEY
```

## Getting Your Heroku API Key

### Method 1: CLI
```bash
heroku auth:token
```

### Method 2: Dashboard
1. Go to https://dashboard.heroku.com/account
2. Scroll to **API Key** section
3. Click **Reveal** to see your key
4. Copy the key

⚠️ **Security Note**: Never share your API key or commit it to version control!

## Email Provider Configuration

### Gmail Setup

1. **Enable 2-Factor Authentication:**
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate App Password:**
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-character password
   - Use this as `SMTP_PASS`

3. **Config Vars:**
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your.email@gmail.com
   SMTP_PASS=abcd efgh ijkl mnop (no spaces in actual password)
   ```

### SendGrid Setup

1. Sign up at https://sendgrid.com
2. Create an API Key
3. Config Vars:
   ```
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASS=your_sendgrid_api_key
   ```

### Mailgun Setup

1. Sign up at https://www.mailgun.com
2. Get SMTP credentials from dashboard
3. Config Vars:
   ```
   SMTP_HOST=smtp.mailgun.org
   SMTP_PORT=587
   SMTP_USER=postmaster@your-domain.mailgun.org
   SMTP_PASS=your_mailgun_password
   ```

## Updating Config Vars

### Via Dashboard
1. Go to Settings → Config Vars
2. Click on the value you want to change
3. Update the value
4. Changes apply immediately (app will restart)

### Via CLI
```bash
# Update single variable
heroku config:set DYNO_THRESHOLD=90

# Update multiple variables
heroku config:set DYNO_THRESHOLD=90 CONNECT_THRESHOLD=85
```

## Deleting Config Vars

### Via Dashboard
1. Go to Settings → Config Vars
2. Click the X next to the variable

### Via CLI
```bash
heroku config:unset VARIABLE_NAME
```

## Troubleshooting

### "Failed to fetch usage data"

Check if API key is set correctly:
```bash
heroku config:get HEROKU_API_KEY
```

If empty or incorrect:
```bash
heroku config:set HEROKU_API_KEY=$(heroku auth:token)
```

### "Email notifications not working"

1. Verify SMTP settings:
```bash
heroku config | grep SMTP
```

2. Test notification:
```bash
# Open your app
heroku open

# Click "Test Notification" button in the dashboard
```

3. Check logs:
```bash
heroku logs --tail | grep -i mail
```

### "Environment variable not found"

List all config vars to see what's set:
```bash
heroku config
```

Compare with required variables listed above.

## Security Best Practices

✅ **DO:**
- Use app-specific passwords for email
- Rotate API keys regularly
- Use environment variables (config vars) for all secrets
- Keep API keys private

❌ **DON'T:**
- Commit `.env` file to git
- Share API keys in chat/email
- Use personal email password (use app password)
- Hard-code credentials in source code

## Quick Reference Commands

```bash
# View all config vars
heroku config

# Set a variable
heroku config:set KEY=value

# Get specific variable
heroku config:get KEY

# Remove a variable
heroku config:unset KEY

# Get API token
heroku auth:token

# View app logs
heroku logs --tail

# Restart app (to reload config)
heroku restart
```

## Config Vars Template

Copy this template and fill in your values:

```bash
heroku config:set \
  HEROKU_API_KEY="paste_your_token_here" \
  HEROKU_ACCOUNT_EMAIL="your@email.com" \
  NOTIFICATION_EMAIL="alerts@yourdomain.com" \
  SMTP_HOST="smtp.gmail.com" \
  SMTP_PORT="587" \
  SMTP_USER="your.email@gmail.com" \
  SMTP_PASS="your_app_password" \
  DYNO_THRESHOLD="80" \
  CONNECT_THRESHOLD="80" \
  NODE_ENV="production"
```

## Next Steps After Configuration

1. **Deploy the app:**
   ```bash
   git push heroku main
   ```

2. **Scale the web dyno:**
   ```bash
   heroku ps:scale web=1
   ```

3. **Open your app:**
   ```bash
   heroku open
   ```

4. **Test the setup:**
   - Click "Test Notification" in the dashboard
   - Check your email for the test message
   - Verify usage data displays correctly

5. **Monitor logs:**
   ```bash
   heroku logs --tail
   ```
