#!/bin/bash

# ================================================
# Railway Deployment Script
# Run this in your terminal
# ================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  Railway Deployment${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Change to server directory
cd /Users/mtaasisi/Downloads/NEON-POS-main/server

echo -e "${GREEN}Step 1: Login to Railway${NC}"
echo -e "${YELLOW}This will open your browser...${NC}"
railway login

echo ""
echo -e "${GREEN}Step 2: Initialize Project${NC}"
railway init

echo ""
echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  Set Environment Variables${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

echo -e "${YELLOW}Using Neon Database Connection${NC}"
echo ""
echo -e "Database: ${GREEN}Neon PostgreSQL${NC}"
echo -e "Connection configured automatically"
echo ""

# Neon database configuration
DB_CONNECTION="postgresql://neondb_owner:npg_vABqUKk73tEW@ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

echo ""
echo -e "${GREEN}Setting environment variables...${NC}"

# For Neon, we use the Supabase client with direct database connection
railway variables set DATABASE_URL="$DB_CONNECTION"
railway variables set VITE_SUPABASE_URL="https://ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech"
railway variables set SUPABASE_URL="https://ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech"

# Note: For Neon, we don't need anon key since we're using direct DB connection
# But set a placeholder to prevent errors
railway variables set VITE_SUPABASE_ANON_KEY="not-needed-for-neon"
railway variables set SUPABASE_ANON_KEY="not-needed-for-neon"

railway variables set NODE_ENV="production"
railway variables set PORT="8000"

# Generate webhook secret
WEBHOOK_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
railway variables set WHATSAPP_WEBHOOK_SECRET="$WEBHOOK_SECRET"

echo -e "${GREEN}✅ Environment variables set!${NC}"

echo ""
echo -e "${GREEN}Step 3: Deploy to Railway${NC}"
railway up

echo ""
echo -e "${GREEN}Step 4: Get your webhook URL${NC}"
DOMAIN=$(railway domain)
echo ""
echo -e "${GREEN}✅ Your webhook URL is:${NC}"
echo -e "${BLUE}https://$DOMAIN/api/whatsapp/webhook${NC}"
echo ""

echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Configure this URL in WasenderAPI"
echo -e "  2. Test with: ${GREEN}curl https://$DOMAIN/api/whatsapp/webhook/health${NC}"
echo -e "  3. Send a test WhatsApp message"
echo ""

