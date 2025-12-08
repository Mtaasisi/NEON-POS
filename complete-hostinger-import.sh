#!/bin/bash

# Script to help complete the Hostinger database import
# This script prepares the SQL file and provides instructions

echo "=========================================="
echo "Hostinger Database Import Helper"
echo "=========================================="
echo ""

# Check if converted file exists
CONVERTED_FILE="database-backup-2025-12-06T02-11-20-mysql.sql"

if [ ! -f "$CONVERTED_FILE" ]; then
    echo "❌ Error: Converted file not found: $CONVERTED_FILE"
    exit 1
fi

echo "✅ Found converted file: $CONVERTED_FILE"
echo ""

# Get file size
FILE_SIZE=$(du -h "$CONVERTED_FILE" | cut -f1)
echo "📊 File size: $FILE_SIZE"
echo ""

# Check if file needs compression (phpMyAdmin has upload limits)
if [ $(stat -f%z "$CONVERTED_FILE" 2>/dev/null || stat -c%s "$CONVERTED_FILE" 2>/dev/null) -gt 10485760 ]; then
    echo "⚠️  File is larger than 10MB. Consider compressing it:"
    echo "   gzip $CONVERTED_FILE"
    echo "   This will create: ${CONVERTED_FILE}.gz"
    echo ""
fi

echo "=========================================="
echo "Next Steps:"
echo "=========================================="
echo ""
echo "1. ✅ Database name and username are filled in the form"
echo "2. ⚠️  MANUAL STEP: Fill in the password field with: NeonDB2024!Secure"
echo "3. ⚠️  MANUAL STEP: Click the green 'Create' button"
echo "4. ⚠️  MANUAL STEP: Wait for database creation confirmation"
echo "5. ⚠️  MANUAL STEP: Click 'Databases' → 'phpMyAdmin' in left sidebar"
echo "6. ⚠️  MANUAL STEP: In phpMyAdmin:"
echo "   - Select your database (u440907902_neondb)"
echo "   - Click 'Import' tab"
echo "   - Click 'Choose File' and select: $CONVERTED_FILE"
echo "   - Click 'Go' button"
echo ""
echo "=========================================="
echo "File Location:"
echo "=========================================="
echo "$(pwd)/$CONVERTED_FILE"
echo ""
echo "You can drag and drop this file into phpMyAdmin's file upload area."
echo ""

