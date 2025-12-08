-- ============================================================================
-- CHECK AND FIX BRANCH SETTINGS
-- ============================================================================
-- This script checks branch isolation settings and provides options to fix them
-- ============================================================================

-- ============================================================================
-- 1. CHECK CURRENT BRANCH SETTINGS
-- ============================================================================
DO $$
DECLARE
  branch_record RECORD;
  current_branch_id UUID := '4cc81573-e86c-484b-a487-9d7a63a1b9e9'::UUID;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CURRENT BRANCH SETTINGS';
  RAISE NOTICE '========================================';
  
  SELECT * INTO branch_record
  FROM store_locations
  WHERE id = current_branch_id;
  
  IF branch_record IS NULL THEN
    RAISE EXCEPTION '❌ Branch % not found!', current_branch_id;
  END IF;
  
  RAISE NOTICE 'Branch: %', branch_record.name;
  RAISE NOTICE 'Isolation Mode: %', branch_record.data_isolation_mode;
  RAISE NOTICE '';
  RAISE NOTICE 'Share Flags:';
  RAISE NOTICE '  share_products: %', branch_record.share_products;
  RAISE NOTICE '  share_suppliers: %', branch_record.share_suppliers;
  RAISE NOTICE '  share_customers: %', branch_record.share_customers;
  RAISE NOTICE '  share_inventory: %', branch_record.share_inventory;
  RAISE NOTICE '';
  
  -- Analysis
  IF branch_record.data_isolation_mode = 'hybrid' THEN
    RAISE NOTICE 'Analysis:';
    IF NOT branch_record.share_products THEN
      RAISE NOTICE '  ⚠️ Products are NOT shared - only products with branch_id = % will show', current_branch_id;
    ELSE
      RAISE NOTICE '  ✅ Products are shared - all products will show';
    END IF;
    
    IF NOT branch_record.share_suppliers THEN
      RAISE NOTICE '  ⚠️ Suppliers are NOT shared - only suppliers with branch_id = % will show', current_branch_id;
    ELSE
      RAISE NOTICE '  ✅ Suppliers are shared - all suppliers will show';
    END IF;
  END IF;
  
END $$;

-- ============================================================================
-- 2. OPTION: Make products shared in hybrid mode
-- ============================================================================
-- Uncomment this section if you want to make products shared
/*
DO $$
DECLARE
  current_branch_id UUID := '4cc81573-e86c-484b-a487-9d7a63a1b9e9'::UUID;
BEGIN
  UPDATE store_locations
  SET share_products = true
  WHERE id = current_branch_id;
  
  RAISE NOTICE '✅ Updated share_products to true for branch %', current_branch_id;
END $$;
*/

-- ============================================================================
-- 3. OPTION: Make suppliers shared in hybrid mode
-- ============================================================================
-- Uncomment this section if you want to make suppliers shared
/*
DO $$
DECLARE
  current_branch_id UUID := '4cc81573-e86c-484b-a487-9d7a63a1b9e9'::UUID;
BEGIN
  UPDATE store_locations
  SET share_suppliers = true
  WHERE id = current_branch_id;
  
  RAISE NOTICE '✅ Updated share_suppliers to true for branch %', current_branch_id;
END $$;
*/

-- ============================================================================
-- 4. OPTION: Switch to shared mode (all data shared)
-- ============================================================================
-- Uncomment this section if you want to switch to shared mode
/*
DO $$
DECLARE
  current_branch_id UUID := '4cc81573-e86c-484b-a487-9d7a63a1b9e9'::UUID;
BEGIN
  UPDATE store_locations
  SET data_isolation_mode = 'shared'
  WHERE id = current_branch_id;
  
  RAISE NOTICE '✅ Switched branch % to shared mode', current_branch_id;
END $$;
*/
