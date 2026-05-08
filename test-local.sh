#!/bin/bash

# Test Script for Heroku Usage Tracker
# This script helps you test the application locally before deploying

echo "🧪 Heroku Usage Tracker - Local Testing Script"
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo ""
    echo "Creating .env file from .env.example..."

    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ .env file created${NC}"
        echo ""
        echo -e "${YELLOW}⚠️  Please edit .env file with your credentials:${NC}"
        echo "   - HEROKU_API_KEY (run: heroku auth:token)"
        echo "   - HEROKU_ACCOUNT_EMAIL"
        echo "   - NOTIFICATION_EMAIL"
        echo "   - SMTP credentials"
        echo ""
        exit 1
    else
        echo -e "${RED}❌ .env.example not found!${NC}"
        exit 1
    fi
fi

echo "✅ .env file found"
echo ""

# Load environment variables
source .env

# Check required variables
echo "🔍 Checking required environment variables..."
MISSING_VARS=0

check_var() {
    if [ -z "${!1}" ]; then
        echo -e "${RED}❌ $1 is not set${NC}"
        MISSING_VARS=1
    else
        echo -e "${GREEN}✅ $1 is set${NC}"
    fi
}

check_var "HEROKU_API_KEY"
check_var "HEROKU_ACCOUNT_EMAIL"
check_var "NOTIFICATION_EMAIL"
check_var "SMTP_HOST"
check_var "SMTP_PORT"
check_var "SMTP_USER"
check_var "SMTP_PASS"

echo ""

if [ $MISSING_VARS -eq 1 ]; then
    echo -e "${RED}❌ Some required variables are missing. Please update your .env file.${NC}"
    echo ""
    echo "To get your Heroku API key, run:"
    echo "  heroku auth:token"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ All required environment variables are set!${NC}"
echo ""

# Check Node.js version
echo "🔍 Checking Node.js version..."
NODE_VERSION=$(node -v)
echo "   Node.js version: $NODE_VERSION"

# Extract major version number
NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1 | sed 's/v//')

if [ "$NODE_MAJOR" -lt 18 ]; then
    echo -e "${YELLOW}⚠️  Warning: Node.js 18+ recommended (you have v$NODE_MAJOR)${NC}"
else
    echo -e "${GREEN}✅ Node.js version is good${NC}"
fi
echo ""

# Check if dependencies are installed
echo "🔍 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  Backend dependencies not installed${NC}"
    echo "   Installing backend dependencies..."
    npm install
    echo -e "${GREEN}✅ Backend dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Backend dependencies installed${NC}"
fi

if [ ! -d "client/node_modules" ]; then
    echo -e "${YELLOW}⚠️  Frontend dependencies not installed${NC}"
    echo "   Installing frontend dependencies..."
    cd client && npm install && cd ..
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
fi
echo ""

# Test Heroku API connection
echo "🔍 Testing Heroku API connection..."
HEROKU_TEST=$(curl -s -X GET \
  -H "Accept: application/vnd.heroku+json; version=3" \
  -H "Authorization: Bearer $HEROKU_API_KEY" \
  https://api.heroku.com/account)

if echo "$HEROKU_TEST" | grep -q '"email"'; then
    echo -e "${GREEN}✅ Heroku API connection successful${NC}"
    ACCOUNT_EMAIL=$(echo "$HEROKU_TEST" | grep -o '"email":"[^"]*"' | cut -d'"' -f4)
    echo "   Account: $ACCOUNT_EMAIL"
else
    echo -e "${RED}❌ Heroku API connection failed${NC}"
    echo "   Please check your HEROKU_API_KEY"
    echo ""
    echo "   Get a fresh token with: heroku auth:token"
    exit 1
fi
echo ""

# Build frontend
echo "📦 Building React frontend..."
cd client
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend build successful${NC}"
else
    echo -e "${RED}❌ Frontend build failed${NC}"
    exit 1
fi
cd ..
echo ""

# Start the server
echo "🚀 Starting server..."
echo ""
echo "=============================================="
echo -e "${GREEN}Server starting on http://localhost:3001${NC}"
echo "=============================================="
echo ""
echo "📊 Dashboard: http://localhost:3001"
echo "🔧 Health Check: http://localhost:3001/api/health"
echo "📈 Usage API: http://localhost:3001/api/usage/summary"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
npm start
