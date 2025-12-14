#!/bin/bash

echo "🧹 Cleaning up Vite cache and build artifacts..."

# Stop any running Vite servers
pkill -f "vite" || true

# Remove Vite cache
rm -rf node_modules/.vite
echo "✅ Cleared node_modules/.vite"

# Remove dist folder
rm -rf dist
echo "✅ Cleared dist folder"

# Remove browser cache storage (if you have localStorage issues)
# Note: This is just a reminder - you need to do this in the browser
echo "⚠️  Remember to clear browser cache:"
echo "   1. Open DevTools (F12)"
echo "   2. Right-click refresh button"
echo "   3. Select 'Empty Cache and Hard Reload'"

echo ""
echo "✅ Cache cleanup complete!"
echo "🚀 Starting dev server..."

# Start the dev server
npm run dev

