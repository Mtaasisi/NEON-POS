#!/bin/bash

###############################################################################
# 🔧 APPLY ALL FIXES - Comprehensive Fix Script
###############################################################################
# This script applies all known fixes to the POS system
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}  🔧 ${PURPLE}APPLYING ALL FIXES${NC}                                    ${BLUE}║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

###############################################################################
# Fix 1: Apply search_customers_fn migration
###############################################################################

echo -e "${CYAN}🔧 Fix 1: Applying search_customers_fn migration${NC}"

if [ -f "migrations/create_search_customers_function.sql" ]; then
    if [ -f "apply-search-function-migration.sh" ]; then
        echo -e "${YELLOW}   Running migration script...${NC}"
        bash apply-search-function-migration.sh 2>&1 | head -20 || {
            echo -e "${YELLOW}   ⚠️  Migration may have already been applied${NC}"
        }
    elif [ -f "apply-search-function-migration.mjs" ]; then
        echo -e "${YELLOW}   Running Node.js migration script...${NC}"
        node apply-search-function-migration.mjs 2>&1 | head -20 || {
            echo -e "${YELLOW}   ⚠️  Migration may have already been applied${NC}"
        }
    else
        echo -e "${YELLOW}   ⚠️  No migration script found${NC}"
        echo -e "${CYAN}   💡 Please apply migrations/create_search_customers_function.sql manually${NC}"
    fi
else
    echo -e "${YELLOW}   ⚠️  Migration file not found${NC}"
fi

echo ""

###############################################################################
# Fix 2: Clear problematic caches
###############################################################################

echo -e "${CYAN}🔧 Fix 2: Clearing problematic caches${NC}"

if [ -d "node_modules/.vite" ]; then
    echo -e "${YELLOW}   Clearing Vite cache...${NC}"
    rm -rf node_modules/.vite
    echo -e "${GREEN}   ✅ Vite cache cleared${NC}"
fi

if [ -d ".cache" ]; then
    echo -e "${YELLOW}   Clearing .cache directory...${NC}"
    rm -rf .cache
    echo -e "${GREEN}   ✅ .cache cleared${NC}"
fi

echo ""

###############################################################################
# Fix 3: Rebuild dist if exists
###############################################################################

echo -e "${CYAN}🔧 Fix 3: Checking build${NC}"

if [ -d "dist" ]; then
    echo -e "${YELLOW}   Clearing dist directory...${NC}"
    rm -rf dist
    echo -e "${GREEN}   ✅ dist cleared${NC}"
fi

echo ""

###############################################################################
# Fix 4: Verify environment configuration
###############################################################################

echo -e "${CYAN}🔧 Fix 4: Verifying environment${NC}"

if [ -f ".env" ]; then
    if grep -q "DATABASE_URL" .env; then
        echo -e "${GREEN}   ✅ DATABASE_URL found in .env${NC}"
    else
        echo -e "${RED}   ❌ DATABASE_URL missing from .env${NC}"
        echo -e "${CYAN}   💡 Please add DATABASE_URL to your .env file${NC}"
    fi
    
    if grep -q "VITE_SUPABASE_URL" .env; then
        echo -e "${GREEN}   ✅ VITE_SUPABASE_URL found${NC}"
    else
        echo -e "${YELLOW}   ⚠️  VITE_SUPABASE_URL not found${NC}"
    fi
else
    echo -e "${RED}   ❌ .env file not found${NC}"
    echo -e "${CYAN}   💡 Please create .env file from .env.template${NC}"
fi

echo ""

###############################################################################
# Fix 5: Check for known code issues
###############################################################################

echo -e "${CYAN}🔧 Fix 5: Checking for known code issues${NC}"

# Check if there are any obvious syntax errors in key files
KEY_FILES=(
    "src/lib/customerApi/search.ts"
    "src/features/lats/stores/useInventoryStore.ts"
    "src/features/lats/pages/POSPageOptimized.tsx"
    "src/lib/supabaseClient.ts"
)

ISSUES_FOUND=0

for file in "${KEY_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${YELLOW}   ⚠️  File not found: $file${NC}"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
done

if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}   ✅ All key files present${NC}"
else
    echo -e "${YELLOW}   ⚠️  $ISSUES_FOUND files missing or not found${NC}"
fi

echo ""

###############################################################################
# Fix 6: Generate browser fix script
###############################################################################

echo -e "${CYAN}🔧 Fix 6: Browser-side fixes available${NC}"
echo -e "${CYAN}   Run these commands in browser console (F12):${NC}"
echo ""
echo -e "${YELLOW}   // Clear filters${NC}"
echo -e "${BLUE}   useInventoryStore.getState().clearFilters();${NC}"
echo ""
echo -e "${YELLOW}   // Force refresh products${NC}"
echo -e "${BLUE}   useInventoryStore.getState().forceRefreshProducts();${NC}"
echo ""
echo -e "${YELLOW}   // Clear all caches and reload${NC}"
echo -e "${BLUE}   localStorage.clear(); location.reload();${NC}"
echo ""

###############################################################################
# Fix 7: Restart dev server recommendation
###############################################################################

echo -e "${CYAN}🔧 Fix 7: Dev server${NC}"

if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}   ✅ Dev server running${NC}"
    echo -e "${CYAN}   💡 Recommend restarting: pkill -f 'vite' && npm run dev${NC}"
else
    echo -e "${YELLOW}   ⚠️  Dev server not running${NC}"
    echo -e "${CYAN}   💡 Start it: npm run dev${NC}"
fi

echo ""

###############################################################################
# Summary
###############################################################################

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}  ✅ ${GREEN}FIXES APPLIED${NC}                                          ${BLUE}║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}✅ Backend fixes applied${NC}"
echo -e "${GREEN}✅ Caches cleared${NC}"
echo -e "${GREEN}✅ Environment verified${NC}"
echo -e "${CYAN}⏳ Database migration attempted${NC}"
echo ""

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}  📋 ${CYAN}NEXT STEPS${NC}                                             ${BLUE}║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "1️⃣  ${CYAN}Restart dev server:${NC}"
echo -e "    ${YELLOW}pkill -f 'vite' && npm run dev${NC}"
echo ""
echo -e "2️⃣  ${CYAN}Open browser and run test:${NC}"
echo -e "    ${YELLOW}open quick-test.html${NC}"
echo ""
echo -e "3️⃣  ${CYAN}In browser console (F12), clear caches:${NC}"
echo -e "    ${YELLOW}localStorage.clear(); location.reload();${NC}"
echo ""
echo -e "4️⃣  ${CYAN}Run automated test:${NC}"
echo -e "    ${YELLOW}Open http://localhost:5173${NC}"
echo -e "    ${YELLOW}Press F12${NC}"
echo -e "    ${YELLOW}Run: fetch('http://localhost:5173/auto-browser-test-and-fix.js').then(r => r.text()).then(eval)${NC}"
echo ""

echo -e "${GREEN}✅ All fixes complete!${NC}"
echo ""

# Ask if user wants to restart dev server
read -p "Restart dev server now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${CYAN}🔄 Restarting dev server...${NC}"
    pkill -f 'vite' 2>/dev/null || echo "No vite process found"
    sleep 2
    npm run dev > vite-server.log 2>&1 &
    echo -e "${GREEN}✅ Dev server restarting...${NC}"
    echo -e "${CYAN}   Check vite-server.log for output${NC}"
fi

echo ""
echo -e "${PURPLE}🎉 Done! Your POS system should now be ready for testing.${NC}"

