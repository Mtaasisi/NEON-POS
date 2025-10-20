#!/bin/bash

# Open the Product Fix Guide in the default browser

echo "🚀 Opening Product Display Fix Guide..."
echo ""

# Check if the HTML file exists
if [ ! -f "product-fix-guide.html" ]; then
    echo "❌ Error: product-fix-guide.html not found!"
    echo "   Please make sure you're in the correct directory."
    exit 1
fi

# Detect OS and open accordingly
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open product-fix-guide.html
    echo "✅ Guide opened in your default browser (macOS)"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    xdg-open product-fix-guide.html
    echo "✅ Guide opened in your default browser (Linux)"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    # Windows (Git Bash or Cygwin)
    start product-fix-guide.html
    echo "✅ Guide opened in your default browser (Windows)"
else
    echo "⚠️  Could not detect your operating system"
    echo "   Please manually open: product-fix-guide.html"
fi

echo ""
echo "📖 Follow the step-by-step instructions in the guide"
echo "⚡ Use the QUICK FIX method for fastest results"
echo ""

