-- Fix: Mark existing messages as unread
-- This will make them visible in the inbox

UPDATE whatsapp_incoming_messages 
SET is_read = false
WHERE is_read = true;

-- Verify the update
SELECT 
    COUNT(*) as total_messages,
    SUM(CASE WHEN is_read = false THEN 1 ELSE 0 END) as unread_count,
    SUM(CASE WHEN is_read = true THEN 1 ELSE 0 END) as read_count
FROM whatsapp_incoming_messages;

-- Show recent messages
SELECT 
    from_phone,
    message_text,
    is_read,
    replied,
    created_at
FROM whatsapp_incoming_messages 
ORDER BY created_at DESC 
LIMIT 10;

