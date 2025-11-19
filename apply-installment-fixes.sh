#!/bin/bash

# ============================================
# Apply Installment Plan Fixes
# ============================================
# This script applies the database migrations
# needed to fix the installment plan issues
# ============================================

echo "🔧 Applying Installment Plan Fixes..."
echo ""

# Check if .env file exists and has DATABASE_URL
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Please create a .env file with your DATABASE_URL"
    echo ""
    echo "Example:"
    echo "DATABASE_URL=postgresql://user:password@host:5432/database"
    exit 1
fi

# Check if DATABASE_URL is set
if ! grep -q "DATABASE_URL" .env; then
    echo "❌ DATABASE_URL not found in .env file!"
    echo "Please add your DATABASE_URL to .env"
    exit 1
fi

echo "✅ Found DATABASE_URL in .env"
echo ""

# Run the migration
echo "📊 Running database migration..."
echo ""

node run-migration.mjs migrations/FIX_installment_and_stock_columns.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "🎉 All fixes applied! You can now:"
    echo "   1. Run the test again: node test-installment-plan.mjs"
    echo "   2. Create installment plans in the POS"
    echo ""
else
    echo ""
    echo "❌ Migration failed!"
    echo "Please check the error messages above"
    echo ""
    exit 1
fi

