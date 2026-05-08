#!/bin/bash

# Automated Heroku Deployment Script
# This script will guide you through deploying the Heroku Usage Tracker

echo "🚀 Heroku Usage Tracker - Deployment Script"
echo "============================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Heroku CLI is installed
echo "🔍 Checking prerequisites..."
if ! command -v heroku &> /dev/null; then
    echo -e "${RED}❌ Heroku CLI not found${NC}"
    echo ""
    echo "Please install Heroku CLI:"
    echo "  macOS: brew install heroku/brew/heroku"
    echo "  Or visit: https://devcenter.heroku.com/articles/heroku-cli"
    echo ""
    exit 1
fi
echo -e "${GREEN}✅ Heroku CLI installed${NC}"

# Check if Git is initialized
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}⚠️  Git not initialized${NC}"
    echo ""
    read -p "Initialize git repository? (y/n): " init_git
    if [ "$init_git" == "y" ]; then
        git init
        git add .
        git commit -m "Initial commit: Heroku Usage Tracker"
        echo -e "${GREEN}✅ Git repository initialized${NC}"
    else
        echo -e "${RED}❌ Git is required for Heroku deployment${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Git repository found${NC}"
fi
echo ""

# Check if logged in to Heroku
echo "🔍 Checking Heroku authentication..."
if ! heroku auth:whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Heroku${NC}"
    echo ""
    echo "Logging in to Heroku..."
    heroku login
else
    HEROKU_USER=$(heroku auth:whoami)
    echo -e "${GREEN}✅ Logged in as: $HEROKU_USER${NC}"
fi
echo ""

# Get Heroku API key
echo "🔑 Getting Heroku API key..."
HEROKU_API_KEY=$(heroku auth:token)
if [ -z "$HEROKU_API_KEY" ]; then
    echo -e "${RED}❌ Could not get Heroku API key${NC}"
    exit 1
fi
echo -e "${GREEN}✅ API key obtained${NC}"
echo ""

# Ask for app name
echo "📝 Configuration"
echo "============================================"
read -p "Enter Heroku app name (leave empty for auto-generated): " APP_NAME

# Create Heroku app
echo ""
echo "🚀 Creating Heroku app..."
if [ -z "$APP_NAME" ]; then
    heroku create
else
    heroku create "$APP_NAME"
fi

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to create Heroku app${NC}"
    exit 1
fi

# Get the app name (in case it was auto-generated)
APP_NAME=$(heroku apps:info -s | grep '^name=' | cut -d= -f2)
echo -e "${GREEN}✅ App created: $APP_NAME${NC}"
echo ""

# Get account email
HEROKU_ACCOUNT_EMAIL=$(heroku auth:whoami)

# Get configuration values from user
echo "📧 Email Configuration"
echo "============================================"
read -p "Notification email (where to send alerts): " NOTIFICATION_EMAIL

echo ""
echo "SMTP Configuration (for sending emails)"
echo "--------------------------------------------"
echo "Default is Gmail. Press Enter to use defaults or provide custom values."
read -p "SMTP Host [smtp.gmail.com]: " SMTP_HOST
SMTP_HOST=${SMTP_HOST:-smtp.gmail.com}

read -p "SMTP Port [587]: " SMTP_PORT
SMTP_PORT=${SMTP_PORT:-587}

read -p "SMTP User (your email): " SMTP_USER

echo ""
echo -e "${YELLOW}⚠️  For Gmail, use an App Password (not your regular password)${NC}"
echo "   Get it at: https://myaccount.google.com/apppasswords"
echo ""
read -sp "SMTP Password/App Password: " SMTP_PASS
echo ""

echo ""
echo "⚙️  Threshold Configuration"
echo "============================================"
read -p "Dyno usage alert threshold (%) [80]: " DYNO_THRESHOLD
DYNO_THRESHOLD=${DYNO_THRESHOLD:-80}

read -p "Connect usage alert threshold (%) [80]: " CONNECT_THRESHOLD
CONNECT_THRESHOLD=${CONNECT_THRESHOLD:-80}

# Set environment variables
echo ""
echo "🔧 Setting environment variables..."

heroku config:set \
  HEROKU_API_KEY="$HEROKU_API_KEY" \
  HEROKU_ACCOUNT_EMAIL="$HEROKU_ACCOUNT_EMAIL" \
  NOTIFICATION_EMAIL="$NOTIFICATION_EMAIL" \
  SMTP_HOST="$SMTP_HOST" \
  SMTP_PORT="$SMTP_PORT" \
  SMTP_USER="$SMTP_USER" \
  SMTP_PASS="$SMTP_PASS" \
  DYNO_THRESHOLD="$DYNO_THRESHOLD" \
  CONNECT_THRESHOLD="$CONNECT_THRESHOLD" \
  NODE_ENV=production \
  --app "$APP_NAME"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Environment variables configured${NC}"
else
    echo -e "${RED}❌ Failed to set environment variables${NC}"
    exit 1
fi
echo ""

# Commit any uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo "📦 Committing changes..."
    git add .
    git commit -m "Configure for Heroku deployment"
fi

# Deploy to Heroku
echo "🚀 Deploying to Heroku..."
echo "This may take 2-3 minutes..."
echo ""

git push heroku main || git push heroku master

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Deployment failed${NC}"
    echo ""
    echo "Check the error messages above."
    echo "You can view logs with: heroku logs --tail"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Deployment successful!${NC}"
echo ""

# Scale the dyno
echo "⚡ Starting web dyno..."
heroku ps:scale web=1 --app "$APP_NAME"
echo -e "${GREEN}✅ Web dyno started${NC}"
echo ""

# Get app URL
APP_URL=$(heroku info -s --app "$APP_NAME" | grep '^web_url=' | cut -d= -f2)

# Summary
echo ""
echo "============================================"
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo "============================================"
echo ""
echo "📊 Your Dashboard: $APP_URL"
echo ""
echo "🧪 Test Commands:"
echo "  Health Check:"
echo "    curl ${APP_URL}api/health"
echo ""
echo "  Usage Summary:"
echo "    curl ${APP_URL}api/usage/summary"
echo ""
echo "  Test Notification:"
echo "    curl -X POST ${APP_URL}api/test-notification"
echo ""
echo "📝 Useful Commands:"
echo "  View logs:    heroku logs --tail --app $APP_NAME"
echo "  View config:  heroku config --app $APP_NAME"
echo "  Restart app:  heroku restart --app $APP_NAME"
echo "  Open app:     heroku open --app $APP_NAME"
echo ""
echo "============================================"
echo ""

# Ask if user wants to open the app
read -p "Open the dashboard in your browser? (y/n): " open_app
if [ "$open_app" == "y" ]; then
    heroku open --app "$APP_NAME"
fi

echo ""
echo -e "${GREEN}✨ All done! Your Heroku Usage Tracker is live! ✨${NC}"
echo ""
