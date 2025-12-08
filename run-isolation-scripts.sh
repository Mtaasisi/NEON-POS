#!/bin/bash

# ============================================================================
# Run Branch Isolation Scripts
# ============================================================================
# This script runs the branch isolation verification and migration scripts
# against your PostgreSQL database.
# ============================================================================

# Database connection string
DB_URL="postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Branch Isolation Script Runner"
echo "=========================================="
echo ""

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: psql is not installed${NC}"
    echo "Please install PostgreSQL client tools"
    exit 1
fi

# Function to run a SQL file
run_sql_file() {
    local file=$1
    local description=$2
    
    if [ ! -f "$file" ]; then
        echo -e "${YELLOW}⚠️  File not found: $file${NC}"
        return 1
    fi
    
    echo -e "${GREEN}Running: $description${NC}"
    echo "File: $file"
    echo ""
    
    psql "$DB_URL" -f "$file"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Successfully executed: $file${NC}"
    else
        echo -e "${RED}❌ Error executing: $file${NC}"
        return 1
    fi
    
    echo ""
    echo "----------------------------------------"
    echo ""
}

# Step 1: Run verification script
echo "STEP 1: Verifying current isolation state..."
run_sql_file "VERIFY_ALL_TABLES_BRANCH_ISOLATION.sql" "Verification Script"

read -p "Review the output above. Press Enter to continue with migrations, or Ctrl+C to cancel..."

# Step 2: Add branch_id to logging tables
echo "STEP 2: Adding branch_id to logging tables..."
run_sql_file "ADD_BRANCH_ID_TO_LOGGING_TABLES.sql" "Logging Tables Migration"

# Step 3: Add branch_id to communication tables
echo "STEP 3: Adding branch_id to communication tables..."
run_sql_file "ADD_BRANCH_ID_TO_COMMUNICATION_TABLES.sql" "Communication Tables Migration"

# Step 4: Add branch_id to session tables
echo "STEP 4: Adding branch_id to session tables..."
run_sql_file "ADD_BRANCH_ID_TO_SESSION_TABLES.sql" "Session Tables Migration"

# Step 5: Verify again
echo "STEP 5: Verifying changes..."
run_sql_file "VERIFY_ALL_TABLES_BRANCH_ISOLATION.sql" "Final Verification"

echo ""
echo "=========================================="
echo -e "${GREEN}✅ All scripts completed!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Review the verification output above"
echo "2. Update your application code to set branch_id when creating records"
echo "3. Update queries to use addBranchFilter() for branch filtering"
echo ""
