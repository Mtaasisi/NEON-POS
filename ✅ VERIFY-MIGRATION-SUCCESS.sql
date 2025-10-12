-- ============================================
-- VERIFY MIGRATION SUCCESS
-- Run this AFTER running FIX-PRODUCT-PAGES-COMPLETE.sql
-- to verify everything worked correctly
-- ============================================

SELECT '========== VERIFICATION REPORT ==========' as title;
SELECT '📊 Checking migration results...' as status;
SELECT '' as empty_1;

-- Check 1: Products table columns
SELECT '========== CHECK 1: Product Columns ==========' as check_1;
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'lats_products'
AND column_name IN (
  'specification', 'condition', 'selling_price', 'tags',
  'total_quantity', 'total_value', 'storage_room_id', 
  'store_shelf_id', 'images', 'attributes', 'metadata'
)
ORDER BY column_name;

SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM information_schema.columns 
          WHERE table_name = 'lats_products' 
          AND column_name IN ('specification', 'condition', 'selling_price')) = 3
    THEN '✅ PASS: Core columns exist'
    ELSE '❌ FAIL: Missing core columns'
  END as result_1;

-- Check 2: Product images table
SELECT '========== CHECK 2: Product Images Table ==========' as check_2;
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_images')
    THEN '✅ PASS: product_images table exists'
    ELSE '❌ FAIL: product_images table missing'
  END as result_2;

SELECT COUNT(*) as image_columns
FROM information_schema.columns 
WHERE table_name = 'product_images';

-- Check 3: Indexes
SELECT '========== CHECK 3: Performance Indexes ==========' as check_3;
SELECT 
  indexname,
  tablename
FROM pg_indexes 
WHERE tablename = 'lats_products'
AND indexname LIKE 'idx_lats_products_%'
ORDER BY indexname;

SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_indexes 
          WHERE tablename = 'lats_products' 
          AND indexname LIKE 'idx_lats_products_%') >= 5
    THEN '✅ PASS: Performance indexes created'
    ELSE '⚠️ WARNING: Some indexes might be missing'
  END as result_3;

-- Check 4: Helper function
SELECT '========== CHECK 4: Helper Functions ==========' as check_4;
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_product_totals')
    THEN '✅ PASS: update_product_totals function exists'
    ELSE '❌ FAIL: update_product_totals function missing'
  END as result_4;

-- Check 5: RLS policies
SELECT '========== CHECK 5: Security Policies ==========' as check_5;
SELECT 
  schemaname,
  tablename,
  policyname
FROM pg_policies 
WHERE tablename IN ('lats_products', 'product_images')
ORDER BY tablename, policyname;

SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_policies 
          WHERE tablename = 'lats_products') >= 4
    THEN '✅ PASS: RLS policies configured'
    ELSE '⚠️ WARNING: Some RLS policies might be missing'
  END as result_5;

-- Check 6: Permissions granted
SELECT '========== CHECK 6: Role Permissions ==========' as check_6;
SELECT 
  grantee,
  table_name,
  privilege_type
FROM information_schema.table_privileges 
WHERE table_name = 'lats_products'
AND grantee IN ('neondb_owner', 'authenticated', 'anon', 'service_role')
ORDER BY grantee, privilege_type;

-- Check 7: Product variants table
SELECT '========== CHECK 7: Product Variants ==========' as check_7;
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_product_variants')
    THEN '✅ PASS: lats_product_variants table exists'
    ELSE '⚠️ INFO: lats_product_variants table not found (might be named differently)'
  END as result_7;

-- Final Summary
SELECT '' as empty_2;
SELECT '========== 🎉 MIGRATION VERIFICATION COMPLETE ==========' as summary;
SELECT '' as empty_3;

-- Count successes
SELECT 
  'Total Checks: 7' as total_checks,
  '✅ Check results above for details' as instruction;

SELECT '' as empty_4;
SELECT '💡 Next Steps:' as next_steps;
SELECT '1. If all checks passed, refresh your application' as step_1;
SELECT '2. Navigate to /lats/add-product' as step_2;
SELECT '3. Test adding a product with images' as step_3;
SELECT '4. Test editing an existing product' as step_4;
SELECT '' as empty_5;
SELECT '🚀 Your product pages are ready!' as final_message;

