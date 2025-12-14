#!/bin/bash

echo "🔄 Restarting Development Server..."
echo "=================================="
echo ""

# Check if dev server is running and stop it
echo "1️⃣  Checking for running dev server..."
if lsof -ti:5173 > /dev/null 2>&1; then
    echo "   Found dev server on port 5173, stopping..."
    kill $(lsof -ti:5173) 2>/dev/null
    sleep 2
    echo "   ✅ Stopped"
else
    echo "   ℹ️  No dev server running"
fi

# Clear Vite cache
echo ""
echo "2️⃣  Clearing Vite cache..."
if [ -d "node_modules/.vite" ]; then
    rm -rf node_modules/.vite
    echo "   ✅ Cleared node_modules/.vite"
else
    echo "   ℹ️  No cache to clear"
fi

# Clear dist if exists
if [ -d "dist" ]; then
    echo "   Clearing dist..."
    rm -rf dist
    echo "   ✅ Cleared dist"
fi

# Start dev server
echo ""
echo "3️⃣  Starting dev server..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Development Server Starting..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Remember to:"
echo "   1. Hard refresh your browser (Cmd+Shift+R or Ctrl+Shift+R)"
echo "   2. Open DevTools Console (F12) to see improved error messages"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start the dev server
npm run dev

