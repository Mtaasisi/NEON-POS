#!/bin/bash
# Restore Database Command
# This script restores the backup to your database

BACKUP_FILE="database-backup-full-2025-11-30T12-19-28.sql"

# Get database URL from .env
DATABASE_URL=$(grep -E "^(DATABASE_URL|VITE_DATABASE_URL)=" .env | head -1 | cut -d '=' -f2- | tr -d '"' | tr -d "'")

if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL not found in .env file"
    exit 1
fi

# Convert pooler endpoint to direct endpoint for psql
DIRECT_URL=$(echo "$DATABASE_URL" | sed 's/-pooler\.c-2\./.c-2./g')

echo "📦 Restoring backup: $BACKUP_FILE"
echo "🔌 Database: ${DIRECT_URL:0:60}..."
echo ""
echo "⚠️  WARNING: This will overwrite your current database!"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

# Extract password for PGPASSWORD
PASSWORD=$(echo "$DIRECT_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')

# Restore
PGPASSWORD="$PASSWORD" psql "$DIRECT_URL" -f "$BACKUP_FILE"

echo ""
echo "✅ Restore complete!"
