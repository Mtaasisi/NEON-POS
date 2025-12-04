#!/bin/bash

# Scheduled Bulk Messages - Neon Database Setup
# This script sets up scheduled messages using your Neon database

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   SCHEDULED BULK MESSAGES - NEON DATABASE SETUP           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Neon database connection string
DATABASE_URL="postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

echo -e "${BLUE}📋 Step 1: Testing Database Connection${NC}"
echo "----------------------------------------"

# Test connection
if command -v psql &> /dev/null; then
    echo "Testing connection to Neon database..."
    if psql "$DATABASE_URL" -c "SELECT version();" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Database connection successful!"
    else
        echo -e "${RED}❌ Database connection failed${NC}"
        echo "Please check your connection string"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠${NC} psql not found. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install postgresql
        else
            echo -e "${RED}❌ Homebrew not found. Please install PostgreSQL manually:${NC}"
            echo "Visit: https://www.postgresql.org/download/macosx/"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        sudo apt-get update && sudo apt-get install -y postgresql-client
    else
        echo -e "${RED}❌ Unsupported OS. Please install PostgreSQL client manually${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${BLUE}📋 Step 2: Running Database Migration${NC}"
echo "----------------------------------------"

echo "Creating scheduled messages tables..."
psql "$DATABASE_URL" -f migrations/create_scheduled_bulk_messages.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Database migration completed successfully!"
else
    echo -e "${RED}❌ Database migration failed${NC}"
    echo "Check the error messages above"
    exit 1
fi

echo ""
echo -e "${BLUE}📋 Step 3: Verifying Tables${NC}"
echo "----------------------------------------"

echo "Checking if tables were created..."
TABLES=$(psql "$DATABASE_URL" -t -c "
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE '%scheduled%'
    ORDER BY table_name;
")

if [ -z "$TABLES" ]; then
    echo -e "${RED}❌ No tables found. Migration may have failed.${NC}"
    exit 1
else
    echo -e "${GREEN}✓${NC} Found the following tables:"
    echo "$TABLES" | while read -r table; do
        if [ ! -z "$table" ]; then
            echo "   - $table"
        fi
    done
fi

echo ""
echo -e "${BLUE}📋 Step 4: Environment Configuration${NC}"
echo "----------------------------------------"

echo "Please add this to your .env file:"
echo ""
echo -e "${YELLOW}DATABASE_URL=\"postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require\"${NC}"
echo ""
echo "Also make sure you have:"
echo "VITE_SUPABASE_URL=your_supabase_url"
echo "VITE_SUPABASE_ANON_KEY=your_supabase_key"
echo ""

# Check if server dependencies are installed
echo ""
echo -e "${BLUE}📋 Step 5: Backend Dependencies${NC}"
echo "----------------------------------------"

if [ -d "server" ]; then
    cd server
    
    if [ ! -d "node_modules" ]; then
        echo "Installing server dependencies..."
        npm install
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓${NC} Server dependencies installed"
        else
            echo -e "${RED}❌ Failed to install server dependencies${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}✓${NC} Server dependencies already installed"
    fi
    
    cd ..
else
    echo -e "${YELLOW}⚠${NC} Server directory not found"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              ✅ SETUP COMPLETE!                           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo ""
echo "1. Add the DATABASE_URL to your .env file (shown above)"
echo ""
echo "2. Start the backend server:"
echo "   ${GREEN}cd server && npm start${NC}"
echo ""
echo "3. In a new terminal, start the frontend:"
echo "   ${GREEN}npm run dev${NC}"
echo ""
echo "4. Navigate to:"
echo "   ${GREEN}http://localhost:5173/sms/scheduled${NC}"
echo ""
echo "5. Click 'Schedule New' to create your first scheduled message"
echo ""
echo -e "${BLUE}📚 Documentation:${NC}"
echo "   - Quick Start: ${BLUE}START_HERE.md${NC}"
echo "   - Complete Guide: ${BLUE}SCHEDULED_BULK_MESSAGES_GUIDE.md${NC}"
echo ""
echo "Happy scheduling! 🚀"

