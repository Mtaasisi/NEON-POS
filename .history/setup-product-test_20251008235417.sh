#!/bin/bash

# 🎯 Quick Setup for Product Creation Test
# This installs Playwright and runs the automated test

echo "============================================================"
echo "🚀 Setting up Product Creation Auto-Test"
echo "============================================================"
echo ""

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install Node.js first."
    exit 1
fi

echo "📦 Installing Playwright..."
npm install --save-dev playwright

echo ""
echo "🌐 Installing Playwright Chromium browser..."
npx playwright install chromium

echo ""
echo "============================================================"
echo "✅ Setup Complete!"
echo "============================================================"
echo ""
echo "Now you can run the test with:"
echo "  node auto-test-product-creation.mjs"
echo ""
echo "Or use this script to run it directly:"
echo "  ./setup-product-test.sh run"
echo ""

# If 'run' argument is passed, run the test
if [ "$1" = "run" ]; then
    echo "🧪 Running Product Creation Test..."
    echo ""
    node auto-test-product-creation.mjs
fi

