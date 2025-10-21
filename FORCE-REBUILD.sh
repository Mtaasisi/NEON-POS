#!/bin/bash

# Force rebuild script - fixes cached JavaScript issues
# This ensures the new code changes are actually used

echo "🔄 Forcing complete rebuild to clear cache..."
echo ""

# Step 1: Kill any running dev servers
echo "1️⃣  Stopping all running dev servers..."
pkill -f "vite" || true
pkill -f "node.*dev" || true
sleep 2

# Step 2: Clear Vite cache
echo "2️⃣  Clearing Vite cache..."
rm -rf node_modules/.vite
rm -rf dist
rm -rf .vite

# Step 3: Clear browser cache files
echo "3️⃣  Clearing dev server cache..."
rm -rf .cache
rm -f vite-server.log
rm -f dev-server.log

# Step 4: Rebuild
echo "4️⃣  Rebuilding..."
npm run build || true

echo ""
echo "✅ Rebuild complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Start your dev server: npm run dev"
echo "   2. Open browser and do HARD REFRESH: Ctrl+Shift+R (or Cmd+Shift+R on Mac)"
echo "   3. Run the enhanced debug script from debug-400-enhanced.js"
echo ""

