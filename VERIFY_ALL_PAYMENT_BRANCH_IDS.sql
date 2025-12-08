-- ============================================================================
-- VERIFY ALL PAYMENT ACCOUNTS AND PAYMENTS HAVE BRANCH_ID
-- ============================================================================
-- This script checks the status of branch_id assignment for all payment-related tables
-- ============================================================================

SELECT 
  'finance_accounts' as table_name,
  COUNT(*) as total,
  COUNT(branch_id) as with_branch_id,
  COUNT(*) - COUNT(branch_id) as missing_branch_id,
  COUNT(CASE WHEN is_shared = true THEN 1 END) as shared_accounts,
  COUNT(CASE WHEN is_shared = false AND branch_id IS NOT NULL THEN 1 END) as isolated_with_branch
FROM finance_accounts;

SELECT 
  'customer_payments' as table_name,
  COUNT(*) as total,
  COUNT(branch_id) as with_branch_id,
  COUNT(*) - COUNT(branch_id) as missing_branch_id
FROM customer_payments;

SELECT 
  'purchase_order_payments' as table_name,
  COUNT(*) as total,
  COUNT(branch_id) as with_branch_id,
  COUNT(*) - COUNT(branch_id) as missing_branch_id
FROM purchase_order_payments;

SELECT 
  'payment_transactions' as table_name,
  COUNT(*) as total,
  COUNT(branch_id) as with_branch_id,
  COUNT(*) - COUNT(branch_id) as missing_branch_id
FROM payment_transactions;

SELECT 
  'account_transactions' as table_name,
  COUNT(*) as total,
  COUNT(branch_id) as with_branch_id,
  COUNT(*) - COUNT(branch_id) as missing_branch_id
FROM account_transactions;

-- Summary
SELECT 
  'SUMMARY' as status,
  (SELECT COUNT(*) FROM finance_accounts WHERE branch_id IS NULL AND is_shared = false) as finance_accounts_missing,
  (SELECT COUNT(*) FROM customer_payments WHERE branch_id IS NULL) as customer_payments_missing,
  (SELECT COUNT(*) FROM purchase_order_payments WHERE branch_id IS NULL) as po_payments_missing,
  (SELECT COUNT(*) FROM payment_transactions WHERE branch_id IS NULL) as payment_transactions_missing,
  (SELECT COUNT(*) FROM account_transactions WHERE branch_id IS NULL) as account_transactions_missing;
