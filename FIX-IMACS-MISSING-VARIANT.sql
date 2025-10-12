-- ================================================================================
-- AUTO-FIX: Create missing variant for iMacs product
-- ================================================================================
-- Product: iMacs
-- ID: 00c4a470-8777-4935-9250-0bf69c687ca3
-- Issue: Has 43 stock but 0 variants
-- ================================================================================

BEGIN;

-- Create default variant for iMacs product
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
    COALESCE(p.sku, 'iMacs-' || SUBSTRING(p.id::text, 1, 8)) as sku,
    COALESCE(p.cost_price, 0) as cost_price,
    COALESCE(p.unit_price, 0) as unit_price,
    COALESCE(p.selling_price, 0) as selling_price,
    COALESCE(p.stock_quantity, 43) as quantity,
    COALESCE(p.min_stock_level, 0) as min_quantity,
    '{}'::jsonb as attributes,
    true as is_active,
    NOW() as created_at,
    NOW() as updated_at
FROM lats_products p
WHERE p.id = '00c4a470-8777-4935-9250-0bf69c687ca3';

-- Verify the fix
SELECT 
    '✅ VARIANT CREATED' as status,
    p.name as product_name,
    p.id as product_id,
    v.name as variant_name,
    v.sku as variant_sku,
    v.quantity as stock,
    v.selling_price,
    v.cost_price
FROM lats_products p
INNER JOIN lats_product_variants v ON p.id = v.product_id
WHERE p.id = '00c4a470-8777-4935-9250-0bf69c687ca3';

COMMIT;

SELECT '✅ iMacs product now has a default variant with 43 units in stock!' as result;

