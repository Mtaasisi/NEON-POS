-- POS DATABASE DIAGNOSTIC QUERIES
-- Run these in your Neon Database SQL Editor to check the database state

-- ============================================================
-- 1. CHECK IF TABLES EXIST
-- ============================================================
SELECT 
    'lats_products' as table_name,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'lats_products'
    ) as exists
UNION ALL
SELECT 
    'lats_product_variants' as table_name,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'lats_product_variants'
    ) as exists
UNION ALL
SELECT 
    'lats_sales' as table_name,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'lats_sales'
    ) as exists
UNION ALL
SELECT 
    'lats_sale_items' as table_name,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'lats_sale_items'
    ) as exists;

-- ============================================================
-- 2. CHECK COLUMN NAMES IN lats_products
-- ============================================================
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'lats_products'
AND column_name IN ('id', 'name', 'price', 'unit_price', 'cost_price', 'stock_quantity')
ORDER BY ordinal_position;

-- ============================================================
-- 3. CHECK COLUMN NAMES IN lats_product_variants
-- ============================================================
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'lats_product_variants'
AND column_name IN ('id', 'product_id', 'variant_name', 'price', 'unit_price', 'selling_price', 'cost_price', 'quantity')
ORDER BY ordinal_position;

-- ============================================================
-- 4. CHECK IF PRODUCTS HAVE PRICES
-- ============================================================
SELECT 
    COUNT(*) as total_products,
    COUNT(unit_price) as products_with_unit_price,
    COUNT(CASE WHEN unit_price > 0 THEN 1 END) as products_with_price_gt_0,
    ROUND(AVG(unit_price), 2) as avg_price,
    MAX(unit_price) as max_price,
    MIN(unit_price) as min_price
FROM lats_products;

-- ============================================================
-- 5. CHECK IF VARIANTS HAVE PRICES
-- ============================================================
SELECT 
    COUNT(*) as total_variants,
    COUNT(unit_price) as variants_with_unit_price,
    COUNT(CASE WHEN unit_price > 0 THEN 1 END) as variants_with_price_gt_0,
    ROUND(AVG(unit_price), 2) as avg_price,
    MAX(unit_price) as max_price,
    MIN(unit_price) as min_price
FROM lats_product_variants;

-- ============================================================
-- 6. SAMPLE PRODUCTS WITH PRICES
-- ============================================================
SELECT 
    p.id,
    p.name,
    p.unit_price as product_unit_price,
    p.cost_price as product_cost_price,
    COUNT(v.id) as variant_count
FROM lats_products p
LEFT JOIN lats_product_variants v ON v.product_id = p.id
GROUP BY p.id, p.name, p.unit_price, p.cost_price
LIMIT 5;

-- ============================================================
-- 7. SAMPLE VARIANTS WITH PRICES
-- ============================================================
SELECT 
    v.id,
    p.name as product_name,
    v.variant_name,
    v.unit_price,
    v.cost_price,
    v.quantity
FROM lats_product_variants v
JOIN lats_products p ON p.id = v.product_id
LIMIT 10;

-- ============================================================
-- 8. PRODUCTS WITHOUT PRICES (POTENTIAL ISSUES)
-- ============================================================
SELECT 
    p.id,
    p.name,
    p.unit_price,
    COUNT(v.id) as variant_count
FROM lats_products p
LEFT JOIN lats_product_variants v ON v.product_id = p.id
WHERE p.unit_price IS NULL OR p.unit_price = 0
GROUP BY p.id, p.name, p.unit_price
LIMIT 10;

-- ============================================================
-- 9. VARIANTS WITHOUT PRICES (POTENTIAL ISSUES)
-- ============================================================
SELECT 
    v.id,
    p.name as product_name,
    v.variant_name,
    v.unit_price,
    v.quantity
FROM lats_product_variants v
JOIN lats_products p ON p.id = v.product_id
WHERE v.unit_price IS NULL OR v.unit_price = 0
LIMIT 10;

-- ============================================================
-- 10. CHECK RECENT SALES
-- ============================================================
SELECT 
    id,
    sale_number,
    customer_name,
    total_amount,
    payment_status,
    created_at
FROM lats_sales
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================
-- 11. CHECK IF SPECIFIC PRODUCT HAS PRICE (from error log)
-- ============================================================
SELECT 
    p.id,
    p.name,
    p.unit_price as product_price,
    p.cost_price,
    v.id as variant_id,
    v.variant_name,
    v.unit_price as variant_price,
    v.quantity
FROM lats_products p
LEFT JOIN lats_product_variants v ON v.product_id = p.id
WHERE p.id = 'a015f57e-7220-4bd2-94b0-10158488bba0'; -- iPhone from error log

-- ============================================================
-- 12. FIX: UPDATE PRODUCTS WITHOUT PRICES
-- (Run this if products don't have prices)
-- ============================================================
-- UNCOMMENT TO RUN:
-- UPDATE lats_products
-- SET unit_price = 0
-- WHERE unit_price IS NULL;

-- ============================================================
-- 13. FIX: UPDATE VARIANTS WITHOUT PRICES
-- (Run this if variants don't have prices)
-- ============================================================
-- UNCOMMENT TO RUN:
-- UPDATE lats_product_variants
-- SET unit_price = 0
-- WHERE unit_price IS NULL;

-- ============================================================
-- 14. FIX: ADD DEFAULT VARIANT FOR PRODUCTS WITHOUT VARIANTS
-- (Run this to create default variants)
-- ============================================================
-- UNCOMMENT TO RUN:
-- INSERT INTO lats_product_variants (product_id, variant_name, sku, unit_price, cost_price, quantity, min_quantity)
-- SELECT 
--     p.id,
--     'Default' as variant_name,
--     p.sku || '-DEFAULT' as sku,
--     COALESCE(p.unit_price, 0) as unit_price,
--     COALESCE(p.cost_price, 0) as cost_price,
--     COALESCE(p.stock_quantity, 0) as quantity,
--     5 as min_quantity
-- FROM lats_products p
-- WHERE NOT EXISTS (
--     SELECT 1 FROM lats_product_variants v WHERE v.product_id = p.id
-- );

-- ============================================================
-- SUMMARY
-- ============================================================
-- After running these queries, you should see:
-- 1. All tables exist
-- 2. Column is 'unit_price' not 'selling_price' or 'price'
-- 3. Products and variants have prices > 0
-- 4. Each product has at least one variant
-- 5. Recent sales are being recorded

