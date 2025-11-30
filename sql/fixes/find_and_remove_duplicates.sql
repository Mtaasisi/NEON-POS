-- ============================================================================
-- FIND AND REMOVE DUPLICATE PRODUCTS
-- This script helps identify and provides SQL to remove duplicate products
-- ============================================================================

-- Step 1: Find products with duplicate names
-- ============================================================================
\echo '=== FINDING DUPLICATE PRODUCTS BY NAME ==='
\echo ''

-- Create a temporary table with duplicate analysis
CREATE TEMP TABLE IF NOT EXISTS duplicate_products_analysis AS
WITH ranked_products AS (
    SELECT 
        id,
        name,
        sku,
        barcode,
        brand,
        model,
        branch_id,
        selling_price,
        cost_price,
        stock_quantity,
        is_active,
        created_at,
        ROW_NUMBER() OVER (
            PARTITION BY name 
            ORDER BY 
                created_at ASC,  -- Keep the oldest
                is_active DESC,  -- Prefer active products
                stock_quantity DESC,  -- Prefer products with stock
                id ASC
        ) as row_num
    FROM lats_products
    WHERE name IS NOT NULL AND name != ''
)
SELECT 
    rp.*,
    CASE WHEN row_num > 1 THEN true ELSE false END as is_duplicate
FROM ranked_products
WHERE name IN (
    SELECT name 
    FROM lats_products 
    WHERE name IS NOT NULL AND name != ''
    GROUP BY name 
    HAVING COUNT(*) > 1
);

-- Display duplicate products
\echo 'Products identified as duplicates (to be potentially removed):'
\echo ''

SELECT 
    id,
    name,
    sku,
    brand,
    branch_id,
    selling_price,
    stock_quantity,
    is_active,
    created_at,
    row_num
FROM duplicate_products_analysis
ORDER BY name, row_num;

-- Count duplicates
\echo ''
\echo 'Summary:'
SELECT 
    COUNT(*) FILTER (WHERE row_num = 1) as products_to_keep,
    COUNT(*) FILTER (WHERE row_num > 1) as duplicates_to_remove,
    COUNT(DISTINCT name) as unique_product_names_with_duplicates
FROM duplicate_products_analysis;

-- ============================================================================
-- Step 2: Generate DELETE statements for duplicates
-- ============================================================================
\echo ''
\echo '=== SQL TO REMOVE DUPLICATES (Keep oldest, most active) ==='
\echo ''
\echo 'WARNING: Review carefully before running!'
\echo ''

-- Generate DELETE statements
SELECT 
    'DELETE FROM lats_products WHERE id = ''' || id || '''; -- ' || 
    name || ' (created: ' || created_at || ', stock: ' || stock_quantity || ')' as delete_statement
FROM duplicate_products_analysis
WHERE is_duplicate = true
ORDER BY name, created_at;

-- ============================================================================
-- Step 3: Check for SKU duplicates
-- ============================================================================
\echo ''
\echo '=== DUPLICATE SKUs ==='
\echo ''

SELECT 
    sku,
    COUNT(*) as count,
    STRING_AGG(name, ' | ') as product_names,
    STRING_AGG(id::text, ', ') as ids
FROM lats_products
WHERE sku IS NOT NULL AND sku != ''
GROUP BY sku
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- ============================================================================
-- Step 4: Check for barcode duplicates
-- ============================================================================
\echo ''
\echo '=== DUPLICATE BARCODES ==='
\echo ''

SELECT 
    barcode,
    COUNT(*) as count,
    STRING_AGG(name, ' | ') as product_names,
    STRING_AGG(id::text, ', ') as ids
FROM lats_products
WHERE barcode IS NOT NULL AND barcode != ''
GROUP BY barcode
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- ============================================================================
-- SAFER ALTERNATIVE: Merge duplicates instead of deleting
-- ============================================================================
\echo ''
\echo '=== ALTERNATIVE: MERGE DUPLICATES (Safer approach) ==='
\echo ''
\echo 'This approach updates duplicate products to reference the master product:'
\echo ''

-- Generate UPDATE statements to merge stock quantities and mark as inactive
WITH master_products AS (
    SELECT 
        name,
        MIN(id) as master_id
    FROM lats_products
    WHERE name IS NOT NULL AND name != ''
    GROUP BY name
    HAVING COUNT(*) > 1
)
SELECT 
    '-- Merge ' || p.name || chr(10) ||
    'UPDATE lats_products SET ' || chr(10) ||
    '    stock_quantity = (SELECT SUM(stock_quantity) FROM lats_products WHERE name = ''' || p.name || '''), ' || chr(10) ||
    '    updated_at = NOW() ' || chr(10) ||
    'WHERE id = ''' || mp.master_id || ''';' || chr(10) ||
    'UPDATE lats_products SET is_active = false WHERE name = ''' || p.name || ''' AND id != ''' || mp.master_id || ''';' || chr(10) as merge_statements
FROM lats_products p
JOIN master_products mp ON p.name = mp.name
WHERE p.id != mp.master_id
ORDER BY p.name
LIMIT 20;  -- Show first 20 examples

-- ============================================================================
-- Final recommendations
-- ============================================================================
\echo ''
\echo '=== RECOMMENDATIONS ==='
\echo ''
\echo '1. Review the duplicate products list above'
\echo '2. Back up your database before making any changes'
\echo '3. Consider using the MERGE approach instead of DELETE to preserve data'
\echo '4. After removing duplicates, add a UNIQUE constraint on important fields:'
\echo '   ALTER TABLE lats_products ADD CONSTRAINT unique_product_name_per_branch UNIQUE (name, branch_id);'
\echo '   ALTER TABLE lats_products ADD CONSTRAINT unique_product_sku UNIQUE (sku) WHERE sku IS NOT NULL;'
\echo ''

