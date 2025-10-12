-- ============================================
-- QUICK TEST: Do I Have the Price Issue?
-- ============================================
-- Run this ONE query to see if you need the fix
-- ============================================

WITH product_variant_check AS (
  SELECT 
    p.id,
    p.name,
    p.unit_price as product_price,
    p.created_at,
    COUNT(v.id) as variant_count,
    MAX(v.unit_price) as max_variant_price,
    MAX(COALESCE(v.selling_price, 0)) as max_selling_price
  FROM lats_products p
  LEFT JOIN lats_product_variants v ON p.id = v.product_id AND v.is_active = true
  WHERE p.is_active = true
  GROUP BY p.id, p.name, p.unit_price, p.created_at
)
SELECT 
  CASE 
    WHEN variant_count = 0 THEN '❌ NO VARIANTS'
    WHEN max_variant_price = 0 AND max_selling_price = 0 THEN '❌ ZERO PRICE'
    ELSE '✅ OK'
  END as status,
  name as product_name,
  product_price,
  variant_count,
  max_variant_price,
  max_selling_price,
  created_at::date as created_date
FROM product_variant_check
ORDER BY 
  CASE 
    WHEN variant_count = 0 THEN 1
    WHEN max_variant_price = 0 AND max_selling_price = 0 THEN 2
    ELSE 3
  END,
  created_at DESC
LIMIT 20;

-- Summary
SELECT '' as blank;
SELECT '📊 SUMMARY' as info;
SELECT '' as blank;

SELECT 
  COUNT(*) FILTER (WHERE variant_count = 0) as products_without_variants,
  COUNT(*) FILTER (WHERE variant_count > 0 AND max_variant_price = 0) as products_with_zero_price,
  COUNT(*) FILTER (WHERE variant_count > 0 AND max_variant_price > 0) as products_ok,
  COUNT(*) as total_active_products
FROM (
  SELECT 
    p.id,
    COUNT(v.id) as variant_count,
    MAX(v.unit_price) as max_variant_price
  FROM lats_products p
  LEFT JOIN lats_product_variants v ON p.id = v.product_id AND v.is_active = true
  WHERE p.is_active = true
  GROUP BY p.id
) summary;

-- Action needed
SELECT '' as blank;
SELECT '🎯 ACTION NEEDED:' as info;
SELECT '' as blank;

SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM lats_products p 
          LEFT JOIN lats_product_variants v ON p.id = v.product_id 
          WHERE p.is_active = true AND v.id IS NULL) > 0
    THEN '⚠️  YES - You have products without variants. Run FIX-NEW-PRODUCT-PRICE-ISSUE.sql'
    WHEN (SELECT COUNT(*) FROM lats_product_variants v 
          INNER JOIN lats_products p ON v.product_id = p.id
          WHERE v.is_active = true AND p.is_active = true AND v.unit_price = 0) > 0
    THEN '⚠️  YES - You have variants with zero prices. Run FIX-NEW-PRODUCT-PRICE-ISSUE.sql'
    ELSE '✅ NO - Your products look good! Prices should display correctly.'
  END as need_fix;

