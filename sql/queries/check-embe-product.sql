-- ============================================
-- Check if "Embe" product has IMEI variants
-- Run this in Supabase SQL Editor
-- ============================================

-- Find the variant by SKU
WITH product_variant AS (
  SELECT 
    v.id,
    v.product_id,
    v.variant_name,
    v.sku,
    v.quantity,
    v.selling_price,
    v.cost_price,
    v.variant_attributes,
    v.is_active,
    p.name as product_name,
    p.stock_quantity as product_stock
  FROM lats_product_variants v
  JOIN lats_products p ON p.id = v.product_id
  WHERE v.sku = 'SKU-1761224833317-0KI-V01'
)
SELECT 
  product_name,
  variant_name,
  sku,
  quantity,
  selling_price,
  cost_price,
  -- Check if has IMEI
  CASE 
    WHEN variant_attributes->>'imei' IS NOT NULL 
    THEN '✅ YES - This IS an IMEI Variant'
    ELSE '❌ NO - This is a Regular Variant'
  END as has_imei,
  -- Show IMEI if exists
  variant_attributes->>'imei' as imei,
  variant_attributes->>'serial_number' as serial_number,
  variant_attributes->>'condition' as condition,
  variant_attributes->>'source' as source,
  product_stock,
  is_active
FROM product_variant;

-- ============================================
-- Check all variants for this product
-- ============================================

WITH product_info AS (
  SELECT p.id, p.name
  FROM lats_product_variants v
  JOIN lats_products p ON p.id = v.product_id
  WHERE v.sku = 'SKU-1761224833317-0KI-V01'
)
SELECT 
  v.variant_name,
  v.sku,
  v.quantity,
  v.selling_price,
  CASE 
    WHEN v.variant_attributes->>'imei' IS NOT NULL 
    THEN '📱 IMEI Variant'
    ELSE '📦 Regular Variant'
  END as variant_type,
  v.variant_attributes->>'imei' as imei,
  v.is_active
FROM product_info p
JOIN lats_product_variants v ON v.product_id = p.id
WHERE v.is_active = true
ORDER BY v.created_at;

-- ============================================
-- Summary: Count IMEI vs Regular variants
-- ============================================

WITH product_info AS (
  SELECT p.id, p.name
  FROM lats_product_variants v
  JOIN lats_products p ON p.id = v.product_id
  WHERE v.sku = 'SKU-1761224833317-0KI-V01'
)
SELECT 
  p.name as product_name,
  COUNT(*) as total_variants,
  COUNT(CASE WHEN v.variant_attributes->>'imei' IS NOT NULL THEN 1 END) as imei_variants,
  COUNT(CASE WHEN v.variant_attributes->>'imei' IS NULL THEN 1 END) as regular_variants
FROM product_info p
JOIN lats_product_variants v ON v.product_id = p.id
WHERE v.is_active = true
GROUP BY p.name;

