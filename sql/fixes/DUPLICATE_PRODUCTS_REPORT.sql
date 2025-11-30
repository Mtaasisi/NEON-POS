-- ============================================================================
-- COMPREHENSIVE DUPLICATE PRODUCTS ANALYSIS REPORT
-- Generated: 2025-11-11
-- ============================================================================
-- Run this in your Neon Database dashboard or using psql
-- ============================================================================

\echo '===================================================================='
\echo '                 DUPLICATE PRODUCTS ANALYSIS REPORT'
\echo '===================================================================='
\echo ''

-- ============================================================================
-- SECTION 1: SUMMARY STATISTICS
-- ============================================================================
\echo '1. SUMMARY STATISTICS'
\echo '--------------------------------------------------------------------'

WITH duplicate_stats AS (
    SELECT 
        COUNT(*) as total_products,
        COUNT(DISTINCT name) as unique_names,
        COUNT(DISTINCT sku) FILTER (WHERE sku IS NOT NULL AND sku != '') as unique_skus,
        COUNT(DISTINCT barcode) FILTER (WHERE barcode IS NOT NULL AND barcode != '') as unique_barcodes,
        
        -- Count products that have duplicate names
        COUNT(*) FILTER (WHERE name IN (
            SELECT name FROM lats_products 
            WHERE name IS NOT NULL AND name != ''
            GROUP BY name HAVING COUNT(*) > 1
        )) as products_with_duplicate_names,
        
        -- Count products that have duplicate SKUs
        COUNT(*) FILTER (WHERE sku IN (
            SELECT sku FROM lats_products 
            WHERE sku IS NOT NULL AND sku != ''
            GROUP BY sku HAVING COUNT(*) > 1
        )) as products_with_duplicate_skus,
        
        -- Count products that have duplicate barcodes
        COUNT(*) FILTER (WHERE barcode IN (
            SELECT barcode FROM lats_products 
            WHERE barcode IS NOT NULL AND barcode != ''
            GROUP BY barcode HAVING COUNT(*) > 1
        )) as products_with_duplicate_barcodes
    FROM lats_products
)
SELECT 
    'Total Products' as metric,
    total_products as count,
    '100.00%' as percentage
FROM duplicate_stats
UNION ALL
SELECT 
    'Unique Product Names',
    unique_names,
    ROUND((unique_names::numeric / NULLIF(total_products, 0) * 100), 2) || '%'
FROM duplicate_stats
UNION ALL
SELECT 
    'Products with Duplicate Names',
    products_with_duplicate_names,
    ROUND((products_with_duplicate_names::numeric / NULLIF(total_products, 0) * 100), 2) || '%'
FROM duplicate_stats
UNION ALL
SELECT 
    'Products with Duplicate SKUs',
    products_with_duplicate_skus,
    ROUND((products_with_duplicate_skus::numeric / NULLIF(total_products, 0) * 100), 2) || '%'
FROM duplicate_stats
UNION ALL
SELECT 
    'Products with Duplicate Barcodes',
    products_with_duplicate_barcodes,
    ROUND((products_with_duplicate_barcodes::numeric / NULLIF(total_products, 0) * 100), 2) || '%'
FROM duplicate_stats;

\echo ''
\echo ''

-- ============================================================================
-- SECTION 2: DUPLICATE PRODUCT NAMES (Top 20)
-- ============================================================================
\echo '2. DUPLICATE PRODUCT NAMES (Top 20)'
\echo '--------------------------------------------------------------------'

SELECT 
    name,
    COUNT(*) as duplicate_count,
    STRING_AGG(DISTINCT branch_id::text, ', ') as branches,
    STRING_AGG(id::text, ', ') as product_ids,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created
FROM lats_products
WHERE name IS NOT NULL AND name != ''
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, name
LIMIT 20;

\echo ''
\echo ''

-- ============================================================================
-- SECTION 3: DUPLICATE SKUs (All)
-- ============================================================================
\echo '3. DUPLICATE SKUs'
\echo '--------------------------------------------------------------------'

SELECT 
    sku,
    COUNT(*) as duplicate_count,
    STRING_AGG(name, ' | ') as product_names,
    STRING_AGG(id::text, ', ') as product_ids,
    STRING_AGG(DISTINCT branch_id::text, ', ') as branches
FROM lats_products
WHERE sku IS NOT NULL AND sku != ''
GROUP BY sku
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, sku;

\echo ''
\echo ''

-- ============================================================================
-- SECTION 4: DUPLICATE BARCODES (All)
-- ============================================================================
\echo '4. DUPLICATE BARCODES'
\echo '--------------------------------------------------------------------'

SELECT 
    barcode,
    COUNT(*) as duplicate_count,
    STRING_AGG(name, ' | ') as product_names,
    STRING_AGG(id::text, ', ') as product_ids,
    STRING_AGG(DISTINCT branch_id::text, ', ') as branches
FROM lats_products
WHERE barcode IS NOT NULL AND barcode != ''
GROUP BY barcode
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, barcode;

\echo ''
\echo ''

-- ============================================================================
-- SECTION 5: CROSS-BRANCH DUPLICATES
-- Products with same name in multiple branches
-- ============================================================================
\echo '5. CROSS-BRANCH DUPLICATES (Same name in multiple branches)'
\echo '--------------------------------------------------------------------'

SELECT 
    name,
    COUNT(DISTINCT branch_id) as branch_count,
    COUNT(*) as total_products,
    STRING_AGG(DISTINCT branch_id::text, ', ') as branch_ids,
    AVG(selling_price)::numeric(10,2) as avg_price,
    MIN(selling_price)::numeric(10,2) as min_price,
    MAX(selling_price)::numeric(10,2) as max_price
