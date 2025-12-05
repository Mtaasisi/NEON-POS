#!/bin/bash

echo "🔍 Checking for NEW WhatsApp messages..."
echo "========================================"
echo ""

psql 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require' -c "
SELECT 
    from_phone,
    LEFT(message_text, 50) as message,
    is_read,
    received_at,
    created_at
FROM whatsapp_incoming_messages 
ORDER BY created_at DESC 
LIMIT 10;
"

echo ""
echo "========================================"
echo ""

COUNT=$(psql 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require' -t -c "SELECT COUNT(*) FROM whatsapp_incoming_messages;")

echo "Total messages in database: $COUNT"
echo ""

if [ "$COUNT" -eq 1 ]; then
    echo "⚠️  Still only 1 message (the old test message)"
    echo ""
    echo "This means:"
    echo "  1. Webhook not configured in WasenderAPI yet, OR"
    echo "  2. You didn't click 'Save Changes' button, OR"
    echo "  3. You haven't sent a test message yet"
    echo ""
    echo "✅ SOLUTION:"
    echo "  1. Go to: https://wasenderapi.com/whatsapp/37637/edit"
    echo "  2. Click 'Save Changes' button (orange button)"
    echo "  3. Send test WhatsApp message"
    echo "  4. Run this script again"
else
    echo "🎉 SUCCESS! Found $COUNT messages!"
    echo ""
    echo "Webhook is working! ✅"
fi

