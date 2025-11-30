#!/bin/bash

# Script to apply the RLS fix migration
# This is a simpler alternative using psql command

echo "🔧 Applying RLS Fix Migration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ] && [ -z "$VITE_DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL or VITE_DATABASE_URL not found"
    echo "Please set the database URL in your .env file or export it:"
    echo "  export DATABASE_URL='your-connection-string'"
    exit 1
fi

# Use VITE_DATABASE_URL if DATABASE_URL is not set
DB_URL="${DATABASE_URL:-$VITE_DATABASE_URL}"

echo "✅ Database URL found"
echo "📄 Reading migration file..."

# Apply migration
psql "$DB_URL" -f migrations/fix_daily_closure_rls_comprehensive.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Migration applied successfully!"
    echo ""
    echo "💡 Next steps:"
    echo "   1. Refresh your application in the browser"
    echo "   2. The 'No data returned from insert' error should be resolved"
    echo "   3. Daily closure and session tracking should work properly"
    echo ""
else
    echo ""
    echo "❌ Migration failed! Please check the error messages above."
    exit 1
fi

