-- Check if customer with phone 255746605561 exists in database
-- Run this query in your Supabase SQL editor

-- Check all possible variations of this phone number
SELECT 
  id, 
  name, 
  phone, 
  whatsapp,
  email,
  created_at
FROM customers
WHERE 
  -- Try exact matches
  phone = '255746605561' 
  OR whatsapp = '255746605561'
  
  -- Try with + prefix
  OR phone = '+255746605561' 
  OR whatsapp = '+255746605561'
  
  -- Try with 0 prefix (746605561)
  OR phone = '0746605561'
  OR whatsapp = '0746605561'
  
  -- Try just the last 9 digits (746605561)
  OR phone = '746605561'
  OR whatsapp = '746605561'
  
  -- Try with formatting characters
  OR phone LIKE '%746605561%'
  OR whatsapp LIKE '%746605561%'
  
  -- Try with spaces/dashes
  OR REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', '') LIKE '%746605561%'
  OR REPLACE(REPLACE(REPLACE(whatsapp, ' ', ''), '-', ''), '+', '') LIKE '%746605561%';

-- If above returns no results, this customer doesn't exist in your database
-- You need to add them manually or they used a different number

