#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  POS Database Schema Fix Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    if [ -f ".env copy" ]; then
        echo -e "${YELLOW}⚠️  .env not found, but '.env copy' exists${NC}"
        echo -e "${YELLOW}Would you like to use '.env copy'? (y/n)${NC}"
        read -r response
        if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            cp ".env copy" .env
            echo -e "${GREEN}✅ Copied '.env copy' to .env${NC}"
        else
            echo -e "${RED}❌ Please create a .env file with your DATABASE_URL${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ .env file not found!${NC}"
        echo -e "${YELLOW}Please create a .env file with your DATABASE_URL${NC}"
        exit 1
    fi
fi

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL not found in .env file!${NC}"
    echo -e "${YELLOW}Please add your Neon database URL to .env file:${NC}"
    echo -e "${YELLOW}DATABASE_URL=postgresql://user:password@host/database${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Database connection string found${NC}"
echo ""

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ psql is not installed!${NC}"
    echo -e "${YELLOW}Installing PostgreSQL client...${NC}"
    
    # Check OS and install accordingly
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install postgresql
        else
            echo -e "${RED}❌ Homebrew not found. Please install psql manually:${NC}"
            echo -e "${YELLOW}brew install postgresql${NC}"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        sudo apt-get update && sudo apt-get install -y postgresql-client
    else
        echo -e "${RED}❌ Unsupported OS. Please install psql manually.${NC}"
        exit 1
    fi
fi

echo -e "${BLUE}🔧 Running schema fix script...${NC}"
echo ""

# Run the SQL fix script
psql "$DATABASE_URL" -f FIX-SALES-SCHEMA-NOW.sql

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  ✅ Database Schema Fixed Successfully!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${GREEN}The following changes were made:${NC}"
    echo -e "${GREEN}  ✓ payment_method converted to JSONB${NC}"
    echo -e "${GREEN}  ✓ payment_status column added/verified${NC}"
    echo -e "${GREEN}  ✓ sold_by column added/verified${NC}"
    echo -e "${GREEN}  ✓ discount column fixed (removed old columns)${NC}"
    echo -e "${GREEN}  ✓ tax column fixed${NC}"
    echo -e "${GREEN}  ✓ All sale_items columns verified${NC}"
    echo ""
    echo -e "${BLUE}🚀 You can now test your POS system!${NC}"
else
    echo ""
    echo -e "${RED}❌ Error running schema fix script!${NC}"
    echo -e "${YELLOW}Please check the error messages above.${NC}"
    exit 1
fi

