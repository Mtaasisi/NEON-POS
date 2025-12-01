-- ============================================================================
-- CHECK PRICE FIELDS IN DATABASE
-- Run these queries to investigate price storage in products and variants
-- ============================================================================

-- 1. Check product-level prices
-- ============================================================================
SELECT 
    id,
    name,
    sku,
    selling_price,
    cost_price,
    CASE 
        WHEN selling_price IS NULL THEN 'NULL'
        WHEN selling_price = 0 THEN 'ZERO'
        ELSE 'HAS_PRICE'
    END as price_status
FROM lats_products
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 20;

-- 2. Check variant-level prices
-- ============================================================================
SELECT 
    v.id,
    v.product_id,
    p.name as product_name,
    v.name,
    v.variant_name,
    v.sku,
    v.selling_price,
    v.cost_price,
    v.unit_price,
    v.parent_variant_id,
    v.is_parent,
    v.variant_type,
    CASE 
        WHEN v.selling_price IS NULL AND v.unit_price IS NULL THEN 'NO_PRICE'
        WHEN v.selling_price IS NOT NULL AND v.selling_price > 0 THEN 'HAS_SELLING_PRICE'
        WHEN v.unit_price IS NOT NULL AND v.unit_price > 0 THEN 'HAS_UNIT_PRICE'
        ELSE 'ZERO_PRICE'
    END as price_status
FROM lats_product_variants v
LEFT JOIN lats_products p ON v.product_id = p.id
WHERE v.is_active = true
ORDER BY v.created_at DESC
LIMIT 30;

-- 3. Check products with variants that have prices
-- ============================================================================
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.selling_price as product_selling_price,
    COUNT(v.id) as variant_count,
    COUNT(CASE WHEN v.selling_price IS NOT NULL AND v.selling_price > 0 THEN 1 END) as variants_with_selling_price,
    COUNT(CASE WHEN v.unit_price IS NOT NULL AND v.unit_price > 0 THEN 1 END) as variants_with_unit_price,
    MAX(v.selling_price) as max_variant_selling_price,
    MAX(v.unit_price) as max_variant_unit_price
FROM lats_products p
LEFT JOIN lats_product_variants v ON p.id = v.product_id AND v.is_active = true
WHERE p.is_active = true
GROUP BY p.id, p.name, p.selling_price
HAVING COUNT(v.id) > 0
ORDER BY p.created_at DESC
LIMIT 20;

-- 4. Check specific products mentioned (Book, Zombi, Macbook Air)
-- ============================================================================
SELECT 
    p.id,
    p.name,
    p.sku,
    p.selling_price as product_selling_price,
    p.cost_price as product_cost_price,
    v.id as variant_id,
    v.name as variant_name,
    v.variant_name,
    v.sku as variant_sku,
    v.selling_price as variant_selling_price,
    v.cost_price as variant_cost_price,
    v.unit_price as variant_unit_price,
    v.parent_variant_id,
    v.is_parent,
    v.variant_type
FROM lats_products p
LEFT JOIN lats_product_variants v ON p.id = v.product_id AND v.is_active = true
WHERE p.name IN ('Book', 'Zombi', 'Macbook Air A1466')
   OR p.sku LIKE '%1764512440133%'  -- Book SKU
   OR p.sku LIKE '%1764531231128%'   -- Zombi SKU
   OR p.sku LIKE '%1764502501787%'   -- Macbook Air SKU
ORDER BY p.name, v.created_at;

-- 5. Check all price-related columns in variants table
-- ============================================================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'lats_product_variants'
  AND (column_name LIKE '%price%' OR column_name LIKE '%cost%')
ORDER BY column_name;

-- 6. Check all price-related columns in products table
-- ============================================================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'lats_products'
  AND (column_name LIKE '%price%' OR column_name LIKE '%cost%')
ORDER BY column_name;

-- 7. Sample data from variants to see actual structure
-- ============================================================================
SELECT 
    v.*
FROM lats_product_variants v
WHERE v.product_id IN (
    SELECT id FROM lats_products 
    WHERE name IN ('Book', 'Zombi') 
    LIMIT 2
)
AND v.is_active = true
LIMIT 10;

