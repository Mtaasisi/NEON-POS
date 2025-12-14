-- ============================================
-- Find IMEI numbers for Embe product
-- Run this in Supabase SQL Editor
-- ============================================

-- Option 1: Check if IMEIs are in variant_attributes (new system)
SELECT 
  p.name as product_name,
  v.variant_name,
  v.sku,
  v.quantity,
  v.variant_attributes->>'imei' as imei,
  v.variant_attributes as all_attributes,
  v.created_at
FROM lats_product_variants v
JOIN lats_products p ON p.id = v.product_id
WHERE v.sku = 'SKU-1761224833317-0KI-V01'
   OR p.name ILIKE '%Embe%';

-- Option 2: Check if IMEIs are in old inventory_items table (legacy system)
SELECT 
  ii.id,
  p.name as product_name,
  v.variant_name,
  ii.serial_number,
  ii.imei,
  ii.mac_address,
  ii.status,
  ii.cost_price,
  ii.selling_price,
  ii.created_at
FROM inventory_items ii
JOIN lats_products p ON p.id = ii.product_id
LEFT JOIN lats_product_variants v ON v.id = ii.variant_id
WHERE (ii.variant_id = (
  SELECT id FROM lats_product_variants 
  WHERE sku = 'SKU-1761224833317-0KI-V01'
) OR p.name ILIKE '%Embe%')
AND ii.imei IS NOT NULL
ORDER BY ii.created_at;

-- Option 3: Find product by name and check all related data
WITH embe_product AS (
  SELECT id, name, sku, stock_quantity
  FROM lats_products
  WHERE name ILIKE '%Embe%'
  LIMIT 1
)
SELECT 
  'Product Info' as source,
  ep.name,
  ep.sku,
  ep.stock_quantity::text as data,
  NULL as imei
FROM embe_product ep

UNION ALL

SELECT 
  'Variant Info' as source,
  v.variant_name as name,
  v.sku,
  v.quantity::text as data,
  v.variant_attributes->>'imei' as imei
FROM embe_product ep
JOIN lats_product_variants v ON v.product_id = ep.id

UNION ALL

SELECT 
  'Inventory Items' as source,
  ii.serial_number as name,
  ii.item_number as sku,
  ii.status as data,
  ii.imei
FROM embe_product ep
JOIN inventory_items ii ON ii.product_id = ep.id
WHERE ii.imei IS NOT NULL;

