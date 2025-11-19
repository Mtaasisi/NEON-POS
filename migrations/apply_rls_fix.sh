#!/bin/bash

# ============================================================================
# Apply RLS Policy Fix for Daily Closure Tables
# ============================================================================
# This script applies the RLS policy fix to resolve the error:
# "No data returned from insert. Check RLS policies and database triggers."
# ============================================================================

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}============================================${NC}"
echo -e "${YELLOW}Applying RLS Policy Fix${NC}"
echo -e "${YELLOW}============================================${NC}"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ ERROR: DATABASE_URL environment variable is not set${NC}"
    echo ""
    echo "Please set your DATABASE_URL first:"
    echo "export DATABASE_URL='postgresql://user:password@host:port/database'"
    echo ""
    echo "For Neon, it should look like:"
    echo "export DATABASE_URL='postgresql://neondb_owner:npg_...@ep-....neon.tech/neondb?sslmode=require'"
    exit 1
fi

echo -e "${GREEN}✅ DATABASE_URL is set${NC}"
echo ""

# Apply the migration
echo -e "${YELLOW}📝 Applying migration: fix_daily_closure_rls_policies_final.sql${NC}"
echo ""

psql "$DATABASE_URL" -f migrations/fix_daily_closure_rls_policies_final.sql

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}✅ Migration applied successfully!${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""
    echo "The RLS policy error should now be resolved."
    echo "Please refresh your browser and test the POS system."
else
    echo ""
    echo -e "${RED}============================================${NC}"
    echo -e "${RED}❌ Migration failed${NC}"
    echo -e "${RED}============================================${NC}"
    echo ""
    echo "Please check the error messages above and try again."
    exit 1
fi

