-- ============================================================================
-- FIX: ASSIGN EXISTING DATA TO CURRENT BRANCH
-- ============================================================================
-- This script assigns existing products and suppliers to the current branch
-- Use this if you have existing data that needs to be assigned to a branch
-- 
-- IMPORTANT: Review the changes before applying!
-- You can modify the branch_id below to assign to a different branch
-- ============================================================================

-- ============================================================================
-- CONFIGURATION: Set your branch ID here
-- ============================================================================
DO $$
DECLARE
  target_branch_id UUID := '4cc81573-e86c-484b-a487-9d7a63a1b9e9'::UUID;
  products_updated INT := 0;
  suppliers_updated INT := 0;
  branch_exists BOOLEAN;
BEGIN
  -- Verify branch exists
  SELECT EXISTS(SELECT 1 FROM store_locations WHERE id = target_branch_id) INTO branch_exists;
  
  IF NOT branch_exists THEN
    RAISE EXCEPTION '❌ Branch % does not exist in store_locations! Please check the branch ID.', target_branch_id;
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ASSIGNING EXISTING DATA TO BRANCH';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Target Branch ID: %', target_branch_id;
  RAISE NOTICE '';
  
  -- ============================================================================
  -- OPTION 1: Assign products with NULL branch_id to target branch
  -- ============================================================================
  RAISE NOTICE '1. Assigning products with NULL branch_id to target branch...';
  
  UPDATE lats_products
  SET 
    branch_id = target_branch_id,
    is_shared = false,
    updated_at = now()
  WHERE branch_id IS NULL
    AND is_active = true;
  
  GET DIAGNOSTICS products_updated = ROW_COUNT;
  RAISE NOTICE '   ✅ Updated % products', products_updated;
  
  -- ============================================================================
  -- OPTION 2: Assign suppliers with NULL branch_id to target branch
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '2. Assigning suppliers with NULL branch_id to target branch...';
  
  UPDATE lats_suppliers
  SET 
    branch_id = target_branch_id,
    is_shared = false,
    updated_at = now()
  WHERE branch_id IS NULL
    AND is_active = true;
  
  GET DIAGNOSTICS suppliers_updated = ROW_COUNT;
  RAISE NOTICE '   ✅ Updated % suppliers', suppliers_updated;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ UPDATE COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Products updated: %', products_updated;
  RAISE NOTICE 'Suppliers updated: %', suppliers_updated;
  RAISE NOTICE '';
  RAISE NOTICE '💡 Refresh your application to see the changes!';
  
END $$;

-- ============================================================================
-- ALTERNATIVE: Make existing data SHARED instead of assigning to branch
-- ============================================================================
-- Uncomment the section below if you want to make existing products/suppliers
-- SHARED instead of assigning them to a specific branch
-- ============================================================================

/*
DO $$
DECLARE
  products_updated INT := 0;
  suppliers_updated INT := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MAKING EXISTING DATA SHARED';
  RAISE NOTICE '========================================';
  
  -- Make products with NULL branch_id shared
  UPDATE lats_products
  SET 
    branch_id = NULL,
    is_shared = true,
    updated_at = now()
  WHERE branch_id IS NULL
    AND is_active = true;
  
  GET DIAGNOSTICS products_updated = ROW_COUNT;
  RAISE NOTICE '   ✅ Made % products shared', products_updated;
  
  -- Make suppliers with NULL branch_id shared
  UPDATE lats_suppliers
  SET 
    branch_id = NULL,
    is_shared = true,
    updated_at = now()
  WHERE branch_id IS NULL
    AND is_active = true;
  
  GET DIAGNOSTICS suppliers_updated = ROW_COUNT;
  RAISE NOTICE '   ✅ Made % suppliers shared', suppliers_updated;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ UPDATE COMPLETE';
END $$;
*/
