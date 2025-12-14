-- ============================================================================
-- DUPLICATE PRODUCTS CHECK
-- This script identifies all types of duplicate products in lats_products
-- ============================================================================

-- 1. CHECK FOR DUPLICATE PRODUCT NAMES
-- ============================================================================
\echo '===================='
\echo '1. DUPLICATE PRODUCT NAMES'
\echo '===================='

SELECT 
    name,
    COUNT(*) as duplicate_count,
    STRING_AGG(id::text, ', ') as product_ids,
    STRING_AGG(branch_id::text, ', ') as branch_ids
FROM lats_products
WHERE name IS NOT NULL AND name != ''
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, name;

-- 2. CHECK FOR DUPLICATE SKUs
-- ============================================================================
\echo ''
\echo '===================='
\echo '2. DUPLICATE SKUs'
\echo '===================='

SELECT 
    sku,
    COUNT(*) as duplicate_count,
    STRING_AGG(name, ' | ') as product_names,
    STRING_AGG(id::text, ', ') as product_ids,
    STRING_AGG(branch_id::text, ', ') as branch_ids
FROM lats_products
WHERE sku IS NOT NULL AND sku != ''
GROUP BY sku
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, sku;

-- 3. CHECK FOR DUPLICATE BARCODES
-- ============================================================================
\echo ''
\echo '===================='
\echo '3. DUPLICATE BARCODES'
\echo '===================='

SELECT 
    barcode,
    COUNT(*) as duplicate_count,
    STRING_AGG(name, ' | ') as product_names,
    STRING_AGG(id::text, ', ') as product_ids,
    STRING_AGG(branch_id::text, ', ') as branch_ids
FROM lats_products
WHERE barcode IS NOT NULL AND barcode != ''
GROUP BY barcode
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, barcode;

-- 4. CHECK FOR DUPLICATE NAME + BRAND COMBINATIONS
-- ============================================================================
\echo ''
\echo '===================='
\echo '4. DUPLICATE NAME + BRAND COMBINATIONS'
\echo '===================='

SELECT 
    name,
    brand,
    COUNT(*) as duplicate_count,
    STRING_AGG(id::text, ', ') as product_ids,
    STRING_AGG(sku, ', ') as skus,
    STRING_AGG(branch_id::text, ', ') as branch_ids
FROM lats_products
WHERE name IS NOT NULL AND brand IS NOT NULL
GROUP BY name, brand
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, name, brand;

-- 5. CHECK FOR DUPLICATE NAME + BRAND + MODEL COMBINATIONS
-- ============================================================================
\echo ''
\echo '===================='
\echo '5. DUPLICATE NAME + BRAND + MODEL COMBINATIONS'
\echo '===================='

SELECT 
    name,
    brand,
    model,
    COUNT(*) as duplicate_count,
    STRING_AGG(id::text, ', ') as product_ids,
    STRING_AGG(sku, ', ') as skus,
    STRING_AGG(branch_id::text, ', ') as branch_ids
FROM lats_products
WHERE name IS NOT NULL AND brand IS NOT NULL AND model IS NOT NULL
GROUP BY name, brand, model
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, name, brand, model;

-- 6. CHECK FOR NEAR-DUPLICATE NAMES (case-insensitive, trimmed whitespace)
-- ============================================================================
\echo ''
\echo '===================='
\echo '6. NEAR-DUPLICATE NAMES (case-insensitive)'
\echo '===================='

SELECT 
    LOWER(TRIM(name)) as normalized_name,
    COUNT(*) as duplicate_count,
    STRING_AGG(DISTINCT name, ' | ') as actual_names,
    STRING_AGG(id::text, ', ') as product_ids,
    STRING_AGG(branch_id::text, ', ') as branch_ids
FROM lats_products
WHERE name IS NOT NULL AND name != ''
GROUP BY LOWER(TRIM(name))
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, normalized_name;

