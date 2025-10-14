#!/bin/bash

# ============================================
# 🔄 PROCESS RECURRING EXPENSES - DAILY RUNNER
# Schedule this to run every day
# ============================================

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Database connection
DB_CONNECTION="postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   🔄 RECURRING EXPENSES PROCESSOR${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Processing due recurring expenses...${NC}"
echo ""

# Run the processing script
psql "$DB_CONNECTION" -f "🔄-PROCESS-RECURRING-EXPENSES.sql"

echo ""
echo -e "${GREEN}✅ Processing complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  • Check Payment Accounts for updated balances"
echo "  • Review Expense Management for new transactions"
echo "  • Check Recurring Expenses tab for next due dates"
echo ""
echo -e "${YELLOW}To schedule this to run daily:${NC}"
echo ""
echo "  Linux/Mac (crontab):"
echo "    crontab -e"
echo "    # Add: 0 2 * * * /path/to/process-recurring-expenses.sh"
echo ""
echo "  Windows (Task Scheduler):"
echo "    • Open Task Scheduler"
echo "    • Create Basic Task"
echo "    • Schedule: Daily at 2:00 AM"
echo "    • Action: process-recurring-expenses.bat"
echo ""

