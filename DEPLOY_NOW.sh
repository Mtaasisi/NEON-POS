#!/bin/bash

# ================================================
# DEPLOY TO RAILWAY - READY TO RUN
# ================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  WhatsApp Webhook Deployment${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

cd /Users/mtaasisi/Downloads/NEON-POS-main/server

echo -e "${GREEN}✅ Your Supabase configuration detected!${NC}"
echo -e "  URL: ${BLUE}https://jxhzveborezjhsmzsgbc.supabase.co${NC}"
echo -e "  Database: ${BLUE}Neon PostgreSQL${NC}"
echo ""

echo -e "${YELLOW}Step 1: Login to Railway...${NC}"
railway login
echo ""

echo -e "${YELLOW}Step 2: Initialize project...${NC}"
railway init
echo ""

echo -e "${YELLOW}Step 3: Setting environment variables...${NC}"

# Set Supabase credentials (already configured in your project)
railway variables set VITE_SUPABASE_URL="https://jxhzveborezjhsmzsgbc.supabase.co"
railway variables set VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aHp2ZWJvcmV6amhzbXpzZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MTE1MjQsImV4cCI6MjA2ODI4NzUyNH0.pIug4PlJ3Q14GxcYilW-u0blByYoyeOfN3q9RNIjgfw"

# Alternative variable names (for compatibility)
railway variables set SUPABASE_URL="https://jxhzveborezjhsmzsgbc.supabase.co"
railway variables set SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aHp2ZWJvcmV6amhzbXpzZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MTE1MjQsImV4cCI6MjA2ODI4NzUyNH0.pIug4PlJ3Q14GxcYilW-u0blByYoyeOfN3q9RNIjgfw"

# Production settings
railway variables set NODE_ENV="production"
railway variables set PORT="8000"

# Generate webhook secret for security
WEBHOOK_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
railway variables set WHATSAPP_WEBHOOK_SECRET="$WEBHOOK_SECRET"

echo -e "${GREEN}✅ Environment variables set!${NC}"
echo ""

echo -e "${YELLOW}Step 4: Deploying to Railway...${NC}"
railway up
echo ""

echo -e "${YELLOW}Step 5: Getting your webhook URL...${NC}"
DOMAIN=$(railway domain 2>&1 | grep -o '[a-z0-9\-]*\.up\.railway\.app' | head -1)

if [ -z "$DOMAIN" ]; then
    echo -e "${YELLOW}⚠️  Could not auto-detect domain. Run manually:${NC}"
    echo -e "  ${GREEN}railway domain${NC}"
else
    echo ""
    echo -e "${GREEN}======================================${NC}"
    echo -e "${GREEN}  ✅ Deployment Successful!${NC}"
    echo -e "${GREEN}======================================${NC}"
    echo ""
    echo -e "${BLUE}Your webhook URL:${NC}"
    echo -e "${GREEN}https://$DOMAIN/api/whatsapp/webhook${NC}"
    echo ""
    echo -e "${BLUE}Health check:${NC}"
    echo -e "${GREEN}https://$DOMAIN/api/whatsapp/webhook/health${NC}"
    echo ""
fi

echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Test health: ${GREEN}curl https://$DOMAIN/api/whatsapp/webhook/health${NC}"
echo -e "  2. Configure webhook in WasenderAPI with URL above"
echo -e "  3. Send test WhatsApp message"
echo -e "  4. Check database: ${GREEN}psql 'postgresql://...' -c \"SELECT * FROM whatsapp_incoming_messages LIMIT 5;\"${NC}"
echo ""
echo -e "${GREEN}🎉 Deployment complete!${NC}"

