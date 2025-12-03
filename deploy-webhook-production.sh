#!/bin/bash

# ================================================
# Production Webhook Deployment Script
# ================================================
# This script helps you deploy webhooks to production

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  WhatsApp Webhook Production Deploy${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Check if server directory exists
if [ ! -d "server" ]; then
    echo -e "${RED}❌ Error: server/ directory not found${NC}"
    echo -e "${YELLOW}Run this script from the project root${NC}"
    exit 1
fi

# Step 1: Install dependencies
echo -e "${BLUE}Step 1: Installing dependencies...${NC}"
cd server
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 2: Build TypeScript
echo -e "${BLUE}Step 2: Building TypeScript...${NC}"
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi
echo ""

# Step 3: Check environment variables
echo -e "${BLUE}Step 3: Checking environment variables...${NC}"

if [ -f ".env" ]; then
    echo -e "${GREEN}✅ .env file found${NC}"
    
    # Check required variables
    if grep -q "VITE_SUPABASE_URL" .env || grep -q "SUPABASE_URL" .env; then
        echo -e "${GREEN}✅ Supabase URL configured${NC}"
    else
        echo -e "${RED}❌ Supabase URL not found in .env${NC}"
        echo -e "${YELLOW}Add: VITE_SUPABASE_URL=your-url${NC}"
    fi
    
    if grep -q "VITE_SUPABASE_ANON_KEY" .env || grep -q "SUPABASE_ANON_KEY" .env; then
        echo -e "${GREEN}✅ Supabase key configured${NC}"
    else
        echo -e "${RED}❌ Supabase key not found in .env${NC}"
        echo -e "${YELLOW}Add: VITE_SUPABASE_ANON_KEY=your-key${NC}"
    fi
    
    if grep -q "WHATSAPP_WEBHOOK_SECRET" .env; then
        echo -e "${GREEN}✅ Webhook secret configured${NC}"
    else
        echo -e "${YELLOW}⚠️  Webhook secret not set (recommended for production)${NC}"
        echo -e "${YELLOW}Generate: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No .env file found${NC}"
    echo -e "${YELLOW}Copy env.production.template and fill in values${NC}"
fi
echo ""

# Step 4: Test build
echo -e "${BLUE}Step 4: Testing build...${NC}"
if [ -f "dist/index.js" ]; then
    echo -e "${GREEN}✅ Build output exists${NC}"
else
    echo -e "${RED}❌ Build output not found${NC}"
    exit 1
fi
echo ""

# Step 5: Deployment options
echo -e "${BLUE}Step 5: Choose deployment platform:${NC}"
echo -e "  ${GREEN}1)${NC} Railway (recommended)"
echo -e "  ${GREEN}2)${NC} Heroku"
echo -e "  ${GREEN}3)${NC} Vercel"
echo -e "  ${GREEN}4)${NC} DigitalOcean"
echo -e "  ${GREEN}5)${NC} VPS/Manual"
echo ""
read -p "Enter choice (1-5): " choice

cd ..  # Back to project root

case $choice in
    1)
        echo -e "${BLUE}Deploying to Railway...${NC}"
        if ! command -v railway &> /dev/null; then
            echo -e "${YELLOW}Installing Railway CLI...${NC}"
            npm install -g @railway/cli
        fi
        echo -e "${YELLOW}Run these commands:${NC}"
        echo -e "  ${GREEN}railway login${NC}"
        echo -e "  ${GREEN}cd server && railway init${NC}"
        echo -e "  ${GREEN}railway up${NC}"
        ;;
    2)
        echo -e "${BLUE}Deploying to Heroku...${NC}"
        if ! command -v heroku &> /dev/null; then
            echo -e "${RED}Heroku CLI not installed${NC}"
            echo -e "${YELLOW}Install from: https://devcenter.heroku.com/articles/heroku-cli${NC}"
        else
            echo -e "${YELLOW}Run these commands:${NC}"
            echo -e "  ${GREEN}heroku login${NC}"
            echo -e "  ${GREEN}heroku create your-app-name${NC}"
            echo -e "  ${GREEN}cd server && git init${NC}"
            echo -e "  ${GREEN}git add . && git commit -m 'Deploy'${NC}"
            echo -e "  ${GREEN}git push heroku main${NC}"
        fi
        ;;
    3)
        echo -e "${BLUE}Deploying to Vercel...${NC}"
        if ! command -v vercel &> /dev/null; then
            echo -e "${YELLOW}Installing Vercel CLI...${NC}"
            npm install -g vercel
        fi
        echo -e "${YELLOW}Run these commands:${NC}"
        echo -e "  ${GREEN}cd server${NC}"
        echo -e "  ${GREEN}vercel --prod${NC}"
        ;;
    4)
        echo -e "${BLUE}Deploying to DigitalOcean...${NC}"
        echo -e "${YELLOW}1. Go to: https://cloud.digitalocean.com/apps${NC}"
        echo -e "${YELLOW}2. Click 'Create App'${NC}"
        echo -e "${YELLOW}3. Connect GitHub or upload server/ folder${NC}"
        echo -e "${YELLOW}4. Add environment variables${NC}"
        echo -e "${YELLOW}5. Deploy${NC}"
        ;;
    5)
        echo -e "${BLUE}Manual/VPS Deployment${NC}"
        echo -e "${YELLOW}1. Upload server/ to your VPS${NC}"
        echo -e "${YELLOW}2. Install Node.js and PM2${NC}"
        echo -e "${YELLOW}3. Create .env file with variables${NC}"
        echo -e "${YELLOW}4. Run: pm2 start dist/index.js${NC}"
        echo -e "${YELLOW}5. Setup Nginx reverse proxy${NC}"
        echo -e "${YELLOW}6. Get SSL with Let's Encrypt${NC}"
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  Pre-deployment Complete!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "${YELLOW}After deploying:${NC}"
echo -e "  1. Run database migration: ${GREEN}node setup-whatsapp-webhook.mjs${NC}"
echo -e "  2. Configure webhook URL in WasenderAPI"
echo -e "  3. Test with: ${GREEN}curl https://your-domain/api/whatsapp/webhook/health${NC}"
echo ""
echo -e "${BLUE}Documentation:${NC}"
echo -e "  📖 Full guide: ${GREEN}PRODUCTION_DEPLOYMENT.md${NC}"
echo -e "  🚀 Quick start: ${GREEN}WEBHOOK_QUICK_START.md${NC}"
echo ""

