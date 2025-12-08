-- ============================================================================
-- CHECK IF PAYMENT ACCOUNTS ARE FETCHING BRANCH_ID
-- ============================================================================
-- This script verifies that finance_accounts queries return branch_id
-- ============================================================================

-- Check if branch_id column exists and has data
SELECT 
  'Column Check' as check_type,
  COUNT(*) as total_accounts,
  COUNT(branch_id) as accounts_with_branch_id,
  COUNT(CASE WHEN branch_id IS NULL AND is_shared = false THEN 1 END) as isolated_without_branch,
  COUNT(CASE WHEN branch_id IS NULL AND is_shared = true THEN 1 END) as shared_with_null_branch,
  COUNT(CASE WHEN branch_id IS NOT NULL THEN 1 END) as accounts_with_branch_id_value
FROM finance_accounts;

-- Sample accounts to verify branch_id is present
SELECT 
  id,
  name,
  type,
  branch_id,
  is_shared,
  is_active,
  is_payment_method,
  CASE 
    WHEN is_shared = true AND branch_id IS NULL THEN '✅ Shared (NULL branch_id is correct)'
    WHEN is_shared = false AND branch_id IS NOT NULL THEN '✅ Isolated (has branch_id)'
    WHEN is_shared = false AND branch_id IS NULL THEN '❌ Isolated but missing branch_id'
    ELSE '⚠️ Unexpected state'
  END as branch_status
FROM finance_accounts
ORDER BY is_shared, branch_id, name
LIMIT 20;

-- Check payment methods specifically
SELECT 
  'Payment Methods' as account_type,
  COUNT(*) as total,
  COUNT(branch_id) as with_branch_id,
  COUNT(CASE WHEN is_shared = true THEN 1 END) as shared,
  COUNT(CASE WHEN is_shared = false AND branch_id IS NOT NULL THEN 1 END) as isolated_with_branch
FROM finance_accounts
WHERE is_payment_method = true AND is_active = true;

-- Verify all columns that should be selected
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'finance_accounts'
  AND column_name IN ('id', 'name', 'branch_id', 'is_shared', 'is_active', 'is_payment_method')
ORDER BY column_name;
