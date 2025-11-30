-- ============================================
-- QUICK CHECK: Where are Embe IMEIs stored?
-- Run this first for a quick answer
-- ============================================

-- Quick Summary
WITH embe_product AS (
  SELECT id, name FROM lats_products WHERE name ILIKE '%Embe%' LIMIT 1
),
variant_imeis AS (
  SELECT 
    v.id,
    v.variant_name,
    v.variant_attributes->>'imei' as imei,
    v.quantity,
    v.is_active
  FROM embe_product p
  JOIN lats_product_variants v ON v.product_id = p.id
  WHERE v.variant_attributes->>'imei' IS NOT NULL
),
inventory_imeis AS (
  SELECT 
    ii.id,
    ii.serial_number,
    ii.imei,
    ii.status
  FROM embe_product p
  JOIN inventory_items ii ON ii.product_id = p.id
  WHERE ii.imei IS NOT NULL
)
SELECT 
  (SELECT name FROM embe_product) as product_name,
  (SELECT COUNT(*) FROM variant_imeis) as imeis_in_variants_table,
  (SELECT COUNT(*) FROM inventory_imeis) as imeis_in_inventory_items_table,
  CASE 
    WHEN (SELECT COUNT(*) FROM variant_imeis) > 0 THEN '✅ Found in lats_product_variants (NEW SYSTEM)'
    WHEN (SELECT COUNT(*) FROM inventory_imeis) > 0 THEN '⚠️ Found in inventory_items (LEGACY SYSTEM)'
    ELSE '❌ No IMEIs found in database'
  END as location_status;

-- Show the actual IMEIs
SELECT '=== IMEIs in VARIANTS table (New System) ===' as section;
SELECT 
  v.variant_name,
  v.variant_attributes->>'imei' as imei,
  v.variant_attributes->>'serial_number' as serial,
  v.variant_attributes->>'condition' as condition,
  v.quantity,
  v.is_active,
  v.created_at
FROM lats_products p
JOIN lats_product_variants v ON v.product_id = p.id
WHERE p.name ILIKE '%Embe%'
  AND v.variant_attributes->>'imei' IS NOT NULL;

SELECT '=== IMEIs in INVENTORY_ITEMS table (Legacy System) ===' as section;
SELECT 
  ii.id,
  ii.serial_number,
  ii.imei,
  ii.mac_address,
  ii.status,
  ii.location,
  ii.cost_price,
  ii.selling_price,
  ii.created_at,
  ii.purchase_order_id
FROM lats_products p
JOIN inventory_items ii ON ii.product_id = p.id
WHERE p.name ILIKE '%Embe%'
  AND ii.imei IS NOT NULL
ORDER BY ii.created_at DESC;

