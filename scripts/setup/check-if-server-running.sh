#!/bin/bash

echo "🔍 Checking if dev server is running..."
echo ""

# Check if port 5173 is in use (default Vite port)
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "✅ Dev server is running on port 5173"
    echo ""
    echo "🌐 App URL: http://localhost:5173"
    echo ""
    echo "To test the app:"
    echo "1. Open: http://localhost:5173"
    echo "2. Login: care@care.com / 123456"
    echo "3. Follow: 🧪_MANUAL_TEST_GUIDE.md"
else
    echo "❌ Dev server is NOT running"
    echo ""
    echo "⚡ START SERVER NOW:"
    echo ""
    echo "   npm run dev"
    echo ""
    echo "Then wait for: 'Local: http://localhost:5173'"
    echo "Then open browser and test!"
fi

echo ""
echo "═══════════════════════════════════════════════════════"