FROM lats_products
WHERE name IS NOT NULL AND name != ''
GROUP BY name
HAVING COUNT(DISTINCT branch_id) > 1
ORDER BY total_products DESC, name
LIMIT 20;

\echo ''
\echo ''

-- ============================================================================
-- SECTION 6: EXACT DUPLICATES
-- Products with same name, brand, and model
-- ============================================================================
\echo '6. EXACT DUPLICATES (Same name, brand, and model)'
\echo '--------------------------------------------------------------------'

SELECT 
    name,
    brand,
    model,
    COUNT(*) as duplicate_count,
    STRING_AGG(id::text, ', ') as product_ids,
    STRING_AGG(DISTINCT branch_id::text, ', ') as branches,
    STRING_AGG(DISTINCT sku, ', ') as different_skus
FROM lats_products
WHERE name IS NOT NULL AND brand IS NOT NULL AND model IS NOT NULL
GROUP BY name, brand, model
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, name, brand, model;

\echo ''
\echo ''

-- ============================================================================
-- SECTION 7: NEAR-DUPLICATES
-- Case-insensitive name duplicates
-- ============================================================================
\echo '7. NEAR-DUPLICATES (Case-insensitive, trimmed names)'
\echo '--------------------------------------------------------------------'

SELECT 
    LOWER(TRIM(name)) as normalized_name,
    COUNT(*) as duplicate_count,
    COUNT(DISTINCT name) as name_variations,
    STRING_AGG(DISTINCT name, ' | ') as actual_names,
    STRING_AGG(DISTINCT branch_id::text, ', ') as branches
FROM lats_products
WHERE name IS NOT NULL AND name != ''
GROUP BY LOWER(TRIM(name))
HAVING COUNT(*) > 1 AND COUNT(DISTINCT name) > 1
ORDER BY duplicate_count DESC, normalized_name
LIMIT 20;

\echo ''
\echo ''

-- ============================================================================
-- SECTION 8: DUPLICATES WITH STOCK
-- Products with duplicate names that have stock
-- ============================================================================
\echo '8. DUPLICATES WITH STOCK (Duplicates that have inventory)'
\echo '--------------------------------------------------------------------'

WITH duplicate_names AS (
    SELECT name
    FROM lats_products
    WHERE name IS NOT NULL AND name != ''
    GROUP BY name
    HAVING COUNT(*) > 1
)
SELECT 
    p.name,
    COUNT(*) as duplicate_count,
    SUM(p.stock_quantity) as total_stock,
    STRING_AGG(p.id::text || ' (' || COALESCE(p.stock_quantity::text, '0') || ')', ', ') as products_with_stock
FROM lats_products p
INNER JOIN duplicate_names dn ON p.name = dn.name
WHERE p.stock_quantity > 0
GROUP BY p.name
ORDER BY total_stock DESC, duplicate_count DESC
LIMIT 20;

\echo ''
\echo ''

-- ============================================================================
-- SECTION 9: INACTIVE DUPLICATES
-- Duplicate products that are inactive (can be cleaned up)
-- ============================================================================
\echo '9. INACTIVE DUPLICATES (Candidates for removal)'
\echo '--------------------------------------------------------------------'

WITH duplicate_names AS (
    SELECT name
    FROM lats_products
    WHERE name IS NOT NULL AND name != ''
    GROUP BY name
    HAVING COUNT(*) > 1
)
SELECT 
    p.name,
    COUNT(*) FILTER (WHERE p.is_active = false) as inactive_count,
    COUNT(*) as total_count,
    STRING_AGG(
        CASE WHEN p.is_active = false 
        THEN p.id::text || ' (inactive)' 
        ELSE p.id::text || ' (active)' 
        END, 
        ', '
    ) as product_ids
FROM lats_products p
INNER JOIN duplicate_names dn ON p.name = dn.name
GROUP BY p.name
HAVING COUNT(*) FILTER (WHERE p.is_active = false) > 0
ORDER BY inactive_count DESC, total_count DESC
LIMIT 20;

\echo ''
\echo ''

-- ============================================================================
-- SECTION 10: RECOMMENDATIONS
-- ============================================================================
\echo '10. RECOMMENDED ACTIONS'
\echo '--------------------------------------------------------------------'
\echo ''
\echo 'Based on the duplicate analysis, consider the following actions:'
\echo ''
\echo '1. EXACT DUPLICATES (Same name, brand, model):'
\echo '   - Review products in Section 6'
\echo '   - Keep the oldest or most active product'
\echo '   - Merge stock quantities before removal'
\echo ''
\echo '2. CROSS-BRANCH DUPLICATES (Section 5):'
\echo '   - These might be intentional for branch-specific inventory'
\echo '   - Review if all branches should share the same product'
\echo ''
\echo '3. SKU/BARCODE DUPLICATES (Sections 3 & 4):'
\echo '   - These are CRITICAL - SKUs and barcodes must be unique'
\echo '   - Update or regenerate SKUs/barcodes immediately'
\echo ''
\echo '4. INACTIVE DUPLICATES (Section 9):'
\echo '   - Safe candidates for cleanup'
\echo '   - Can be removed if no stock and no transaction history'
\echo ''
\echo '5. CASE-SENSITIVE DUPLICATES (Section 7):'
\echo '   - Standardize product names (proper capitalization)'
\echo '   - Consider automated name normalization'
\echo ''
\echo ''
\echo '===================================================================='
\echo '                      END OF REPORT'
\echo '===================================================================='

