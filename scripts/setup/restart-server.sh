#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 Restarting Dev Server with New Configuration..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Kill any existing processes on port 5173
echo "🛑 Stopping old server..."
lsof -ti:5173 | xargs kill -9 2>/dev/null
sleep 2
echo "✅ Old server stopped"
echo ""

# Start new server
echo "🚀 Starting fresh server with .env configuration..."
echo ""
npm run dev

