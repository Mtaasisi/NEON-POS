#!/bin/bash

# Payment Accounts - Automated Test Runner
# Quick script to run all tests

echo "🧪 Payment Accounts - Test Suite"
echo "=================================="
echo ""

# Check if dev server is running
if ! lsof -ti:5173 > /dev/null 2>&1; then
    echo "❌ Error: Dev server not running on port 5173"
    echo ""
    echo "Please start the dev server first:"
    echo "  npm run dev"
    echo ""
    exit 1
fi

echo "✅ Dev server is running"
echo ""

# Check if playwright is installed
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npx not found"
    echo "Please install Node.js"
    exit 1
fi

# Check if test file exists
if [ ! -f "test-payment-accounts.js" ]; then
    echo "❌ Error: test-payment-accounts.js not found"
    exit 1
fi

echo "📋 Test Options:"
echo "1. Run automated tests (Playwright)"
echo "2. Open visual test guide"
echo "3. View test documentation"
echo "4. Run quick manual test"
echo ""
read -p "Select option (1-4): " option

case $option in
    1)
        echo ""
        echo "🚀 Running automated tests..."
        echo ""
        
        # Check if playwright is installed
        if ! npm list playwright > /dev/null 2>&1; then
            echo "⚠️  Playwright not found. Installing..."
            npm install --save-dev playwright
        fi
        
        node test-payment-accounts.js
        ;;
    2)
        echo ""
        echo "📖 Opening visual test guide..."
        open test-payment-accounts.html
        echo "✅ Test guide opened in browser"
        ;;
    3)
        echo ""
        echo "📚 Opening test documentation..."
        open PAYMENT_ACCOUNTS_TESTING.md
        echo "✅ Documentation opened"
        ;;
    4)
        echo ""
        echo "🌐 Quick Manual Test:"
        echo ""
        echo "1. Opening application in browser..."
        open "http://localhost:5173/payments"
        echo ""
        echo "2. Manual Test Steps:"
        echo "   - Login with admin credentials"
        echo "   - Click 'Payment Accounts' tab"
        echo "   - Click 'Add Account' button"
        echo "   - Test the form with different account types"
        echo ""
        echo "3. Features to verify:"
        echo "   ✓ Currency dropdown (6 currencies)"
        echo "   ✓ Type-specific fields"
        echo "   ✓ Validation messages"
        echo "   ✓ All 4 settings checkboxes"
        echo ""
        ;;
    *)
        echo "Invalid option"
        exit 1
        ;;
esac

echo ""
echo "=================================="
echo "✨ Done!"

