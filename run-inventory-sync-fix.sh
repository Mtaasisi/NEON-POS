#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}🔧 Inventory Sync Fix Utility${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

echo -e "${YELLOW}What would you like to do?${NC}"
echo -e "  ${GREEN}1${NC}) Diagnose the issue (check current state)"
echo -e "  ${GREEN}2${NC}) Fix the inventory sync"
echo -e "  ${GREEN}3${NC}) Run both (diagnose → fix → verify)"
echo ""
read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo -e "\n${BLUE}🔍 Running diagnostics...${NC}\n"
        node diagnose-inventory-sync.js
        ;;
    2)
        echo -e "\n${BLUE}🔧 Fixing inventory sync...${NC}\n"
        node fix-inventory-sync.js
        ;;
    3)
        echo -e "\n${BLUE}🔍 Step 1: Running diagnostics...${NC}\n"
        node diagnose-inventory-sync.js
        
        echo -e "\n${YELLOW}Press Enter to continue with the fix...${NC}"
        read
        
        echo -e "\n${BLUE}🔧 Step 2: Fixing inventory sync...${NC}\n"
        node fix-inventory-sync.js
        
        echo -e "\n${YELLOW}Press Enter to verify the fix...${NC}"
        read
        
        echo -e "\n${BLUE}✅ Step 3: Verifying the fix...${NC}\n"
        node diagnose-inventory-sync.js
        ;;
    *)
        echo -e "${RED}❌ Invalid choice. Please run again and select 1, 2, or 3.${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✅ Operation complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "${YELLOW}💡 Next steps:${NC}"
echo -e "   1. Test by receiving a new purchase order"
echo -e "   2. Check that inventory quantities update"
echo -e "   3. See ${BLUE}FIX-INVENTORY-SYNC-GUIDE.md${NC} for more details"
echo ""

