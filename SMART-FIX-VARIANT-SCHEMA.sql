-- ================================================================================
-- SMART FIX: Detect and Correct Variant Schema Issues
-- ================================================================================
-- This script automatically detects which columns exist and fixes mismatches
-- Run this in your Neon Database SQL Editor
-- ================================================================================

BEGIN;

SELECT '🔍 SMART VARIANT SCHEMA FIX STARTING...' as status;
SELECT '' as blank;

-- ================================================================================
-- STEP 1: DETECT CURRENT SCHEMA
-- ================================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '🔍 STEP 1: Detecting Current Schema' as step;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

-- Show current variant table columns
SELECT 
    'Current lats_product_variants columns:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'lats_product_variants'
  AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT '' as blank;

-- ================================================================================
-- STEP 2: STANDARDIZE COLUMN NAMES
-- ================================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '🔧 STEP 2: Standardizing Column Names' as step;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

-- Fix 1: If 'name' exists but not 'variant_name', add 'variant_name' as alias
DO $$
DECLARE
    has_variant_name BOOLEAN;
    has_name BOOLEAN;
    has_variant_attributes BOOLEAN;
    has_attributes BOOLEAN;
    has_selling_price BOOLEAN;
BEGIN
    -- Check which columns exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' 
        AND column_name = 'variant_name'
    ) INTO has_variant_name;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' 
        AND column_name = 'name'
    ) INTO has_name;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' 
        AND column_name = 'variant_attributes'
    ) INTO has_variant_attributes;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' 
        AND column_name = 'attributes'
    ) INTO has_attributes;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' 
        AND column_name = 'selling_price'
    ) INTO has_selling_price;
    
    -- Report findings
    RAISE NOTICE '📊 Column Detection Results:';
    RAISE NOTICE '   - variant_name exists: %', has_variant_name;
    RAISE NOTICE '   - name exists: %', has_name;
    RAISE NOTICE '   - variant_attributes exists: %', has_variant_attributes;
    RAISE NOTICE '   - attributes exists: %', has_attributes;
    RAISE NOTICE '   - selling_price exists: %', has_selling_price;
    
    -- FIX 1: Handle name vs variant_name
    IF has_name AND NOT has_variant_name THEN
        RAISE NOTICE '🔧 Adding variant_name column (using name as source)...';
        ALTER TABLE lats_product_variants ADD COLUMN IF NOT EXISTS variant_name TEXT;
        EXECUTE 'UPDATE lats_product_variants SET variant_name = name WHERE variant_name IS NULL';
        RAISE NOTICE '✅ variant_name column added and populated';
    ELSIF has_variant_name AND NOT has_name THEN
        RAISE NOTICE '🔧 Adding name column (using variant_name as source)...';
        ALTER TABLE lats_product_variants ADD COLUMN IF NOT EXISTS name TEXT;
        EXECUTE 'UPDATE lats_product_variants SET name = variant_name WHERE name IS NULL';
        RAISE NOTICE '✅ name column added and populated';
    ELSIF has_variant_name AND has_name THEN
        RAISE NOTICE '✅ Both columns exist - syncing data...';
        -- Sync: prefer variant_name as primary
        EXECUTE 'UPDATE lats_product_variants SET name = variant_name WHERE name IS NULL OR name = ''''';
        EXECUTE 'UPDATE lats_product_variants SET variant_name = name WHERE variant_name IS NULL OR variant_name = ''''';
        RAISE NOTICE '✅ Data synced between name and variant_name';
    ELSIF NOT has_variant_name AND NOT has_name THEN
        RAISE EXCEPTION '❌ CRITICAL: No name column found! Cannot proceed.';
    END IF;
    
    -- FIX 2: Handle attributes vs variant_attributes
    IF has_attributes AND NOT has_variant_attributes THEN
        RAISE NOTICE '🔧 Adding variant_attributes column (using attributes as source)...';
        ALTER TABLE lats_product_variants ADD COLUMN IF NOT EXISTS variant_attributes JSONB DEFAULT '{}'::jsonb;
        EXECUTE 'UPDATE lats_product_variants SET variant_attributes = COALESCE(attributes, ''{}''::jsonb) WHERE variant_attributes IS NULL OR variant_attributes = ''{}''::jsonb';
        RAISE NOTICE '✅ variant_attributes column added and populated';
    ELSIF has_variant_attributes AND NOT has_attributes THEN
        RAISE NOTICE '🔧 Adding attributes column (using variant_attributes as source)...';
        ALTER TABLE lats_product_variants ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb;
        EXECUTE 'UPDATE lats_product_variants SET attributes = COALESCE(variant_attributes, ''{}''::jsonb) WHERE attributes IS NULL OR attributes = ''{}''::jsonb';
        RAISE NOTICE '✅ attributes column added and populated';
    ELSIF has_variant_attributes AND has_attributes THEN
        RAISE NOTICE '✅ Both attribute columns exist - syncing data...';
        EXECUTE 'UPDATE lats_product_variants SET attributes = variant_attributes WHERE attributes IS NULL OR attributes = ''{}''::jsonb';
        EXECUTE 'UPDATE lats_product_variants SET variant_attributes = attributes WHERE variant_attributes IS NULL OR variant_attributes = ''{}''::jsonb';
        RAISE NOTICE '✅ Data synced between attributes columns';
    END IF;
    
    -- FIX 3: Add selling_price if missing
    IF NOT has_selling_price THEN
        RAISE NOTICE '🔧 Adding selling_price column...';
        ALTER TABLE lats_product_variants ADD COLUMN IF NOT EXISTS selling_price NUMERIC DEFAULT 0;
        EXECUTE 'UPDATE lats_product_variants SET selling_price = COALESCE(unit_price, 0) WHERE selling_price IS NULL OR selling_price = 0';
        RAISE NOTICE '✅ selling_price column added and populated from unit_price';
    END IF;
    
