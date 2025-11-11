#!/bin/bash

# Load environment variables
export $(grep -v '^#' .env | xargs)

echo "🔧 Fixing IMEI validation triggers"
echo ""

# Execute the SQL file
psql "$DATABASE_URL" -f fix-imei-triggers.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Trigger fix applied successfully!"
    echo ""
else
    echo ""
    echo "❌ Error applying trigger fix"
    echo ""
    exit 1
fi

