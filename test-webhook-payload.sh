#!/bin/bash
# Test webhook with a sample WhatsApp message payload

echo "🧪 Testing webhook with sample message payload..."
echo ""

curl -X POST https://inauzwaapp.netlify.app/.netlify/functions/whatsapp-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "messages.received",
    "data": {
      "from": "255123456789@s.whatsapp.net",
      "id": "test_'$(date +%s)'",
      "text": "Test message from webhook test script",
      "type": "text",
      "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"
    }
  }' | python3 -m json.tool

echo ""
echo "✅ Test completed. Check database for the message."






