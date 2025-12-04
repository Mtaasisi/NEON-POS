#!/bin/bash

# ================================================
# Production Build Script
# ================================================
# This script builds your application for production
# with the correct database configuration

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}          🏗️  PRODUCTION BUILD PROCESS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Step 1: Show database info
echo -e "${CYAN}📊 Production Database Configuration:${NC}"
echo -e "${GREEN}   Host: ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech${NC}"
echo -e "${GREEN}   Database: neondb${NC}"
echo -e "${GREEN}   SSL: Required with Channel Binding${NC}"
echo ""

# Step 2: Clean previous builds
echo -e "${YELLOW}🧹 Step 1/5: Cleaning previous builds...${NC}"
if [ -d "dist" ]; then
    rm -rf dist
    echo -e "${GREEN}   ✅ Removed old dist folder${NC}"
else
    echo -e "${GREEN}   ✅ No previous build found${NC}"
fi
echo ""

# Step 3: Install/update dependencies
echo -e "${YELLOW}📦 Step 2/5: Checking dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${CYAN}   Installing dependencies...${NC}"
    npm install
    echo -e "${GREEN}   ✅ Dependencies installed${NC}"
else
    echo -e "${GREEN}   ✅ Dependencies already installed${NC}"
fi
echo ""

# Step 4: Verify build configuration
echo -e "${YELLOW}🔍 Step 3/5: Verifying database configuration...${NC}"
node verify-build-config.mjs
if [ $? -eq 0 ]; then
    echo -e "${GREEN}   ✅ Database configuration verified${NC}"
else
    echo -e "${RED}   ❌ Configuration verification failed${NC}"
    exit 1
fi
echo ""

# Step 5: Type check
echo -e "${YELLOW}🔧 Step 4/5: Type checking TypeScript...${NC}"
npm run type-check
if [ $? -eq 0 ]; then
    echo -e "${GREEN}   ✅ Type check passed${NC}"
else
    echo -e "${YELLOW}   ⚠️  Type check warnings (continuing anyway)${NC}"
fi
echo ""

# Step 6: Build for production
echo -e "${YELLOW}🏗️  Step 5/5: Building production bundle...${NC}"
NODE_ENV=production npm run build:prod
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}   ✅ Production Build Complete!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    # Show build size
    echo -e "${CYAN}📦 Build Output:${NC}"
    if [ -d "dist" ]; then
        du -sh dist
        echo ""
        echo -e "${CYAN}📁 Build contents:${NC}"
        ls -lh dist/ | head -10
    fi
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}          📋 NEXT STEPS${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${GREEN}Your production build is ready in the ${CYAN}dist/${GREEN} folder.${NC}"
    echo ""
    echo -e "${YELLOW}To deploy:${NC}"
    echo -e "  ${CYAN}1.${NC} Upload ${CYAN}dist/${NC} folder to your hosting provider"
    echo -e "  ${CYAN}2.${NC} Set environment variable: ${GREEN}NODE_ENV=production${NC}"
    echo -e "  ${CYAN}3.${NC} Set database URL (or use automatic fallback)"
    echo ""
    echo -e "${YELLOW}Test locally:${NC}"
    echo -e "  ${CYAN}npm run preview${NC}"
    echo ""
    echo -e "${YELLOW}Deploy to Railway:${NC}"
    echo -e "  ${CYAN}./deploy-to-railway.sh${NC}"
    echo ""
    echo -e "${GREEN}✅ Build successful! Ready for deployment.${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
else
    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}   ❌ Build Failed${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}Please check the error messages above.${NC}"
    exit 1
fi

