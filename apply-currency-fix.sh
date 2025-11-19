#!/bin/bash

# ============================================
# Apply Currency Conversion Fix
# ============================================
# This script applies the currency conversion fix to your Neon database
# Run this after updating the code to fix supplier statistics
# ============================================

set -e

echo "🔧 Applying Currency Conversion Fix for Supplier Statistics"
echo "============================================"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo ""
    echo "Please set your Neon database URL:"
    echo "  export DATABASE_URL='postgresql://user:password@host/database'"
    echo ""
    exit 1
fi

echo "✅ Database URL found"
echo ""

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo "❌ ERROR: psql is not installed"
    echo ""
    echo "Please install PostgreSQL client:"
    echo "  macOS: brew install postgresql"
    echo "  Ubuntu: sudo apt-get install postgresql-client"
    echo ""
    exit 1
fi

echo "✅ psql found"
echo ""

# Apply the migration
echo "📦 Applying migration: fix_supplier_stats_currency_conversion.sql"
echo ""

psql "$DATABASE_URL" -f migrations/fix_supplier_stats_currency_conversion.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "============================================"
    echo "✅ Currency conversion fix applied successfully!"
    echo ""
    echo "Next steps:"
    echo "  1. Restart your application"
    echo "  2. Check supplier statistics in the Purchase Orders page"
    echo "  3. Verify that amounts are showing correctly in TZS"
    echo ""
else
    echo ""
    echo "❌ Migration failed. Please check the error messages above."
    echo ""
    exit 1
fi

