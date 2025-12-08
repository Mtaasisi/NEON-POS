-- ============================================================================
-- FIX ALL PRODUCTS TO CURRENT BRANCH
-- ============================================================================
-- This script assigns ALL active products to your current branch
-- Use this if products are not showing up in your UI
-- ============================================================================

DO $$
DECLARE
  target_branch_id UUID := '4cc81573-e86c-484b-a487-9d7a63a1b9e9'::UUID;
  products_updated INT := 0;
  products_activated INT := 0;
  branch_exists BOOLEAN;
BEGIN
  -- Verify branch exists
  SELECT EXISTS(SELECT 1 FROM store_locations WHERE id = target_branch_id) INTO branch_exists;
  
  IF NOT branch_exists THEN
    RAISE EXCEPTION '❌ Branch % does not exist in store_locations! Please check the branch ID.', target_branch_id;
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FIXING ALL PRODUCTS TO BRANCH';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Target Branch ID: %', target_branch_id;
  RAISE NOTICE '';
  
  -- Option 1: Assign products with NULL branch_id to target branch
  RAISE NOTICE '1. Assigning products with NULL branch_id to target branch...';
  
  UPDATE lats_products
  SET 
    branch_id = target_branch_id,
    is_shared = false,
    updated_at = now()
  WHERE branch_id IS NULL
    AND is_active = true;
  
  GET DIAGNOSTICS products_updated = ROW_COUNT;
  RAISE NOTICE '   ✅ Updated % products (NULL -> branch)', products_updated;
  
  -- Option 2: Activate inactive products and assign to branch
  RAISE NOTICE '';
  RAISE NOTICE '2. Activating and assigning inactive products...';
  
  UPDATE lats_products
  SET 
    is_active = true,
    branch_id = COALESCE(branch_id, target_branch_id),
    is_shared = false,
    updated_at = now()
  WHERE is_active = false;
  
  GET DIAGNOSTICS products_activated = ROW_COUNT;
  RAISE NOTICE '   ✅ Activated and assigned % products', products_activated;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ UPDATE COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Products updated: %', products_updated;
  RAISE NOTICE 'Products activated: %', products_activated;
  RAISE NOTICE 'Total products now in branch: %', products_updated + products_activated;
  RAISE NOTICE '';
  RAISE NOTICE '💡 Refresh your application to see the changes!';
  
END $$;