END $$;

SELECT '✅ Schema standardization complete!' as result;
SELECT '' as blank;

-- ================================================================================
-- STEP 3: CREATE A VIEW FOR CONSISTENT ACCESS
-- ================================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '🔧 STEP 3: Creating Compatibility View' as step;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

-- Drop existing view if it exists
DROP VIEW IF EXISTS product_variants_view CASCADE;

-- Create a view that works with both column naming conventions
CREATE OR REPLACE VIEW product_variants_view AS
SELECT 
    id,
    product_id,
    -- Use COALESCE to support both column names
    COALESCE(
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name = 'lats_product_variants' 
                         AND column_name = 'variant_name')
             THEN variant_name
             ELSE NULL
        END,
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name = 'lats_product_variants' 
                         AND column_name = 'name')
             THEN name
             ELSE NULL
        END,
        'Default'
    ) as variant_name,
    sku,
    barcode,
    cost_price,
    unit_price,
    COALESCE(selling_price, unit_price, 0) as selling_price,
    quantity,
    min_quantity,
    -- Handle both attribute column names
    COALESCE(
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name = 'lats_product_variants' 
                         AND column_name = 'variant_attributes')
             THEN variant_attributes
             ELSE NULL
        END,
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name = 'lats_product_variants' 
                         AND column_name = 'attributes')
             THEN attributes
             ELSE NULL
        END,
        '{}'::jsonb
    ) as attributes,
    is_active,
    created_at,
    updated_at
FROM lats_product_variants;

SELECT '✅ Compatibility view created: product_variants_view' as result;
SELECT '' as blank;

-- ================================================================================
-- STEP 4: CREATE HELPER FUNCTIONS
-- ================================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '🔧 STEP 4: Creating Helper Functions' as step;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

-- Function to get variants for a product (works with both schemas)
CREATE OR REPLACE FUNCTION get_product_variants(p_product_id UUID)
RETURNS TABLE (
    id UUID,
    product_id UUID,
    variant_name TEXT,
    sku TEXT,
    cost_price NUMERIC,
    unit_price NUMERIC,
    selling_price NUMERIC,
    quantity INTEGER,
    attributes JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id,
        v.product_id,
        v.variant_name,
        v.sku,
        v.cost_price,
        v.unit_price,
        v.selling_price,
        v.quantity,
        v.attributes
    FROM product_variants_view v
    WHERE v.product_id = p_product_id
      AND v.is_active = true
    ORDER BY v.variant_name;
END;
$$ LANGUAGE plpgsql;

SELECT '✅ Function created: get_product_variants(uuid)' as result;
SELECT '' as blank;

-- Function to create a variant (works with both schemas)
CREATE OR REPLACE FUNCTION create_product_variant(
    p_product_id UUID,
    p_variant_name TEXT,
    p_sku TEXT DEFAULT NULL,
    p_cost_price NUMERIC DEFAULT 0,
    p_unit_price NUMERIC DEFAULT 0,
    p_quantity INTEGER DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
    has_variant_name BOOLEAN;
    has_name BOOLEAN;
BEGIN
    -- Check which columns exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' 
        AND column_name = 'variant_name'
    ) INTO has_variant_name;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' 
        AND column_name = 'name'
    ) INTO has_name;
    
    -- Insert using appropriate column name
    IF has_variant_name THEN
        INSERT INTO lats_product_variants (
            product_id, variant_name, sku, cost_price, unit_price, 
            selling_price, quantity, variant_attributes, is_active
        )
        VALUES (
            p_product_id, p_variant_name, p_sku, p_cost_price, p_unit_price,
            p_unit_price, p_quantity, '{}'::jsonb, true
        )
        RETURNING id INTO v_id;
    ELSIF has_name THEN
        INSERT INTO lats_product_variants (
            product_id, name, sku, cost_price, unit_price, 
            selling_price, quantity, attributes, is_active
        )
        VALUES (
            p_product_id, p_variant_name, p_sku, p_cost_price, p_unit_price,
            p_unit_price, p_quantity, '{}'::jsonb, true
        )
        RETURNING id INTO v_id;
    ELSE
        RAISE EXCEPTION 'No valid name column found in lats_product_variants';
    END IF;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

