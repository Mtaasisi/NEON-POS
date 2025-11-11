#!/bin/bash

# ============================================
# IMEI VALIDATION QUICK RUN SCRIPT
# ============================================

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║          🔍 IMEI VALIDATION QUICK START                      ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js haipo! Tafadhali install Node.js kwanza."
    echo "   Download: https://nodejs.org/"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file haipatikani!"
    echo "   Tafadhali unda .env file na DATABASE_URL/VITE_DATABASE_URL"
    exit 1
fi

# Check if validation script exists
if [ ! -f run-imei-validation.mjs ]; then
    echo "❌ run-imei-validation.mjs script haipatikani!"
    exit 1
fi

# Run the validation
echo "🚀 Inaanza validation..."
echo ""

node run-imei-validation.mjs

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Validation imekamilika kwa mafanikio!"
    echo ""
    echo "📄 Tazama matokeo zaidi kwenye:"
    echo "   • ✅_IMEI_VALIDATION_COMPLETE.md"
    echo "   • 📋_IMEI_VALIDATION_GUIDE.md"
    echo ""
else
    echo ""
    echo "❌ Kuna hitilafu imetokea!"
    echo "   Tafadhali angalia error message hapo juu."
    echo ""
fi

