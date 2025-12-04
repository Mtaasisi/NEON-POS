-- Check the specific WhatsApp message details
-- Run this in your Supabase SQL editor

-- 1. Check the message from 255746605561
SELECT 
  id,
  message_id,
  from_phone,
  customer_id,
  message_text,
  created_at,
  received_at
FROM whatsapp_incoming_messages
WHERE from_phone = '255746605561'
ORDER BY created_at DESC
LIMIT 5;

-- 2. Try to find if a customer exists with similar phone
SELECT 
  'Customer Found' as status,
  c.id as customer_id,
  c.name,
  c.phone,
  c.whatsapp,
  -- Show what format the phone is in
  LENGTH(c.phone) as phone_length,
  LENGTH(c.whatsapp) as whatsapp_length
FROM customers c
WHERE 
  c.phone LIKE '%746605561%' 
  OR c.whatsapp LIKE '%746605561%'
  OR RIGHT(REPLACE(REPLACE(c.phone, '+', ''), ' ', ''), 9) = '746605561'
  OR RIGHT(REPLACE(REPLACE(c.whatsapp, '+', ''), ' ', ''), 9) = '746605561';

-- 3. If no results above, check if this is a new customer
-- (message exists but no customer in database)

