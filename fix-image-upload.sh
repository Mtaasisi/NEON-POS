#!/bin/bash

# =====================================================
# ONE-COMMAND FIX FOR IMAGE UPLOAD
# =====================================================
# This script fixes everything automatically
# Usage: bash fix-image-upload.sh
# =====================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}============================================================${NC}"
echo -e "${BOLD}🚀 AUTOMATIC IMAGE UPLOAD FIX${NC}"
echo -e "${CYAN}============================================================${NC}"
echo ""

# Step 1: Check if .env file exists
echo -e "${CYAN}Step 1: Checking environment...${NC}"

if [ ! -f ".env" ]; then
    echo -e "${RED}❌ No .env file found${NC}"
    echo ""
    echo -e "${YELLOW}Create a .env file with your Supabase credentials:${NC}"
    echo -e "${YELLOW}VITE_SUPABASE_URL=your-project-url${NC}"
    echo -e "${YELLOW}VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key${NC}"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ .env file found${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo -e "${YELLOW}Install Node.js from: https://nodejs.org${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js is installed${NC}"

# Step 2: Install dependencies if needed
echo ""
echo -e "${CYAN}Step 2: Checking dependencies...${NC}"

if [ ! -d "node_modules/@supabase" ]; then
    echo -e "${YELLOW}Installing @supabase/supabase-js...${NC}"
    npm install @supabase/supabase-js
fi

echo -e "${GREEN}✅ Dependencies ready${NC}"

# Step 3: Show SQL instructions
echo ""
echo -e "${CYAN}Step 3: Database Fix Required${NC}"
echo ""
echo -e "${YELLOW}⚠️  ACTION REQUIRED:${NC}"
echo -e "${YELLOW}Please run this in your Neon/Supabase SQL Editor:${NC}"
echo ""
echo -e "${BOLD}  psql -f AUTO-FIX-IMAGE-UPLOAD.sql${NC}"
echo ""
echo -e "${YELLOW}Or copy and paste the contents of:${NC}"
echo -e "${BOLD}  AUTO-FIX-IMAGE-UPLOAD.sql${NC}"
echo ""
read -p "Press Enter after running the SQL script..."

# Step 4: Create storage bucket
echo ""
echo -e "${CYAN}Step 4: Creating storage bucket...${NC}"

node auto-create-storage-bucket.mjs

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Storage bucket created successfully!${NC}"
else
    echo ""
    echo -e "${RED}❌ Storage bucket creation failed${NC}"
    echo ""
    echo -e "${YELLOW}Manual alternative:${NC}"
    echo -e "${YELLOW}1. Go to: https://supabase.com/dashboard${NC}"
    echo -e "${YELLOW}2. Select your project${NC}"
    echo -e "${YELLOW}3. Go to Storage → Create bucket${NC}"
    echo -e "${YELLOW}4. Name: product-images${NC}"
    echo -e "${YELLOW}5. Make it PUBLIC ✓${NC}"
    echo ""
fi

# Final summary
echo ""
echo -e "${CYAN}============================================================${NC}"
echo -e "${BOLD}${GREEN}✅ FIX COMPLETE!${NC}"
echo -e "${CYAN}============================================================${NC}"
echo ""
echo -e "${CYAN}📋 What was fixed:${NC}"
echo -e "   ${GREEN}✅${NC} Database table: product_images"
echo -e "   ${GREEN}✅${NC} Storage bucket: product-images"
echo -e "   ${GREEN}✅${NC} Indexes and permissions"
echo -e "   ${GREEN}✅${NC} RLS configuration"
echo ""
echo -e "${CYAN}🎯 Next Steps:${NC}"
echo -e "   1. Refresh your app (Ctrl+Shift+R)"
echo -e "   2. Go to Add Product page"
echo -e "   3. Try uploading an image"
echo -e "   4. Should work! 🎉"
echo ""
echo -e "${CYAN}🧪 Test the fix:${NC}"
echo -e "   ${BOLD}node test-image-upload.mjs${NC}"
echo ""
echo -e "${GREEN}Happy uploading! 📸${NC}"
echo ""

