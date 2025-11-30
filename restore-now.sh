#!/bin/bash

# =====================================================
# Quick Restore Script
# =====================================================
# This script restores the full database backup
# ⚠️  WARNING: This will overwrite your current database!

BACKUP_FILE="database-backup-full-2025-11-30T12-19-28.sql"
DATABASE_URL="postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║          RESTORE FULL DATABASE BACKUP                            ║"
echo "║          ⚠️  WARNING: Will Overwrite Current Database!          ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "📦 Backup File: $BACKUP_FILE"
echo "🔌 Database: ${DATABASE_URL:0:70}..."
echo ""
echo "⚠️  This will DELETE all current data and replace with backup data!"
echo ""
read -p "Type 'yes' to continue: " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Restore cancelled."
    exit 0
fi

echo ""
echo "🔄 Starting restore..."
echo ""

# Run the restore
psql "$DATABASE_URL" -f "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Restore completed successfully!"
else
    echo ""
    echo "❌ Restore failed. Check the error messages above."
    exit 1
fi
