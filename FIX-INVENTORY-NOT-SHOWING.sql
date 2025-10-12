-- ================================================================================
-- 🔧 FIX INVENTORY NOT SHOWING
-- ================================================================================
-- This script diagnoses and fixes common issues with products not appearing
-- in the inventory page
-- ================================================================================

\echo '🔍 STEP 1: CHECKING PRODUCTS IN DATABASE...'
\echo ''

-- 1. Count total products
SELECT 
    '📦 Total Products:' as check_type,
    COUNT(*) as count
FROM lats_products;

-- 2. Check active vs inactive products
SELECT 
    '✅ Active Products:' as check_type,
    CASE 
        WHEN is_active THEN 'Active'
        ELSE 'Inactive'
    END as status,
    COUNT(*) as count
FROM lats_products
GROUP BY is_active;

-- 3. Check products with missing categories
SELECT 
    '⚠️  Products with Missing Category:' as check_type,
    COUNT(*) as count
FROM lats_products p
LEFT JOIN lats_categories c ON p.category_id = c.id
WHERE c.id IS NULL;

-- 4. Check products with missing suppliers
SELECT 
    '⚠️  Products with Missing Supplier:' as check_type,
    COUNT(*) as count
FROM lats_products p
LEFT JOIN lats_suppliers s ON p.supplier_id = s.id
WHERE p.supplier_id IS NOT NULL AND s.id IS NULL;

-- 5. Check products without variants
SELECT 
    '⚠️  Products WITHOUT Variants:' as check_type,
    COUNT(DISTINCT p.id) as count
FROM lats_products p
LEFT JOIN lats_product_variants v ON p.id = v.product_id
WHERE v.id IS NULL;

\echo ''
\echo '🔍 STEP 2: CHECKING SPECIFIC PRODUCT DETAILS...'
\echo ''

-- 6. Show sample products with full details
SELECT 
    p.id,
    p.name,
    p.sku,
    p.is_active as active,
    c.name as category,
    s.name as supplier,
    p.total_quantity as stock,
    (SELECT COUNT(*) FROM lats_product_variants WHERE product_id = p.id) as variant_count,
    p.created_at
FROM lats_products p
LEFT JOIN lats_categories c ON p.category_id = c.id
LEFT JOIN lats_suppliers s ON p.supplier_id = s.id
ORDER BY p.created_at DESC
LIMIT 10;

\echo ''
\echo '🔧 STEP 3: APPLYING FIXES...'
\echo ''

-- FIX 1: Activate all inactive products
UPDATE lats_products
SET is_active = true
WHERE is_active = false OR is_active IS NULL;

SELECT '✅ Activated all products' as fix_status;

-- FIX 2: Ensure all products have a category (assign default if missing)
DO $$
DECLARE
    default_category_id uuid;
    uncategorized_count integer;
BEGIN
    -- Check if 'Uncategorized' category exists
    SELECT id INTO default_category_id
    FROM lats_categories
    WHERE LOWER(name) = 'uncategorized'
    LIMIT 1;
    
    -- If not, create it
    IF default_category_id IS NULL THEN
        INSERT INTO lats_categories (name, description, color, icon, is_active)
        VALUES ('Uncategorized', 'Products without a specific category', '#808080', '📦', true)
        RETURNING id INTO default_category_id;
        
        RAISE NOTICE '✅ Created Uncategorized category: %', default_category_id;
    END IF;
    
    -- Assign uncategorized products to the default category
    UPDATE lats_products
    SET category_id = default_category_id
    WHERE category_id IS NULL OR category_id NOT IN (SELECT id FROM lats_categories);
    
    GET DIAGNOSTICS uncategorized_count = ROW_COUNT;
    RAISE NOTICE '✅ Fixed % products with missing categories', uncategorized_count;
END $$;

-- FIX 3: Create default variants for products that don't have any
DO $$
DECLARE
    product_record RECORD;
    variant_count integer := 0;
BEGIN
    FOR product_record IN (
        SELECT DISTINCT p.id, p.name, p.sku
        FROM lats_products p
        LEFT JOIN lats_product_variants v ON p.id = v.product_id
        WHERE v.id IS NULL
    ) LOOP
        -- Create a default variant for this product
        INSERT INTO lats_product_variants (
            product_id,
            variant_name,
            sku,
            unit_price,
            cost_price,
            quantity,
            min_quantity,
            is_active
        )
        VALUES (
            product_record.id,
            'Standard',
            product_record.sku || '-STD',
            0,
            0,
            0,
            0,
            true
        )
        ON CONFLICT DO NOTHING;
        
        variant_count := variant_count + 1;
    END LOOP;
    
    RAISE NOTICE '✅ Created % default variants for products without variants', variant_count;
END $$;

-- FIX 4: Update total_quantity for all products based on their variants
UPDATE lats_products p
SET total_quantity = COALESCE((
    SELECT SUM(quantity)
    FROM lats_product_variants
    WHERE product_id = p.id
), 0);

SELECT '✅ Updated total quantities for all products' as fix_status;

\echo ''
\echo '🎉 STEP 4: VERIFICATION...'
\echo ''

-- Verify the fixes
SELECT 
    '📊 Final Product Status:' as summary,
    COUNT(*) FILTER (WHERE is_active = true) as active_products,
    COUNT(*) FILTER (WHERE is_active = false) as inactive_products,
    COUNT(*) FILTER (WHERE category_id IS NOT NULL) as products_with_category,
    COUNT(*) as total_products
FROM lats_products;

SELECT 
    '📦 Products with Variants:' as summary,
    COUNT(DISTINCT product_id) as products_with_variants
FROM lats_product_variants;

\echo ''
\echo '✅ All fixes applied!'
\echo ''
\echo '🚀 Next Steps:'
\echo '   1. Refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)'
\echo '   2. Clear browser cache if products still don\'t show'
\echo '   3. Check browser console for any errors (F12)'
\echo ''
\echo '💡 If products still don\'t show, the issue might be in the frontend.'
\echo '   Check the browser console for errors related to product fetching.'
\echo ''

-- Show the current products that should now be visible
\echo '📋 Products that should now be visible:'
\echo ''

SELECT 
    p.name,
    p.sku,
    CASE WHEN p.is_active THEN 'Yes' ELSE 'No' END as active,
    c.name as category,
    COALESCE(s.name, 'No Supplier') as supplier,
    p.total_quantity as stock,
    (SELECT COUNT(*) FROM lats_product_variants WHERE product_id = p.id) as variants
FROM lats_products p
LEFT JOIN lats_categories c ON p.category_id = c.id
LEFT JOIN lats_suppliers s ON p.supplier_id = s.id
WHERE p.is_active = true
ORDER BY p.created_at DESC
LIMIT 20;

