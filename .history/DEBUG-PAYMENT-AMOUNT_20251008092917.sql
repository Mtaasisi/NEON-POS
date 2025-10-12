-- ============================================
-- DEBUG PAYMENT AMOUNT ISSUE
-- ============================================
-- This helps debug why payment modal shows TSh 0.00
-- ============================================

-- 1. Check if cart items exist in database (if stored)
-- Note: Cart is usually stored in frontend memory, not database
SELECT 
  '🔍 CART ITEMS CHECK' as debug_type,
  'Cart stored in frontend memory (normal)' as status;

-- 2. Check recent sales to see if POS is working
SELECT 
  '💰 RECENT SALES' as debug_type,
  id,
  sale_number,
  total_amount,
  payment_status,
  created_at
FROM lats_sales
ORDER BY created_at DESC
LIMIT 5;

-- 3. Check what columns exist in products table
SELECT 
  '📦 PRODUCTS TABLE STRUCTURE' as debug_type,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'lats_products'
ORDER BY ordinal_position;

-- 4. Check what columns exist in variants table
SELECT 
  '🏷️ VARIANTS TABLE STRUCTURE' as debug_type,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'lats_product_variants'
ORDER BY ordinal_position;

-- 5. Sample products data
SELECT 
  '📋 SAMPLE PRODUCTS' as debug_type,
  *
FROM lats_products
LIMIT 3;

-- 6. Sample variants data
SELECT 
  '🏷️ SAMPLE VARIANTS' as debug_type,
  *
FROM lats_product_variants
LIMIT 3;

-- 6. Check if there are any cart-related tables
SELECT 
  '🛒 CART TABLES' as debug_type,
  tablename as table_name
FROM pg_tables
WHERE schemaname = 'public'
  AND (tablename LIKE '%cart%' OR tablename LIKE '%pos%')
ORDER BY tablename;

-- 7. Summary for debugging
DO $$
DECLARE
  v_products_count INTEGER;
  v_variants_count INTEGER;
  v_sales_count INTEGER;
  v_products_with_price INTEGER;
  v_variants_with_price INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '🔍 PAYMENT AMOUNT DEBUG SUMMARY';
  RAISE NOTICE '═══════════════════════════════════════';
  
  -- Count products
  SELECT COUNT(*) INTO v_products_count FROM lats_products;
  SELECT COUNT(CASE WHEN selling_price > 0 THEN 1 END) INTO v_products_with_price FROM lats_products;
  
  -- Count variants
  SELECT COUNT(*) INTO v_variants_count FROM lats_product_variants;
  SELECT COUNT(CASE WHEN selling_price > 0 THEN 1 END) INTO v_variants_with_price FROM lats_product_variants;
  
  -- Count sales
  SELECT COUNT(*) INTO v_sales_count FROM lats_sales;
  
  RAISE NOTICE '📦 Products: % (with prices: %)', v_products_count, v_products_with_price;
  RAISE NOTICE '🏷️ Variants: % (with prices: %)', v_variants_count, v_variants_with_price;
  RAISE NOTICE '💰 Sales: %', v_sales_count;
  
  IF v_products_with_price = 0 AND v_variants_with_price = 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '❌ ISSUE FOUND: No products have prices!';
    RAISE NOTICE '   → This is why cart shows TSh 0.00';
    RAISE NOTICE '   → Add prices to products or variants';
  ELSIF v_sales_count = 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE 'ℹ️ No sales yet - this is normal for new setup';
    RAISE NOTICE '   → Add items to cart and check if prices show';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '✅ Products and prices look good';
    RAISE NOTICE '   → Issue might be in frontend cart calculation';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next Steps:';
  RAISE NOTICE '   1. Check if products have prices';
  RAISE NOTICE '   2. Add items to cart in POS';
  RAISE NOTICE '   3. Check browser console for errors';
  RAISE NOTICE '   4. Verify cartItems.totalPrice calculation';
  RAISE NOTICE '═══════════════════════════════════════';
END $$;
