-- ============================================
-- TEST SCRIPT: Verify 400 Errors are Fixed
-- Run this AFTER applying the main fix
-- ============================================

-- Test 1: Check if tables exist
SELECT 
  'Test 1: Tables Existence' AS test_name,
  CASE 
    WHEN COUNT(*) = 4 THEN '✅ PASS - All tables exist'
    ELSE '❌ FAIL - Some tables missing: ' || COUNT(*) || '/4 found'
  END AS result
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'purchase_order_payments',
  'lats_purchase_orders',
  'finance_accounts',
  'payment_methods'
);

-- Test 2: Check if purchase_order_payments table has correct columns
SELECT 
  'Test 2: Table Structure' AS test_name,
  CASE 
    WHEN COUNT(DISTINCT column_name) >= 10 THEN '✅ PASS - purchase_order_payments has proper columns'
    ELSE '❌ FAIL - purchase_order_payments missing columns'
  END AS result
FROM information_schema.columns
WHERE table_name = 'purchase_order_payments'
AND column_name IN ('id', 'purchase_order_id', 'amount', 'payment_method', 'payment_date', 'status', 'created_at', 'updated_at', 'reference_number', 'notes');

-- Test 3: Check RLS policies for purchase_order_payments
SELECT 
  'Test 3: RLS Policies' AS test_name,
  CASE 
    WHEN COUNT(*) >= 4 THEN '✅ PASS - RLS policies configured'
    WHEN COUNT(*) = 0 THEN '❌ FAIL - No RLS policies found'
    ELSE '⚠️ WARNING - Some RLS policies missing: ' || COUNT(*) || '/4 found'
  END AS result
FROM pg_policies
WHERE tablename = 'purchase_order_payments';

-- Test 4: Test simple query on purchase_order_payments
DO $$
DECLARE
  record_count INTEGER;
  test_result TEXT;
BEGIN
  BEGIN
    SELECT COUNT(*) INTO record_count FROM purchase_order_payments;
    test_result := '✅ PASS - Can query purchase_order_payments (' || record_count || ' records)';
  EXCEPTION WHEN OTHERS THEN
    test_result := '❌ FAIL - Cannot query purchase_order_payments: ' || SQLERRM;
  END;
  
  RAISE NOTICE 'Test 4: Query Access - %', test_result;
END $$;

-- Test 5: Check indexes
SELECT 
  'Test 5: Indexes' AS test_name,
  CASE 
    WHEN COUNT(*) >= 3 THEN '✅ PASS - Indexes created'
    ELSE '⚠️ WARNING - Some indexes missing: ' || COUNT(*) || ' found'
  END AS result
FROM pg_indexes
WHERE tablename = 'purchase_order_payments'
AND indexname LIKE 'idx_%';

-- Test 6: Check foreign key relationships
SELECT 
  'Test 6: Foreign Keys' AS test_name,
  CASE 
    WHEN COUNT(*) >= 1 THEN '✅ PASS - Foreign keys configured'
    ELSE '⚠️ WARNING - No foreign keys found'
  END AS result
FROM information_schema.table_constraints
WHERE table_name = 'purchase_order_payments'
AND constraint_type = 'FOREIGN KEY';

-- Test 7: Verify finance_accounts accessibility
DO $$
DECLARE
  record_count INTEGER;
  test_result TEXT;
BEGIN
  BEGIN
    SELECT COUNT(*) INTO record_count FROM finance_accounts;
    test_result := '✅ PASS - Can query finance_accounts (' || record_count || ' records)';
  EXCEPTION WHEN OTHERS THEN
    test_result := '❌ FAIL - Cannot query finance_accounts: ' || SQLERRM;
  END;
  
  RAISE NOTICE 'Test 7: Finance Accounts - %', test_result;
END $$;

-- Test 8: Verify lats_purchase_orders accessibility
DO $$
DECLARE
  record_count INTEGER;
  test_result TEXT;
BEGIN
  BEGIN
    SELECT COUNT(*) INTO record_count FROM lats_purchase_orders;
    test_result := '✅ PASS - Can query lats_purchase_orders (' || record_count || ' records)';
  EXCEPTION WHEN OTHERS THEN
    test_result := '❌ FAIL - Cannot query lats_purchase_orders: ' || SQLERRM;
  END;
  
  RAISE NOTICE 'Test 8: Purchase Orders - %', test_result;
END $$;

-- Test 9: Check trigger for updated_at
SELECT 
  'Test 9: Triggers' AS test_name,
  CASE 
    WHEN COUNT(*) >= 1 THEN '✅ PASS - update trigger exists'
    ELSE '⚠️ WARNING - update trigger not found'
  END AS result
FROM information_schema.triggers
WHERE event_object_table = 'purchase_order_payments'
AND trigger_name LIKE '%updated_at%';

-- Test 10: Summary of all tables and their record counts
SELECT 
  'Test 10: Data Summary' AS test_name,
  'ℹ️ INFO' AS result;

-- Show record counts for all relevant tables
DO $$
DECLARE
  po_payments_count INTEGER;
  lats_po_count INTEGER;
  finance_accounts_count INTEGER;
  payment_methods_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO po_payments_count FROM purchase_order_payments;
  SELECT COUNT(*) INTO lats_po_count FROM lats_purchase_orders;
  SELECT COUNT(*) INTO finance_accounts_count FROM finance_accounts;
  SELECT COUNT(*) INTO payment_methods_count FROM payment_methods;
  
  RAISE NOTICE '==========================================';
  RAISE NOTICE '📊 DATABASE SUMMARY:';
  RAISE NOTICE '   • purchase_order_payments: % records', po_payments_count;
  RAISE NOTICE '   • lats_purchase_orders: % records', lats_po_count;
  RAISE NOTICE '   • finance_accounts: % records', finance_accounts_count;
  RAISE NOTICE '   • payment_methods: % records', payment_methods_count;
  RAISE NOTICE '==========================================';
END $$;

-- Final Summary
SELECT 
  '🎉 ALL TESTS COMPLETE!' AS status,
  'Check the results above. All tests should show ✅ PASS' AS instructions;

-- Show all RLS policies for verification
SELECT 
  '📋 RLS POLICIES:' AS info,
  tablename,
  policyname,
  CASE permissive WHEN 't' THEN 'Permissive' ELSE 'Restrictive' END AS type,
  cmd AS operation
FROM pg_policies
WHERE tablename IN ('purchase_order_payments', 'lats_purchase_orders', 'finance_accounts')
ORDER BY tablename, policyname;

