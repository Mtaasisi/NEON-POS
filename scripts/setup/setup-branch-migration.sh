#!/bin/bash

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     Database Branch Migration - Setup Script                  ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Node.js found: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed. Please install npm first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} npm found: $(npm --version)"
echo ""

# Install dependencies if needed
echo "📦 Checking dependencies..."

if [ ! -d "node_modules" ]; then
    echo "Installing Node.js dependencies..."
    npm install
else
    echo -e "${GREEN}✓${NC} Dependencies already installed"
fi

echo ""

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOL
# Neon Database Configuration
DATABASE_URL=your_database_url_here

# Neon API Credentials (for branch migration)
NEON_API_KEY=your_neon_api_key_here
NEON_PROJECT_ID=your_neon_project_id_here

# Branch Connection Strings (optional)
SOURCE_DATABASE_URL=postgresql://user:pass@ep-branch-dev.neon.tech/neondb?sslmode=require
TARGET_DATABASE_URL=postgresql://user:pass@ep-branch-main.neon.tech/neondb?sslmode=require
EOL
    echo -e "${YELLOW}⚠${NC}  Please update .env with your actual credentials"
else
    echo -e "${GREEN}✓${NC} .env file exists"
fi

echo ""

# Create neon-branches.json.example if needed (already exists)
if [ -f "neon-branches.json.example" ]; then
    echo -e "${GREEN}✓${NC} neon-branches.json.example exists"
    
    if [ ! -f "neon-branches.json" ]; then
        echo -e "${YELLOW}⚠${NC}  You can copy neon-branches.json.example to neon-branches.json and configure it"
        echo "   cp neon-branches.json.example neon-branches.json"
    fi
fi

echo ""

# Check if backend server directory exists
if [ ! -d "server/routes" ]; then
    echo "📁 Creating server routes directory..."
    mkdir -p server/routes
    echo -e "${GREEN}✓${NC} Directory created"
else
    echo -e "${GREEN}✓${NC} Server routes directory exists"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     Setup Complete!                                            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "📖 Next Steps:"
echo ""
echo "1. Configure your Neon credentials:"
echo "   ${YELLOW}Edit .env file and add:${NC}"
echo "   - NEON_API_KEY"
echo "   - NEON_PROJECT_ID"
echo ""
echo "2. Get your credentials from:"
echo "   🌐 https://console.neon.tech"
echo "   → Account Settings → API Keys"
echo ""
echo "3. Start the backend server:"
echo "   ${GREEN}node server/api.mjs${NC}"
echo ""
echo "4. Start your app:"
echo "   ${GREEN}npm run dev${NC}"
echo ""
echo "5. Access Branch Migration:"
echo "   🖥️  Admin Panel → Settings → Branch Migration"
echo ""
echo "📚 Documentation:"
echo "   - Quick Start: 🚀_QUICK_START_BRANCH_MIGRATION.md"
echo "   - Full Guide:  📚_DATABASE_BRANCH_MIGRATION_GUIDE.md"
echo ""
echo "💻 CLI Usage:"
echo "   ${GREEN}node scripts/migrate-branch-data.mjs --help${NC}"
echo ""
echo "Happy migrating! 🚀"
echo ""