-- 7. CHECK FOR PRODUCTS WITH SAME NAME BUT DIFFERENT BRANCHES
-- ============================================================================
\echo ''
\echo '===================='
\echo '7. PRODUCTS WITH SAME NAME IN DIFFERENT BRANCHES'
\echo '===================='

SELECT 
    name,
    COUNT(DISTINCT branch_id) as branch_count,
    COUNT(*) as total_count,
    STRING_AGG(DISTINCT branch_id::text, ', ') as branch_ids,
    STRING_AGG(id::text, ', ') as product_ids
FROM lats_products
WHERE name IS NOT NULL
GROUP BY name
HAVING COUNT(DISTINCT branch_id) > 1
ORDER BY total_count DESC, name;

-- 8. DETAILED VIEW OF ALL DUPLICATES BY NAME
-- ============================================================================
\echo ''
\echo '===================='
\echo '8. DETAILED VIEW OF DUPLICATES (Name-based)'
\echo '===================='

WITH duplicate_names AS (
    SELECT name
    FROM lats_products
    WHERE name IS NOT NULL AND name != ''
    GROUP BY name
    HAVING COUNT(*) > 1
)
SELECT 
    p.id,
    p.name,
    p.sku,
    p.barcode,
    p.brand,
    p.model,
    p.category_id,
    p.branch_id,
    p.selling_price,
    p.cost_price,
    p.stock_quantity,
    p.is_active,
    p.created_at
FROM lats_products p
INNER JOIN duplicate_names dn ON p.name = dn.name
ORDER BY p.name, p.created_at;

-- 9. SUMMARY STATISTICS
-- ============================================================================
\echo ''
\echo '===================='
\echo '9. DUPLICATE SUMMARY STATISTICS'
\echo '===================='

SELECT 
    'Total Products' as metric,
    COUNT(*) as count
FROM lats_products
UNION ALL
SELECT 
    'Products with Duplicate Names',
    COUNT(*)
FROM (
    SELECT name
    FROM lats_products
    WHERE name IS NOT NULL AND name != ''
    GROUP BY name
    HAVING COUNT(*) > 1
) dup_names
UNION ALL
SELECT 
    'Products with Duplicate SKUs',
    COUNT(*)
FROM (
    SELECT sku
    FROM lats_products
    WHERE sku IS NOT NULL AND sku != ''
    GROUP BY sku
    HAVING COUNT(*) > 1
) dup_skus
UNION ALL
SELECT 
    'Products with Duplicate Barcodes',
    COUNT(*)
FROM (
    SELECT barcode
    FROM lats_products
    WHERE barcode IS NOT NULL AND barcode != ''
    GROUP BY barcode
    HAVING COUNT(*) > 1
) dup_barcodes;

-- 10. CHECK FOR POTENTIAL DUPLICATE PRODUCTS (same name, similar prices)
-- ============================================================================
\echo ''
\echo '===================='
\echo '10. POTENTIAL DUPLICATES (same name, similar prices)'
\echo '===================='

WITH product_groups AS (
    SELECT 
        name,
        COUNT(*) as count,
        AVG(selling_price) as avg_price,
        STDDEV(selling_price) as price_stddev
    FROM lats_products
    WHERE name IS NOT NULL
    GROUP BY name
    HAVING COUNT(*) > 1
)
SELECT 
    pg.name,
    pg.count as duplicate_count,
    ROUND(pg.avg_price::numeric, 2) as avg_selling_price,
    ROUND(pg.price_stddev::numeric, 2) as price_variation,
    STRING_AGG(DISTINCT p.id::text, ', ') as product_ids,
    STRING_AGG(DISTINCT p.selling_price::text, ', ') as prices
FROM product_groups pg
JOIN lats_products p ON pg.name = p.name
WHERE pg.price_stddev < 10 OR pg.price_stddev IS NULL  -- Similar prices (less than $10 variation)
GROUP BY pg.name, pg.count, pg.avg_price, pg.price_stddev
ORDER BY pg.count DESC, pg.name;

