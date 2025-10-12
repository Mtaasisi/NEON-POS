#!/bin/bash

# Customer Creation Test Runner
# This script starts the dev server and opens the automated test

echo "🧪 Customer Creation Automated Test"
echo "===================================="
echo ""
echo "Starting development server..."
echo ""

# Start the vite dev server in the background
npm run dev &
DEV_PID=$!

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 5

# Open the test file in default browser
echo "🌐 Opening test in browser..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open "http://localhost:5173/auto-test-customer-creation.html"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    xdg-open "http://localhost:5173/auto-test-customer-creation.html"
else
    # Windows
    start "http://localhost:5173/auto-test-customer-creation.html"
fi

echo ""
echo "✅ Test opened in browser!"
echo "📋 The test will automatically:"
echo "   1. Connect to your database"
echo "   2. Test customer creation"
echo "   3. Identify any errors"
echo "   4. Show you how to fix them"
echo ""
echo "Press Ctrl+C to stop the server when done"
echo ""

# Wait for user to stop
wait $DEV_PID

