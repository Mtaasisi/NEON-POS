#!/bin/bash

# ============================================
# 🚀 PAYMENT SYSTEM FIX - AUTO RUNNER
# ============================================
# This script runs all payment fixes on your Neon database
# ============================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Database connection string
DB_CONNECTION="postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   🚀 PAYMENT SYSTEM FIX${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ ERROR: psql is not installed${NC}"
    echo -e "${YELLOW}Please install PostgreSQL client:${NC}"
    echo "  - macOS: brew install postgresql"
    echo "  - Ubuntu/Debian: sudo apt-get install postgresql-client"
    echo "  - Windows: Download from https://www.postgresql.org/download/"
    exit 1
fi

echo -e "${GREEN}✅ psql found${NC}"
echo ""

# Test database connection
echo -e "${YELLOW}📡 Testing database connection...${NC}"
if psql "$DB_CONNECTION" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
else
    echo -e "${RED}❌ Failed to connect to database${NC}"
    echo -e "${YELLOW}Please check your connection string and network${NC}"
    exit 1
fi
echo ""

# Run the comprehensive payment fix
echo -e "${YELLOW}🔧 Running comprehensive payment system fix...${NC}"
echo ""

if psql "$DB_CONNECTION" -f "🚀-COMPREHENSIVE-PAYMENT-FIX.sql"; then
    echo ""
    echo -e "${GREEN}✅ Payment system fix completed successfully!${NC}"
else
    echo ""
    echo -e "${RED}❌ Error running payment fix${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   🎉 FIX COMPLETE${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "1. Restart your development server (npm run dev)"
echo "2. Clear browser cache (Ctrl+Shift+R)"
echo "3. Test payment functionality"
echo ""
echo -e "${YELLOW}To verify the fix worked, run:${NC}"
echo "  ./run-payment-diagnostics.sh"
echo ""

