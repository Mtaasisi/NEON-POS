-- ============================================================================
-- CORRECTED: add_imei_to_parent_variant Function
-- ============================================================================
-- This version fixes critical issues in your original function
-- ============================================================================

CREATE OR REPLACE FUNCTION add_imei_to_parent_variant(
    parent_id UUID,
    new_imei TEXT,
    sn TEXT DEFAULT NULL,
    cost_price NUMERIC DEFAULT NULL,
    selling_price NUMERIC DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    new_variant_id UUID;
    v_product_id UUID;
    v_parent_sku TEXT;
    v_duplicate_count INT;
BEGIN
    -- ========================================================================
    -- CRITICAL FIX #1: Check if parent exists and get product_id
    -- ========================================================================
    SELECT product_id, sku
    INTO v_product_id, v_parent_sku
    FROM lats_product_variants
    WHERE id = parent_id;

    IF v_product_id IS NULL THEN
        RAISE EXCEPTION 'Parent variant with id % not found', parent_id;
    END IF;

    -- ========================================================================
    -- CRITICAL FIX #2: Validate IMEI format
    -- ========================================================================
    IF new_imei !~ '^[0-9]{15}$' THEN
        RAISE EXCEPTION 'IMEI must be exactly 15 numeric digits. Provided: %', new_imei;
    END IF;

    -- ========================================================================
    -- CRITICAL FIX #3: Check for duplicate IMEI (uses 'attributes' not 'variant_attributes')
    -- ========================================================================
    SELECT COUNT(*) INTO v_duplicate_count
    FROM lats_product_variants
    WHERE variant_type = 'imei'
    AND (attributes->>'imei' = new_imei OR name = new_imei);

    IF v_duplicate_count > 0 THEN
        RAISE EXCEPTION 'IMEI % already exists in the system', new_imei;
    END IF;

    -- ========================================================================
    -- CRITICAL FIX #4: Insert child variant with ALL required fields
    -- ========================================================================
    INSERT INTO lats_product_variants(
        product_id,              -- CRITICAL: Must reference the same product as parent
        parent_variant_id,
        variant_type,
        attributes,              -- CRITICAL: Column is 'attributes', not 'variant_attributes'
        quantity,
        stock_quantity,          -- Good practice to keep in sync with quantity
        cost_price,
        selling_price,
        name,                    -- Use IMEI as name for easy identification
        sku,                     -- Generate SKU based on parent
        status,                  -- Set status for consistency
        is_active,
        created_at,
        updated_at
    ) VALUES (
        v_product_id,            -- FIXED: Now includes product_id
        parent_id,
        'imei',                  -- FIXED: Changed from 'imei_child' to 'imei' (standard convention)
        jsonb_build_object(
            'imei', new_imei,
            'imei_status', 'available',  -- FIXED: Changed from 'valid' to 'available'
            'serial_number', sn,
            'added_at', NOW()
        ),
        1,                       -- Each IMEI is 1 unit
        1,                       -- Stock quantity same as quantity
        COALESCE(cost_price, 0), -- Handle NULL prices
        COALESCE(selling_price, 0),
        new_imei,                -- FIXED: Use IMEI as name instead of generic text
        v_parent_sku || '-IMEI-' || new_imei,  -- FIXED: Generate proper SKU
        'active',                -- FIXED: Set explicit status
        true,
        NOW(),
        NOW()
    )
    RETURNING id INTO new_variant_id;

    -- ========================================================================
    -- Update parent quantity (same as your original)
    -- ========================================================================
    UPDATE lats_product_variants
    SET 
        quantity = (
            SELECT COUNT(*) 
            FROM lats_product_variants 
            WHERE parent_variant_id = parent_id
            AND variant_type = 'imei'
            AND is_active = true
        ),
        stock_quantity = (
            SELECT COUNT(*) 
            FROM lats_product_variants 
            WHERE parent_variant_id = parent_id
            AND variant_type = 'imei'
            AND is_active = true
        ),
        updated_at = NOW()
    WHERE id = parent_id;

    RAISE NOTICE 'Successfully added IMEI % as child of parent %', new_imei, parent_id;
    RETURN new_variant_id;
END$$ LANGUAGE plpgsql;

-- ============================================================================
-- EXPLANATION OF FIXES
-- ============================================================================

/*
CRITICAL ISSUES FIXED:

1. ❌ MISSING product_id
   ✅ FIXED: Now queries parent to get product_id and includes it in INSERT
   Why: Without product_id, the variant is orphaned and won't show up in product queries

2. ❌ WRONG COLUMN NAME: variant_attributes
   ✅ FIXED: Changed to 'attributes' (your actual column name)
   Why: variant_attributes doesn't exist in your schema

3. ❌ NO DUPLICATE CHECK
   ✅ FIXED: Added check for duplicate IMEIs before insert
   Why: Prevents data integrity issues and confusing errors

4. ❌ MISSING parent validation
   ✅ FIXED: Checks if parent exists before proceeding
   Why: Prevents foreign key errors and provides clear error messages

5. ❌ HARDCODED NAME: 'IMEI Child Variant'
   ✅ FIXED: Uses actual IMEI as name
   Why: Makes variants searchable and identifiable

6. ❌ NO SKU GENERATION
   ✅ FIXED: Generates SKU from parent SKU + IMEI
   Why: Each variant needs unique SKU for tracking

7. ❌ MISSING stock_quantity
   ✅ FIXED: Sets stock_quantity same as quantity
   Why: Many queries rely on stock_quantity field

8. ❌ MISSING status field
   ✅ FIXED: Sets status to 'active'
   Why: Status filtering is used throughout the system

9. ⚠️  VARIANT TYPE: 'imei_child'
   ✅ IMPROVED: Changed to 'imei' (standard convention)
   Why: Matches audit documentation and is more standard

10. ⚠️ IMEI STATUS: 'valid'
    ✅ IMPROVED: Changed to 'available'
    Why: 'available' vs 'sold' is clearer for inventory status
*/

-- ============================================================================
-- TESTING THE FUNCTION
-- ============================================================================

-- Test 1: Add IMEI to a parent variant (replace with your actual parent ID)
-- SELECT add_imei_to_parent_variant(
--     'your-parent-variant-id-here',
--     '123456789012345',
--     'SN123456',
--     800000,
--     1000000
-- );

-- Test 2: Try to add duplicate IMEI (should fail with clear error)
-- SELECT add_imei_to_parent_variant(
--     'your-parent-variant-id-here',
--     '123456789012345',  -- Same IMEI
--     'SN123457',
--     800000,
--     1000000
-- );

-- Test 3: Try with invalid IMEI (should fail with clear error)
-- SELECT add_imei_to_parent_variant(
--     'your-parent-variant-id-here',
--     '12345',  -- Only 5 digits
--     'SN123458',
--     800000,
--     1000000
-- );

-- Test 4: Verify parent quantity updated
-- SELECT 
--     id,
--     name,
--     variant_type,
--     quantity,
--     (SELECT COUNT(*) FROM lats_product_variants WHERE parent_variant_id = 'your-parent-id') as child_count
-- FROM lats_product_variants
-- WHERE id = 'your-parent-variant-id-here';

-- ============================================================================
-- COMPARISON: YOUR VERSION vs CORRECTED VERSION
-- ============================================================================

/*
YOUR VERSION:
  - Missing product_id → Child variant orphaned
  - Wrong column: variant_attributes → Would cause error
  - No duplicate check → Could insert duplicate IMEIs
  - No parent validation → Could fail with cryptic FK error
  - Hardcoded name → Not searchable by IMEI
  - No SKU → Tracking issues

CORRECTED VERSION:
  ✅ Includes product_id from parent
  ✅ Uses correct column: attributes
  ✅ Checks for duplicate IMEIs
  ✅ Validates parent exists
  ✅ Uses IMEI as name
  ✅ Generates proper SKU
  ✅ Sets all required fields
  ✅ Better error messages
  ✅ Handles NULL prices gracefully
*/

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- Run this after adding IMEIs to verify structure:
SELECT 
    pv.id,
    pv.product_id,
    pv.parent_variant_id,
    pv.variant_type,
    pv.name,
    pv.sku,
    pv.quantity,
    pv.attributes->>'imei' as imei,
    pv.attributes->>'imei_status' as imei_status,
    pv.attributes->>'serial_number' as serial_number,
    pv.is_active,
    p.name as product_name
FROM lats_product_variants pv
LEFT JOIN lats_products p ON p.id = pv.product_id
WHERE pv.variant_type = 'imei'
ORDER BY pv.created_at DESC
LIMIT 10;

