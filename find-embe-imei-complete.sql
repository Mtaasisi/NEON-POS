-- ============================================
-- COMPLETE IMEI SEARCH FOR EMBE PRODUCT
-- Find where IMEI numbers are stored
-- Run this in Supabase SQL Editor
-- ============================================

-- Part 1: Find the product and variant info
SELECT 
  '=== PRODUCT & VARIANT INFO ===' as section,
  p.id as product_id,
  p.name as product_name,
  p.sku as product_sku,
  p.stock_quantity,
  v.id as variant_id,
  v.variant_name,
  v.sku as variant_sku,
  v.quantity as variant_quantity,
  v.variant_attributes,
  v.variant_attributes->>'imei' as imei_in_variant,
  v.created_at,
  v.updated_at
FROM lats_product_variants v
JOIN lats_products p ON p.id = v.product_id
WHERE v.sku = 'SKU-1761224833317-0KI-V01'
   OR p.name ILIKE '%Embe%';

-- Part 2: Check inventory_items table (legacy system - MOST LIKELY HERE)
SELECT 
  '=== INVENTORY ITEMS (Legacy System) ===' as section,
  ii.id,
  p.name as product_name,
  v.variant_name,
  ii.serial_number,
  ii.imei,  -- ← IMEI STORED HERE
  ii.mac_address,
  ii.barcode,
  ii.status,
  ii.location,
  ii.cost_price,
  ii.selling_price,
  ii.warranty_start,
  ii.warranty_end,
  ii.notes,
  ii.metadata,
  ii.created_at,
  ii.purchase_order_id
FROM inventory_items ii
JOIN lats_products p ON p.id = ii.product_id
LEFT JOIN lats_product_variants v ON v.id = ii.variant_id
WHERE (
  ii.variant_id = (
    SELECT id FROM lats_product_variants 
    WHERE sku = 'SKU-1761224833317-0KI-V01'
  )
  OR p.name ILIKE '%Embe%'
)
ORDER BY ii.created_at DESC;

-- Part 3: Check for ALL Embe-related records
WITH embe_product AS (
  SELECT 
    p.id as product_id,
    p.name as product_name,
    p.sku as product_sku,
    p.stock_quantity
  FROM lats_products p
  WHERE p.name ILIKE '%Embe%'
  LIMIT 1
)
SELECT 
  'Product' as data_source,
  ep.product_name as name,
  ep.product_sku as identifier,
  ep.stock_quantity::text as quantity,
  NULL as imei,
  NULL as location,
  'Product record' as notes
FROM embe_product ep

UNION ALL

SELECT 
  'Variant' as data_source,
  v.variant_name as name,
  v.sku as identifier,
  v.quantity::text as quantity,
  v.variant_attributes->>'imei' as imei,
  v.variant_attributes->>'location' as location,
  CASE 
    WHEN v.variant_attributes->>'imei' IS NOT NULL 
    THEN 'Has IMEI in variant_attributes'
    ELSE 'No IMEI in variant'
  END as notes
FROM embe_product ep
JOIN lats_product_variants v ON v.product_id = ep.product_id
WHERE v.is_active = true

UNION ALL

SELECT 
  'Inventory Item' as data_source,
  COALESCE(ii.serial_number, 'No Serial') as name,
  COALESCE(ii.item_number, ii.id::text) as identifier,
  '1' as quantity,
  ii.imei,  -- ← IMEI LOCATION
  COALESCE(ii.location, ii.shelf, ii.bin) as location,
  'Legacy inventory_items table' as notes
FROM embe_product ep
JOIN inventory_items ii ON ii.product_id = ep.product_id
WHERE ii.imei IS NOT NULL
ORDER BY data_source, name;

-- Part 4: Count IMEI locations
WITH embe_product AS (
  SELECT id FROM lats_products WHERE name ILIKE '%Embe%' LIMIT 1
)
SELECT 
  '=== IMEI COUNT BY LOCATION ===' as section,
  COUNT(CASE WHEN v.variant_attributes->>'imei' IS NOT NULL THEN 1 END) as imei_in_variants,
  COUNT(CASE WHEN ii.imei IS NOT NULL THEN 1 END) as imei_in_inventory_items,
  COUNT(CASE WHEN v.variant_attributes->>'imei' IS NOT NULL THEN 1 END) + 
  COUNT(CASE WHEN ii.imei IS NOT NULL THEN 1 END) as total_imei_records
FROM embe_product ep
LEFT JOIN lats_product_variants v ON v.product_id = ep.id AND v.is_active = true
LEFT JOIN inventory_items ii ON ii.product_id = ep.id;

-- Part 5: Show all IMEIs with full details
SELECT 
  '=== ALL IMEI NUMBERS FOUND ===' as section,
  COALESCE(ii.imei, v.variant_attributes->>'imei') as imei_number,
  CASE 
    WHEN ii.imei IS NOT NULL THEN 'inventory_items table (Legacy)'
    WHEN v.variant_attributes->>'imei' IS NOT NULL THEN 'lats_product_variants.variant_attributes (New)'
    ELSE 'Unknown'
  END as stored_in,
  COALESCE(ii.serial_number, v.variant_name) as identifier,
  COALESCE(ii.status, CASE WHEN v.is_active THEN 'active' ELSE 'inactive' END) as status,
  COALESCE(ii.location, v.variant_attributes->>'location') as location,
  COALESCE(ii.cost_price, v.cost_price) as cost_price,
  COALESCE(ii.selling_price, v.selling_price) as selling_price,
  COALESCE(ii.created_at, v.created_at) as created_at
FROM lats_products p
LEFT JOIN lats_product_variants v ON v.product_id = p.id
LEFT JOIN inventory_items ii ON ii.product_id = p.id
WHERE p.name ILIKE '%Embe%'
  AND (ii.imei IS NOT NULL OR v.variant_attributes->>'imei' IS NOT NULL)
ORDER BY created_at DESC;

-- Part 6: Check purchase order history
SELECT 
  '=== PURCHASE ORDER HISTORY ===' as section,
  po.id as po_id,
  po.order_number,
  po.status as po_status,
  poi.id as po_item_id,
  p.name as product_name,
  poi.quantity_ordered,
  poi.quantity_received,
  po.created_at as po_created,
  po.updated_at as po_updated
FROM lats_purchase_orders po
JOIN lats_purchase_order_items poi ON poi.purchase_order_id = po.id
JOIN lats_products p ON p.id = poi.product_id
WHERE p.name ILIKE '%Embe%'
ORDER BY po.created_at DESC
LIMIT 10;

