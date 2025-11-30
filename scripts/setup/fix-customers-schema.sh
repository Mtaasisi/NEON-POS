#!/bin/bash
# ============================================================================
# Fix Customers Table Schema - Add Missing Columns
# ============================================================================

# Your Neon database connection string
DATABASE_URL="postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

echo "========================================="
echo "🔧 Fixing Customers Table Schema"
echo "========================================="
echo ""
echo "This will add missing columns to your customers table:"
echo "  ✓ branch_id"
echo "  ✓ is_active (if missing)"
echo "  ✓ total_spent (if missing)"
echo "  ✓ id (primary key - already exists)"
echo "  ✓ And many other columns..."
echo ""
echo "⚠️  This migration is SAFE:"
echo "  • Won't delete any existing data"
echo "  • Won't modify existing columns"
echo "  • Only adds missing columns"
echo "  • Uses IF NOT EXISTS checks"
echo ""
read -p "Continue? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Migration cancelled"
    exit 1
fi

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo ""
    echo "❌ psql is not installed or not in PATH"
    echo ""
    echo "Please install PostgreSQL client tools:"
    echo "  • macOS: brew install postgresql"
    echo "  • Ubuntu/Debian: sudo apt install postgresql-client"
    echo "  • Windows: Download from postgresql.org"
    echo ""
    exit 1
fi

# Check if the SQL file exists
if [ ! -f "migrations/fix_customers_table_add_missing_columns.sql" ]; then
    echo "❌ File not found: migrations/fix_customers_table_add_missing_columns.sql"
    echo "Please run this script from the project root directory"
    exit 1
fi

echo "📁 Found SQL file: migrations/fix_customers_table_add_missing_columns.sql"
echo "🔗 Connecting to Neon database..."
echo ""

# Apply the migration
psql "$DATABASE_URL" -f "migrations/fix_customers_table_add_missing_columns.sql"

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================="
    echo "✅ Migration completed successfully!"
    echo "========================================="
    echo ""
    echo "Your customers table now has all required columns."
    echo "The application errors should be resolved."
    echo ""
    echo "Next steps:"
    echo "  1. Refresh your application in the browser"
    echo "  2. Check the browser console for errors"
    echo "  3. Test customer-related features"
    echo ""
else
    echo ""
    echo "========================================="
    echo "❌ Error applying migration"
    echo "========================================="
    echo ""
    echo "Please check the error messages above."
    echo ""
    echo "Common issues:"
    echo "  • Database connection timeout"
    echo "  • Invalid connection string"
    echo "  • Network connectivity issues"
    echo ""
    exit 1
fi

