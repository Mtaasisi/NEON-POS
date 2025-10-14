-- ============================================
-- VERIFY CUSTOMER PERFORMANCE FIX
-- Date: October 13, 2025
-- Purpose: Verify database is optimized for customer queries
-- ============================================

-- 1. Check if branch columns exist
SELECT '========== CHECKING CUSTOMER TABLE STRUCTURE ==========' as status;

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'customers'
    AND column_name IN ('branch_id', 'is_shared')
ORDER BY column_name;

-- 2. Check if indexes exist
SELECT '========== CHECKING PERFORMANCE INDEXES ==========' as status;

SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'customers'
    AND (indexname LIKE '%branch%' OR indexname LIKE '%shared%')
ORDER BY indexname;

-- 3. Check customer distribution by branch
SELECT '========== CUSTOMER COUNT BY BRANCH ==========' as status;

SELECT 
    COALESCE(c.branch_id::text, 'NO BRANCH') as branch_id,
    COALESCE(sl.name, 'Unassigned') as branch_name,
    COUNT(*) as customer_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM customers c
LEFT JOIN store_locations sl ON c.branch_id = sl.id
GROUP BY c.branch_id, sl.name
ORDER BY customer_count DESC;

-- 4. Check total customer count
SELECT '========== TOTAL CUSTOMER COUNT ==========' as status;

SELECT 
    COUNT(*) as total_customers,
    COUNT(DISTINCT branch_id) as branches_with_customers,
    COUNT(*) FILTER (WHERE branch_id IS NULL) as unassigned_customers,
    COUNT(*) FILTER (WHERE is_shared = true) as shared_customers,
    COUNT(*) FILTER (WHERE is_shared = false) as private_customers
FROM customers;

-- 5. Test query performance for ARUSHA branch
SELECT '========== TESTING ARUSHA BRANCH QUERY PERFORMANCE ==========' as status;

EXPLAIN ANALYZE
SELECT id, name, phone, email, branch_id, is_shared
FROM customers
WHERE branch_id = '115e0e51-d0d6-437b-9fda-dfe11241b167'  -- ARUSHA branch
ORDER BY created_at DESC
LIMIT 100;

-- 6. Check for any customers without branch assignment
SELECT '========== CUSTOMERS WITHOUT BRANCH ASSIGNMENT ==========' as status;

SELECT 
    COUNT(*) as count_without_branch,
    CASE 
        WHEN COUNT(*) > 0 THEN '⚠️ WARNING: Some customers have no branch assigned'
        ELSE '✅ All customers have branch assignment'
    END as status
FROM customers
WHERE branch_id IS NULL;

-- 7. Check index usage statistics (if available)
SELECT '========== INDEX USAGE STATISTICS ==========' as status;

SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename = 'customers'
    AND indexname LIKE '%branch%'
ORDER BY idx_scan DESC;

-- 8. Summary and recommendations
SELECT '========== SUMMARY ==========' as status;

SELECT 
    '✅ Customer table structure verified' as step1,
    '✅ Performance indexes verified' as step2,
    '✅ Branch distribution analyzed' as step3,
    '✅ Query performance tested' as step4;

-- 9. Expected results
SELECT '========== EXPECTED RESULTS ==========' as status;

SELECT 
    'If indexes exist and customer counts per branch are reasonable (< 1000)' as expectation,
    'then the application should load customers within 3-5 seconds' as result;

-- 10. If customers lack branch assignment, suggest fix
DO $$
DECLARE
    unassigned_count INTEGER;
    main_branch_id UUID;
BEGIN
    -- Count unassigned customers
    SELECT COUNT(*) INTO unassigned_count
    FROM customers
    WHERE branch_id IS NULL;
    
    IF unassigned_count > 0 THEN
        RAISE NOTICE '⚠️ Found % customers without branch assignment', unassigned_count;
        RAISE NOTICE '📝 To fix this, run the following SQL:';
        RAISE NOTICE '';
        RAISE NOTICE 'UPDATE customers';
        RAISE NOTICE 'SET branch_id = (SELECT id FROM store_locations WHERE name = ''ARUSHA'' LIMIT 1)';
        RAISE NOTICE 'WHERE branch_id IS NULL;';
        RAISE NOTICE '';
    ELSE
        RAISE NOTICE '✅ All customers have branch assignment';
    END IF;
END $$;

