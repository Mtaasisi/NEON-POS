-- ============================================================================
-- CHECK ACCOUNTS BRANCH ISOLATION
-- ============================================================================
-- This script verifies that accounts are properly isolated per branch
-- ============================================================================

-- ============================================================================
-- 1. OVERVIEW: Account Distribution by Branch
-- ============================================================================
SELECT 
  'Account Distribution' as check_type,
  COUNT(*) as total_accounts,
  COUNT(CASE WHEN is_shared = true THEN 1 END) as shared_accounts,
  COUNT(CASE WHEN is_shared = false THEN 1 END) as isolated_accounts,
  COUNT(CASE WHEN is_payment_method = true THEN 1 END) as payment_methods,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_accounts
FROM finance_accounts;

-- ============================================================================
-- 2. BRANCH ISOLATION STATUS
-- ============================================================================
SELECT 
  'Isolation Status' as check_type,
  CASE 
    WHEN is_shared = true AND branch_id IS NULL THEN '✅ Shared (NULL branch_id)'
    WHEN is_shared = false AND branch_id IS NOT NULL THEN '✅ Isolated (has branch_id)'
    WHEN is_shared = false AND branch_id IS NULL THEN '❌ Isolated but missing branch_id'
    WHEN is_shared = true AND branch_id IS NOT NULL THEN '⚠️ Shared but has branch_id (should be NULL)'
    ELSE '❓ Unknown state'
  END as isolation_status,
  COUNT(*) as count
FROM finance_accounts
GROUP BY isolation_status
ORDER BY 
  CASE isolation_status
    WHEN '✅ Shared (NULL branch_id)' THEN 1
    WHEN '✅ Isolated (has branch_id)' THEN 2
    WHEN '⚠️ Shared but has branch_id (should be NULL)' THEN 3
    WHEN '❌ Isolated but missing branch_id' THEN 4
    ELSE 5
  END;

-- ============================================================================
-- 3. ACCOUNTS BY BRANCH
-- ============================================================================
SELECT 
  COALESCE(branch_id::TEXT, 'SHARED (NULL)') as branch_id,
  COALESCE(sl.name, 'Shared Accounts') as branch_name,
  COUNT(*) as account_count,
  COUNT(CASE WHEN is_payment_method = true THEN 1 END) as payment_methods,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_accounts,
  COUNT(CASE WHEN is_shared = true THEN 1 END) as shared_count,
  COUNT(CASE WHEN is_shared = false THEN 1 END) as isolated_count
FROM finance_accounts fa
LEFT JOIN store_locations sl ON fa.branch_id = sl.id
GROUP BY fa.branch_id, sl.name
ORDER BY 
  CASE WHEN fa.branch_id IS NULL THEN 0 ELSE 1 END,
  sl.name;

-- ============================================================================
-- 4. DETAILED ACCOUNT LIST WITH ISOLATION STATUS
-- ============================================================================
SELECT 
  fa.id,
  fa.name,
  fa.type,
  fa.currency,
  fa.balance,
  COALESCE(fa.branch_id::TEXT, 'NULL') as branch_id,
  COALESCE(sl.name, 'SHARED') as branch_name,
  fa.is_shared,
  fa.is_payment_method,
  fa.is_active,
  CASE 
    WHEN fa.is_shared = true AND fa.branch_id IS NULL THEN '✅ Correctly Shared'
    WHEN fa.is_shared = false AND fa.branch_id IS NOT NULL THEN '✅ Correctly Isolated'
    WHEN fa.is_shared = false AND fa.branch_id IS NULL THEN '❌ ERROR: Isolated but missing branch_id'
    WHEN fa.is_shared = true AND fa.branch_id IS NOT NULL THEN '⚠️ WARNING: Shared but has branch_id'
    ELSE '❓ Unknown'
  END as isolation_status
FROM finance_accounts fa
LEFT JOIN store_locations sl ON fa.branch_id = sl.id
ORDER BY 
  fa.is_shared,
  fa.branch_id,
  fa.name;

-- ============================================================================
-- 5. ISSUES TO FIX
-- ============================================================================
SELECT 
  'Issues Found' as check_type,
  COUNT(*) as total_issues
FROM finance_accounts
WHERE 
  (is_shared = false AND branch_id IS NULL) OR  -- Isolated but missing branch_id
  (is_shared = true AND branch_id IS NOT NULL); -- Shared but has branch_id

-- Show accounts with issues
SELECT 
  'Accounts with Issues' as issue_type,
  id,
  name,
  type,
  CASE 
    WHEN is_shared = false AND branch_id IS NULL THEN 'Isolated but missing branch_id'
    WHEN is_shared = true AND branch_id IS NOT NULL THEN 'Shared but has branch_id (should be NULL)'
  END as issue,
  branch_id,
  is_shared
FROM finance_accounts
WHERE 
  (is_shared = false AND branch_id IS NULL) OR
  (is_shared = true AND branch_id IS NOT NULL)
ORDER BY issue, name;

-- ============================================================================
-- 6. PAYMENT METHODS ISOLATION CHECK
-- ============================================================================
SELECT 
  'Payment Methods Isolation' as check_type,
  COUNT(*) as total_payment_methods,
  COUNT(CASE WHEN is_shared = true THEN 1 END) as shared_payment_methods,
  COUNT(CASE WHEN is_shared = false AND branch_id IS NOT NULL THEN 1 END) as isolated_payment_methods,
  COUNT(CASE WHEN is_shared = false AND branch_id IS NULL THEN 1 END) as isolated_missing_branch_id
FROM finance_accounts
WHERE is_payment_method = true AND is_active = true;

-- ============================================================================
-- 7. SUMMARY BY BRANCH
-- ============================================================================
SELECT 
  COALESCE(sl.name, 'SHARED ACCOUNTS') as branch_name,
  COALESCE(fa.branch_id::TEXT, 'NULL') as branch_id,
  COUNT(*) as total_accounts,
  COUNT(CASE WHEN fa.type = 'cash' THEN 1 END) as cash_accounts,
  COUNT(CASE WHEN fa.type = 'bank' THEN 1 END) as bank_accounts,
  COUNT(CASE WHEN fa.type = 'mobile_money' THEN 1 END) as mobile_money_accounts,
  SUM(fa.balance) as total_balance,
  COUNT(CASE WHEN fa.is_payment_method = true THEN 1 END) as payment_methods
FROM finance_accounts fa
LEFT JOIN store_locations sl ON fa.branch_id = sl.id
WHERE fa.is_active = true
GROUP BY fa.branch_id, sl.name
ORDER BY 
  CASE WHEN fa.branch_id IS NULL THEN 0 ELSE 1 END,
  sl.name;
