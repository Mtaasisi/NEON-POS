-- ============================================
-- TRACE WHERE YOUR RECEIVING DATA GOES
-- Run this AFTER you receive items
-- ============================================

-- Part 1: Check recent IMEI variants (NEW SYSTEM)
SELECT '=== RECENT IMEI VARIANTS (NEW SYSTEM) ===' as section;

SELECT 
  p.name as product_name,
  v.variant_name,
  v.sku,
  v.quantity,
  v.variant_attributes->>'imei' as imei,
  v.variant_attributes->>'serial_number' as serial_number,
  v.variant_attributes->>'location' as location,
  v.variant_attributes->>'source' as source,
  v.cost_price,
  v.selling_price,
  v.created_at,
  v.updated_at
FROM lats_product_variants v
JOIN lats_products p ON p.id = v.product_id
WHERE v.variant_attributes->>'imei' IS NOT NULL
  AND v.created_at >= NOW() - INTERVAL '1 hour'  -- Last hour
ORDER BY v.created_at DESC;

-- Part 2: Check recent inventory items (LEGACY SYSTEM)
SELECT '=== RECENT INVENTORY ITEMS (LEGACY SYSTEM) ===' as section;

SELECT 
  p.name as product_name,
  ii.id,
  ii.serial_number,
  ii.imei,
  ii.mac_address,
  ii.status,
  ii.location,
  ii.cost_price,
  ii.selling_price,
  ii.purchase_order_id,
  ii.notes,
  ii.created_at
FROM inventory_items ii
JOIN lats_products p ON p.id = ii.product_id
WHERE ii.created_at >= NOW() - INTERVAL '1 hour'  -- Last hour
ORDER BY ii.created_at DESC;

-- Part 3: Check for EMBE specifically
SELECT '=== EMBE PRODUCT - ALL TRACKING DATA ===' as section;

-- Get product info
WITH embe_product AS (
  SELECT id, name, stock_quantity FROM lats_products WHERE name ILIKE '%Embe%' LIMIT 1
)
SELECT 
  'Product' as data_type,
  ep.name as identifier,
  NULL as imei,
  ep.stock_quantity as quantity,
  NULL as created_at,
  'Main product record' as notes
FROM embe_product ep

UNION ALL

-- Get variants
SELECT 
  'Variant' as data_type,
  v.variant_name as identifier,
  v.variant_attributes->>'imei' as imei,
  v.quantity,
  v.created_at,
  CASE 
    WHEN v.variant_attributes->>'imei' IS NOT NULL THEN '✅ Has IMEI (NEW system)'
    ELSE '📦 Regular variant'
  END as notes
FROM embe_product ep
JOIN lats_product_variants v ON v.product_id = ep.id
WHERE v.is_active = true

UNION ALL

-- Get inventory items
SELECT 
  'Inventory Item' as data_type,
  COALESCE(ii.serial_number, 'No serial') as identifier,
  ii.imei,
  1 as quantity,
  ii.created_at,
  '⚠️ Legacy inventory_items table' as notes
FROM embe_product ep
JOIN inventory_items ii ON ii.product_id = ep.id
WHERE ii.status != 'sold'

ORDER BY data_type, created_at DESC;

-- Part 4: Recent stock movements
SELECT '=== RECENT STOCK MOVEMENTS ===' as section;

SELECT 
  p.name as product_name,
  sm.movement_type,
  sm.quantity,
  sm.reference_type,
  sm.notes,
  sm.created_at
FROM lats_stock_movements sm
JOIN lats_products p ON p.id = sm.product_id
WHERE sm.created_at >= NOW() - INTERVAL '1 hour'
ORDER BY sm.created_at DESC;

-- Part 5: Quick count comparison
SELECT '=== QUICK COUNT: WHERE IS YOUR DATA? ===' as section;

WITH embe_data AS (
  SELECT 
    (SELECT COUNT(*) FROM lats_product_variants v
     JOIN lats_products p ON p.id = v.product_id
     WHERE p.name ILIKE '%Embe%'
     AND v.variant_attributes->>'imei' IS NOT NULL
    ) as imei_variants,
    
    (SELECT COUNT(*) FROM inventory_items ii
     JOIN lats_products p ON p.id = ii.product_id
     WHERE p.name ILIKE '%Embe%'
     AND ii.imei IS NOT NULL
    ) as inventory_items_with_imei,
    
    (SELECT stock_quantity FROM lats_products WHERE name ILIKE '%Embe%' LIMIT 1
    ) as product_stock
)
SELECT 
  imei_variants as imei_variants_count,
  inventory_items_with_imei as inventory_items_count,
  product_stock as total_stock,
  CASE 
    WHEN imei_variants > 0 THEN '✅ Using NEW system (IMEI variants)'
    WHEN inventory_items_with_imei > 0 THEN '⚠️ Using LEGACY system (inventory_items)'
    ELSE '❌ No IMEI tracking found'
  END as system_status
FROM embe_data;

