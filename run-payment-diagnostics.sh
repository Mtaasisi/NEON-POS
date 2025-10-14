#!/bin/bash

# ============================================
# 🔍 PAYMENT SYSTEM DIAGNOSTICS - AUTO RUNNER
# ============================================
# This script runs diagnostics on your payment system
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
echo -e "${BLUE}   🔍 PAYMENT SYSTEM DIAGNOSTICS${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ ERROR: psql is not installed${NC}"
    exit 1
fi

# Run diagnostics
echo -e "${YELLOW}Running diagnostics...${NC}"
echo ""

psql "$DB_CONNECTION" -f "🔍-PAYMENT-DIAGNOSTICS.sql"

echo ""
echo -e "${GREEN}✅ Diagnostics complete${NC}"
echo ""

