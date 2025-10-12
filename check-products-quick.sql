-- Quick check: How many products do we have?
SELECT COUNT(*) as total_products FROM lats_products;

-- Are they active?
SELECT 
    is_active,
    COUNT(*) as count
FROM lats_products
GROUP BY is_active;

-- Check products with their basic info
SELECT 
    id,
    name,
    sku,
    is_active,
    category_id,
    supplier_id,
    total_quantity,
    created_at
FROM lats_products
ORDER BY created_at DESC
LIMIT 10;

-- Check variants
SELECT 
    COUNT(*) as total_variants,
    COUNT(DISTINCT product_id) as products_with_variants
FROM lats_product_variants;
