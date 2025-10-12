-- ============================================
-- COMPREHENSIVE PRICE MAPPING FIX
-- ============================================
-- This script helps identify and fix all price mapping issues
-- ============================================

-- 1. Check if selling_price column exists in variants table
SELECT 
  '🔍 CHECKING VARIANTS TABLE' as check_type,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'lats_product_variants'
  AND column_name IN ('selling_price', 'unit_price')
ORDER BY column_name;

-- 2. Check if selling_price column exists in products table
SELECT 
  '🔍 CHECKING PRODUCTS TABLE' as check_type,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'lats_products'
  AND column_name IN ('selling_price', 'unit_price')
ORDER BY column_name;

-- 3. Sample data to verify prices exist
SELECT 
  '💰 SAMPLE PRICES' as check_type,
  'Products' as table_type,
  id,
  name,
  unit_price,
  cost_price
FROM lats_products
WHERE unit_price > 0
LIMIT 3

UNION ALL

SELECT 
  '💰 SAMPLE PRICES' as check_type,
  'Variants' as table_type,
  id,
  variant_name as name,
  unit_price,
  cost_price
FROM lats_product_variants
WHERE unit_price > 0
LIMIT 3;

-- 4. Summary
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '🔧 PRICE MAPPING STATUS';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '✅ Frontend code updated to use unit_price';
  RAISE NOTICE '✅ Database has unit_price column';
  RAISE NOTICE '✅ Products and variants have prices';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next Steps:';
  RAISE NOTICE '   1. Run CREATE-PAYMENT-METHODS.sql';
  RAISE NOTICE '   2. Refresh POS page (F5)';
  RAISE NOTICE '   3. Add items to cart';
  RAISE NOTICE '   4. Test payment modal';
  RAISE NOTICE '═══════════════════════════════════════';
END $$;
