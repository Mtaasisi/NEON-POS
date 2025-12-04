#!/bin/bash

# Test WasenderAPI Connection
# Verifies your Bearer Token and fetches your sessions

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     WasenderAPI Connection Test                           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Database connection
DB_URL="postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"

echo "📊 Step 1: Checking database configuration..."

# Get Bearer Token from database
BEARER_TOKEN=$(psql "$DB_URL" -t -c "SELECT credentials->>'api_key' FROM lats_pos_integrations_settings WHERE integration_name = 'WHATSAPP_WASENDER' AND is_enabled = true LIMIT 1;" 2>/dev/null | xargs)

if [ -z "$BEARER_TOKEN" ] || [ "$BEARER_TOKEN" = "" ]; then
    # Try bearer_token field
    BEARER_TOKEN=$(psql "$DB_URL" -t -c "SELECT credentials->>'bearer_token' FROM lats_pos_integrations_settings WHERE integration_name = 'WHATSAPP_WASENDER' AND is_enabled = true LIMIT 1;" 2>/dev/null | xargs)
fi

if [ -z "$BEARER_TOKEN" ] || [ "$BEARER_TOKEN" = "" ]; then
    echo "❌ No Bearer Token found in database"
    echo "   Please configure WhatsApp integration:"
    echo "   Admin Settings → Integrations → WhatsApp (WasenderAPI)"
    echo ""
    exit 1
fi

echo "✅ Bearer Token found: ${BEARER_TOKEN:0:20}..."
echo ""

echo "📡 Step 2: Testing WasenderAPI connection..."

# Test API call
RESPONSE=$(curl -s -w "\n%{http_code}" "https://www.wasenderapi.com/api/whatsapp-sessions" \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ API Connection Successful!"
    echo ""
    echo "📱 Your WasenderAPI Sessions:"
    echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
    echo ""
    
    # Count sessions
    SESSION_COUNT=$(echo "$BODY" | grep -o '"id"' | wc -l | xargs)
    echo "═══════════════════════════════════════════════════════════"
    echo "Total Sessions: $SESSION_COUNT"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "✅ Next Step: Click 'Sync from API' in Session Manager to import these!"
    
elif [ "$HTTP_CODE" = "401" ]; then
    echo "❌ Authentication Failed (401 Unauthorized)"
    echo "   Your Bearer Token is invalid or expired"
    echo "   Please update it in: Admin Settings → Integrations"
    
elif [ "$HTTP_CODE" = "403" ]; then
    echo "❌ Forbidden (403)"
    echo "   Your account may have reached session limits"
    echo "   Or subscription may be inactive"
    
else
    echo "❌ API Error (HTTP $HTTP_CODE)"
    echo "$BODY"
fi

echo ""

