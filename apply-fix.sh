#!/bin/bash
# ============================================================================
# Apply IMEI Fix to Neon Database
# ============================================================================

# Set your database connection string
DATABASE_URL="postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

echo "========================================="
echo "🚀 Applying IMEI System Fix"
echo "========================================="
echo ""

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo "❌ psql is not installed or not in PATH"
    echo "Please install PostgreSQL client tools"
    exit 1
fi

# Check if the SQL file exists
if [ ! -f "migrations/COMPLETE_IMEI_SYSTEM_FIX.sql" ]; then
    echo "❌ File not found: migrations/COMPLETE_IMEI_SYSTEM_FIX.sql"
    echo "Please run this script from the project root directory"
    exit 1
fi

echo "📁 Found SQL file: migrations/COMPLETE_IMEI_SYSTEM_FIX.sql"
echo "🔗 Connecting to database..."
echo ""

# Apply the fix
psql "$DATABASE_URL" -f "migrations/COMPLETE_IMEI_SYSTEM_FIX.sql"

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================="
    echo "✅ Fix applied successfully!"
    echo "========================================="
    echo ""
    echo "Next steps:"
    echo "1. Test receiving a PO with IMEI"
    echo "2. Verify IMEIs are saved in database"
else
    echo ""
    echo "========================================="
    echo "❌ Error applying fix"
    echo "========================================="
    echo ""
    echo "Please check the error messages above"
    exit 1
fi
