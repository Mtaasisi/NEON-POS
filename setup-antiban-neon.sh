#!/bin/bash

# ============================================
# Setup Anti-Ban Settings on Neon PostgreSQL
# ============================================

echo "🚀 Setting up Anti-Ban Settings on Neon PostgreSQL..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Neon database URL
NEON_URL="postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"

echo -e "${BLUE}📋 Database Configuration:${NC}"
echo "  Database: Neon PostgreSQL"
echo "  Connection: Secure (SSL)"
echo ""

# Check if psql command is available
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️ psql client not found!${NC}"
    echo ""
    echo "Installing psql..."
    echo ""
    
    # Try to install based on OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            echo "Installing via Homebrew..."
            brew install postgresql
        else
            echo -e "${RED}❌ Homebrew not found!${NC}"
            echo "Please install Homebrew first: https://brew.sh"
            echo ""
            echo "Or use the web-based SQL editor at: https://console.neon.tech"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        echo "Installing via apt..."
        sudo apt-get update
        sudo apt-get install -y postgresql-client
    else
        echo -e "${RED}❌ Could not install psql automatically${NC}"
        echo ""
        echo "Manual installation:"
        echo "  macOS: brew install postgresql"
        echo "  Linux: sudo apt-get install postgresql-client"
        echo ""
        echo "Or use Neon's web SQL editor: https://console.neon.tech"
        exit 1
    fi
fi

# Run migration
echo "📦 Running migration..."
echo ""

psql "$NEON_URL" < migrations/create_whatsapp_antiban_settings_postgres.sql

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Migration completed successfully!${NC}"
    echo ""
    
    # Verify table was created
    echo "🔍 Verifying table creation..."
    TABLE_EXISTS=$(psql "$NEON_URL" -tAc "SELECT to_regclass('public.whatsapp_antiban_settings');" 2>/dev/null)
    
    if [ "$TABLE_EXISTS" != "" ] && [ "$TABLE_EXISTS" != "null" ]; then
        echo -e "${GREEN}✅ Table 'whatsapp_antiban_settings' created successfully!${NC}"
        echo ""
        
        # Show table structure
        echo "📊 Table structure:"
        psql "$NEON_URL" -c "\d whatsapp_antiban_settings" 2>/dev/null
        echo ""
        
        # Check default settings
        echo "🎯 Default settings:"
        psql "$NEON_URL" -c "SELECT * FROM whatsapp_antiban_settings WHERE user_id IS NULL;" 2>/dev/null
        echo ""
        
        echo -e "${GREEN}🎉 Setup Complete!${NC}"
        echo ""
        echo "Next steps:"
        echo "  1. Add DATABASE_URL to your .env file:"
        echo "     DATABASE_URL=\"$NEON_URL\""
        echo ""
        echo "  2. Install pg package if not already:"
        echo "     cd server && npm install pg"
        echo ""
        echo "  3. Restart backend server:"
        echo "     cd server && npm run dev"
        echo ""
        echo "  4. Restart frontend:"
        echo "     npm run dev"
        echo ""
        echo "  5. Open WhatsApp Inbox"
        echo "  6. Settings will auto-load from Neon database ✅"
        echo ""
        echo "📖 See ANTIBAN_SETTINGS_NEON.md for full documentation"
    else
        echo -e "${RED}❌ Table verification failed!${NC}"
        echo "Please check the migration file and database permissions."
    fi
else
    echo ""
    echo -e "${RED}❌ Migration failed!${NC}"
    echo ""
    echo "Alternative setup methods:"
    echo ""
    echo "1. Web-based SQL Editor:"
    echo "   - Go to: https://console.neon.tech"
    echo "   - Select your project"
    echo "   - Click 'SQL Editor'"
    echo "   - Copy/paste: migrations/create_whatsapp_antiban_settings_postgres.sql"
    echo "   - Click 'Run'"
    echo ""
    echo "2. Using psql directly:"
    echo "   psql \"$NEON_URL\" < migrations/create_whatsapp_antiban_settings_postgres.sql"
    echo ""
    exit 1
fi

