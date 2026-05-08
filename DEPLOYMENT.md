# Deployment Guide

## Quick Deploy to Heroku

### Option 1: One-Click Deploy

Click the button below to deploy directly to Heroku:

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

You'll be prompted to:
1. Name your app
2. Enter your Heroku API key
3. Configure email settings
4. Set usage thresholds

### Option 2: Manual Deployment

#### Step 1: Prerequisites

```bash
# Install Heroku CLI
brew tap heroku/brew && brew install heroku

# Login to Heroku
heroku login
```

#### Step 2: Create Heroku App

```bash
# Create new app
heroku create heroku-usage-tracker

# Or use specific name
heroku create your-custom-name
```

#### Step 3: Get Heroku API Key

```bash
heroku auth:token
```

Copy the displayed token for the next step.

#### Step 4: Configure Environment Variables

```bash
# Heroku API Configuration
heroku config:set HEROKU_API_KEY=your_heroku_api_token_here

# Your Heroku account email
heroku config:set HEROKU_ACCOUNT_EMAIL=your@email.com

# Email notification settings
heroku config:set NOTIFICATION_EMAIL=alerts@yourdomain.com
heroku config:set SMTP_HOST=smtp.gmail.com
heroku config:set SMTP_PORT=587
heroku config:set SMTP_USER=your.email@gmail.com
heroku config:set SMTP_PASS=your_gmail_app_password

# Usage thresholds (percentage)
heroku config:set DYNO_THRESHOLD=80
heroku config:set CONNECT_THRESHOLD=80

# Environment
heroku config:set NODE_ENV=production

# Verify configuration
heroku config
```

#### Step 5: Deploy the Application

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial deployment"

# Add Heroku remote
heroku git:remote -a your-app-name

# Deploy to Heroku
git push heroku main

# If you're on master branch
git push heroku master:main
```

#### Step 6: Scale and Open

```bash
# Ensure web dyno is running
heroku ps:scale web=1

# Open the app in browser
heroku open
```

#### Step 7: View Logs

```bash
# View real-time logs
heroku logs --tail

# View recent logs
heroku logs --num 100
```

## Email Configuration Examples

### Gmail

1. Enable 2FA: https://myaccount.google.com/security
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use these settings:

```bash
heroku config:set SMTP_HOST=smtp.gmail.com
heroku config:set SMTP_PORT=587
heroku config:set SMTP_USER=your.email@gmail.com
heroku config:set SMTP_PASS=your_16_char_app_password
```

### SendGrid

```bash
heroku config:set SMTP_HOST=smtp.sendgrid.net
heroku config:set SMTP_PORT=587
heroku config:set SMTP_USER=apikey
heroku config:set SMTP_PASS=your_sendgrid_api_key
```

### Mailgun

```bash
heroku config:set SMTP_HOST=smtp.mailgun.org
heroku config:set SMTP_PORT=587
heroku config:set SMTP_USER=postmaster@yourdomain.mailgun.org
heroku config:set SMTP_PASS=your_mailgun_password
```

### AWS SES

```bash
heroku config:set SMTP_HOST=email-smtp.us-east-1.amazonaws.com
heroku config:set SMTP_PORT=587
heroku config:set SMTP_USER=your_ses_smtp_username
heroku config:set SMTP_PASS=your_ses_smtp_password
```

## Testing After Deployment

### 1. Check App Health

```bash
curl https://your-app-name.herokuapp.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-04-28T10:00:00.000Z"
}
```

### 2. Test Usage Endpoint

```bash
curl https://your-app-name.herokuapp.com/api/usage/summary
```

### 3. Test Email Notifications

Open your app and click "Test Notification" button, or use curl:

```bash
curl -X POST https://your-app-name.herokuapp.com/api/test-notification
```

Check your email for the test notification.

## Monitoring & Maintenance

### View Application Metrics

```bash
# View app info
heroku apps:info

# View dyno usage
heroku ps

# View logs
heroku logs --tail
```

### Update Environment Variables

```bash
# Update a single variable
heroku config:set DYNO_THRESHOLD=90

# Remove a variable
heroku config:unset VARIABLE_NAME
```

### Restart the Application

```bash
heroku restart
```

### Update the Application

```bash
# Make your changes
git add .
git commit -m "Update description"
git push heroku main
```

## Scheduler Add-on (Optional)

For more robust scheduling, use Heroku Scheduler:

```bash
# Install scheduler
heroku addons:create scheduler:standard

# Open scheduler dashboard
heroku addons:open scheduler
```

Add a job:
- **Command**: `curl -X POST https://your-app-name.herokuapp.com/api/usage/summary`
- **Frequency**: Every hour / Every day

## Custom Domain (Optional)

```bash
# Add custom domain
heroku domains:add www.yourdomain.com

# Get DNS target
heroku domains

# Configure your DNS provider with the provided CNAME
```

## SSL Certificate

Heroku automatically provides SSL for `*.herokuapp.com` domains and custom domains.

```bash
# Check SSL status
heroku certs:info
```

## Scaling

### Dyno Types

```bash
# Use eco dyno (recommended for low-traffic)
heroku ps:scale web=1:eco

# Use basic dyno
heroku ps:scale web=1:basic

# Use standard dyno
heroku ps:scale web=1:standard-1x
```

### Multiple Dynos

```bash
# Scale to 2 dynos
heroku ps:scale web=2
```

## Cost Optimization

1. **Eco Dynos**: Use for apps that don't need 24/7 uptime ($5/month)
2. **Basic Dynos**: For always-on apps ($7/month)
3. **Scheduler**: Free add-on for periodic tasks
4. **Log Management**: Use free log limits or external logging

## Troubleshooting

### Application Errors

```bash
# View error logs
heroku logs --tail | grep "Error"

# Check build logs
heroku builds:output
```

### Environment Variable Issues

```bash
# List all config vars
heroku config

# Check specific variable
heroku config:get HEROKU_API_KEY
```

### API Rate Limiting

If you see rate limit errors from Heroku API:
- Reduce monitoring frequency
- Cache API responses
- Use pagination for large datasets

### Email Delivery Issues

```bash
# Check SMTP settings
heroku config | grep SMTP

# Test with different port
heroku config:set SMTP_PORT=465  # Try SSL
heroku config:set SMTP_PORT=2525 # Alternative
```

## Rollback

```bash
# View releases
heroku releases

# Rollback to previous version
heroku rollback

# Rollback to specific version
heroku rollback v10
```

## Database (Future Enhancement)

If you want to store historical usage data:

```bash
# Add Postgres
heroku addons:create heroku-postgresql:essential-0

# Get database URL
heroku config:get DATABASE_URL
```

## Security Checklist

- [ ] API keys stored as environment variables (not in code)
- [ ] `.env` file added to `.gitignore`
- [ ] Heroku API key has minimal required permissions
- [ ] Email credentials use app-specific passwords
- [ ] HTTPS enforced (automatic on Heroku)
- [ ] Regular security updates: `npm audit fix`

## Support

For deployment issues:
- Check Heroku Status: https://status.heroku.com
- Heroku Support: https://help.heroku.com
- Application logs: `heroku logs --tail`
