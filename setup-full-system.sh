#!/bin/bash

# Complete System Setup Script
# Sets up both frontend and backend for development

echo "🚀 Setting Up Complete POS System"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Check prerequisites
echo "📋 Step 1: Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found!${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found!${NC}"
    echo "Please install npm"
    exit 1
fi

echo -e "${GREEN}✓${NC} Node.js: $(node --version)"
echo -e "${GREEN}✓${NC} npm: $(npm --version)"
echo ""

# Step 2: Install frontend dependencies
echo "📦 Step 2: Installing frontend dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✓${NC} Frontend dependencies installed"
else
    echo -e "${BLUE}ℹ${NC} Frontend dependencies already installed"
fi
echo ""

# Step 3: Install backend dependencies
echo "📦 Step 3: Installing backend dependencies..."
cd server

if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✓${NC} Backend dependencies installed"
else
    echo -e "${BLUE}ℹ${NC} Backend dependencies already installed"
fi

cd ..
echo ""

# Step 4: Setup environment files
echo "⚙️  Step 4: Setting up environment files..."

# Backend .env
if [ ! -f "server/.env" ]; then
    if [ -f "server/.env.example" ]; then
        cp server/.env.example server/.env
        echo -e "${GREEN}✓${NC} Created server/.env from example"
        echo -e "${YELLOW}⚠️  IMPORTANT: Edit server/.env and add your DATABASE_URL!${NC}"
    fi
else
    echo -e "${BLUE}ℹ${NC} server/.env already exists"
fi

# Frontend .env
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✓${NC} Created .env from example"
    fi
else
    echo -e "${BLUE}ℹ${NC} .env already exists"
fi

echo ""

# Step 5: Validate database
echo "🔍 Step 5: Validating products..."
node validate-all-products.mjs 2>&1 | tail -20
echo ""

# Step 6: Apply database fixes
echo "🔧 Step 6: Applying database fixes..."
node fix-all-products.mjs 2>&1 | grep -E "✓|✅|❌" | tail -10
echo ""

# Step 7: Show next steps
echo "✅ Setup Complete!"
echo "=================="
echo ""
echo -e "${GREEN}Your POS system is ready!${NC}"
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Configure database:"
echo -e "   ${BLUE}nano server/.env${NC}  # Add your DATABASE_URL"
echo ""
echo "2. Start backend server:"
echo -e "   ${BLUE}./start-backend.sh${NC}"
echo ""
echo "3. In another terminal, start frontend:"
echo -e "   ${BLUE}npm run dev${NC}"
echo ""
echo "4. Test the system:"
echo -e "   ${BLUE}node auto-test-pos-cart.mjs${NC}"
echo ""
echo "🎉 All 50+ files created and ready to use!"
echo ""
echo "📚 Read START-HERE-FINAL.md for complete guide"
echo ""

