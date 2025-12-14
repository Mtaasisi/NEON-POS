-- Check if the IMEI was stored in inventory_items
SELECT 
  id,
  product_id,
  serial_number,
  imei,
  cost_price,
  selling_price,
  status,
  created_at
FROM inventory_items
WHERE serial_number = '987654321098765' OR imei = '987654321098765'
ORDER BY created_at DESC
LIMIT 5;

-- Also check the serial_number_movements table
SELECT 
  id,
  inventory_item_id,
  serial_number,
  imei,
  status,
  created_at
FROM serial_number_movements
WHERE serial_number = '987654321098765' OR imei = '987654321098765'
ORDER BY created_at DESC
LIMIT 5;

-- Check the product itself
SELECT 
  p.id,
  p.name,
  p.sku,
  COUNT(ii.id) as inventory_count
FROM lats_products p
LEFT JOIN inventory_items ii ON p.id = ii.product_id
WHERE p.name = 'sada'
GROUP BY p.id, p.name, p.sku;

