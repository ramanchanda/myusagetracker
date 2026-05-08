#!/bin/bash

echo "🚀 Heroku Usage Tracker - Configuration Helper"
echo "================================================"
echo ""

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo "❌ Heroku CLI not found. Please install it first:"
    echo "   brew tap heroku/brew && brew install heroku"
    exit 1
fi

echo "✅ Heroku CLI found"
echo ""

# Prompt for app name
read -p "Enter your Heroku app name (or press Enter to create new): " APP_NAME

if [ -z "$APP_NAME" ]; then
    echo "Creating new Heroku app..."
    heroku create
else
    # Check if app exists
    if heroku apps:info -a "$APP_NAME" &> /dev/null; then
        echo "✅ App '$APP_NAME' found"
        heroku git:remote -a "$APP_NAME"
    else
        echo "Creating app '$APP_NAME'..."
        heroku create "$APP_NAME"
    fi
fi

echo ""
echo "📧 Email Configuration"
echo "======================"
read -p "Notification email address: " NOTIFICATION_EMAIL
read -p "SMTP Host (default: smtp.gmail.com): " SMTP_HOST
SMTP_HOST=${SMTP_HOST:-smtp.gmail.com}
read -p "SMTP Port (default: 587): " SMTP_PORT
SMTP_PORT=${SMTP_PORT:-587}
read -p "SMTP User (your email): " SMTP_USER
read -sp "SMTP Password (app password): " SMTP_PASS
echo ""

echo ""
echo "🔑 Heroku API Configuration"
echo "============================"
echo "Getting your Heroku API token..."
HEROKU_API_KEY=$(heroku auth:token)
read -p "Your Heroku account email: " HEROKU_EMAIL

echo ""
echo "⚙️ Usage Thresholds"
echo "==================="
read -p "Dyno threshold percentage (default: 80): " DYNO_THRESHOLD
DYNO_THRESHOLD=${DYNO_THRESHOLD:-80}
read -p "Connect threshold percentage (default: 80): " CONNECT_THRESHOLD
CONNECT_THRESHOLD=${CONNECT_THRESHOLD:-80}

echo ""
echo "Setting Heroku config vars..."

heroku config:set \
  HEROKU_API_KEY="$HEROKU_API_KEY" \
  HEROKU_ACCOUNT_EMAIL="$HEROKU_EMAIL" \
  NOTIFICATION_EMAIL="$NOTIFICATION_EMAIL" \
  SMTP_HOST="$SMTP_HOST" \
  SMTP_PORT="$SMTP_PORT" \
  SMTP_USER="$SMTP_USER" \
  SMTP_PASS="$SMTP_PASS" \
  DYNO_THRESHOLD="$DYNO_THRESHOLD" \
  CONNECT_THRESHOLD="$CONNECT_THRESHOLD" \
  NODE_ENV="production"

echo ""
echo "✅ Configuration complete!"
echo ""
echo "Next steps:"
echo "1. Deploy your app: git push heroku main"
echo "2. Scale the web dyno: heroku ps:scale web=1"
echo "3. Open your app: heroku open"
echo ""
echo "View logs: heroku logs --tail"
