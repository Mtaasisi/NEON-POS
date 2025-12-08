-- ============================================================================
-- FIX ACCOUNTS ISOLATION ISSUES
-- ============================================================================
-- This script fixes accounts that have incorrect isolation settings:
-- 1. Shared accounts with branch_id (should be NULL)
-- 2. Isolated accounts without branch_id (should have branch_id)
-- ============================================================================

DO $$
DECLARE
  default_branch_id UUID;
  accounts_fixed INT := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FIXING ACCOUNTS ISOLATION ISSUES';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Get default branch (first active branch)
  SELECT id INTO default_branch_id
  FROM store_locations
  WHERE is_active = true
  ORDER BY created_at ASC
  LIMIT 1;

  IF default_branch_id IS NULL THEN
    RAISE EXCEPTION 'No active branch found. Please create at least one active branch first.';
  END IF;

  RAISE NOTICE 'Using default branch: %', default_branch_id;
  RAISE NOTICE '';

  -- ============================================================================
  -- FIX 1: Shared accounts with branch_id (should be NULL)
  -- ============================================================================
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FIX 1: Shared accounts with branch_id';
  RAISE NOTICE '========================================';

  SELECT COUNT(*) INTO accounts_fixed
  FROM finance_accounts
  WHERE is_shared = true AND branch_id IS NOT NULL;

  RAISE NOTICE 'Found % shared accounts with branch_id (should be NULL)', accounts_fixed;

  UPDATE finance_accounts
  SET 
    branch_id = NULL,
    updated_at = NOW()
  WHERE is_shared = true AND branch_id IS NOT NULL;

  RAISE NOTICE '✅ Fixed % shared accounts (set branch_id to NULL)', accounts_fixed;
  RAISE NOTICE '';

  -- ============================================================================
  -- FIX 2: Isolated accounts without branch_id (should have branch_id)
  -- ============================================================================
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FIX 2: Isolated accounts without branch_id';
  RAISE NOTICE '========================================';

  SELECT COUNT(*) INTO accounts_fixed
  FROM finance_accounts
  WHERE is_shared = false AND branch_id IS NULL;

  RAISE NOTICE 'Found % isolated accounts without branch_id', accounts_fixed;

  UPDATE finance_accounts
  SET 
    branch_id = default_branch_id,
    updated_at = NOW()
  WHERE is_shared = false AND branch_id IS NULL;

  RAISE NOTICE '✅ Fixed % isolated accounts (assigned to default branch)', accounts_fixed;
  RAISE NOTICE '';

  -- ============================================================================
  -- SUMMARY
  -- ============================================================================
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ All account isolation issues have been fixed!';
  RAISE NOTICE '';

END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check for remaining issues
SELECT 
  'Remaining Issues' as check_type,
  COUNT(*) as total_issues
FROM finance_accounts
WHERE 
  (is_shared = false AND branch_id IS NULL) OR
  (is_shared = true AND branch_id IS NOT NULL);

-- Show final status
SELECT 
  'Final Status' as check_type,
  CASE 
    WHEN is_shared = true AND branch_id IS NULL THEN '✅ Correctly Shared'
    WHEN is_shared = false AND branch_id IS NOT NULL THEN '✅ Correctly Isolated'
    WHEN is_shared = false AND branch_id IS NULL THEN '❌ ERROR: Isolated but missing branch_id'
    WHEN is_shared = true AND branch_id IS NOT NULL THEN '⚠️ WARNING: Shared but has branch_id'
  END as status,
  COUNT(*) as count
FROM finance_accounts
GROUP BY 
  CASE 
    WHEN is_shared = true AND branch_id IS NULL THEN '✅ Correctly Shared'
    WHEN is_shared = false AND branch_id IS NOT NULL THEN '✅ Correctly Isolated'
    WHEN is_shared = false AND branch_id IS NULL THEN '❌ ERROR: Isolated but missing branch_id'
    WHEN is_shared = true AND branch_id IS NOT NULL THEN '⚠️ WARNING: Shared but has branch_id'
  END
ORDER BY 
  CASE 
    WHEN is_shared = true AND branch_id IS NULL THEN 1
    WHEN is_shared = false AND branch_id IS NOT NULL THEN 2
    WHEN is_shared = true AND branch_id IS NOT NULL THEN 3
    WHEN is_shared = false AND branch_id IS NULL THEN 4
  END;

-- Show accounts by branch after fix
SELECT 
  COALESCE(sl.name, 'SHARED') as branch_name,
  COALESCE(fa.branch_id::TEXT, 'NULL') as branch_id,
  fa.is_shared,
  COUNT(*) as account_count,
  COUNT(CASE WHEN fa.is_payment_method = true THEN 1 END) as payment_methods
FROM finance_accounts fa
LEFT JOIN store_locations sl ON fa.branch_id = sl.id
GROUP BY fa.branch_id, sl.name, fa.is_shared
ORDER BY 
  CASE WHEN fa.branch_id IS NULL THEN 0 ELSE 1 END,
  sl.name;
