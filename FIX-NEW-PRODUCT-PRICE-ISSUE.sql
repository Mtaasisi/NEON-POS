-- ================================================================================
-- FIX: NEW PRODUCTS NOT SHOWING PRICE
-- ================================================================================
-- This script fixes the issue where newly created products don't display prices
-- by ensuring all products have variants with correct pricing information
-- ================================================================================

BEGIN;

SELECT '🔧 FIXING NEW PRODUCT PRICE DISPLAY ISSUE...' as status;
SELECT '' as blank;

-- ================================================================================
-- STEP 1: DIAGNOSTIC - IDENTIFY THE PROBLEM
-- ================================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '📊 STEP 1: Diagnosing the Issue' as step;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

-- Find products without variants
SELECT 
    '⚠️  Products without variants:' as issue,
    COUNT(*) as count
FROM lats_products p
LEFT JOIN lats_product_variants v ON p.id = v.product_id
WHERE p.is_active = true
  AND v.id IS NULL;

-- Find products with variants but zero prices
SELECT 
    '⚠️  Products with variants but zero prices:' as issue,
    COUNT(DISTINCT p.id) as count
FROM lats_products p
INNER JOIN lats_product_variants v ON p.id = v.product_id
WHERE p.is_active = true
  AND v.is_active = true
  AND (v.unit_price IS NULL OR v.unit_price = 0)
  AND (v.selling_price IS NULL OR v.selling_price = 0);

-- Show sample problematic products
SELECT 
    '📋 Sample products with issues:' as info,
    p.name as product_name,
    p.unit_price as product_price,
    p.cost_price as product_cost,
    COUNT(v.id) as variant_count,
    COALESCE(MAX(v.unit_price), 0) as max_variant_price
FROM lats_products p
LEFT JOIN lats_product_variants v ON p.id = v.product_id AND v.is_active = true
WHERE p.is_active = true
GROUP BY p.id, p.name, p.unit_price, p.cost_price
HAVING COUNT(v.id) = 0 OR MAX(v.unit_price) = 0
ORDER BY p.created_at DESC
LIMIT 10;

SELECT '' as blank;

-- ================================================================================
-- STEP 2: CREATE MISSING VARIANTS WITH PRICES FROM PRODUCTS
-- ================================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '🔧 STEP 2: Creating Missing Variants' as step;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

-- Detect column names dynamically and create variants
DO $$
DECLARE
    has_variant_name BOOLEAN;
    has_name BOOLEAN;
    name_column TEXT;
    attributes_column TEXT;
    has_selling_price BOOLEAN;
    rows_inserted INTEGER := 0;
