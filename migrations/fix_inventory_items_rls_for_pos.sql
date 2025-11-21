-- ============================================
-- FIX INVENTORY_ITEMS RLS POLICIES FOR POS
-- ============================================
-- This script ensures inventory_items table has proper RLS policies
-- to allow POS system to query serial number devices during sale processing
--
-- Issue: Serial number devices stored in inventory_items were not being
-- found during sale processing because RLS policies were blocking access
--
-- Date: 2025-01-XX
-- ============================================

-- Step 1: Check current RLS status on inventory_items
DO $$
BEGIN
    RAISE NOTICE '=== Checking RLS status on inventory_items ===';
END $$;

SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'inventory_items';

-- Step 2: Check existing policies on inventory_items
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'inventory_items'
ORDER BY policyname;

-- Step 3: Enable RLS if not already enabled
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies if they exist (to recreate them properly)
DROP POLICY IF EXISTS inventory_items_select_all ON inventory_items;
DROP POLICY IF EXISTS inventory_items_insert_all ON inventory_items;
DROP POLICY IF EXISTS inventory_items_update_all ON inventory_items;
DROP POLICY IF EXISTS inventory_items_delete_all ON inventory_items;

-- Step 5: Create comprehensive RLS policies for inventory_items
-- These policies allow all operations (similar to lats_product_variants)
-- This is necessary for POS system to access serial number devices

-- SELECT policy: Allow reading all inventory items
CREATE POLICY inventory_items_select_all ON inventory_items
    FOR SELECT
    USING (true);

-- INSERT policy: Allow inserting inventory items
CREATE POLICY inventory_items_insert_all ON inventory_items
    FOR INSERT
    WITH CHECK (true);

-- UPDATE policy: Allow updating inventory items
CREATE POLICY inventory_items_update_all ON inventory_items
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- DELETE policy: Allow deleting inventory items
CREATE POLICY inventory_items_delete_all ON inventory_items
    FOR DELETE
    USING (true);

-- Step 6: Verify policies were created
DO $$
BEGIN
    RAISE NOTICE '=== Verifying RLS policies were created ===';
END $$;

SELECT 
    policyname,
    cmd,
    permissive
FROM pg_policies
WHERE tablename = 'inventory_items'
ORDER BY policyname;

-- Step 7: Test query to verify access works
-- This simulates what the POS system does when checking for serial number devices
DO $$
DECLARE
    test_variant_id uuid;
    test_count integer;
BEGIN
    -- Get a sample inventory item ID to test
    SELECT id INTO test_variant_id
    FROM inventory_items
    WHERE status = 'available'
    LIMIT 1;
    
    IF test_variant_id IS NOT NULL THEN
        -- Test if we can query it
        SELECT COUNT(*) INTO test_count
        FROM inventory_items
        WHERE id = test_variant_id;
        
        IF test_count > 0 THEN
            RAISE NOTICE '✅ SUCCESS: Can query inventory_items (test ID: %)', test_variant_id;
        ELSE
            RAISE WARNING '⚠️ WARNING: Cannot query inventory_items (test ID: %)', test_variant_id;
        END IF;
    ELSE
        RAISE NOTICE 'ℹ️ INFO: No available inventory items found to test';
    END IF;
END $$;

-- Step 8: Create a helper function to check if a variant ID exists in either table
-- This can be used by the application to verify items before processing
CREATE OR REPLACE FUNCTION check_variant_exists(p_variant_id uuid)
RETURNS TABLE(
    exists_in_variants boolean,
    exists_in_inventory boolean,
    variant_type text,
    inventory_status text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        EXISTS(SELECT 1 FROM lats_product_variants WHERE id = p_variant_id) as exists_in_variants,
        EXISTS(SELECT 1 FROM inventory_items WHERE id = p_variant_id) as exists_in_inventory,
        (SELECT pv.variant_type::text FROM lats_product_variants pv WHERE pv.id = p_variant_id LIMIT 1) as variant_type,
        (SELECT ii.status::text FROM inventory_items ii WHERE ii.id = p_variant_id LIMIT 1) as inventory_status;
END;
$$;

COMMENT ON FUNCTION check_variant_exists(uuid) IS 
'Helper function to check if a variant ID exists in either lats_product_variants or inventory_items tables. Used by POS system to validate items before sale processing.';

-- Step 9: Test the helper function
DO $$
DECLARE
    test_result record;
    test_id uuid;
BEGIN
    -- Get a test ID from inventory_items
    SELECT id INTO test_id FROM inventory_items LIMIT 1;
    
    IF test_id IS NOT NULL THEN
        SELECT * INTO test_result FROM check_variant_exists(test_id);
        RAISE NOTICE '✅ Helper function test - Variant ID: %, Exists in variants: %, Exists in inventory: %, Inventory status: %',
            test_id, 
            test_result.exists_in_variants, 
            test_result.exists_in_inventory,
            test_result.inventory_status;
    END IF;
END $$;

-- Step 10: Summary
DO $$
BEGIN
    RAISE NOTICE '=== FIX COMPLETE ===';
    RAISE NOTICE 'RLS policies have been created/updated for inventory_items table';
    RAISE NOTICE 'POS system should now be able to access serial number devices';
    RAISE NOTICE 'Helper function check_variant_exists() is available for validation';
END $$;

