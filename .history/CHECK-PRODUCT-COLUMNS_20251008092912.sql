-- ============================================
-- CHECK PRODUCT TABLE COLUMNS
-- ============================================
-- This checks what columns actually exist in lats_products
-- ============================================

-- 1. Check lats_products table structure
SELECT 
  '📦 LATS_PRODUCTS COLUMNS' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'lats_products'
ORDER BY ordinal_position;

-- 2. Check lats_product_variants table structure
SELECT 
  '🏷️ LATS_PRODUCT_VARIANTS COLUMNS' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'lats_product_variants'
ORDER BY ordinal_position;

-- 3. Sample data from lats_products
SELECT 
  '📋 SAMPLE PRODUCTS' as check_type,
  *
FROM lats_products
LIMIT 3;

-- 4. Sample data from lats_product_variants
SELECT 
  '🏷️ SAMPLE VARIANTS' as check_type,
  *
FROM lats_product_variants
LIMIT 3;
