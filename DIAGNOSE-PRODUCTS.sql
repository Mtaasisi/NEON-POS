-- ================================================================================
-- DIAGNOSE: Check products and variants in database
-- ================================================================================

-- 1. Check if products exist
SELECT 
    '📦 PRODUCTS COUNT' as check_type,
    COUNT(*) as total_products,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_products,
    COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_products
FROM lats_products;

-- 2. Show sample products
SELECT 
    '📋 SAMPLE PRODUCTS' as check_type,
    id,
    name,
    sku,
    unit_price,
    cost_price,
    is_active,
    created_at
FROM lats_products
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check variants count
SELECT 
    '🏷️ VARIANTS COUNT' as check_type,
    COUNT(*) as total_variants
FROM lats_product_variants;

-- 4. Check variants structure
SELECT 
    '🔧 VARIANTS COLUMNS' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'lats_product_variants'
ORDER BY ordinal_position;

-- 5. Sample variants
SELECT 
    '🏷️ SAMPLE VARIANTS' as check_type,
    v.id,
    v.product_id,
    v.name as variant_name,
    v.sku,
    v.quantity,
    v.cost_price,
    p.name as product_name
FROM lats_product_variants v
LEFT JOIN lats_products p ON v.product_id = p.id
ORDER BY v.created_at DESC
LIMIT 10;

-- 6. Products without variants
SELECT 
    '⚠️ PRODUCTS WITHOUT VARIANTS' as check_type,
    p.id,
    p.name,
    p.sku,
    p.created_at
FROM lats_products p
LEFT JOIN lats_product_variants v ON p.id = v.product_id
WHERE v.id IS NULL
LIMIT 10;

-- 7. Check RLS policies (might be blocking access)
SELECT 
    '🔒 RLS STATUS' as check_type,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('lats_products', 'lats_product_variants');

