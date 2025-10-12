-- ================================================================================
-- DIAGNOSE ZERO PRICES IN POS SYSTEM
-- ================================================================================
-- This script identifies products with zero or null prices that cause
-- the "Invalid cart items found" error in the POS system
-- ================================================================================

-- 1. Check products with zero or null unit_price
SELECT 
    'Products with zero/null price' as issue_type,
    p.id,
    p.name,
    p.sku,
    p.unit_price,
    p.cost_price,
    c.name as category_name
FROM lats_products p
LEFT JOIN lats_categories c ON c.id = p.category_id
WHERE p.unit_price IS NULL 
   OR p.unit_price = 0
   OR p.unit_price < 0
ORDER BY p.name;

-- 2. Check product variants with zero or null unit_price
SELECT 
    'Variants with zero/null price' as issue_type,
    pv.id as variant_id,
    p.id as product_id,
    p.name as product_name,
    pv.variant_name,
    pv.sku as variant_sku,
    pv.unit_price,
    pv.cost_price,
    pv.quantity as stock
FROM lats_product_variants pv
JOIN lats_products p ON p.id = pv.product_id
WHERE pv.unit_price IS NULL 
   OR pv.unit_price = 0
   OR pv.unit_price < 0
ORDER BY p.name, pv.variant_name;

-- 3. Find the specific "Sony WH-1000XM5" product mentioned in the error
SELECT 
    'Sony WH-1000XM5 Details' as info_type,
    p.id,
    p.name,
    p.sku,
    p.unit_price as product_price,
    p.cost_price,
    p.is_active,
    pv.id as variant_id,
    pv.variant_name,
    pv.sku as variant_sku,
    pv.unit_price as variant_price,
    pv.cost_price as variant_cost,
    pv.quantity as stock
FROM lats_products p
LEFT JOIN lats_product_variants pv ON pv.product_id = p.id
WHERE p.name ILIKE '%Sony%WH-1000XM5%'
   OR p.name ILIKE '%Sony WH-1000XM5%'
   OR p.name ILIKE '%Headphones%Sony%';

-- 4. Count total products affected
SELECT 
    COUNT(DISTINCT p.id) as products_with_zero_price,
    COUNT(DISTINCT pv.id) as variants_with_zero_price
FROM lats_products p
LEFT JOIN lats_product_variants pv ON pv.product_id = p.id
WHERE (p.unit_price IS NULL OR p.unit_price = 0 OR p.unit_price < 0)
   OR (pv.unit_price IS NULL OR pv.unit_price = 0 OR pv.unit_price < 0);

-- 5. Check if products have variants but no prices set
SELECT 
    'Products with variants but no price' as issue_type,
    p.id,
    p.name,
    p.sku,
    p.unit_price as product_price,
    COUNT(pv.id) as variant_count,
    MIN(pv.unit_price) as min_variant_price,
    MAX(pv.unit_price) as max_variant_price,
    AVG(pv.unit_price) as avg_variant_price
FROM lats_products p
LEFT JOIN lats_product_variants pv ON pv.product_id = p.id
GROUP BY p.id, p.name, p.sku, p.unit_price
HAVING (p.unit_price IS NULL OR p.unit_price = 0)
   AND COUNT(pv.id) > 0
ORDER BY p.name;

-- 6. Summary of pricing issues
SELECT 
    'PRICING SUMMARY' as summary,
    (SELECT COUNT(*) FROM lats_products WHERE unit_price IS NULL OR unit_price = 0) as products_no_price,
    (SELECT COUNT(*) FROM lats_product_variants WHERE unit_price IS NULL OR unit_price = 0) as variants_no_price,
    (SELECT COUNT(*) FROM lats_products) as total_products,
    (SELECT COUNT(*) FROM lats_product_variants) as total_variants;

