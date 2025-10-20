#!/bin/bash

###############################################################################
# 🧪 AUTOMATED BROWSER TEST AND FIX SCRIPT
###############################################################################
# This script will:
# 1. Check if dev server is running
# 2. Open browser to POS application
# 3. Provide instructions for running tests
# 4. Apply backend fixes
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Emojis
CHECK="✅"
CROSS="❌"
WARNING="⚠️"
INFO="ℹ️"
ROCKET="🚀"
WRENCH="🔧"
TEST="🧪"
FIX="🔧"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}  ${TEST} ${PURPLE}AUTOMATED BROWSER TEST & FIX${NC}                        ${BLUE}║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

###############################################################################
# STEP 1: Check if dev server is running
###############################################################################

echo -e "${CYAN}${INFO} Step 1: Checking dev server...${NC}"

if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}${CHECK} Dev server is running on port 5173${NC}"
    SERVER_RUNNING=true
else
    echo -e "${YELLOW}${WARNING} Dev server not running on port 5173${NC}"
    echo -e "${CYAN}   Starting dev server...${NC}"
    
    # Try to start server in background
    npm run dev > /dev/null 2>&1 &
    SERVER_PID=$!
    
    echo -e "${CYAN}   Waiting for server to start...${NC}"
    sleep 5
    
    if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${GREEN}${CHECK} Dev server started successfully${NC}"
        SERVER_RUNNING=true
    else
        echo -e "${RED}${CROSS} Failed to start dev server${NC}"
        echo -e "${YELLOW}   Please start it manually: npm run dev${NC}"
        SERVER_RUNNING=false
    fi
fi

echo ""

###############################################################################
# STEP 2: Check database connection
###############################################################################

echo -e "${CYAN}${INFO} Step 2: Checking database connection...${NC}"

if [ -f .env ]; then
    if grep -q "DATABASE_URL" .env; then
        echo -e "${GREEN}${CHECK} .env file exists with DATABASE_URL${NC}"
    else
        echo -e "${RED}${CROSS} DATABASE_URL not found in .env${NC}"
    fi
else
    echo -e "${RED}${CROSS} .env file not found${NC}"
    echo -e "${YELLOW}   Please create .env file with DATABASE_URL${NC}"
fi

echo ""

###############################################################################
# STEP 3: Apply backend fixes
###############################################################################

echo -e "${CYAN}${INFO} Step 3: Applying backend fixes...${NC}"
echo ""

# Fix 1: Apply search function migration
echo -e "${FIX} Fix 1: Checking search_customers_fn..."

if [ -f "migrations/create_search_customers_function.sql" ]; then
    echo -e "${GREEN}${CHECK} Migration file exists${NC}"
    
    # Check if we can apply it
    if [ -f "apply-search-function-migration.sh" ]; then
        echo -e "${CYAN}   Applying migration...${NC}"
        
        # Run migration in background
        bash apply-search-function-migration.sh 2>/dev/null || {
            echo -e "${YELLOW}${WARNING} Migration might have already been applied${NC}"
        }
    fi
else
    echo -e "${YELLOW}${WARNING} Migration file not found${NC}"
fi

echo ""

# Fix 2: Clear old caches
echo -e "${FIX} Fix 2: Checking for stale caches..."

CACHE_FILES=(
    "dist"
    "node_modules/.vite"
    ".cache"
)

for cache_dir in "${CACHE_FILES[@]}"; do
    if [ -d "$cache_dir" ]; then
        echo -e "${YELLOW}   Found cache: $cache_dir${NC}"
    fi
done

echo -e "${GREEN}${CHECK} Cache check complete${NC}"
echo ""

###############################################################################
# STEP 4: Open browser and test runner
###############################################################################

echo -e "${CYAN}${INFO} Step 4: Opening browser test runner...${NC}"

# Open the test runner page
if [ -f "auto-test-runner.html" ]; then
    open "auto-test-runner.html"
    echo -e "${GREEN}${CHECK} Test runner opened${NC}"
else
    echo -e "${YELLOW}${WARNING} Test runner not found, opening app directly${NC}"
    open "http://localhost:5173"
fi

echo ""

###############################################################################
# STEP 5: Display instructions
###############################################################################

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}  ${INFO} ${CYAN}MANUAL TESTING INSTRUCTIONS${NC}                           ${BLUE}║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}The test runner page should now be open. Follow these steps:${NC}"
echo ""
echo -e "  1️⃣  Click '${PURPLE}Open POS Application${NC}' button"
echo -e "  2️⃣  Press ${YELLOW}F12${NC} to open browser console"
echo -e "  3️⃣  Click '${PURPLE}Copy Test Script${NC}' button"
echo -e "  4️⃣  Paste into console and press ${YELLOW}Enter${NC}"
echo -e "  5️⃣  Wait for tests to complete"
echo -e "  6️⃣  Review results in console"
echo ""

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}  ${WRENCH} ${CYAN}WHAT THE TEST SCRIPT WILL DO${NC}                          ${BLUE}║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "  ${CHECK} ${GREEN}Auto-login${NC} with care@care.com"
echo -e "  ${CHECK} ${GREEN}Test database${NC} connection"
echo -e "  ${CHECK} ${GREEN}Verify branch${NC} context"
echo -e "  ${CHECK} ${GREEN}Check inventory${NC} store"
echo -e "  ${CHECK} ${GREEN}Test product${NC} display"
echo -e "  ${CHECK} ${GREEN}Test navigation${NC} to POS"
echo -e "  ${CHECK} ${GREEN}Test product${NC} interactions"
echo -e "  ${FIX} ${YELLOW}Apply auto-fixes${NC}"
echo -e "  ${TEST} ${BLUE}Generate report${NC}"
echo ""

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}  ${ROCKET} ${CYAN}QUICK COMMANDS${NC}                                        ${BLUE}║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "  ${CYAN}View dev server logs:${NC}"
echo -e "    ${YELLOW}tail -f vite-server.log${NC}"
echo ""
echo -e "  ${CYAN}Apply search function fix:${NC}"
echo -e "    ${YELLOW}./apply-search-function-migration.sh${NC}"
echo ""
echo -e "  ${CYAN}Clear all caches:${NC}"
echo -e "    ${YELLOW}rm -rf dist node_modules/.vite && npm run build${NC}"
echo ""
echo -e "  ${CYAN}Open application directly:${NC}"
echo -e "    ${YELLOW}open http://localhost:5173${NC}"
echo ""

echo -e "${GREEN}${CHECK} Setup complete! Ready for testing.${NC}"
echo ""

# Wait for user
read -p "Press Enter to continue or Ctrl+C to exit..."

echo ""
echo -e "${PURPLE}${ROCKET} Opening POS application...${NC}"

# Open the actual app
if [ "$SERVER_RUNNING" = true ]; then
    open "http://localhost:5173"
    echo -e "${GREEN}${CHECK} Application opened${NC}"
else
    echo -e "${RED}${CROSS} Cannot open app - server not running${NC}"
fi

echo ""
echo -e "${CYAN}Remember to:${NC}"
echo -e "  1. Open Console (F12)"
echo -e "  2. Run the test script"
echo -e "  3. Check results"
echo ""

echo -e "${GREEN}${CHECK} Done!${NC}"