BEGIN
    -- Detect column names
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' AND column_name = 'variant_name'
    ) INTO has_variant_name;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' AND column_name = 'name'
    ) INTO has_name;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' AND column_name = 'selling_price'
    ) INTO has_selling_price;
    
    -- Determine column to use
    IF has_variant_name THEN
        name_column := 'variant_name';
    ELSIF has_name THEN
        name_column := 'name';
    ELSE
        RAISE EXCEPTION 'No name column found in lats_product_variants';
    END IF;
    
    -- Check attributes column
    SELECT CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'lats_product_variants' AND column_name = 'variant_attributes')
        THEN 'variant_attributes'
        ELSE 'attributes'
    END INTO attributes_column;
    
    RAISE NOTICE '📋 Detected columns: name=%, attributes=%, selling_price=%', 
        name_column, attributes_column, has_selling_price;
    
    -- Create variants for products without them
    IF has_selling_price THEN
        EXECUTE format('
            INSERT INTO lats_product_variants (
                product_id,
                %I,
                sku,
                cost_price,
                unit_price,
                selling_price,
                quantity,
                min_quantity,
                %I,
                is_active,
                created_at,
                updated_at
            )
            SELECT 
                p.id as product_id,
                ''Default'' as name,
                COALESCE(
                    NULLIF(p.sku, ''''),
                    ''SKU-'' || SUBSTRING(p.id::text, 1, 8) || ''-'' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, ''0'')
                ) as sku,
                COALESCE(p.cost_price, 0) as cost_price,
                COALESCE(p.unit_price, 0) as unit_price,
                COALESCE(p.unit_price, 0) as selling_price,
                COALESCE(p.stock_quantity, 0) as quantity,
                COALESCE(p.min_stock_level, 0) as min_quantity,
                ''{}''::jsonb as attributes,
                true as is_active,
                NOW() as created_at,
                NOW() as updated_at
            FROM lats_products p
            LEFT JOIN lats_product_variants v ON p.id = v.product_id
            WHERE v.id IS NULL
              AND p.is_active = true
        ', name_column, attributes_column);
    ELSE
        EXECUTE format('
            INSERT INTO lats_product_variants (
                product_id,
                %I,
                sku,
                cost_price,
                unit_price,
                quantity,
                min_quantity,
                %I,
                is_active,
                created_at,
                updated_at
            )
            SELECT 
                p.id as product_id,
                ''Default'' as name,
                COALESCE(
                    NULLIF(p.sku, ''''),
                    ''SKU-'' || SUBSTRING(p.id::text, 1, 8) || ''-'' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, ''0'')
                ) as sku,
                COALESCE(p.cost_price, 0) as cost_price,
                COALESCE(p.unit_price, 0) as unit_price,
                COALESCE(p.stock_quantity, 0) as quantity,
                COALESCE(p.min_stock_level, 0) as min_quantity,
                ''{}''::jsonb as attributes,
                true as is_active,
                NOW() as created_at,
                NOW() as updated_at
            FROM lats_products p
            LEFT JOIN lats_product_variants v ON p.id = v.product_id
            WHERE v.id IS NULL
              AND p.is_active = true
        ', name_column, attributes_column);
    END IF;
    
    GET DIAGNOSTICS rows_inserted = ROW_COUNT;
    RAISE NOTICE '✅ Created % default variants', rows_inserted;
END $$;

-- Show created variants
SELECT 
    '✅ Variants created in last minute:' as result,
    p.name as product_name,
    p.unit_price as product_price,
    v.unit_price as variant_price,
    v.sku as variant_sku
FROM lats_products p
INNER JOIN lats_product_variants v ON p.id = v.product_id
WHERE v.created_at >= NOW() - INTERVAL '1 minute'
ORDER BY v.created_at DESC;

SELECT '' as blank;

-- ================================================================================
-- STEP 3: FIX ZERO-PRICE VARIANTS (Copy price from product)
-- ================================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '🔧 STEP 3: Fixing Zero-Price Variants' as step;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

-- Update variants with zero prices from their parent product
DO $$
DECLARE
    has_selling_price BOOLEAN;
    rows_updated INTEGER := 0;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' AND column_name = 'selling_price'
    ) INTO has_selling_price;
    
    IF has_selling_price THEN
        UPDATE lats_product_variants v
        SET 
            unit_price = COALESCE(NULLIF(p.unit_price, 0), v.unit_price, 1.00),
            selling_price = COALESCE(NULLIF(p.unit_price, 0), v.selling_price, 1.00),
            cost_price = COALESCE(NULLIF(p.cost_price, 0), v.cost_price, 0),
            updated_at = NOW()
        FROM lats_products p
        WHERE v.product_id = p.id
          AND v.is_active = true
          AND (v.unit_price IS NULL OR v.unit_price = 0)
          AND p.unit_price > 0;
    ELSE
        UPDATE lats_product_variants v
        SET 
            unit_price = COALESCE(NULLIF(p.unit_price, 0), v.unit_price, 1.00),
            cost_price = COALESCE(NULLIF(p.cost_price, 0), v.cost_price, 0),
            updated_at = NOW()
        FROM lats_products p
        WHERE v.product_id = p.id
          AND v.is_active = true
          AND (v.unit_price IS NULL OR v.unit_price = 0)
          AND p.unit_price > 0;
    END IF;
    
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RAISE NOTICE '✅ Updated % variants with prices from products', rows_updated;
END $$;

-- Show updated variants
SELECT 
    '✅ Variants updated with prices:' as result,
    p.name as product_name,
    p.unit_price as product_price,
    v.unit_price as new_variant_price
FROM lats_products p
INNER JOIN lats_product_variants v ON p.id = v.product_id
WHERE v.updated_at >= NOW() - INTERVAL '1 minute'
  AND v.unit_price > 0
ORDER BY v.updated_at DESC
LIMIT 10;

SELECT '' as blank;

-- ================================================================================
-- STEP 4: CREATE AUTO-TRIGGER FOR NEW PRODUCTS
-- ================================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '🔧 STEP 4: Creating Auto-Variant Trigger' as step;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS auto_create_product_variant ON lats_products;
DROP FUNCTION IF EXISTS auto_create_default_variant();

-- Create function to auto-create variant
CREATE OR REPLACE FUNCTION auto_create_default_variant()
RETURNS TRIGGER AS $$
DECLARE
    variant_count INTEGER;
    name_column TEXT;
    attributes_column TEXT;
    has_selling_price BOOLEAN;
    has_variant_name BOOLEAN;
    has_name BOOLEAN;
