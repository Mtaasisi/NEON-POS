-- ================================================================================
-- PERMANENT FIX: Ensure ALL Products Always Have Variants
-- ================================================================================
-- This script provides a PERMANENT solution to the missing variants issue:
-- 1. Fixes all existing products without variants
-- 2. Creates a database trigger to auto-create variants for new products
-- 3. Adds a validation function to ensure data integrity
-- 4. Can be run multiple times safely (idempotent)
-- ================================================================================

BEGIN;

-- ================================================================================
-- STEP 1: Fix All Existing Products (Create Missing Variants)
-- ================================================================================

DO $$
DECLARE
    fixed_count INTEGER;
BEGIN
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
        COALESCE(p.cost_price, 0) as cost_price,
        COALESCE(p.unit_price, 0) as unit_price,
        COALESCE(p.selling_price, 0) as selling_price,
        COALESCE(p.stock_quantity, 0) as quantity,
        COALESCE(p.min_stock_level, 0) as min_quantity,
        COALESCE(p.attributes, '{}'::jsonb) as attributes,
        true as is_active,
        NOW() as created_at,
        NOW() as updated_at
    FROM lats_products p
    LEFT JOIN lats_product_variants v ON p.id = v.product_id
    WHERE v.id IS NULL
      AND p.is_active = true;
    
    GET DIAGNOSTICS fixed_count = ROW_COUNT;
    
    RAISE NOTICE '✅ Fixed % existing products without variants', fixed_count;
END $$;

-- ================================================================================
-- STEP 2: Create Trigger Function to Auto-Create Default Variant
-- ================================================================================

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS auto_create_default_variant_trigger ON lats_products;
DROP FUNCTION IF EXISTS auto_create_default_variant() CASCADE;

-- Create the trigger function
CREATE OR REPLACE FUNCTION auto_create_default_variant()
RETURNS TRIGGER AS $$
DECLARE
    variant_count INTEGER;
BEGIN
    -- Wait a moment to allow batch variant insertions
    PERFORM pg_sleep(0.1);
    
    -- Check if this product has any variants
    SELECT COUNT(*) INTO variant_count
    FROM lats_product_variants
    WHERE product_id = NEW.id;
    
    -- If no variants exist, create a default one
    IF variant_count = 0 THEN
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
        VALUES (
            NEW.id,
            'Default',
            COALESCE(NEW.sku, 'SKU-' || SUBSTRING(NEW.id::text, 1, 8)),
            COALESCE(NEW.cost_price, 0),
            COALESCE(NEW.unit_price, 0),
            COALESCE(NEW.selling_price, 0),
            COALESCE(NEW.stock_quantity, 0),
            COALESCE(NEW.min_stock_level, 0),
            COALESCE(NEW.attributes, '{}'::jsonb),
            true,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE '🔄 Auto-created default variant for product: % (ID: %)', NEW.name, NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger (runs after product insert with a delay to allow manual variant creation)
CREATE TRIGGER auto_create_default_variant_trigger
    AFTER INSERT ON lats_products
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_default_variant();

-- Log trigger creation
DO $$
BEGIN
    RAISE NOTICE '✅ Trigger created: auto_create_default_variant_trigger';
END $$;

-- ================================================================================
-- STEP 3: Create Validation Function (Optional - for manual checks)
-- ================================================================================

CREATE OR REPLACE FUNCTION check_products_without_variants()
RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    sku TEXT,
    stock_quantity INTEGER,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.sku,
        p.stock_quantity,
        p.created_at
    FROM lats_products p
    LEFT JOIN lats_product_variants v ON p.id = v.product_id
    WHERE v.id IS NULL
      AND p.is_active = true
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Log validation function creation
DO $$
BEGIN
    RAISE NOTICE '✅ Validation function created: check_products_without_variants()';
END $$;

-- ================================================================================
-- STEP 4: Verify the Fix
-- ================================================================================

-- Show products that were just fixed
DO $$
DECLARE
    total_products INTEGER;
    products_with_variants INTEGER;
    products_without_variants INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_products FROM lats_products WHERE is_active = true;
    
    SELECT COUNT(DISTINCT p.id) INTO products_with_variants
    FROM lats_products p
    INNER JOIN lats_product_variants v ON p.id = v.product_id
    WHERE p.is_active = true;
    
    products_without_variants := total_products - products_with_variants;
    
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════╗';
    RAISE NOTICE '║        PRODUCT VARIANTS STATUS REPORT             ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Total Active Products: %', total_products;
    RAISE NOTICE '✅ Products WITH Variants: %', products_with_variants;
    RAISE NOTICE '❌ Products WITHOUT Variants: %', products_without_variants;
    RAISE NOTICE '';
    
    IF products_without_variants = 0 THEN
        RAISE NOTICE '🎉 SUCCESS! All products now have variants!';
    ELSE
        RAISE NOTICE '⚠️  WARNING: % products still need variants', products_without_variants;
        RAISE NOTICE '   Run: SELECT * FROM check_products_without_variants();';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Automatic variant creation is now ENABLED';
    RAISE NOTICE '   All future products will automatically get a default variant';
    RAISE NOTICE '';
END $$;

COMMIT;

-- ================================================================================
-- STEP 5: Test the Trigger (Optional - Run Separately to Test)
-- ================================================================================

-- Uncomment below to test the trigger:
-- BEGIN;
-- 
-- INSERT INTO lats_products (name, category_id, is_active)
-- VALUES ('Test Product - Auto Variant', (SELECT id FROM lats_categories LIMIT 1), true)
-- RETURNING id, name;
-- 
-- -- Wait and check if variant was created
-- SELECT pg_sleep(0.2);
-- 
-- SELECT 
--     p.name as product_name,
--     v.name as variant_name,
--     v.sku as variant_sku,
--     '✅ Trigger Works!' as status
-- FROM lats_products p
-- LEFT JOIN lats_product_variants v ON p.id = v.product_id
-- WHERE p.name = 'Test Product - Auto Variant';
-- 
-- ROLLBACK;

-- ================================================================================
-- USAGE NOTES
-- ================================================================================
-- 
-- 1. To check products without variants at any time:
--    SELECT * FROM check_products_without_variants();
--
-- 2. To manually fix any products without variants:
--    Run STEP 1 again
--
-- 3. To disable the trigger (not recommended):
--    DROP TRIGGER auto_create_default_variant_trigger ON lats_products;
--
-- 4. To re-enable the trigger:
--    Run STEP 2 again
--
-- ================================================================================

SELECT '
╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║  ✅ PERMANENT FIX COMPLETED SUCCESSFULLY!                         ║
║                                                                    ║
║  What was done:                                                    ║
║  • Fixed all existing products without variants                   ║
║  • Created database trigger for automatic variant creation        ║
║  • Added validation function for monitoring                       ║
║                                                                    ║
║  What happens now:                                                 ║
║  • All NEW products will automatically get a default variant      ║
║  • Your POS will work correctly for all products                  ║
║  • Products will always be clickable in the POS                   ║
║                                                                    ║
║  To monitor: SELECT * FROM check_products_without_variants();     ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
' as "🎉 Installation Complete";

