-- Find all WhatsApp messages WITHOUT customer match
-- Run this in Supabase SQL Editor

-- 1. List all messages without customer_id (showing as "Unknown")
SELECT 
  from_phone,
  COUNT(*) as message_count,
  MAX(message_text) as last_message,
  MAX(created_at) as last_message_time
FROM whatsapp_incoming_messages
WHERE customer_id IS NULL
GROUP BY from_phone
ORDER BY MAX(created_at) DESC;

-- 2. For each phone above, check if customer exists in database
-- Replace PHONE_NUMBER with the phone from step 1
/*
SELECT id, name, phone, whatsapp
FROM customers
WHERE 
  phone LIKE '%[LAST_9_DIGITS]%' 
  OR whatsapp LIKE '%[LAST_9_DIGITS]%';
*/

-- 3. If customer exists, you can manually link them:
-- Replace MESSAGE_PHONE and CUSTOMER_ID
/*
UPDATE whatsapp_incoming_messages
SET customer_id = 'CUSTOMER_ID_HERE'
WHERE from_phone = 'MESSAGE_PHONE_HERE';
*/

-- Example for 255746605561:
-- First find customer:
-- SELECT id, name FROM customers WHERE phone LIKE '%746605561%' OR whatsapp LIKE '%746605561%';
-- Then update:
-- UPDATE whatsapp_incoming_messages SET customer_id = 'found-customer-id' WHERE from_phone = '255746605561';

