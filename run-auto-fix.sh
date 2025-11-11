#!/bin/bash

# Load environment variables
export $(grep -v '^#' .env | xargs)

echo "╔═══════════════════════════════════════════════════════════════════════════╗"
echo "║                    AUTOMATIC DATA CLEANUP & FIXES                         ║"
echo "╚═══════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "This will automatically fix all data issues found in the audit..."
echo ""

# Run the automatic fixes
psql "$DATABASE_URL" -f AUTO_FIX_DATA_ISSUES.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All fixes applied successfully!"
    echo ""
else
    echo ""
    echo "❌ Some fixes encountered errors"
    echo ""
    exit 1
fi

