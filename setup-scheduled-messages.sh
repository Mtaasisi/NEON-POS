#!/bin/bash

# Scheduled Bulk Messages - Quick Setup Script
# This script sets up the scheduled bulk messages feature

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   SCHEDULED BULK MESSAGES - QUICK SETUP                   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo "Please create a .env file with your Supabase credentials"
    exit 1
fi

# Source .env
source .env

echo -e "${BLUE}📋 Step 1: Database Setup${NC}"
echo "----------------------------------------"

if [ -z "$DATABASE_URL" ] && [ -z "$VITE_SUPABASE_URL" ]; then
    echo -e "${RED}❌ No database URL found in .env${NC}"
    echo "Please add DATABASE_URL or VITE_SUPABASE_URL to your .env file"
    exit 1
fi

# Determine which database connection to use
if [ ! -z "$DATABASE_URL" ]; then
    DB_URL="$DATABASE_URL"
    echo -e "${GREEN}✓${NC} Using DATABASE_URL"
else
    # Convert Supabase URL to connection string
    echo -e "${YELLOW}⚠${NC} Using VITE_SUPABASE_URL (may require psql configuration)"
fi

# Run migration
echo ""
echo "Running database migration..."
if command -v psql &> /dev/null; then
    if [ ! -z "$DATABASE_URL" ]; then
        psql "$DATABASE_URL" -f migrations/create_scheduled_bulk_messages.sql
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓${NC} Database migration completed successfully"
        else
            echo -e "${RED}❌ Database migration failed${NC}"
            echo "You can manually run the migration using:"
            echo "psql \"\$DATABASE_URL\" -f migrations/create_scheduled_bulk_messages.sql"
            exit 1
        fi
    else
        echo -e "${YELLOW}⚠${NC} Please run the migration manually:"
        echo "1. Go to Supabase Dashboard"
        echo "2. Open SQL Editor"
        echo "3. Copy and paste contents from: migrations/create_scheduled_bulk_messages.sql"
        echo "4. Execute the SQL"
        echo ""
        read -p "Press Enter when migration is complete..."
    fi
else
    echo -e "${YELLOW}⚠${NC} psql not found. Please run the migration manually:"
    echo "1. Install PostgreSQL client (psql)"
    echo "2. Run: psql \"\$DATABASE_URL\" -f migrations/create_scheduled_bulk_messages.sql"
    echo ""
    echo "OR using Supabase Dashboard:"
    echo "1. Go to Supabase Dashboard"
    echo "2. Open SQL Editor"
    echo "3. Copy and paste contents from: migrations/create_scheduled_bulk_messages.sql"
    echo "4. Execute the SQL"
    echo ""
    read -p "Press Enter when migration is complete..."
fi

echo ""
echo -e "${BLUE}📋 Step 2: Backend Setup${NC}"
echo "----------------------------------------"

# Check if server directory exists
if [ -d "server" ]; then
    cd server
    
    # Check if dependencies are installed
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
    echo "Make sure you're in the project root directory"
fi

echo ""
echo -e "${BLUE}📋 Step 3: Verify Configuration${NC}"
echo "----------------------------------------"

# Check for required environment variables
MISSING_VARS=()

if [ -z "$VITE_SUPABASE_URL" ]; then
    MISSING_VARS+=("VITE_SUPABASE_URL")
fi

if [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    MISSING_VARS+=("VITE_SUPABASE_ANON_KEY")
fi

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${RED}❌ Missing required environment variables:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "Please add these to your .env file"
    exit 1
else
    echo -e "${GREEN}✓${NC} All required environment variables found"
fi

echo ""
echo -e "${BLUE}📋 Step 4: Test Setup${NC}"
echo "----------------------------------------"

echo "To test the setup:"
echo ""
echo "1. Start the backend server:"
echo "   ${GREEN}cd server && npm start${NC}"
echo ""
echo "2. In a new terminal, start the frontend:"
echo "   ${GREEN}npm run dev${NC}"
echo ""
echo "3. Navigate to:"
echo "   ${GREEN}http://localhost:5173/sms/scheduled${NC}"
echo ""
echo "4. Click 'Schedule New' to create your first scheduled message"
echo ""

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              ✅ SETUP COMPLETE!                           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo ""
echo "1. Review the documentation:"
echo "   ${BLUE}SCHEDULED_BULK_MESSAGES_GUIDE.md${NC}"
echo ""
echo "2. Start your servers and test the feature"
echo ""
echo "3. Check server logs to confirm scheduler is running:"
echo "   Look for: '📅 Scheduled Messages Service: STARTED'"
echo ""
echo -e "${YELLOW}Need Help?${NC}"
echo "- Read: SCHEDULED_BULK_MESSAGES_GUIDE.md"
echo "- Check: Server logs for errors"
echo "- Test: Create a simple one-time message"
echo ""
echo "Happy scheduling! 🚀"

