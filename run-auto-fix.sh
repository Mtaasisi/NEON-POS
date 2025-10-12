#!/bin/bash
# ============================================================================
# Auto-Fix Payment Mirroring - One-Command Execution
# ============================================================================
# Usage: ./run-auto-fix.sh
# Or with custom database URL: DATABASE_URL="postgres://..." ./run-auto-fix.sh
# ============================================================================

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       Payment Mirroring Auto-Fix - Execution Script          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ Error: psql is not installed${NC}"
    echo "Please install PostgreSQL client:"
    echo "  macOS: brew install postgresql"
    echo "  Ubuntu: sudo apt-get install postgresql-client"
    echo "  Windows: Download from https://www.postgresql.org/download/"
    exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    # Try to load from .env file
    if [ -f ".env" ]; then
        echo -e "${YELLOW}📄 Loading DATABASE_URL from .env file...${NC}"
        export $(grep -v '^#' .env | grep DATABASE_URL | xargs)
    fi
    
    # Still not set? Ask user
    if [ -z "$DATABASE_URL" ]; then
        echo -e "${YELLOW}⚠️  DATABASE_URL not found in environment or .env file${NC}"
        echo ""
        echo "Please provide your database URL:"
        echo "Example: postgres://user:password@host:5432/database"
        echo ""
        read -p "Database URL: " DATABASE_URL
        export DATABASE_URL
    fi
fi

# Verify DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ Error: DATABASE_URL is required${NC}"
    exit 1
fi

# Check if SQL file exists
SQL_FILE="AUTO-FIX-PAYMENT-MIRRORING.sql"
if [ ! -f "$SQL_FILE" ]; then
    echo -e "${RED}❌ Error: $SQL_FILE not found${NC}"
    echo "Please ensure you're running this script from the correct directory."
    exit 1
fi

echo -e "${BLUE}🔍 Using database: ${DATABASE_URL%%@*}@***${NC}"
echo ""
echo -e "${YELLOW}⚠️  This script will:${NC}"
echo "  ✓ Create/verify payment tables"
echo "  ✓ Add missing columns"
echo "  ✓ Remove invalid columns"
echo "  ✓ Create indexes"
echo "  ✓ Set up default data"
echo "  ✓ Run validation tests"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo -e "${BLUE}🚀 Running auto-fix script...${NC}"
echo ""

# Run the SQL script
if psql "$DATABASE_URL" -f "$SQL_FILE"; then
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                  ✅ AUTO-FIX COMPLETED!                        ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}📋 Next Steps:${NC}"
    echo "  1. Restart your dev server: npm run dev"
    echo "  2. Clear browser cache (F12 → Application → Clear Site Data)"
    echo "  3. Test a sale with multiple payment methods"
    echo "  4. Check console for ✅ success messages"
    echo ""
    echo -e "${BLUE}📊 Quick Verification:${NC}"
    echo "  psql \"\$DATABASE_URL\" -c \"SELECT * FROM test_payment_mirroring();\""
    echo ""
    echo -e "${BLUE}📚 Documentation:${NC}"
    echo "  Read: 🎯-PAYMENT-FIX-README.md"
    echo ""
else
    echo ""
    echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                    ❌ ERROR OCCURRED                           ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Troubleshooting:${NC}"
    echo "  • Check your DATABASE_URL is correct"
    echo "  • Ensure you have database permissions"
    echo "  • Verify PostgreSQL version is 12+"
    echo "  • Read RUN-AUTO-FIX.md for more help"
    echo ""
    exit 1
fi

