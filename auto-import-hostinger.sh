#!/bin/bash

# Automated MySQL Import Script for Hostinger
# This script attempts to import via command line if SSH access is available

echo "=========================================="
echo "Automated Hostinger Database Import"
echo "=========================================="
echo ""

SQL_FILE="database-backup-2025-12-06T02-11-20-mysql.sql"
DB_NAME="u440907902_neondb"
DB_USER="u440907902_neondb_user"
DB_PASS="NeonDB2024!Secure"

if [ ! -f "$SQL_FILE" ]; then
    echo "❌ Error: SQL file not found: $SQL_FILE"
    exit 1
fi

echo "📁 SQL File: $SQL_FILE"
echo "📊 File size: $(du -h "$SQL_FILE" | cut -f1)"
echo ""

# Check if we can connect to Hostinger MySQL
# Hostinger typically uses localhost from server, but external access might be available
# Common Hostinger MySQL hosts: localhost, mysql.hostinger.com, or server-specific

echo "🔍 Attempting to find Hostinger MySQL connection..."
echo ""

# Try common Hostinger MySQL connection methods
HOSTS=("localhost" "mysql.hostinger.com" "127.0.0.1")

for HOST in "${HOSTS[@]}"; do
    echo "Trying host: $HOST..."
    
    # Test connection
    if mysql -h "$HOST" -u "$DB_USER" -p"$DB_PASS" -e "USE $DB_NAME; SELECT 1;" 2>/dev/null; then
        echo "✅ Connected to $HOST!"
        echo ""
        echo "🔄 Importing database..."
        
        mysql -h "$HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$SQL_FILE"
        
        if [ $? -eq 0 ]; then
            echo ""
            echo "✅ Import completed successfully!"
            exit 0
        else
            echo ""
            echo "❌ Import failed. Check error messages above."
            exit 1
        fi
    fi
done

echo ""
echo "⚠️  Could not connect to Hostinger MySQL via command line."
echo ""
echo "This usually means:"
echo "1. External MySQL access is not enabled on Hostinger"
echo "2. You need SSH access to run this on the server"
echo ""
echo "Alternative: Use phpMyAdmin web interface"
echo "1. Go to: https://hpanel.hostinger.com"
echo "2. Navigate to Databases → phpMyAdmin"
echo "3. Click Import tab"
echo "4. Select file: $SQL_FILE"
echo "5. Click Import button"
echo ""

