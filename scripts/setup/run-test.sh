#!/bin/bash

echo "🧪 Running Variant Name Display Test"
echo "===================================="
echo ""

# Check if Playwright is installed
if ! command -v npx &> /dev/null; then
    echo "❌ npx not found. Please install Node.js first."
    exit 1
fi

# Check if test file exists
if [ ! -f "test-variant-names.spec.ts" ]; then
    echo "❌ Test file not found: test-variant-names.spec.ts"
    exit 1
fi

# Check if dev server is running
echo "🔍 Checking if dev server is running on port 5173..."
if ! lsof -ti:5173 > /dev/null; then
    echo "❌ Dev server not running on port 5173"
    echo "Please start the dev server first: npm run dev"
    exit 1
fi

echo "✅ Dev server is running"
echo ""

# Install Playwright if needed
echo "📦 Ensuring Playwright is installed..."
npx playwright install chromium --with-deps

echo ""
echo "🚀 Running tests..."
echo ""

# Run the test
npx playwright test test-variant-names.spec.ts --headed --project=chromium

echo ""
echo "✅ Test execution complete!"
echo "Check test-results/ folder for screenshots"

