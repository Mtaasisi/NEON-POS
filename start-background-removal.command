#!/bin/bash
# Background Removal Tool - Desktop Launcher
# Double-click this file to start the tool

clear
echo "🎨 Starting Background Removal Tool..."
echo ""

# Change to the correct directory
cd "$(dirname "$0")"

# Check if API is already running
if lsof -Pi :5001 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ API is already running on port 5001"
else
    echo "🚀 Starting Background Removal API..."
    python3 bg-removal-api.py > /dev/null 2>&1 &
    echo "✅ API started on port 5001"
    sleep 3
fi

# Open the web interface
echo ""
echo "🌐 Opening Background Removal Tool..."
open "http://localhost:5173/background-removal"

echo ""
echo "✨ Background Removal Tool is ready!"
echo ""
echo "📍 Web Interface: http://localhost:5173/background-removal"
echo "📍 API Server: http://localhost:5001"
echo ""
echo "💡 Keep this window open while using the tool"
echo "   Close this window to stop the API server"
echo ""

# Keep the terminal open
read -p "Press any key to stop the API and close..."

# Stop the API
pkill -f "bg-removal-api"
echo "👋 Background Removal API stopped. Goodbye!"

