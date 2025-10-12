-- ============================================
-- CHECK VARIANTS TABLE STRUCTURE AND DATA
-- ============================================
-- This checks what's in the lats_product_variants table
-- ============================================

-- 1. Check variants table structure
SELECT 
  '🏷️ VARIANTS TABLE STRUCTURE' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'lats_product_variants'
ORDER BY ordinal_position;

-- 2. Check if variants exist
SELECT 
  '📊 VARIANTS COUNT' as check_type,
  COUNT(*) as total_variants
FROM lats_product_variants;

-- 3. Sample variants data
SELECT 
  '🏷️ SAMPLE VARIANTS' as check_type,
  *
FROM lats_product_variants
LIMIT 5;

-- 4. Check if variants have prices
SELECT 
  '💰 VARIANTS WITH PRICES' as check_type,
  COUNT(*) as total_variants,
  COUNT(CASE WHEN unit_price > 0 THEN 1 END) as variants_with_unit_price,
  COUNT(CASE WHEN selling_price > 0 THEN 1 END) as variants_with_selling_price,
  COUNT(CASE WHEN cost_price > 0 THEN 1 END) as variants_with_cost_price
FROM lats_product_variants;

-- 5. Check products vs variants relationship
SELECT 
  '🔗 PRODUCTS VS VARIANTS' as check_type,
  (SELECT COUNT(*) FROM lats_products) as total_products,
  (SELECT COUNT(*) FROM lats_product_variants) as total_variants,
  (SELECT COUNT(DISTINCT product_id) FROM lats_product_variants) as products_with_variants;
