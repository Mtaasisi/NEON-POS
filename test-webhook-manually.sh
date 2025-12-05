#!/bin/bash

# Test webhook manually by sending a fake message

echo "🧪 Testing Webhook with Fake Message"
echo "======================================"
echo ""

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
MESSAGE_ID="test_$(date +%s)"

echo "Sending test message to production webhook..."
echo ""

curl -X POST https://dukani.site/api/whatsapp/webhook.php \
  -H "Content-Type: application/json" \
  -d '{
    "event": "messages.received",
    "data": {
      "from": "255746605561",
      "id": "'"$MESSAGE_ID"'",
      "text": "MANUAL WEBHOOK TEST - '"$(date)"'",
      "type": "text",
      "timestamp": "'"$TIMESTAMP"'"
    }
  }' | jq '.'

echo ""
echo "======================================"
echo ""
echo "✅ Test sent!"
echo ""
echo "Now check database:"
echo "psql 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require' -c \"SELECT from_phone, message_text, created_at FROM whatsapp_incoming_messages ORDER BY created_at DESC LIMIT 5;\""
echo ""

