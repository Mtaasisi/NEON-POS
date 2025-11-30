#!/bin/bash

# Load environment variables
export $(grep -v '^#' .env | xargs)

echo "🔧 Fixing validate_new_imei function"
echo ""

# Execute the SQL file
psql "$DATABASE_URL" -f fix-validate-new-imei.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Validation fix applied successfully!"
    echo ""
else
    echo ""
    echo "❌ Error applying validation fix"
    echo ""
    exit 1
fi

