#!/bin/bash

# ============================================================================
# IMEI SYSTEM SETUP - Quick Runner
# ============================================================================
# This script runs the complete IMEI setup on your Neon database
# ============================================================================

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║        🚀 RUNNING IMEI SYSTEM SETUP 🚀                        ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Your Neon database connection string
DB_CONNECTION="postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

echo "📊 Checking if psql is installed..."
if ! command -v psql &> /dev/null; then
    echo "❌ psql not found!"
    echo ""
    echo "Please install PostgreSQL client:"
    echo "  • macOS: brew install postgresql"
    echo "  • Ubuntu: sudo apt-get install postgresql-client"
    echo ""
    echo "OR use Supabase SQL Editor instead (see instructions below)"
    exit 1
fi

echo "✅ psql found"
echo ""

echo "📝 File to execute: apply-system-fixes.sql"
echo "📊 File size: $(wc -l < apply-system-fixes.sql) lines"
echo ""

echo "🔌 Connecting to Neon database..."
echo "🗄️  Database: neondb"
echo "🌐 Region: us-east-1"
echo ""

echo "⚡ Executing SQL setup..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Run the SQL file
psql "$DB_CONNECTION" -f apply-system-fixes.sql

# Check exit status
if [ $? -eq 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║              ✅ SETUP COMPLETE! ✅                            ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
    echo "🎉 Your IMEI system is now ready!"
    echo ""
    echo "📋 Next steps:"
    echo "  1. Verify: node check-and-add-missing-columns.mjs"
    echo "  2. Learn:  Read 📘_IMEI_QUICK_START_GUIDE.md"
    echo "  3. Test:   Try adding a test IMEI"
    echo ""
else
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "❌ Setup failed!"
    echo ""
    echo "Please check the error messages above."
    echo "Common issues:"
    echo "  • Network connectivity"
    echo "  • Database permissions"
    echo "  • Invalid connection string"
    echo ""
    echo "Alternative: Use Supabase SQL Editor"
    echo "  1. Open Supabase Dashboard"
    echo "  2. Go to SQL Editor"
    echo "  3. Copy/paste apply-system-fixes.sql"
    echo "  4. Click RUN"
    echo ""
    exit 1
fi

