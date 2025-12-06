#!/bin/bash
# Deploy Netlify WhatsApp Webhook - Automated Script

set -e

echo "🚀 Netlify WhatsApp Webhook Deployment"
echo "════════════════════════════════════════════════════════"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo -e "${YELLOW}⚠️  Netlify CLI not found. Installing...${NC}"
    npm install -g netlify-cli
fi

# Check if logged in
if ! netlify status &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Netlify. Please login...${NC}"
    netlify login
fi

# Install function dependencies
echo ""
echo "📦 Step 1: Installing function dependencies..."
cd netlify/functions
if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Dependencies already installed${NC}"
fi
cd ../..

# Check environment variables
echo ""
echo "🔐 Step 2: Checking environment variables..."
if [ -z "$VITE_SUPABASE_URL" ] && [ -z "$SUPABASE_URL" ]; then
    echo -e "${YELLOW}⚠️  VITE_SUPABASE_URL not set locally${NC}"
    echo "   (This is OK - set it in Netlify dashboard after deployment)"
else
    echo -e "${GREEN}✅ Supabase URL found${NC}"
fi

# Build the project
echo ""
echo "🔨 Step 3: Building project..."
echo "   (Using build:hosting to skip database verification)"
npm run build:hosting
echo -e "${GREEN}✅ Build complete${NC}"

# Deploy to Netlify
echo ""
echo "🚀 Step 4: Deploying to Netlify..."
echo ""
echo -e "${YELLOW}Choose deployment method:${NC}"
echo "1) Production deploy (recommended)"
echo "2) Preview deploy (test first)"
read -p "Enter choice (1 or 2): " choice

if [ "$choice" = "1" ]; then
    echo ""
    echo "Deploying to production..."
    netlify deploy --prod
else
    echo ""
    echo "Creating preview deployment..."
    netlify deploy
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Set Environment Variables in Netlify Dashboard:"
echo "   - Go to: https://app.netlify.com → Your Site → Site Settings → Environment Variables"
echo "   - Add: VITE_SUPABASE_URL"
echo "   - Add: VITE_SUPABASE_ANON_KEY"
echo ""
echo "2. Get Your Webhook URL:"
echo "   - Go to: Netlify Dashboard → Your Site → Site Settings → General"
echo "   - Your webhook URL: https://YOUR-SITE.netlify.app/api/whatsapp/webhook"
echo ""
echo "3. Configure in WasenderAPI:"
echo "   - Go to: https://wasenderapi.com/whatsapp/37637/edit"
echo "   - Set webhook URL to your Netlify URL"
echo "   - Enable events: messages.received, messages.upsert"
echo "   - Enable webhook toggle"
echo ""
echo "4. Test the webhook:"
echo "   - Visit: https://YOUR-SITE.netlify.app/api/whatsapp/webhook"
echo "   - Should return: { \"status\": \"healthy\", ... }"
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
