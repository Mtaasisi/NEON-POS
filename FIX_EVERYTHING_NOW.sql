-- ============================================================================
-- FIX EVERYTHING NOW - Complete Data Assignment
-- ============================================================================
-- This script fixes ALL missing data issues at once:
-- 1. Assigns products with NULL branch_id to your branch
-- 2. Assigns suppliers with NULL branch_id to your branch
-- 3. Activates inactive products and suppliers
-- 4. Ensures proper branch isolation
-- 
-- Run this script to make products and suppliers appear in your UI
-- ============================================================================

DO $$
DECLARE
  target_branch_id UUID := '4cc81573-e86c-484b-a487-9d7a63a1b9e9'::UUID;
  products_updated INT := 0;
  products_activated INT := 0;
  suppliers_updated INT := 0;
  suppliers_activated INT := 0;
  branch_exists BOOLEAN;
BEGIN
  -- Verify branch exists
  SELECT EXISTS(SELECT 1 FROM store_locations WHERE id = target_branch_id) INTO branch_exists;
  
  IF NOT branch_exists THEN
    RAISE EXCEPTION '❌ Branch % does not exist in store_locations! Please check the branch ID.', target_branch_id;
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FIXING ALL DATA TO BRANCH';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Target Branch ID: %', target_branch_id;
  RAISE NOTICE '';
  
  -- ============================================================================
  -- FIX PRODUCTS
  -- ============================================================================
  RAISE NOTICE '1. FIXING PRODUCTS...';
  
  -- Assign products with NULL branch_id to target branch
  UPDATE lats_products
  SET 
    branch_id = target_branch_id,
    is_shared = false,
    updated_at = now()
  WHERE branch_id IS NULL
    AND is_active = true;
  
  GET DIAGNOSTICS products_updated = ROW_COUNT;
  RAISE NOTICE '   ✅ Assigned % products (NULL -> branch)', products_updated;
  
  -- Activate inactive products and assign to branch
  UPDATE lats_products
  SET 
    is_active = true,
    branch_id = COALESCE(branch_id, target_branch_id),
    is_shared = false,
    updated_at = now()
  WHERE is_active = false;
  
  GET DIAGNOSTICS products_activated = ROW_COUNT;
  RAISE NOTICE '   ✅ Activated and assigned % products', products_activated;
  
  -- ============================================================================
  -- FIX SUPPLIERS
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '2. FIXING SUPPLIERS...';
  
  -- Assign suppliers with NULL branch_id to target branch
  UPDATE lats_suppliers
  SET 
    branch_id = target_branch_id,
    is_shared = false,
    updated_at = now()
  WHERE branch_id IS NULL
    AND is_active = true;
  
  GET DIAGNOSTICS suppliers_updated = ROW_COUNT;
  RAISE NOTICE '   ✅ Assigned % suppliers (NULL -> branch)', suppliers_updated;
  
  -- Activate inactive suppliers and assign to branch
  UPDATE lats_suppliers
  SET 
    is_active = true,
    branch_id = COALESCE(branch_id, target_branch_id),
    is_shared = false,
    updated_at = now()
  WHERE is_active = false;
  
  GET DIAGNOSTICS suppliers_activated = ROW_COUNT;
  RAISE NOTICE '   ✅ Activated and assigned % suppliers', suppliers_activated;
  
  -- ============================================================================
  -- SUMMARY
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ FIX COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Products:';
  RAISE NOTICE '  - Assigned: %', products_updated;
  RAISE NOTICE '  - Activated: %', products_activated;
  RAISE NOTICE '  - Total fixed: %', products_updated + products_activated;
  RAISE NOTICE '';
  RAISE NOTICE 'Suppliers:';
  RAISE NOTICE '  - Assigned: %', suppliers_updated;
  RAISE NOTICE '  - Activated: %', suppliers_activated;
  RAISE NOTICE '  - Total fixed: %', suppliers_updated + suppliers_activated;
  RAISE NOTICE '';
  RAISE NOTICE '💡 Refresh your application to see the changes!';
  RAISE NOTICE '';
  RAISE NOTICE 'If suppliers/products still don''t appear:';
  RAISE NOTICE '  1. Check browser console for errors';
  RAISE NOTICE '  2. Verify branch settings in store_locations table';
  RAISE NOTICE '  3. Run CHECK_SUPPLIERS_STATUS.sql to diagnose';
  
END $$;