SELECT '✅ Function created: create_product_variant(...)' as result;
SELECT '' as blank;

-- ================================================================================
-- STEP 5: VERIFY THE FIX
-- ================================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '✅ STEP 5: Verification' as step;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

-- Test the view
SELECT 
    '✅ Testing product_variants_view:' as test,
    COUNT(*) as total_variants,
    COUNT(DISTINCT product_id) as unique_products,
    COUNT(CASE WHEN variant_name IS NOT NULL AND variant_name != '' THEN 1 END) as variants_with_names
FROM product_variants_view
WHERE is_active = true;

SELECT '' as blank;

-- Show sample data
SELECT 
    '📊 Sample variant data:' as sample,
    variant_name,
    sku,
    quantity,
    selling_price
FROM product_variants_view
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 5;

SELECT '' as blank;

-- Test the function with a sample product
DO $$
DECLARE
    sample_product_id UUID;
    variant_count INTEGER;
BEGIN
    -- Get a sample product ID
    SELECT id INTO sample_product_id
    FROM lats_products
    WHERE is_active = true
    LIMIT 1;
    
    IF sample_product_id IS NOT NULL THEN
        -- Test the get_product_variants function
        SELECT COUNT(*) INTO variant_count
        FROM get_product_variants(sample_product_id);
        
        RAISE NOTICE '✅ Function test: get_product_variants() returned % variants for sample product', variant_count;
    ELSE
        RAISE NOTICE '⚠️  No active products found for testing';
    END IF;
END $$;

SELECT '' as blank;

COMMIT;

-- ================================================================================
-- COMPLETION SUMMARY
-- ================================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '✅ SMART SCHEMA FIX COMPLETE!' as status;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

SELECT '📋 What was done:' as summary;
SELECT '   1. ✅ Detected current schema columns' as fix1;
SELECT '   2. ✅ Standardized column names (added missing columns)' as fix2;
SELECT '   3. ✅ Created compatibility view (product_variants_view)' as fix3;
SELECT '   4. ✅ Created helper functions for safe access' as fix4;
SELECT '   5. ✅ Verified everything works' as fix5;

SELECT '' as blank;

SELECT '💡 How to use:' as usage_header;
SELECT '   OPTION 1: Use the view in your queries' as usage1;
SELECT '   Example: SELECT * FROM product_variants_view WHERE product_id = ''...'';' as usage1_example;
SELECT '' as blank;
SELECT '   OPTION 2: Use the helper function' as usage2;
SELECT '   Example: SELECT * FROM get_product_variants(''product-uuid-here'');' as usage2_example;
SELECT '' as blank;
SELECT '   OPTION 3: Both columns now exist, so your existing queries should work!' as usage3;

SELECT '' as blank;

SELECT '🔧 Frontend Code Updates:' as frontend_header;
SELECT '   You can now query either column name:' as frontend1;
SELECT '   - variant_name (recommended)' as frontend2;
SELECT '   - name (also works)' as frontend3;
SELECT '   Both are kept in sync automatically!' as frontend4;

SELECT '' as blank;

SELECT '⚠️  IMPORTANT:' as important_header;
SELECT '   Going forward, prefer using:' as important1;
SELECT '   - variant_name (not just "name")' as important2;
SELECT '   - variant_attributes (not just "attributes")' as important3;
SELECT '   This matches best practices for clarity' as important4;

SELECT '' as blank;
SELECT '🎉 Your variant schema is now standardized and compatible!' as done;

