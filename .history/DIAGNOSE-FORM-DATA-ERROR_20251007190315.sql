-- ============================================
-- DIAGNOSE "Failed to load form data" Error
-- Run this to see exactly what's blocking your forms
-- ============================================

-- 1. Check if tables exist
SELECT 
    'Table Check' as test_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_categories') 
        THEN '✅ lats_categories exists'
        ELSE '❌ lats_categories MISSING'
    END as categories_table,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_suppliers') 
        THEN '✅ lats_suppliers exists'
        ELSE '❌ lats_suppliers MISSING'
    END as suppliers_table,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_products') 
        THEN '✅ lats_products exists'
        ELSE '❌ lats_products MISSING'
    END as products_table;

-- 2. Check RLS status (THIS IS LIKELY THE CULPRIT!)
SELECT 
    'RLS Status' as test_type,
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity = true THEN '🔒 RLS ENABLED (BLOCKING!)'
        ELSE '✅ RLS Disabled'
    END as rls_status
FROM pg_tables
WHERE tablename IN ('lats_categories', 'lats_suppliers', 'lats_products', 'lats_product_variants')
ORDER BY tablename;

-- 3. Check if there's any data in the tables
SELECT 
    'Data Check' as test_type,
    (SELECT COUNT(*) FROM lats_categories) as categories_count,
    (SELECT COUNT(*) FROM lats_suppliers) as suppliers_count,
    (SELECT COUNT(*) FROM lats_products) as products_count;

-- 4. Check RLS policies (if any)
SELECT 
    'RLS Policies' as test_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('lats_categories', 'lats_suppliers', 'lats_products', 'lats_product_variants')
ORDER BY tablename, policyname;

-- 5. Try a direct SELECT to see the actual error
DO $$
BEGIN
    RAISE NOTICE '--- Testing Direct SELECT Queries ---';
    
    BEGIN
        PERFORM * FROM lats_categories LIMIT 1;
        RAISE NOTICE '✅ lats_categories: Query successful';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ lats_categories: % - %', SQLSTATE, SQLERRM;
    END;
    
    BEGIN
        PERFORM * FROM lats_suppliers LIMIT 1;
        RAISE NOTICE '✅ lats_suppliers: Query successful';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ lats_suppliers: % - %', SQLSTATE, SQLERRM;
    END;
    
    BEGIN
        PERFORM * FROM lats_products LIMIT 1;
        RAISE NOTICE '✅ lats_products: Query successful';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ lats_products: % - %', SQLSTATE, SQLERRM;
    END;
END $$;

-- 6. Check current user and role
SELECT 
    'User Info' as test_type,
    current_user as current_user,
    session_user as session_user,
    current_database() as current_database;

-- 7. Summary and Recommendation
SELECT 
    '======================================' as separator
UNION ALL
SELECT 
    '📊 DIAGNOSIS COMPLETE' as separator
UNION ALL
SELECT 
    '======================================' as separator
UNION ALL
SELECT 
    '🔍 Check the results above:' as separator
UNION ALL
SELECT 
    '' as separator
UNION ALL
SELECT 
    '1. If RLS Status shows "🔒 RLS ENABLED"' as separator
UNION ALL
SELECT 
    '   → Run DISABLE-ALL-RLS.sql to fix it!' as separator
UNION ALL
SELECT 
    '' as separator
UNION ALL
SELECT 
    '2. If tables are MISSING' as separator
UNION ALL
SELECT 
    '   → Run NEON-SIMPLE-FIX.sql to create them' as separator
UNION ALL
SELECT 
    '' as separator
UNION ALL
SELECT 
    '3. If SELECT queries fail with errors' as separator
UNION ALL
SELECT 
    '   → Check the error messages in NOTICES' as separator
UNION ALL
SELECT 
    '======================================' as separator;

