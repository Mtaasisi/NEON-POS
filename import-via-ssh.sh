#!/bin/bash

# Alternative import method via SSH/Command Line
# Use this if you have SSH access to your Hostinger account

echo "=========================================="
echo "Hostinger MySQL Import via Command Line"
echo "=========================================="
echo ""

# Database credentials (update these if different)
DB_NAME="u440907902_neondb"
DB_USER="u440907902_neondb_user"
DB_PASS="NeonDB2024!Secure"
DB_HOST="localhost"  # Usually localhost for Hostinger

SQL_FILE="database-backup-2025-12-06T02-11-20-mysql.sql"

if [ ! -f "$SQL_FILE" ]; then
    echo "❌ Error: SQL file not found: $SQL_FILE"
    exit 1
fi

echo "📁 SQL File: $SQL_FILE"
echo "📊 File size: $(du -h "$SQL_FILE" | cut -f1)"
echo ""

# Check if mysql command is available
if ! command -v mysql &> /dev/null; then
    echo "⚠️  MySQL client not found locally."
    echo ""
    echo "To use this script, you need:"
    echo "1. SSH access to your Hostinger account"
    echo "2. Run this command on the server:"
    echo ""
    echo "   mysql -u $DB_USER -p$DB_PASS $DB_NAME < $SQL_FILE"
    echo ""
    echo "Or upload the file via FTP/SFTP and run the command on the server."
    exit 1
fi

echo "✅ MySQL client found"
echo ""
read -p "Do you want to import now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔄 Importing database..."
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$SQL_FILE"
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Import completed successfully!"
    else
        echo ""
        echo "❌ Import failed. Check the error messages above."
        exit 1
    fi
else
    echo "Import cancelled."
fi

