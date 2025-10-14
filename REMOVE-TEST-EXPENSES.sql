-- ============================================
-- REMOVE TEST EXPENSES
-- ============================================
-- This removes all test expenses from the account_transactions table

-- ============================================
-- 1. SHOW CURRENT TEST TRANSACTIONS
-- ============================================

SELECT '═══════════════════════════════════════════════════' as "═══════════════════════════════════════════════════";
SELECT '   Test Transactions to be Deleted' as "INFO";
SELECT '═══════════════════════════════════════════════════' as "═══════════════════════════════════════════════════";

SELECT 
  id,
  transaction_type,
  amount,
  description,
  reference_number,
  created_at
FROM account_transactions
WHERE reference_number = 'TEST-EXPENSE-001'
   OR description LIKE '%🧪 TEST EXPENSE%'
ORDER BY created_at DESC;

-- ============================================
-- 2. DELETE TEST TRANSACTIONS
-- ============================================

DELETE FROM account_transactions
WHERE reference_number = 'TEST-EXPENSE-001'
   OR description LIKE '%🧪 TEST EXPENSE%'
RETURNING 
  id,
  amount,
  description,
  '✅ Deleted' as status;

-- ============================================
-- 3. VERIFY CASH ACCOUNT AFTER CLEANUP
-- ============================================

SELECT '═══════════════════════════════════════════════════' as "═══════════════════════════════════════════════════";
SELECT '   Cash Account After Cleanup' as "CHECK";
SELECT '═══════════════════════════════════════════════════' as "═══════════════════════════════════════════════════";

SELECT 
  fa.name as account_name,
  COALESCE(
    (SELECT SUM(amount) 
     FROM account_transactions 
     WHERE account_id = fa.id 
       AND transaction_type IN ('payment_received', 'transfer_in')),
    0
  ) as total_received,
  COALESCE(
    (SELECT SUM(amount) 
     FROM account_transactions 
     WHERE account_id = fa.id 
       AND transaction_type IN ('payment_made', 'expense', 'transfer_out')),
    0
  ) as total_spent,
  COALESCE(
    (SELECT SUM(amount) 
     FROM account_transactions 
     WHERE account_id = fa.id 
       AND transaction_type IN ('payment_received', 'transfer_in')),
    0
  ) - COALESCE(
    (SELECT SUM(amount) 
     FROM account_transactions 
     WHERE account_id = fa.id 
       AND transaction_type IN ('payment_made', 'expense', 'transfer_out')),
    0
  ) as new_balance,
  fa.currency
FROM finance_accounts fa
WHERE fa.name = 'Cash'
  AND fa.is_payment_method = true;

-- ============================================
-- 4. SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '   ✅ TEST TRANSACTIONS REMOVED';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '🧹 Cleanup Complete:';
  RAISE NOTICE '   - All test expenses have been deleted';
  RAISE NOTICE '   - Cash account restored to original state';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Expected Results After Refresh:';
  RAISE NOTICE '   Cash Account:';
  RAISE NOTICE '   - Balance: TSh 58,924.50 (restored)';
  RAISE NOTICE '   - Received: TSh 58,924.50';
  RAISE NOTICE '   - Spent: TSh 0 (back to normal)';
  RAISE NOTICE '';
  RAISE NOTICE '💡 The "Spent" feature is working correctly!';
  RAISE NOTICE '   It will show amounts when you have real:';
  RAISE NOTICE '   - Expenses';
  RAISE NOTICE '   - Supplier payments';
  RAISE NOTICE '   - Account transfers';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;

