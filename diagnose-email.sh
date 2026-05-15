#!/bin/bash

echo "🔍 Email Configuration Diagnostics"
echo "===================================="
echo ""

# Check if running on Heroku
if command -v heroku &> /dev/null; then
    echo "📍 Environment: Heroku"
    CONFIG_CMD="heroku config:get"
else
    echo "📍 Environment: Local"
    CONFIG_CMD="echo \$"
fi

echo ""
echo "1️⃣ Email Configuration:"
echo "------------------------"

# Check email enabled
ENABLED=$(heroku config:get NOTIFICATION_EMAIL_ENABLED 2>/dev/null || echo $NOTIFICATION_EMAIL_ENABLED)
echo "NOTIFICATION_EMAIL_ENABLED: ${ENABLED:-❌ NOT SET}"

# Check recipients
RECIPIENTS=$(heroku config:get NOTIFICATION_RECIPIENTS 2>/dev/null || echo $NOTIFICATION_RECIPIENTS)
echo "NOTIFICATION_RECIPIENTS: ${RECIPIENTS:-❌ NOT SET}"

# Check from email
FROM_EMAIL=$(heroku config:get NOTIFICATION_FROM_EMAIL 2>/dev/null || echo $NOTIFICATION_FROM_EMAIL)
echo "NOTIFICATION_FROM_EMAIL: ${FROM_EMAIL:-⚠️  Not set (will use default)}"

# Check from name
FROM_NAME=$(heroku config:get NOTIFICATION_FROM_NAME 2>/dev/null || echo $NOTIFICATION_FROM_NAME)
echo "NOTIFICATION_FROM_NAME: ${FROM_NAME:-⚠️  Not set (will use default)}"

echo ""
echo "2️⃣ Mailgun API Configuration:"
echo "------------------------------"

# Check Mailgun API
MAILGUN_KEY=$(heroku config:get MAILGUN_API_KEY 2>/dev/null || echo $MAILGUN_API_KEY)
if [ -n "$MAILGUN_KEY" ]; then
    echo "MAILGUN_API_KEY: ✅ SET (${#MAILGUN_KEY} characters)"
    # Show only first/last 4 chars for security
    MASKED_KEY="${MAILGUN_KEY:0:4}...${MAILGUN_KEY: -4}"
    echo "  Preview: $MASKED_KEY"
else
    echo "MAILGUN_API_KEY: ❌ NOT SET"
fi

MAILGUN_DOMAIN=$(heroku config:get MAILGUN_DOMAIN 2>/dev/null || echo $MAILGUN_DOMAIN)
echo "MAILGUN_DOMAIN: ${MAILGUN_DOMAIN:-❌ NOT SET}"

MAILGUN_URL=$(heroku config:get MAILGUN_API_URL 2>/dev/null || echo $MAILGUN_API_URL)
echo "MAILGUN_API_URL: ${MAILGUN_URL:-⚠️  Not set (will use default: https://api.mailgun.net)}"

echo ""
echo "3️⃣ Mailgun SMTP Configuration (Fallback):"
echo "------------------------------------------"

SMTP_SERVER=$(heroku config:get MAILGUN_SMTP_SERVER 2>/dev/null || echo $MAILGUN_SMTP_SERVER)
echo "MAILGUN_SMTP_SERVER: ${SMTP_SERVER:-❌ NOT SET}"

SMTP_PORT=$(heroku config:get MAILGUN_SMTP_PORT 2>/dev/null || echo $MAILGUN_SMTP_PORT)
echo "MAILGUN_SMTP_PORT: ${SMTP_PORT:-⚠️  Not set (will use default: 587)}"

SMTP_LOGIN=$(heroku config:get MAILGUN_SMTP_LOGIN 2>/dev/null || echo $MAILGUN_SMTP_LOGIN)
echo "MAILGUN_SMTP_LOGIN: ${SMTP_LOGIN:-❌ NOT SET}"

SMTP_PASS=$(heroku config:get MAILGUN_SMTP_PASSWORD 2>/dev/null || echo $MAILGUN_SMTP_PASSWORD)
if [ -n "$SMTP_PASS" ]; then
    echo "MAILGUN_SMTP_PASSWORD: ✅ SET"
else
    echo "MAILGUN_SMTP_PASSWORD: ❌ NOT SET"
fi

echo ""
echo "4️⃣ Alternative SMTP Configuration:"
echo "-----------------------------------"

