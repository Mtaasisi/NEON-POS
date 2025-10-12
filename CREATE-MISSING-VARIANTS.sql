-- ================================================================================
-- Create missing variants for products without them
-- ================================================================================

BEGIN;

-- Create default variants for products that don't have any
INSERT INTO lats_product_variants (
    product_id,
    name,
    sku,
    cost_price,
    unit_price,
    selling_price,
    quantity,
    min_quantity,
    attributes,
    is_active,
    created_at,
    updated_at
)
SELECT 
    p.id as product_id,
    'Default' as name,
    COALESCE(p.sku, 'SKU-' || SUBSTRING(p.id::text, 1, 8)) as sku,
    p.cost_price,
    p.unit_price,
    p.selling_price,
    p.stock_quantity,
    p.min_stock_level,
    '{}'::jsonb as attributes,
    true as is_active,
    NOW() as created_at,
    NOW() as updated_at
FROM lats_products p
LEFT JOIN lats_product_variants v ON p.id = v.product_id
WHERE v.id IS NULL
  AND p.is_active = true;

-- Show what was created
SELECT 
    '✅ VARIANTS CREATED' as status,
    p.name as product_name,
    v.name as variant_name,
    v.sku
FROM lats_products p
INNER JOIN lats_product_variants v ON p.id = v.product_id
WHERE v.created_at >= NOW() - INTERVAL '1 minute';

COMMIT;

SELECT '✅ Done! All active products now have variants.' as result;

