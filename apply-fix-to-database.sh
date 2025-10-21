#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🔧 Applying Inventory Accumulation Fix${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Database connection string
DB_URL='postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ psql is not installed.${NC}"
    echo -e "${YELLOW}Please install PostgreSQL client:${NC}"
    echo "  macOS: brew install postgresql"
    echo "  Ubuntu: sudo apt-get install postgresql-client"
    exit 1
fi

echo -e "${YELLOW}What would you like to do?${NC}"
echo ""
echo -e "  ${GREEN}1${NC}) Apply the fix (run fix-inventory-accumulation.sql)"
echo -e "  ${GREEN}2${NC}) Check trigger status (run check-inventory-trigger.sql)"
echo -e "  ${GREEN}3${NC}) Connect to database (interactive psql)"
echo ""
read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo -e "${BLUE}📝 Applying fix-inventory-accumulation.sql...${NC}"
        echo ""
        psql "$DB_URL" -f fix-inventory-accumulation.sql
        
        if [ $? -eq 0 ]; then
            echo ""
            echo -e "${GREEN}========================================${NC}"
            echo -e "${GREEN}✅ Fix applied successfully!${NC}"
            echo -e "${GREEN}========================================${NC}"
            echo ""
            echo -e "${YELLOW}🧪 Test it now:${NC}"
            echo "   1. Check your inventory page"
            echo "   2. Receive a new purchase order"
            echo "   3. Verify stock ADDS to existing (not replaces)"
        else
            echo ""
            echo -e "${RED}❌ Error applying fix${NC}"
            exit 1
        fi
        ;;
    2)
        echo ""
        echo -e "${BLUE}🔍 Checking inventory trigger status...${NC}"
        echo ""
        psql "$DB_URL" -f check-inventory-trigger.sql
        ;;
    3)
        echo ""
        echo -e "${BLUE}🔌 Connecting to database...${NC}"
        echo -e "${YELLOW}Type \\q to exit${NC}"
        echo ""
        psql "$DB_URL"
        ;;
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""

