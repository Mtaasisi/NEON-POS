-- ==========================================
-- PERFORMANCE OPTIMIZATION VERIFICATION
-- ==========================================
-- Run this script AFTER applying performance-optimization-indexes.sql
-- to verify that all optimizations were applied successfully
-- ==========================================

-- 1. CHECK: Verify all indexes were created
-- Expected: 13 indexes starting with 'idx_lats_'
SELECT 
    '✅ INDEXES CREATED' as status,
    indexname,
    tablename
FROM pg_indexes
WHERE tablename IN (
    'lats_products',
    'lats_product_variants', 
    'lats_categories',
    'lats_suppliers',
    'lats_product_images'
)
AND indexname LIKE 'idx_lats_%'
ORDER BY tablename, indexname;

-- Expected output: 13 rows
-- If you see fewer than 13 rows, re-run performance-optimization-indexes.sql

-- ==========================================
-- 2. CHECK: Test product query performance
-- Expected: Query should complete in < 2 seconds
-- ==========================================

EXPLAIN ANALYZE
SELECT 
    id, name, sku, category_id, supplier_id, 
    branch_id, is_shared, created_at
FROM lats_products
WHERE branch_id = (SELECT id FROM store_locations LIMIT 1)
   OR branch_id IS NULL
ORDER BY created_at DESC
LIMIT 100;

-- Look for:
-- ✅ "Index Scan" or "Bitmap Index Scan" (GOOD - using indexes)
-- ❌ "Seq Scan" (BAD - not using indexes)
-- Execution Time should be < 100ms (warm) or < 2000ms (cold start)

-- ==========================================
-- 3. CHECK: Verify index usage statistics
-- Expected: idx_scan > 0 for frequently used indexes
-- ==========================================

SELECT 
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    idx_scan as times_used,
    idx_tup_read as rows_read,
    idx_tup_fetch as rows_fetched,
    CASE 
        WHEN idx_scan = 0 THEN '⚠️ UNUSED'
        WHEN idx_scan < 10 THEN '🟡 LOW USAGE'
        WHEN idx_scan < 100 THEN '🟢 GOOD'
        ELSE '✅ EXCELLENT'
    END as usage_status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND indexrelname LIKE 'idx_lats_%'
ORDER BY idx_scan DESC;

-- Note: New indexes may show 0 usage until queries start using them
-- Run your POS system for a few minutes, then re-run this query

-- ==========================================
-- 4. CHECK: Database table sizes
-- Helps understand why queries might be slow
-- ==========================================

SELECT 
    schemaname,
    relname as tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||relname)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname) - pg_relation_size(schemaname||'.'||relname)) as indexes_size,
    n_live_tup as row_count
FROM pg_stat_user_tables
WHERE relname IN (
    'lats_products',
    'lats_product_variants',
    'lats_categories',
    'lats_suppliers'
)
ORDER BY pg_total_relation_size(schemaname||'.'||relname) DESC;

-- Expected:
-- Products table: < 50 MB is normal
-- If > 100 MB, consider archiving old products

-- ==========================================
-- 5. CHECK: Recent slow queries
-- Identifies queries that are still slow
-- ==========================================

SELECT 
    ROUND(mean_exec_time::numeric, 2) as avg_ms,
    calls,
    CASE 
        WHEN mean_exec_time < 100 THEN '✅ FAST'
        WHEN mean_exec_time < 1000 THEN '🟡 MODERATE'
        WHEN mean_exec_time < 5000 THEN '⚠️ SLOW'
        ELSE '❌ VERY SLOW'
    END as speed_rating,
    LEFT(query, 80) as query_preview
FROM pg_stat_statements
WHERE query LIKE '%lats_products%'
  AND query NOT LIKE '%pg_stat%'
  AND query NOT LIKE '%pg_indexes%'
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Expected: All queries should be ✅ FAST or 🟡 MODERATE
-- If you see ❌ VERY SLOW, investigate that specific query

-- ==========================================
-- 6. CHECK: Cache hit ratio
-- Measures how often data is served from memory vs disk
-- ==========================================

SELECT 
    'cache_hit_ratio' as metric,
    ROUND(
        100.0 * sum(heap_blks_hit) / 
        NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0), 
        2
    ) as percentage,
    CASE 
        WHEN ROUND(100.0 * sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0), 2) > 99 
        THEN '✅ EXCELLENT'
        WHEN ROUND(100.0 * sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0), 2) > 95 
        THEN '🟢 GOOD'
        WHEN ROUND(100.0 * sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0), 2) > 90 
        THEN '🟡 FAIR'
        ELSE '❌ POOR'
    END as status
