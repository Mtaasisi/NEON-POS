-- ==========================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- ==========================================
-- This file adds database indexes to improve query performance
-- Particularly for the slow product loading issue
-- Run this in your Neon database console
-- ==========================================

-- 1. Index on products table for branch filtering and ordering
-- This dramatically speeds up queries filtered by branch_id and ordered by created_at
CREATE INDEX IF NOT EXISTS idx_lats_products_branch_created 
ON lats_products(branch_id, created_at DESC);

-- 2. Index on products for is_active filtering
-- Many queries filter by active status
CREATE INDEX IF NOT EXISTS idx_lats_products_is_active 
ON lats_products(is_active);

-- 3. Index on products for category lookups
-- Used when filtering products by category
CREATE INDEX IF NOT EXISTS idx_lats_products_category 
ON lats_products(category_id);

-- 4. Index on products for supplier lookups  
-- Used when filtering products by supplier
CREATE INDEX IF NOT EXISTS idx_lats_products_supplier 
ON lats_products(supplier_id);

-- 5. Index on products for SKU searches
-- Used when searching by SKU
CREATE INDEX IF NOT EXISTS idx_lats_products_sku 
ON lats_products(sku);

-- 6. Index on products for barcode searches
-- Used in POS when scanning barcodes
CREATE INDEX IF NOT EXISTS idx_lats_products_barcode 
ON lats_products(barcode);

-- 7. Composite index for shared products filtering
-- Used in branch isolation queries
CREATE INDEX IF NOT EXISTS idx_lats_products_shared 
ON lats_products(is_shared, branch_id);

-- 8. Index on product variants for product lookups
-- Speeds up queries that join products with their variants
CREATE INDEX IF NOT EXISTS idx_lats_product_variants_product 
ON lats_product_variants(product_id);

-- 9. Index on product variants for inventory checks
-- Used when checking stock levels
CREATE INDEX IF NOT EXISTS idx_lats_product_variants_quantity 
ON lats_product_variants(product_id, quantity);

-- 10. Index on categories for active status
-- Used when loading active categories
CREATE INDEX IF NOT EXISTS idx_lats_categories_active 
ON lats_categories(is_active);

-- 11. Index on suppliers for active status
-- Used when loading active suppliers
CREATE INDEX IF NOT EXISTS idx_lats_suppliers_active 
ON lats_suppliers(is_active);

-- 12. Partial index for null branch products (unassigned products)
-- This speeds up queries looking for products without a branch assignment
CREATE INDEX IF NOT EXISTS idx_lats_products_null_branch 
ON lats_products(id, created_at DESC) 
WHERE branch_id IS NULL;

-- 13. Index on product images for product lookups
-- Speeds up image loading for products
CREATE INDEX IF NOT EXISTS idx_lats_product_images_product 
ON lats_product_images(product_id);

-- ==========================================
-- PAYMENT PROCESSING INDEXES
-- ==========================================
-- Additional indexes to speed up payment processing

-- 14. Index for parent-child variant relationships (used in stock validation)
CREATE INDEX IF NOT EXISTS idx_lats_product_variants_parent_child
ON lats_product_variants(parent_variant_id, is_active)
WHERE parent_variant_id IS NOT NULL;

-- 15. Index for IMEI child variant lookups
CREATE INDEX IF NOT EXISTS idx_lats_product_variants_imei_child
ON lats_product_variants(parent_variant_id, variant_type, is_active)
WHERE variant_type = 'imei_child';

-- 16. Index for cost price lookups (used in profit calculations)
CREATE INDEX IF NOT EXISTS idx_lats_product_variants_cost_price
ON lats_product_variants(product_id, cost_price)
WHERE cost_price IS NOT NULL;

-- 17. Index for finance account lookups (payment processing)
CREATE INDEX IF NOT EXISTS idx_finance_accounts_payment_method
ON finance_accounts(payment_method_id, balance);

-- 18. Index for customer lookups in sales
CREATE INDEX IF NOT EXISTS idx_lats_customers_active
ON lats_customers(id, name, phone)
WHERE is_active = true;

-- 19. Composite index for sale items (used in reporting)
CREATE INDEX IF NOT EXISTS idx_lats_sale_items_product_variant
ON lats_sale_items(product_id, variant_id);

-- ==========================================
-- ANALYZE TABLES
-- ==========================================
-- Update table statistics for query planner
-- This helps PostgreSQL choose the best query execution plan

ANALYZE lats_products;
ANALYZE lats_product_variants;
ANALYZE lats_categories;
ANALYZE lats_suppliers;
ANALYZE lats_product_images;
ANALYZE finance_accounts;
ANALYZE lats_customers;
ANALYZE lats_sale_items;

-- ==========================================
-- VERIFY INDEXES
-- ==========================================
-- Run this query to verify all indexes were created successfully

SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN (
    'lats_products',
    'lats_product_variants', 
    'lats_categories',
    'lats_suppliers',
    'lats_product_images'
)
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ==========================================
-- PERFORMANCE MONITORING
-- ==========================================
-- After applying indexes, monitor query performance with:

-- Check slow queries
SELECT 
    mean_exec_time::numeric(10,2) as avg_time_ms,
    calls,
    query
FROM pg_stat_statements
WHERE query LIKE '%lats_products%'
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND tablename IN (
    'lats_products',
    'lats_product_variants'
)
ORDER BY idx_scan DESC;

-- ==========================================
-- NOTES
-- ==========================================
-- Expected Performance Improvements:
-- - Product list loading: 25-30s → 3-5s (with cold start)
-- - Product list loading: 25-30s → <1s (warm database)
-- - Category/Supplier queries: Instant (<100ms)
-- - SKU/Barcode searches: Near-instant (<50ms)
--
-- These indexes should reduce your database query time by 80-90%
-- ==========================================

