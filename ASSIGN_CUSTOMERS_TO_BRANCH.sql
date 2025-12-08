-- ============================================================================
-- ASSIGN CUSTOMERS TO BRANCH (But Keep Them Shared)
-- ============================================================================
-- This script assigns all customers with NULL branch_id to a specific branch
-- But keeps is_shared = true so they're still visible across branches
-- ============================================================================

DO $$
DECLARE
  target_branch_id UUID := '4cc81573-e86c-484b-a487-9d7a63a1b9e9'::UUID;
  customers_updated INT := 0;
  branch_exists BOOLEAN;
BEGIN
  -- Verify branch exists
  SELECT EXISTS(SELECT 1 FROM store_locations WHERE id = target_branch_id) INTO branch_exists;
  
  IF NOT branch_exists THEN
    RAISE EXCEPTION '❌ Branch % does not exist in store_locations!', target_branch_id;
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ASSIGNING CUSTOMERS TO BRANCH';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Target Branch ID: %', target_branch_id;
  RAISE NOTICE '';
  RAISE NOTICE 'Note: Customers will be assigned to branch but kept as shared';
  RAISE NOTICE '(is_shared = true) so they remain visible across all branches';
  RAISE NOTICE '';
  
  -- Assign customers with NULL branch_id to target branch
  -- But keep is_shared = true
  UPDATE customers
  SET 
    branch_id = target_branch_id,
    is_shared = true,  -- Keep them shared
    updated_at = now()
  WHERE branch_id IS NULL;
  
  GET DIAGNOSTICS customers_updated = ROW_COUNT;
  RAISE NOTICE '✅ Assigned % customers to branch % (kept as shared)', customers_updated, target_branch_id;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ UPDATE COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Customers updated: %', customers_updated;
  RAISE NOTICE '';
  RAISE NOTICE '💡 Refresh your application to see the changes!';
  
END $$;
