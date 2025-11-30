-- ==========================================
-- QUICK INDEX VERIFICATION
-- ==========================================
-- Run this simple query to verify indexes were created
-- ==========================================

-- 1. List all LATS indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE indexname LIKE 'idx_lats_%'
ORDER BY tablename, indexname;

-- Expected: 13 rows showing all the indexes

-- ==========================================
-- 2. Count indexes by table
SELECT 
    tablename,
    COUNT(*) as index_count
FROM pg_indexes
WHERE indexname LIKE 'idx_lats_%'
GROUP BY tablename
ORDER BY tablename;

-- Expected output:
-- lats_categories: 1-2 indexes
-- lats_product_images: 1 index
-- lats_product_variants: 2 indexes
-- lats_products: 8-9 indexes
-- lats_suppliers: 1 index

-- ==========================================
-- 3. Simple performance test
EXPLAIN ANALYZE
SELECT id, name, sku, branch_id
FROM lats_products
WHERE branch_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- Look for "Index Scan" in the output (GOOD)
-- Avoid "Seq Scan" (BAD - means indexes not being used)

-- ==========================================
-- 4. Check if indexes are valid
SELECT 
    schemaname,
    tablename,
    indexname,
    CASE 
        WHEN idx_scan = 0 THEN '⚠️ Not used yet'
        ELSE '✅ In use (' || idx_scan || ' times)'
    END as status
FROM pg_stat_user_indexes
WHERE indexrelname LIKE 'idx_lats_%'
ORDER BY relname, indexrelname;

-- Note: New indexes may show 0 usage until queries start using them
-- Run your app for a few minutes, then check again

