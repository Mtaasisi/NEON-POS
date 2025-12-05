#!/bin/bash

echo "🔍 WhatsApp Webhook Flow Test"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test 1: Check webhook endpoint health
echo "📡 Test 1: Checking webhook endpoint..."
RESPONSE=$(curl -s https://dukani.site/api/whatsapp/webhook-debug.php)
echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q "healthy"; then
    echo -e "${GREEN}✅ Webhook endpoint is accessible${NC}"
else
    echo -e "${RED}❌ Webhook endpoint not accessible${NC}"
    exit 1
fi

echo ""
echo "======================================"
echo ""

# Test 2: Send test message
echo "📨 Test 2: Sending test webhook message..."
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
MESSAGE_ID="test_$(date +%s)"

RESPONSE=$(curl -s -X POST https://dukani.site/api/whatsapp/webhook-debug.php \
  -H "Content-Type: application/json" \
  -d '{
    "event": "messages.received",
    "data": {
      "from": "255746605561@s.whatsapp.net",
      "id": "'"$MESSAGE_ID"'",
      "text": "DEBUG TEST - '"$(date '+%Y-%m-%d %H:%M:%S')"'",
      "body": "DEBUG TEST - '"$(date '+%Y-%m-%d %H:%M:%S')"'",
      "type": "text",
      "timestamp": "'"$TIMESTAMP"'"
    }
  }')

echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q "received"; then
    echo -e "${GREEN}✅ Webhook accepted the message${NC}"
else
    echo -e "${RED}❌ Webhook rejected the message${NC}"
fi

echo ""
echo "======================================"
echo ""

# Test 3: Check database
echo "💾 Test 3: Checking database for new message..."
sleep 2

DB_COUNT=$(psql 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require' -t -c "SELECT COUNT(*) FROM whatsapp_incoming_messages WHERE message_id = '$MESSAGE_ID';")

if [ "$DB_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Message found in database!${NC}"
    psql 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require' -c "SELECT from_phone, message_text, created_at FROM whatsapp_incoming_messages WHERE message_id = '$MESSAGE_ID';"
else
    echo -e "${RED}❌ Message NOT found in database${NC}"
fi

echo ""
echo "======================================"
echo ""

# Test 4: Check webhook logs
echo "📋 Test 4: Checking webhook debug logs..."
echo ""
echo "Fetching latest log entries..."
curl -s https://dukani.site/api/whatsapp/webhook-debug-log.php 2>/dev/null | tail -50

echo ""
echo "======================================"
echo ""

# Test 5: Check if WasenderAPI is configured
echo "🔧 Test 5: WasenderAPI Configuration Check"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT:${NC}"
echo "For real messages to work, you MUST configure webhook in WasenderAPI:"
echo ""
echo "1. Go to: https://wasenderapi.com/whatsapp/37637/edit"
echo "2. Enter webhook URL: https://dukani.site/api/whatsapp/webhook.php"
echo "   ${RED}(Note: Use webhook.php NOT webhook-debug.php)${NC}"
echo "3. Check: messages.received, messages.upsert"
echo "4. Enable webhook toggle"
echo "5. Click 'Save Changes'"
echo ""

# Summary
echo "======================================"
echo "📊 Summary"
echo "======================================"
echo ""

TOTAL=$(psql 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require' -t -c "SELECT COUNT(*) FROM whatsapp_incoming_messages;")

echo "Total messages in database: $TOTAL"
echo ""

if [ "$TOTAL" -gt 1 ]; then
    echo -e "${GREEN}✅ Webhook is storing messages!${NC}"
    echo ""
    echo "Latest messages:"
    psql 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require' -c "SELECT from_phone, LEFT(message_text, 50) as message, created_at FROM whatsapp_incoming_messages ORDER BY created_at DESC LIMIT 5;"
else
    echo -e "${YELLOW}⚠️  Only test messages in database${NC}"
    echo ""
    echo "If you send real WhatsApp messages and they don't appear:"
    echo "  → Webhook not configured in WasenderAPI"
    echo "  → Didn't click 'Save Changes' button"
    echo "  → Wrong webhook URL configured"
fi

echo ""

