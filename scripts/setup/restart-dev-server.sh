#!/bin/bash

# ============================================
# Restart Dev Server Script
# ============================================

echo "🔄 Restarting Development Server..."
echo ""

# Kill any existing dev server on port 5173
echo "1️⃣ Stopping any running dev server..."
lsof -ti:5173 | xargs kill -9 2>/dev/null
sleep 1
echo "   ✅ Stopped existing server"
echo ""

# Verify .env file exists
echo "2️⃣ Checking .env configuration..."
if [ ! -f ".env" ]; then
    echo "   ❌ Error: .env file not found!"
    echo "   Please run: ./setup-env.sh first"
    exit 1
fi

# Check if VITE_DATABASE_URL is set
if ! grep -q "VITE_DATABASE_URL" .env; then
    echo "   ❌ Error: VITE_DATABASE_URL not found in .env"
    echo "   Please run: ./setup-env.sh first"
    exit 1
fi

echo "   ✅ .env file configured correctly"
echo ""

# Show database URL (masked)
DB_URL=$(grep "^VITE_DATABASE_URL=" .env | head -1 | cut -d'=' -f2)
echo "   📡 Database: ${DB_URL:0:50}..."
echo ""

echo "3️⃣ Starting development server..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Dev Server Starting..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Valid Login Credentials:"
echo "   Admin Account:"
echo "   • Email: care@care.com"
echo "   • Password: 123456"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "After the server starts:"
echo "1. Open browser to: http://localhost:5173"
echo "2. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)"
echo "3. Login with: care@care.com / 123456"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start the dev server
npm run dev

