#!/bin/bash
# Simple Netlify Deployment - No Interactive Prompts

set -e

echo "🚀 Netlify WhatsApp Webhook Deployment (Simple)"
echo "════════════════════════════════════════════════════════"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Install function dependencies
echo ""
echo "📦 Installing function dependencies..."
cd netlify/functions
if [ ! -d "node_modules" ]; then
    npm install --silent
fi
cd ../..

# Build the project (skip verification)
echo ""
echo "🔨 Building project..."
# Use direct vite build to skip database verification
npx tsc && npx vite build --mode production && node fix-build-mime-types.mjs
echo -e "${GREEN}✅ Build complete${NC}"

# Deploy to Netlify
echo ""
echo "🚀 Deploying to Netlify..."
echo ""
echo "If not logged in, you'll be prompted to login in your browser."
echo ""

# Try to deploy (will prompt for login if needed)
netlify deploy --prod || {
    echo ""
    echo -e "${YELLOW}⚠️  Deployment failed or requires login${NC}"
    echo ""
    echo "Please run manually:"
    echo "  1. netlify login"
    echo "  2. netlify deploy --prod"
    echo ""
    exit 1
}

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
echo "   - Your webhook URL: https://YOUR-SITE.netlify.app/api/whatsapp/webhook"
echo ""
echo "3. Configure in WasenderAPI:"
echo "   - Go to: https://wasenderapi.com/whatsapp/37637/edit"
echo "   - Set webhook URL to your Netlify URL"
echo "   - Enable events: messages.received, messages.upsert"
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