ALT_HOST=$(heroku config:get SMTP_HOST 2>/dev/null || echo $SMTP_HOST)
echo "SMTP_HOST: ${ALT_HOST:-❌ NOT SET}"

ALT_PORT=$(heroku config:get SMTP_PORT 2>/dev/null || echo $SMTP_PORT)
echo "SMTP_PORT: ${ALT_PORT:-❌ NOT SET}"

ALT_USER=$(heroku config:get SMTP_USER 2>/dev/null || echo $SMTP_USER)
echo "SMTP_USER: ${ALT_USER:-❌ NOT SET}"

ALT_PASS=$(heroku config:get SMTP_PASS 2>/dev/null || echo $SMTP_PASS)
if [ -n "$ALT_PASS" ]; then
    echo "SMTP_PASS: ✅ SET"
else
    echo "SMTP_PASS: ❌ NOT SET"
fi

echo ""
echo "5️⃣ Diagnosis:"
echo "-------------"

# Check what's configured
HAS_MAILGUN_API=false
HAS_MAILGUN_SMTP=false
HAS_CUSTOM_SMTP=false
HAS_RECIPIENTS=false

[ -n "$MAILGUN_KEY" ] && [ -n "$MAILGUN_DOMAIN" ] && HAS_MAILGUN_API=true
[ -n "$SMTP_SERVER" ] && [ -n "$SMTP_LOGIN" ] && [ -n "$SMTP_PASS" ] && HAS_MAILGUN_SMTP=true
[ -n "$ALT_HOST" ] && [ -n "$ALT_USER" ] && [ -n "$ALT_PASS" ] && HAS_CUSTOM_SMTP=true
[ -n "$RECIPIENTS" ] && HAS_RECIPIENTS=true

if [ "$HAS_MAILGUN_API" = true ]; then
    echo "✅ Mailgun API configured (primary method)"
else
    echo "❌ Mailgun API not configured"
fi

if [ "$HAS_MAILGUN_SMTP" = true ]; then
    echo "✅ Mailgun SMTP configured (fallback method)"
else
    echo "⚠️  Mailgun SMTP not configured (fallback unavailable)"
fi

if [ "$HAS_CUSTOM_SMTP" = true ]; then
    echo "✅ Custom SMTP configured (alternative method)"
else
    echo "⚠️  Custom SMTP not configured"
fi

if [ "$HAS_RECIPIENTS" = true ]; then
    echo "✅ Recipients configured"
else
    echo "❌ Recipients not configured (emails won't send!)"
fi

if [ "$ENABLED" = "true" ]; then
    echo "✅ Email notifications enabled"
else
    echo "❌ Email notifications disabled"
fi

echo ""
echo "6️⃣ Common Issues & Fixes:"
echo "-------------------------"

if [ "$HAS_MAILGUN_API" = true ]; then
    echo "✓ Mailgun API is configured"
    echo ""
    echo "  If you're getting 'Bad Request' error:"
    echo "  1. Verify MAILGUN_DOMAIN matches your Mailgun dashboard"
    echo "  2. Verify MAILGUN_API_KEY is correct (starts with 'key-')"
    echo "  3. Check if domain is verified in Mailgun"
    echo "  4. Check recipient email format is valid"
    echo ""
    echo "  Fix commands:"
    echo "  heroku config:set MAILGUN_DOMAIN='mg.yourdomain.com'"
    echo "  heroku config:set MAILGUN_API_KEY='key-xxxxxxxxxxxxx'"
else
    echo "❌ Mailgun API not configured"
    echo ""
    echo "  To configure Mailgun API:"
    echo "  1. Get API key from: https://app.mailgun.com/app/account/security/api_keys"
    echo "  2. Get domain from: https://app.mailgun.com/app/sending/domains"
    echo ""
    echo "  heroku config:set MAILGUN_API_KEY='key-xxxxxxxxxxxxx'"
    echo "  heroku config:set MAILGUN_DOMAIN='mg.yourdomain.com'"
fi

echo ""

if [ "$HAS_RECIPIENTS" = false ]; then
    echo "❌ No recipients configured!"
    echo ""
    echo "  Fix:"
    echo "  heroku config:set NOTIFICATION_RECIPIENTS='your@email.com'"
fi

if [ "$ENABLED" != "true" ]; then
    echo "❌ Email notifications disabled!"
    echo ""
    echo "  Fix:"
    echo "  heroku config:set NOTIFICATION_EMAIL_ENABLED=true"
fi

echo ""
echo "===================================="
echo "Diagnostics complete!"
