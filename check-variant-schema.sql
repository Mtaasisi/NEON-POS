-- Check the actual schema of lats_product_variants table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'lats_product_variants'
ORDER BY ordinal_position;

-- Check for unique constraints
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'lats_product_variants'
    AND tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY')
ORDER BY tc.constraint_type, kcu.column_name;

-- Check for any duplicate SKUs currently in the database
SELECT 
    sku,
    COUNT(*) as count,
    array_agg(id) as variant_ids
FROM lats_product_variants
WHERE sku IS NOT NULL
GROUP BY sku
HAVING COUNT(*) > 1;

-- Check the specific product variants that are failing
SELECT 
    id,
    product_id,
    sku,
    variant_name,
    quantity,
    cost_price,
    unit_price
FROM lats_product_variants
WHERE product_id = (
    SELECT id FROM lats_products WHERE sku = 'SKU-1760105351191-OHH' LIMIT 1
);

