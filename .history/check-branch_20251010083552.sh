#!/bin/bash

# 🔍 Check Current Database Branch

echo "🔍 Checking current database configuration..."
echo ""

if [ -f .env ]; then
    echo "📄 Current .env file contents:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cat .env | grep -v "^#" | grep -v "^$"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Extract endpoint from DATABASE_URL
    ENDPOINT=$(grep "DATABASE_URL" .env | sed 's/.*@\(.*\)-pooler.*/\1/')
    
    if [[ $ENDPOINT == *"damp-fire-adtxvumr"* ]]; then
        echo "📊 Detected Branch: One of the active branches"
        echo "   Available branches: development, production, or production_old"
    else
        echo "⚠️  Unknown endpoint detected: $ENDPOINT"
    fi
else
    echo "❌ No .env file found!"
    echo ""
    echo "💡 Create one by running:"
    echo "   ./switch-to-dev.sh    (for development)"
    echo "   ./switch-to-prod.sh   (for production)"
fi

echo ""
echo "🗄️  All available branches:"
echo "   • development (default) - For testing"
echo "   • production - Live data"
echo "   • production_old - Backup from 2025-10-10"

