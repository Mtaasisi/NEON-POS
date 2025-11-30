#!/bin/bash

echo "🔍 Checking Current Environment Configuration..."
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ No .env file found!"
    echo "   Run 'npm run branch:dev' or 'npm run branch:prod' to create one."
    exit 1
fi

# Read current environment settings
NODE_ENV=$(grep "^NODE_ENV=" .env | cut -d'=' -f2)
VITE_APP_ENV=$(grep "^VITE_APP_ENV=" .env | cut -d'=' -f2)

echo "📋 Current Environment Status:"
echo "   NODE_ENV: $NODE_ENV"
echo "   VITE_APP_ENV: $VITE_APP_ENV"
echo ""

# Check database connection
if grep -q "VITE_DATABASE_URL" .env; then
    echo "✅ Database configuration found"
else
    echo "⚠️  No database configuration found"
fi

echo ""

# Determine current mode
if [ "$NODE_ENV" = "production" ] && [ "$VITE_APP_ENV" = "production" ]; then
    echo "🏭 Currently in PRODUCTION mode"
    echo "   Use: npm run build:prod"
elif [ "$NODE_ENV" = "development" ] && [ "$VITE_APP_ENV" = "development" ]; then
    echo "🛠️  Currently in DEVELOPMENT mode"
    echo "   Use: npm run dev"
else
    echo "⚠️  Mixed environment configuration detected!"
    echo "   NODE_ENV: $NODE_ENV"
    echo "   VITE_APP_ENV: $VITE_APP_ENV"
fi

echo ""
echo "🔄 Switch environments:"
echo "   npm run branch:dev   → Development mode"
echo "   npm run branch:prod  → Production mode"
