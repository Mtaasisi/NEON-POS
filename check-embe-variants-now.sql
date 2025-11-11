-- ============================================
-- CHECK WHAT GOT CREATED FOR EMBE
-- Run this in Supabase SQL Editor NOW
-- ============================================

-- Part 1: See all Embe variants
SELECT 
  '=== ALL EMBE VARIANTS ===' as section,
  v.id,
  v.variant_name,
  v.sku,
  v.quantity,
  v.cost_price,
  v.selling_price,
  v.variant_attributes,
  v.variant_attributes->>'imei' as imei,
  v.is_active,
  v.created_at
FROM lats_product_variants v
JOIN lats_products p ON p.id = v.product_id
WHERE p.name ILIKE '%Embe%'
ORDER BY v.created_at DESC;

-- Part 2: Count variants by type
SELECT 
  '=== VARIANT COUNT ===' as section,
  COUNT(*) as total_variants,
  COUNT(CASE WHEN variant_attributes->>'imei' IS NOT NULL THEN 1 END) as imei_variants,
  COUNT(CASE WHEN variant_attributes->>'imei' IS NULL THEN 1 END) as regular_variants,
  SUM(quantity) as total_stock
FROM lats_product_variants v
JOIN lats_products p ON p.id = v.product_id
WHERE p.name ILIKE '%Embe%'
  AND v.is_active = true;

-- Part 3: Check recent variants (last 10 minutes)
SELECT 
  '=== RECENTLY CREATED VARIANTS ===' as section,
  v.variant_name,
  v.sku,
  v.quantity,
  v.variant_attributes->>'imei' as imei,
  v.variant_attributes->>'serial_number' as serial_number,
  v.created_at
FROM lats_product_variants v
JOIN lats_products p ON p.id = v.product_id
WHERE p.name ILIKE '%Embe%'
  AND v.created_at >= NOW() - INTERVAL '10 minutes'
ORDER BY v.created_at DESC;

-- Part 4: Check if IMEIs are in inventory_items (legacy)
SELECT 
  '=== INVENTORY ITEMS (Legacy System) ===' as section,
  ii.id,
  ii.serial_number,
  ii.imei,
  ii.status,
  ii.location,
  ii.created_at
FROM inventory_items ii
JOIN lats_products p ON p.id = ii.product_id
WHERE p.name ILIKE '%Embe%'
  AND ii.created_at >= NOW() - INTERVAL '10 minutes'
ORDER BY ii.created_at DESC;

-- Part 5: Product info
SELECT 
  '=== PRODUCT INFO ===' as section,
  p.id,
  p.name,
  p.sku,
  p.stock_quantity,
  (SELECT COUNT(*) FROM lats_product_variants WHERE product_id = p.id AND is_active = true) as active_variants
FROM lats_products p
WHERE p.name ILIKE '%Embe%';