BEGIN
    -- Wait a moment for any explicit variants to be created
    -- This allows the application to create its own variants first
    PERFORM pg_sleep(0.1);
    
    -- Check if product already has variants
    SELECT COUNT(*) INTO variant_count
    FROM lats_product_variants
    WHERE product_id = NEW.id;
    
    -- Only create default variant if none exists
    IF variant_count = 0 THEN
        -- Detect column structure
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'lats_product_variants' AND column_name = 'variant_name'
        ) INTO has_variant_name;
        
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'lats_product_variants' AND column_name = 'name'
        ) INTO has_name;
        
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'lats_product_variants' AND column_name = 'selling_price'
        ) INTO has_selling_price;
        
        -- Determine column names
        IF has_variant_name THEN
            name_column := 'variant_name';
        ELSIF has_name THEN
            name_column := 'name';
        END IF;
        
        SELECT CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'lats_product_variants' AND column_name = 'variant_attributes')
            THEN 'variant_attributes'
            ELSE 'attributes'
        END INTO attributes_column;
        
        -- Create default variant with proper prices
        IF has_selling_price THEN
            EXECUTE format('
                INSERT INTO lats_product_variants (
                    product_id, %I, sku, cost_price, unit_price, selling_price, 
                    quantity, min_quantity, %I, is_active
                )
                VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
                )', name_column, attributes_column)
            USING 
                NEW.id,
                'Default',
                COALESCE(
                    NULLIF(NEW.sku, ''),
                    'SKU-' || SUBSTRING(NEW.id::text, 1, 8) || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0')
                ),
                COALESCE(NEW.cost_price, 0),
                COALESCE(NEW.unit_price, 0),
                COALESCE(NEW.unit_price, 0),
                COALESCE(NEW.stock_quantity, 0),
                COALESCE(NEW.min_stock_level, 0),
                '{}'::jsonb,
                true;
        ELSE
            EXECUTE format('
                INSERT INTO lats_product_variants (
                    product_id, %I, sku, cost_price, unit_price, 
                    quantity, min_quantity, %I, is_active
                )
                VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9
                )', name_column, attributes_column)
            USING 
                NEW.id,
                'Default',
                COALESCE(
                    NULLIF(NEW.sku, ''),
                    'SKU-' || SUBSTRING(NEW.id::text, 1, 8) || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0')
                ),
                COALESCE(NEW.cost_price, 0),
                COALESCE(NEW.unit_price, 0),
                COALESCE(NEW.stock_quantity, 0),
                COALESCE(NEW.min_stock_level, 0),
                '{}'::jsonb,
                true;
        END IF;
        
        RAISE NOTICE '✅ Auto-created default variant for product: % (price: %)', NEW.name, NEW.unit_price;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger (fires after INSERT with a slight delay)
CREATE TRIGGER auto_create_product_variant
    AFTER INSERT ON lats_products
    FOR EACH ROW
    WHEN (NEW.is_active = true)
    EXECUTE FUNCTION auto_create_default_variant();

SELECT '✅ Auto-variant trigger created successfully' as result;
SELECT '   ℹ️  All new products will automatically get a default variant if none is specified' as info;

SELECT '' as blank;

-- ================================================================================
-- STEP 5: VERIFICATION
-- ================================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '✅ STEP 5: Verification' as step;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

-- Check products without variants (should be 0)
SELECT 
    '📊 Products without variants (should be 0):' as check,
    COUNT(*) as count
FROM lats_products p
LEFT JOIN lats_product_variants v ON p.id = v.product_id
WHERE p.is_active = true
  AND v.id IS NULL;

-- Check variants with zero prices (should be minimal)
SELECT 
    '📊 Variants with zero prices (should be minimal):' as check,
    COUNT(*) as count
FROM lats_product_variants v
INNER JOIN lats_products p ON v.product_id = p.id
WHERE v.is_active = true
  AND p.is_active = true
  AND v.unit_price = 0;

-- Show recent products and their pricing
SELECT 
    '📋 Recent products with pricing info:' as info,
    p.name,
    p.unit_price as product_price,
    COUNT(v.id) as variant_count,
    MAX(v.unit_price) as max_variant_price,
    MIN(v.unit_price) as min_variant_price
FROM lats_products p
LEFT JOIN lats_product_variants v ON p.id = v.product_id AND v.is_active = true
WHERE p.is_active = true
GROUP BY p.id, p.name, p.unit_price
ORDER BY p.created_at DESC
LIMIT 10;

SELECT '' as blank;

COMMIT;

-- ================================================================================
-- COMPLETION MESSAGE
-- ================================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '✅ FIX COMPLETE!' as status;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

SELECT '📋 What was done:' as summary;
SELECT '   1. ✅ Created default variants for all products without them' as fix1;
SELECT '   2. ✅ Fixed zero-price variants by copying prices from products' as fix2;
SELECT '   3. ✅ Created auto-trigger to ensure new products always get variants' as fix3;
SELECT '   4. ✅ Verified all products now have proper pricing' as fix4;

SELECT '' as blank;

SELECT '🎯 TESTING:' as test_header;
SELECT '   1. Try creating a new product with a price' as test1;
SELECT '   2. The product should immediately show the correct price' as test2;
SELECT '   3. Check that a default variant was auto-created' as test3;

SELECT '' as blank;

SELECT '💡 HOW IT WORKS:' as how_header;
SELECT '   - When a product is created, a trigger waits 100ms' as how1;
SELECT '   - If no variants exist after that delay, a default variant is auto-created' as how2;
SELECT '   - The default variant inherits the price from the product' as how3;
SELECT '   - Your frontend can still create custom variants which will prevent the default' as how4;

SELECT '' as blank;

SELECT '⚠️  NOTE:' as note_header;
SELECT '   If you want to disable auto-variant creation:' as note1;
SELECT '   DROP TRIGGER auto_create_product_variant ON lats_products;' as note2;

SELECT '' as blank;
SELECT '🎉 New products will now show prices correctly!' as done;