FROM pg_statio_user_tables;

-- Expected: > 95% cache hit ratio
-- Lower values indicate frequent disk reads (slower)

-- ==========================================
-- 7. CHECK: Missing indexes (recommendations)
-- Identifies columns that might benefit from additional indexes
-- ==========================================

SELECT 
    schemaname,
    tablename,
    attname as column_name,
    n_distinct as unique_values,
    correlation,
    CASE 
        WHEN n_distinct > 100 AND ABS(correlation) < 0.5 
        THEN '💡 Consider adding index'
        ELSE '✅ OK'
    END as recommendation
FROM pg_stats
WHERE schemaname = 'public'
AND tablename IN ('lats_products', 'lats_product_variants')
AND attname NOT IN (
    SELECT regexp_replace(indexdef, '.*\((.*)\).*', '\1')
    FROM pg_indexes
    WHERE tablename IN ('lats_products', 'lats_product_variants')
)
ORDER BY n_distinct DESC;

-- ==========================================
-- 8. PERFORMANCE BENCHMARK
-- Runs a realistic query and measures performance
-- ==========================================

DO $$
DECLARE
    start_time timestamp;
    end_time timestamp;
    execution_ms numeric;
BEGIN
    start_time := clock_timestamp();
    
    PERFORM 
        p.id, p.name, p.sku, 
        c.name as category_name,
        s.name as supplier_name
    FROM lats_products p
    LEFT JOIN lats_categories c ON p.category_id = c.id
    LEFT JOIN lats_suppliers s ON p.supplier_id = s.id
    WHERE (p.branch_id = (SELECT id FROM store_locations LIMIT 1) OR p.branch_id IS NULL)
    AND p.is_active = true
    ORDER BY p.created_at DESC
    LIMIT 100;
    
    end_time := clock_timestamp();
    execution_ms := EXTRACT(MILLISECOND FROM (end_time - start_time));
    
    RAISE NOTICE '⏱️ Query execution time: % ms', execution_ms;
    
    IF execution_ms < 100 THEN
        RAISE NOTICE '✅ EXCELLENT: Query is very fast!';
    ELSIF execution_ms < 1000 THEN
        RAISE NOTICE '🟢 GOOD: Query performance is acceptable';
    ELSIF execution_ms < 5000 THEN
        RAISE NOTICE '🟡 MODERATE: Query could be faster';
    ELSE
        RAISE NOTICE '❌ SLOW: Query needs optimization';
    END IF;
END $$;

-- ==========================================
-- SUMMARY REPORT
-- ==========================================

SELECT 
    '=============================' as separator,
    'PERFORMANCE OPTIMIZATION VERIFICATION' as title,
    'Run at: ' || NOW()::text as timestamp,
    '=============================' as separator2;

-- Count indexes
SELECT 
    COUNT(*) as total_indexes,
    CASE 
        WHEN COUNT(*) >= 13 THEN '✅ All indexes created'
        WHEN COUNT(*) >= 10 THEN '🟡 Most indexes created'
        ELSE '❌ Missing indexes'
    END as status
FROM pg_indexes
WHERE tablename LIKE 'lats_%'
AND indexname LIKE 'idx_lats_%'
AND schemaname = 'public';

-- ==========================================
-- INTERPRETATION GUIDE
-- ==========================================

/*
✅ EXCELLENT:
- All 13 indexes created
- Query times < 1 second
- Index scans being used
- Cache hit ratio > 95%

🟢 GOOD:
- Most indexes created
- Query times < 5 seconds
- Indexes mostly being used
- Cache hit ratio > 90%

🟡 NEEDS ATTENTION:
- Some indexes missing
- Query times 5-10 seconds
- Some sequential scans
- Cache hit ratio < 90%

❌ ISSUES:
- Many indexes missing
- Query times > 10 seconds
- Frequent sequential scans
- Cache hit ratio < 80%

NEXT STEPS:
1. Re-run performance-optimization-indexes.sql
2. Clear application cache
3. Wait 5 minutes for statistics to update
4. Re-run this verification script
*/

-- ==========================================
-- TROUBLESHOOTING
-- ==========================================

/*
PROBLEM: "Seq Scan" instead of "Index Scan"
SOLUTION: Run ANALYZE on tables:
    ANALYZE lats_products;
    ANALYZE lats_product_variants;
    
PROBLEM: Indexes not being used
SOLUTION: Check if query filters match index columns

PROBLEM: Still slow after indexes
SOLUTION: Check table size, consider partitioning if > 100MB

PROBLEM: Low cache hit ratio
SOLUTION: Increase shared_buffers (contact Neon support)
*/

