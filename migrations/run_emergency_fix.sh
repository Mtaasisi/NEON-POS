#!/bin/bash

# ============================================
# Quick Script to Run Emergency Fix
# ============================================
# This script runs the emergency fix directly on your Neon database
# 
# Usage:
#   1. Make executable: chmod +x run_emergency_fix.sh
#   2. Run: ./run_emergency_fix.sh
#
# You'll need to set your DATABASE_URL environment variable first:
#   export DATABASE_URL="postgresql://user:password@host/database"
# ============================================

set -e  # Exit on error

echo "🔧 Starting Emergency Fix for process_purchase_order_payment..."
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set!"
    echo ""
    echo "Please set it first:"
    echo "  export DATABASE_URL=\"postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require\""
    echo ""
    echo "You can find your connection string in:"
    echo "  - Neon Console → Your Project → Connection Details"
    echo "  - Or your .env file"
    exit 1
fi

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo "❌ ERROR: psql is not installed!"
    echo ""
    echo "Please install PostgreSQL client:"
    echo "  macOS: brew install postgresql"
    echo "  Ubuntu/Debian: sudo apt-get install postgresql-client"
    echo "  Or use the Neon/Supabase SQL Editor instead"
    exit 1
fi

echo "✅ DATABASE_URL is set"
echo "✅ psql is available"
echo ""

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SQL_FILE="$SCRIPT_DIR/EMERGENCY_FIX_process_purchase_order_payment.sql"

# Check if the SQL file exists
if [ ! -f "$SQL_FILE" ]; then
    echo "❌ ERROR: SQL file not found at: $SQL_FILE"
    exit 1
fi

echo "📄 Found SQL file: $SQL_FILE"
echo ""
echo "🚀 Running migration..."
echo "================================"
echo ""

# Run the SQL file
psql "$DATABASE_URL" -f "$SQL_FILE"

echo ""
echo "================================"
echo "✅ Migration completed!"
echo ""
echo "Next steps:"
echo "  1. Refresh your application"
echo "  2. Try processing a payment again"
echo "  3. The UUID error should be resolved"
echo ""

