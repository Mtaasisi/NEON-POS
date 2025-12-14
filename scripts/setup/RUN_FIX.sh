#!/bin/bash

# Quick fix script for delivery settings error
# Run this to apply the database migration

echo "🔧 Applying delivery settings fix..."
echo ""

# Run the migration
node run-migration.mjs migrations/create_pos_settings_tables.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration applied successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Restart your dev server if it's running"
    echo "2. Clear browser cache or do a hard refresh (Cmd+Shift+R)"
    echo "3. The delivery settings errors should be gone!"
    echo ""
else
    echo ""
    echo "❌ Migration failed. Check the error above."
    echo ""
    echo "Alternative: Copy migrations/create_pos_settings_tables.sql"
    echo "and run it manually in your Neon database console."
    echo ""
fi

