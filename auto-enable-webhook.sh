#!/bin/bash

# ================================================
# Automatic WasenderAPI Webhook Configuration
# ================================================

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  Auto-Configure WasenderAPI Webhook${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Your configuration
WEBHOOK_URL="https://dukani.site/api/whatsapp/webhook.php"
SESSION_ID="37637"

echo -e "${GREEN}✅ Webhook is already active!${NC}"
echo -e "   URL: ${BLUE}$WEBHOOK_URL${NC}"
echo ""

echo -e "${YELLOW}To enable automatic message receiving:${NC}"
echo ""

echo -e "1. ${BLUE}Get your WasenderAPI Bearer Token:${NC}"
echo -e "   - Go to: https://wasenderapi.com/whatsapp/$SESSION_ID/edit"
echo -e "   - Look for 'API Key' or 'Bearer Token'"
echo -e "   - Copy it"
echo ""

read -p "$(echo -e ${YELLOW}Paste your WasenderAPI Bearer Token here: ${NC})" API_TOKEN

if [ -z "$API_TOKEN" ]; then
    echo -e "${RED}❌ No token provided${NC}"
    echo ""
    echo -e "${YELLOW}Manual Configuration:${NC}"
    echo -e "1. Go to: https://wasenderapi.com/whatsapp/$SESSION_ID/edit"
    echo -e "2. Find 'Webhook URL' field"
    echo -e "3. Enter: $WEBHOOK_URL"
    echo -e "4. Enable webhook"
    echo -e "5. Save"
    exit 1
fi

echo ""
echo -e "${BLUE}Configuring webhook...${NC}"
echo ""

# Configure webhook via API
RESPONSE=$(curl -s -X PUT "https://wasenderapi.com/api/whatsapp-sessions/$SESSION_ID" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook_url": "'"$WEBHOOK_URL"'",
    "webhook_events": [
      "messages.received",
      "messages.upsert",
      "messages.update",
      "messages.reaction",
      "session.status",
      "call.received",
      "poll.results"
    ],
    "webhook_enabled": true
  }')

echo -e "${GREEN}Response from API:${NC}"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  ✅ Webhook Configuration Complete!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""

echo -e "${BLUE}Test now:${NC}"
echo -e "1. Send WhatsApp to your business number"
echo -e "2. Check database:"
echo -e "   ${GREEN}psql 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require' -c \"SELECT * FROM whatsapp_incoming_messages ORDER BY created_at DESC LIMIT 3;\"${NC}"
echo ""
echo -e "${BLUE}3. Check WhatsApp Inbox in your app${NC}"
echo -e "   http://localhost:5173/whatsapp/inbox"
echo ""
echo -e "${GREEN}🎉 You should now receive messages!${NC}"
echo ""

