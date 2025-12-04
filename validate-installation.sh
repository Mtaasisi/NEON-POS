#!/bin/bash

# Scheduled Bulk Messages - Installation Validation
# This script tests all components to ensure everything is working

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     SCHEDULED MESSAGES - INSTALLATION VALIDATION          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

PASS=0
FAIL=0
WARN=0

# Database connection
DATABASE_URL="postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}1. DATABASE TESTS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test 1: Database Connection
echo -n "Testing database connection... "
if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "  Error: Cannot connect to database"
    ((FAIL++))
fi

# Test 2: Tables exist
echo -n "Checking tables... "
TABLE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('scheduled_bulk_messages', 'scheduled_message_executions', 'bulk_message_templates', 'message_recipient_lists');" 2>/dev/null | xargs)
if [ "$TABLE_COUNT" = "4" ]; then
    echo -e "${GREEN}✓ PASS${NC} (4/4 tables)"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL${NC} ($TABLE_COUNT/4 tables)"
    ((FAIL++))
fi

# Test 3: Functions exist
echo -n "Checking functions... "
FUNC_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM pg_proc WHERE proname IN ('calculate_next_execution', 'get_messages_ready_for_execution', 'update_scheduled_messages_updated_at');" 2>/dev/null | xargs)
if [ "$FUNC_COUNT" -ge "3" ]; then
    echo -e "${GREEN}✓ PASS${NC} ($FUNC_COUNT functions)"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL${NC} ($FUNC_COUNT/3 functions)"
    ((FAIL++))
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}2. BACKEND FILES${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test 4: Backend service file
echo -n "Checking scheduledMessagesService.ts... "
if [ -f "server/src/services/scheduledMessagesService.ts" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAIL++))
fi

# Test 5: Backend routes file
echo -n "Checking scheduled-messages.ts routes... "
if [ -f "server/src/routes/scheduled-messages.ts" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAIL++))
fi

# Test 6: Server index updated
echo -n "Checking server index.ts integration... "
if grep -q "scheduledMessagesRoutes" "server/src/index.ts" 2>/dev/null; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAIL++))
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}3. FRONTEND FILES${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test 7: Management page
echo -n "Checking ScheduledMessagesPage.tsx... "
if [ -f "src/features/sms/pages/ScheduledMessagesPage.tsx" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAIL++))
fi

# Test 8: Modal component
echo -n "Checking ScheduleBulkMessageModal.tsx... "
if [ -f "src/features/sms/components/ScheduleBulkMessageModal.tsx" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAIL++))
fi

# Test 9: Browser scheduler service
echo -n "Checking browserSchedulerService.ts... "
if [ -f "src/services/browserSchedulerService.ts" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAIL++))
fi

# Test 10: Web Worker
echo -n "Checking scheduler-worker.js... "
if [ -f "public/scheduler-worker.js" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAIL++))
fi

# Test 11: Route registry updated
echo -n "Checking route registry... "
if grep -q "scheduled-messages" "src/lib/routeRegistry.ts" 2>/dev/null; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAIL++))
fi

# Test 12: App routes updated
echo -n "Checking App.tsx routes... "
if grep -q "ScheduledMessagesPage" "src/App.tsx" 2>/dev/null; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAIL++))
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}4. DOCUMENTATION${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test 13-17: Documentation files
DOC_FILES=("START_HERE.md" "SCHEDULED_MESSAGES_README.md" "SCHEDULED_BULK_MESSAGES_GUIDE.md" "NEON_SETUP_COMPLETE.md" "TEST_RESULTS.md")
for doc in "${DOC_FILES[@]}"; do
    echo -n "Checking $doc... "
    if [ -f "$doc" ]; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASS++))
    else
        echo -e "${RED}✗ FAIL${NC}"
        ((FAIL++))
    fi
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}5. CONFIGURATION${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test 18: .env file exists
echo -n "Checking .env file... "
if [ -f ".env" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASS++))
else
    echo -e "${YELLOW}⚠ WARN${NC} (.env not found - you'll need to create it)"
    ((WARN++))
fi

# Test 19: Database URL in .env
if [ -f ".env" ]; then
    echo -n "Checking DATABASE_URL in .env... "
    if grep -q "DATABASE_URL" ".env" 2>/dev/null; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASS++))
    else
        echo -e "${YELLOW}⚠ WARN${NC} (DATABASE_URL not configured)"
        ((WARN++))
    fi
else
    echo -e "${YELLOW}⚠ SKIP${NC} Checking DATABASE_URL (no .env file)"
    ((WARN++))
fi

# Test 20: Node modules
echo -n "Checking server dependencies... "
if [ -d "server/node_modules" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASS++))
else
    echo -e "${YELLOW}⚠ WARN${NC} (run: cd server && npm install)"
    ((WARN++))
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}6. SERVER STATUS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test 21: Server running
echo -n "Checking if server is running... "
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC} (Server is running)"
    ((PASS++))
    
    # Test 22: API endpoint accessible
    echo -n "Testing API endpoint... "
    if curl -s http://localhost:8000/api/scheduled-messages > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASS++))
    else
        echo -e "${YELLOW}⚠ WARN${NC} (API not responding)"
        ((WARN++))
    fi
else
    echo -e "${YELLOW}⚠ WARN${NC} (Server not running)"
    echo "  Start with: cd server && npm start"
    ((WARN++))
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                   TEST SUMMARY                             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

TOTAL=$((PASS + FAIL + WARN))
echo -e "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo -e "${YELLOW}Warnings: $WARN${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║            ✅ ALL TESTS PASSED!                            ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Your scheduled bulk messages system is fully installed!"
    echo ""
    if [ $WARN -gt 0 ]; then
        echo -e "${YELLOW}Action Items:${NC}"
        echo "1. Configure .env file (if not done)"
        echo "2. Start backend: cd server && npm start"
        echo "3. Start frontend: npm run dev"
        echo "4. Open: http://localhost:5173/sms/scheduled"
    else
        echo -e "${GREEN}Ready to use!${NC}"
        echo "Open: http://localhost:5173/sms/scheduled"
    fi
else
    echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║            ❌ SOME TESTS FAILED                            ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Please review the failed tests above and fix the issues."
    echo ""
    echo "Common fixes:"
    echo "1. Re-run database migration: psql \$DATABASE_URL -f migrations/create_scheduled_bulk_messages.sql"
    echo "2. Check file paths and permissions"
    echo "3. Review installation logs"
fi

echo ""
echo "For detailed information, see: TEST_RESULTS.md"
echo ""

