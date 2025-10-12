#!/bin/bash

# ================================================================================
# AUTOMATIC PRICE FIX SCRIPT
# ================================================================================
# This script automatically fixes zero/null prices in your POS database
# ================================================================================

set -e  # Exit on error

echo "🔧 Starting Automatic Price Fix..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get database URL from environment or .env file
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ Error: DATABASE_URL not found${NC}"
    echo "Please set DATABASE_URL in your .env file or environment"
    echo "Example: DATABASE_URL=postgresql://user:pass@host/database"
    exit 1
fi

echo -e "${BLUE}📊 Step 1: Diagnosing zero price issues...${NC}"
echo ""

# Run diagnostic
psql "$DATABASE_URL" -f DIAGNOSE-ZERO-PRICES.sql -q -o diagnostic-results.txt

if [ -f diagnostic-results.txt ]; then
    echo -e "${YELLOW}Diagnostic Results:${NC}"
    cat diagnostic-results.txt
    echo ""
fi

echo -e "${BLUE}🔧 Step 2: Applying price fixes...${NC}"
echo ""

# Apply fixes
psql "$DATABASE_URL" -f FIX-ZERO-PRICES.sql -q

echo -e "${GREEN}✅ Price fixes applied successfully!${NC}"
echo ""

echo -e "${BLUE}🔍 Step 3: Verifying fixes...${NC}"
echo ""

# Verify fixes
psql "$DATABASE_URL" -c "
SELECT 
    'VERIFICATION SUMMARY' as status,
    (SELECT COUNT(*) FROM lats_products WHERE unit_price IS NULL OR unit_price = 0) as products_still_zero,
    (SELECT COUNT(*) FROM lats_product_variants WHERE unit_price IS NULL OR unit_price = 0) as variants_still_zero,
    (SELECT COUNT(*) FROM lats_products WHERE unit_price > 0) as products_fixed,
    (SELECT COUNT(*) FROM lats_product_variants WHERE unit_price > 0) as variants_fixed;
" -q

echo ""
echo -e "${GREEN}✅ Automatic price fix completed!${NC}"
echo ""
echo "📋 Summary saved to: diagnostic-results.txt"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Refresh your POS page in the browser"
echo "2. Try adding products to cart again"
echo "3. The 'Invalid cart items' error should be fixed"
echo ""

