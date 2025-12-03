#!/bin/bash

# ================================================
# WhatsApp Webhook Migration Script
# Runs the webhook tables migration on Neon database
# ================================================

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  WhatsApp Webhook Migration${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Database connection string
DB_URL='postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require'

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ Error: psql not found${NC}"
    echo -e "${YELLOW}Install PostgreSQL client:${NC}"
    echo -e "  macOS:   ${GREEN}brew install postgresql${NC}"
    echo -e "  Ubuntu:  ${GREEN}sudo apt install postgresql-client${NC}"
    echo -e "  Windows: ${GREEN}Download from postgresql.org${NC}"
    exit 1
fi

echo -e "${GREEN}✅ psql found${NC}"
echo ""

# Check if migration file exists
if [ ! -f "migrations/create_whatsapp_webhook_tables.sql" ]; then
    echo -e "${RED}❌ Error: Migration file not found${NC}"
    echo -e "${YELLOW}Run this script from the project root directory${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Migration file found${NC}"
echo ""

# Show what will be created
echo -e "${BLUE}This migration will create:${NC}"
echo -e "  📊 ${GREEN}whatsapp_incoming_messages${NC} - Store customer messages"
echo -e "  👍 ${GREEN}whatsapp_reactions${NC} - Track emoji reactions"
echo -e "  📞 ${GREEN}whatsapp_calls${NC} - Log incoming calls"
echo -e "  📋 ${GREEN}whatsapp_poll_results${NC} - Store poll responses"
echo -e "  ❌ ${GREEN}webhook_failures${NC} - Track failed webhooks"
echo -e "  🔗 ${GREEN}Triggers${NC} - Auto-link to customers"
echo -e "  📈 ${GREEN}Indexes${NC} - Performance optimization"
echo ""

# Confirm
read -p "$(echo -e ${YELLOW}Continue with migration? [y/N]: ${NC})" confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Migration cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}Running migration...${NC}"
echo ""

# Run the migration
psql "$DB_URL" -f migrations/create_whatsapp_webhook_tables.sql

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}======================================${NC}"
    echo -e "${GREEN}  ✅ Migration Successful!${NC}"
    echo -e "${GREEN}======================================${NC}"
    echo ""
    
    # Verify tables were created
    echo -e "${BLUE}Verifying tables...${NC}"
    
    TABLES=$(psql "$DB_URL" -t -c "
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE 'whatsapp%' OR table_name = 'webhook_failures'
    ORDER BY table_name;
    ")
    
    echo -e "${GREEN}Tables created:${NC}"
    echo "$TABLES" | while read table; do
        if [ ! -z "$table" ]; then
            echo -e "  ✅ ${GREEN}$table${NC}"
        fi
    done
    
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "  1. Install server dependencies: ${GREEN}cd server && npm install${NC}"
    echo -e "  2. Build server: ${GREEN}npm run build${NC}"
    echo -e "  3. Deploy to production (Railway/Heroku/etc)"
    echo -e "  4. Configure webhook: ${GREEN}node setup-whatsapp-webhook.mjs${NC}"
    echo ""
    
else
    echo ""
    echo -e "${RED}======================================${NC}"
    echo -e "${RED}  ❌ Migration Failed${NC}"
    echo -e "${RED}======================================${NC}"
    echo ""
    echo -e "${YELLOW}Check the error messages above${NC}"
    exit 1
fi

