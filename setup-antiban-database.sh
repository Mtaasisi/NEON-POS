#!/bin/bash

# ============================================
# Setup Anti-Ban Settings Database Table
# ============================================

echo "🚀 Setting up Anti-Ban Settings Database..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Database configuration
DB_NAME=${DB_NAME:-"lats_db"}
DB_USER=${DB_USER:-"root"}
DB_HOST=${DB_HOST:-"localhost"}

echo "📋 Database Configuration:"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  Host: $DB_HOST"
echo ""

# Check if mysql command is available
if ! command -v mysql &> /dev/null; then
    echo -e "${RED}❌ MySQL client not found!${NC}"
    echo "Please install MySQL client or use phpMyAdmin to run the migration."
    echo "Migration file: migrations/create_whatsapp_antiban_settings.sql"
    exit 1
fi

# Prompt for password
echo -e "${YELLOW}🔐 Enter MySQL password for user '$DB_USER':${NC}"
read -s DB_PASSWORD
echo ""

# Run migration
echo "📦 Running migration..."
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < migrations/create_whatsapp_antiban_settings.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Migration completed successfully!${NC}"
    echo ""
    
    # Verify table was created
    echo "🔍 Verifying table creation..."
    TABLE_EXISTS=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -sse "SHOW TABLES LIKE 'whatsapp_antiban_settings';" 2>/dev/null)
    
    if [ "$TABLE_EXISTS" = "whatsapp_antiban_settings" ]; then
        echo -e "${GREEN}✅ Table 'whatsapp_antiban_settings' created successfully!${NC}"
        echo ""
        
        # Show table structure
        echo "📊 Table structure:"
        mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "DESCRIBE whatsapp_antiban_settings;" 2>/dev/null
        echo ""
        
        # Check default settings
        echo "🎯 Default settings:"
        mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT * FROM whatsapp_antiban_settings WHERE user_id IS NULL;" 2>/dev/null
        echo ""
        
        echo -e "${GREEN}🎉 Setup Complete!${NC}"
        echo ""
        echo "Next steps:"
        echo "  1. Restart backend server: cd server && npm run dev"
        echo "  2. Restart frontend: npm run dev"
        echo "  3. Open WhatsApp Inbox"
        echo "  4. Settings will auto-load from database ✅"
        echo ""
        echo "📖 See ANTIBAN_SETTINGS_DATABASE.md for full documentation"
    else
        echo -e "${RED}❌ Table verification failed!${NC}"
        echo "Please check the migration file and database permissions."
    fi
else
    echo -e "${RED}❌ Migration failed!${NC}"
    echo ""
    echo "Common issues:"
    echo "  - Wrong password"
    echo "  - Database doesn't exist"
    echo "  - Insufficient permissions"
    echo ""
    echo "Manual setup:"
    echo "  1. Open phpMyAdmin"
    echo "  2. Select database '$DB_NAME'"
    echo "  3. Go to SQL tab"
    echo "  4. Copy/paste: migrations/create_whatsapp_antiban_settings.sql"
    echo "  5. Click Go"
    exit 1
fi

