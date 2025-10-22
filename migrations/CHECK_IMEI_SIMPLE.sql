-- Check if the IMEI was stored in inventory_items
SELECT 
  id,
  product_id,
  imei,
  cost_price,
  selling_price,
  status,
  created_at
FROM inventory_items
WHERE imei = '987654321098765'
ORDER BY created_at DESC
LIMIT 10;

-- Check all recent inventory items
SELECT 
  id,
  product_id,
  imei,
  status,
  created_at
FROM inventory_items
ORDER BY created_at DESC
LIMIT 5;

