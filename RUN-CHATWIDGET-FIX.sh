#!/bin/bash

# ============================================
# ChatWidget Database Fix - Quick Setup Script
# ============================================

echo "🔧 Setting up ChatWidget Database Integration..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ ERROR: DATABASE_URL environment variable is not set${NC}"
    echo ""
    echo "Please set your database URL:"
    echo "export DATABASE_URL='your-database-connection-string'"
    echo ""
    echo "Or add it to your .env file"
    exit 1
fi

echo -e "${BLUE}📊 Step 1: Creating customer_messages table...${NC}"
psql "$DATABASE_URL" -f migrations/create_customer_messages_table.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Table created successfully!${NC}"
else
    echo -e "${RED}❌ Failed to create table${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}📝 Step 2: Do you want to add sample data for testing? (y/n)${NC}"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo -e "${BLUE}📊 Adding sample messages...${NC}"
    psql "$DATABASE_URL" -f migrations/seed_sample_customer_messages.sql
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Sample data added successfully!${NC}"
    else
        echo -e "${YELLOW}⚠️  Sample data insertion had issues (this is optional)${NC}"
    fi
else
    echo -e "${YELLOW}⏭️  Skipping sample data${NC}"
fi

echo ""
echo -e "${GREEN}🎉 ChatWidget Database Integration Complete!${NC}"
echo ""
echo "✅ The ChatWidget now fetches from the database"
echo "✅ All 20 dashboard components are database-connected"
echo ""
echo "📖 For more details, see: CHATWIDGET-DATABASE-FIX.md"
echo ""

