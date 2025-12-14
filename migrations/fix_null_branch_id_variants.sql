-- ============================================================================
-- Fix NULL branch_id in lats_product_variants
-- ============================================================================
-- This migration fixes products/variants that don't have a branch_id assigned
-- by assigning them to the main branch
-- ============================================================================

DO $$
DECLARE
    v_main_branch_id UUID;
    v_affected_products INT;
    v_affected_variants INT;
BEGIN
    RAISE NOTICE '🔧 Starting fix for NULL branch_id in variants...';
    
    -- Get the main branch ID
    SELECT id INTO v_main_branch_id
    FROM store_locations
    WHERE is_main = true
    LIMIT 1;
    
    -- If no main branch exists, get the first active branch
    IF v_main_branch_id IS NULL THEN
        SELECT id INTO v_main_branch_id
        FROM store_locations
        WHERE is_active = true
        ORDER BY created_at ASC
        LIMIT 1;
    END IF;
    
    -- If still no branch found, raise an error
    IF v_main_branch_id IS NULL THEN
        RAISE EXCEPTION 'No store location found. Please create at least one store location first.';
    END IF;
    
    RAISE NOTICE '✅ Using branch: % as default', v_main_branch_id;
    
    -- First, fix products with NULL branch_id
    UPDATE lats_products
    SET branch_id = v_main_branch_id
    WHERE branch_id IS NULL;
    
    GET DIAGNOSTICS v_affected_products = ROW_COUNT;
    RAISE NOTICE '✅ Fixed % products with NULL branch_id', v_affected_products;
    
    -- Then, fix variants with NULL branch_id
    UPDATE lats_product_variants
    SET branch_id = v_main_branch_id
    WHERE branch_id IS NULL;
    
    GET DIAGNOSTICS v_affected_variants = ROW_COUNT;
    RAISE NOTICE '✅ Fixed % variants with NULL branch_id', v_affected_variants;
    
    -- Also fix any variants whose parent product has a branch_id but the variant doesn't match
    UPDATE lats_product_variants v
    SET branch_id = p.branch_id
    FROM lats_products p
    WHERE v.product_id = p.id
    AND v.branch_id IS DISTINCT FROM p.branch_id
    AND p.branch_id IS NOT NULL;
    
    GET DIAGNOSTICS v_affected_variants = ROW_COUNT;
    RAISE NOTICE '✅ Synchronized % variants with their product branch_id', v_affected_variants;
    
    RAISE NOTICE '🎉 Migration completed successfully!';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error: %', SQLERRM;
    RAISE;
END $$;

-- ============================================================================
-- Verify the fix
-- ============================================================================

-- Check for any remaining NULL branch_id values
DO $$
DECLARE
    v_null_products INT;
    v_null_variants INT;
BEGIN
    SELECT COUNT(*) INTO v_null_products
    FROM lats_products
    WHERE branch_id IS NULL;
    
    SELECT COUNT(*) INTO v_null_variants
    FROM lats_product_variants
    WHERE branch_id IS NULL;
    
    RAISE NOTICE '📊 Verification Results:';
    RAISE NOTICE '   - Products with NULL branch_id: %', v_null_products;
    RAISE NOTICE '   - Variants with NULL branch_id: %', v_null_variants;
    
    IF v_null_products > 0 OR v_null_variants > 0 THEN
        RAISE WARNING '⚠️  There are still records with NULL branch_id!';
    ELSE
        RAISE NOTICE '✅ All records have valid branch_id values!';
    END IF;
END $$;

-- ============================================================================
-- Add a default value for future inserts
-- ============================================================================

-- Update the lats_products table to have a default branch_id
-- (using a function to get the main branch)
CREATE OR REPLACE FUNCTION get_default_branch_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_branch_id UUID;
BEGIN
    -- Try to get the main branch
    SELECT id INTO v_branch_id
    FROM store_locations
    WHERE is_main = true AND is_active = true
    LIMIT 1;
    
    -- If no main branch, get any active branch
    IF v_branch_id IS NULL THEN
        SELECT id INTO v_branch_id
        FROM store_locations
        WHERE is_active = true
        ORDER BY created_at ASC
        LIMIT 1;
    END IF;
    
    RETURN v_branch_id;
END;
$$;

COMMENT ON FUNCTION get_default_branch_id() IS 
'Returns the default branch_id (main branch or first active branch)';

-- Note: We don't set this as DEFAULT on the column because it would be called
-- for every insert, which is inefficient. Instead, the application should
-- always provide a branch_id explicitly.

-- Final success message
DO $$
BEGIN
    RAISE NOTICE '✅ Migration completed! All products and variants now have a branch_id.';
END $$;

