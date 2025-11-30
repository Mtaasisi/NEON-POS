#!/bin/bash

# ============================================
# Script to Help You Find Your Connection String
# ============================================

echo "🔍 Looking for your database connection string..."
echo ""

# Check common locations
FOUND=0

# Check .env files
echo "📁 Checking .env files..."
if [ -f ".env" ]; then
    echo "  ✅ Found .env file"
    if grep -q "VITE_DATABASE_URL\|DATABASE_URL" .env; then
        echo "  📋 Database URLs in .env:"
        grep "VITE_DATABASE_URL\|DATABASE_URL" .env | head -5
        FOUND=1
    fi
fi

if [ -f ".env.local" ]; then
    echo "  ✅ Found .env.local file"
    if grep -q "VITE_DATABASE_URL\|DATABASE_URL" .env.local; then
        echo "  📋 Database URLs in .env.local:"
        grep "VITE_DATABASE_URL\|DATABASE_URL" .env.local | head -5
        FOUND=1
    fi
fi

if [ -f ".env.production" ]; then
    echo "  ✅ Found .env.production file"
    if grep -q "VITE_DATABASE_URL\|DATABASE_URL" .env.production; then
        echo "  📋 Database URLs in .env.production:"
        grep "VITE_DATABASE_URL\|DATABASE_URL" .env.production | head -5
        FOUND=1
    fi
fi

echo ""

# Check environment variables
echo "🌍 Checking environment variables..."
if [ ! -z "$VITE_DATABASE_URL" ]; then
    echo "  ✅ VITE_DATABASE_URL is set:"
    echo "     ${VITE_DATABASE_URL:0:50}..."
    FOUND=1
fi

if [ ! -z "$DATABASE_URL" ]; then
    echo "  ✅ DATABASE_URL is set:"
    echo "     ${DATABASE_URL:0:50}..."
    FOUND=1
fi

echo ""

if [ $FOUND -eq 0 ]; then
    echo "❌ Connection string not found!"
    echo ""
    echo "📝 How to get it:"
    echo ""
    echo "1. Go to Neon Console: https://console.neon.tech"
    echo "2. Select your project"
    echo "3. Click 'Connection Details' or 'Dashboard'"
    echo "4. Copy the connection string"
    echo ""
    echo "It should look like:"
    echo "  postgresql://user:password@ep-xxxxx.region.aws.neon.tech/dbname?sslmode=require"
    echo ""
    echo "Then add it to your .env file:"
    echo "  echo 'VITE_DATABASE_URL=\"your_connection_string_here\"' >> .env"
else
    echo "✅ Found connection string(s) above!"
    echo ""
    echo "📝 To use it:"
    echo "  1. Copy the full connection string"
    echo "  2. Run: export DATABASE_URL=\"paste_connection_string_here\""
    echo "  3. Then run: cd migrations && ./run_emergency_fix.sh"
fi

echo ""

