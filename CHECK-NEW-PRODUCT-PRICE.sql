-- ============================================
-- QUICK CHECK: Why New Products Don't Show Price
-- ============================================
-- Run this to see if your products have pricing issues
-- ============================================

-- 1. Check if products have variants
SELECT 
  '📊 ISSUE CHECK: Products Without Variants' as issue,
  p.name as product_name,
  p.unit_price as product_has_price,
  p.created_at as created_date,
  COUNT(v.id) as variant_count
FROM lats_products p
LEFT JOIN lats_product_variants v ON p.id = v.product_id
WHERE p.is_active = true
GROUP BY p.id, p.name, p.unit_price, p.created_at
HAVING COUNT(v.id) = 0
ORDER BY p.created_at DESC
LIMIT 10;

-- 2. Check if variants have prices
SELECT 
  '💰 ISSUE CHECK: Variants With Zero Prices' as issue,
  p.name as product_name,
  v.name as variant_name,
  p.unit_price as product_price,
  v.unit_price as variant_unit_price,
  COALESCE(v.selling_price, 0) as variant_selling_price,
  p.created_at as created_date
FROM lats_products p
INNER JOIN lats_product_variants v ON p.id = v.product_id
WHERE p.is_active = true
  AND v.is_active = true
  AND (v.unit_price = 0 OR v.unit_price IS NULL)
ORDER BY p.created_at DESC
LIMIT 10;

-- 3. Check variant table columns
SELECT 
  '🔍 VARIANT TABLE COLUMNS' as info,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'lats_product_variants'
  AND column_name IN ('name', 'variant_name', 'unit_price', 'selling_price', 'cost_price', 'attributes', 'variant_attributes')
ORDER BY column_name;

-- 4. Overall summary
SELECT 
  '📊 OVERALL SUMMARY' as summary,
  (SELECT COUNT(*) FROM lats_products WHERE is_active = true) as total_active_products,
  (SELECT COUNT(*) FROM lats_product_variants WHERE is_active = true) as total_active_variants,
  (SELECT COUNT(DISTINCT p.id) 
   FROM lats_products p 
   LEFT JOIN lats_product_variants v ON p.id = v.product_id 
   WHERE p.is_active = true AND v.id IS NULL) as products_without_variants,
  (SELECT COUNT(*) 
   FROM lats_product_variants v 
   INNER JOIN lats_products p ON v.product_id = p.id
   WHERE v.is_active = true 
   AND p.is_active = true
   AND (v.unit_price = 0 OR v.unit_price IS NULL)) as variants_with_zero_price;

-- 5. Check most recent products
SELECT 
  '🆕 RECENT PRODUCTS STATUS' as check,
  p.name,
  p.unit_price as product_price,
  p.stock_quantity as product_stock,
  COUNT(v.id) as variant_count,
  MAX(v.unit_price) as max_variant_price,
  p.created_at
FROM lats_products p
LEFT JOIN lats_product_variants v ON p.id = v.product_id AND v.is_active = true
WHERE p.is_active = true
GROUP BY p.id, p.name, p.unit_price, p.stock_quantity, p.created_at
ORDER BY p.created_at DESC
LIMIT 15;

