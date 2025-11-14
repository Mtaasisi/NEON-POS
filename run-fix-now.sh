#!/bin/bash

# ============================================
# Run Currency Fix - Direct Execution
# ============================================
# This script runs the currency conversion fix with your Neon database
# ============================================

set -e

echo "🔧 Running Currency Conversion Fix"
echo "============================================"
echo ""

# Your Neon database connection string
DATABASE_URL='postgresql://neondb_owner:npg_vABqUKk73tEW@ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'

echo "✅ Connecting to Neon database..."
echo ""

# Run the migration
psql "$DATABASE_URL" -f migrations/fix_supplier_stats_currency_conversion.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "============================================"
    echo "✅ Currency conversion fix completed successfully!"
    echo ""
    echo "Your supplier statistics should now show correct TZS amounts."
    echo ""
    echo "Next steps:"
    echo "  1. Restart your application: npm run dev"
    echo "  2. Open Purchase Orders page"
    echo "  3. Check supplier statistics"
    echo ""
else
    echo ""
    echo "❌ Migration failed. Please check the error messages above."
    echo ""
    exit 1
fi

