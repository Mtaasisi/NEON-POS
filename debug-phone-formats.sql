-- Debug Script: Check phone number formats in database
-- Run this to see what formats your phone numbers are stored in

-- 1. Check sample phone numbers from customers
SELECT 
  id,
  name,
  phone,
  whatsapp,
  LENGTH(phone) as phone_length,
  LENGTH(whatsapp) as whatsapp_length
FROM customers
WHERE phone IS NOT NULL OR whatsapp IS NOT NULL
LIMIT 20;

-- 2. Check phone numbers from incoming WhatsApp messages
SELECT 
  id,
  from_phone,
  customer_id,
  LENGTH(from_phone) as phone_length,
  (SELECT name FROM customers WHERE id = customer_id) as customer_name
FROM whatsapp_incoming_messages
ORDER BY created_at DESC
LIMIT 20;

-- 3. Find messages where customer_id is NULL (no match found)
SELECT 
  from_phone,
  message_text,
  created_at,
  -- Try to manually find if customer exists with similar phone
  (SELECT name FROM customers 
   WHERE phone LIKE '%' || SUBSTRING(from_phone, -9) || '%' 
      OR whatsapp LIKE '%' || SUBSTRING(from_phone, -9) || '%'
   LIMIT 1) as possible_match
FROM whatsapp_incoming_messages
WHERE customer_id IS NULL
ORDER BY created_at DESC
LIMIT 10;

