#!/bin/bash

echo "🎯 Device Creation Test Setup & Run"
echo "===================================="
echo ""

# Check if Playwright is installed
if ! npm list playwright > /dev/null 2>&1; then
    echo "📦 Installing Playwright..."
    npm install --save-dev playwright
    
    echo ""
    echo "🌐 Installing browser binaries..."
    npx playwright install chromium
else
    echo "✅ Playwright already installed"
fi

echo ""
echo "🚀 Starting test..."
echo ""

# Run the test
node auto-test-device-creation.mjs

echo ""
echo "✅ Test complete! Check test-screenshots-device-creation/ for results"

