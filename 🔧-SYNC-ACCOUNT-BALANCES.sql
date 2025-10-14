-- ============================================
-- 🔧 SYNC ACCOUNT BALANCES
-- Updates database balances to match transaction history
-- ============================================

-- Show current mismatches
SELECT '═══════════════════════════════════════════════' as "═══════════════════════════════════════════════";
SELECT '   BEFORE: Account Balance Mismatches' as "STATUS";
SELECT '═══════════════════════════════════════════════' as "═══════════════════════════════════════════════";

SELECT 
  fa.name,
  fa.balance as db_balance,
  COALESCE(
    (SELECT SUM(amount) FROM account_transactions 
     WHERE account_id = fa.id AND transaction_type IN ('payment_received', 'transfer_in')),
    0
  ) - COALESCE(
    (SELECT SUM(amount) FROM account_transactions 
     WHERE account_id = fa.id AND transaction_type IN ('payment_made', 'expense', 'transfer_out')),
    0
  ) as calculated_balance,
  CASE 
    WHEN fa.balance != (
      COALESCE((SELECT SUM(amount) FROM account_transactions WHERE account_id = fa.id AND transaction_type IN ('payment_received', 'transfer_in')), 0) -
      COALESCE((SELECT SUM(amount) FROM account_transactions WHERE account_id = fa.id AND transaction_type IN ('payment_made', 'expense', 'transfer_out')), 0)
    ) THEN '⚠️ NEEDS UPDATE'
    ELSE '✅ OK'
  END as status
FROM finance_accounts fa
WHERE fa.is_active = true
ORDER BY fa.name;

-- Update all account balances based on transactions
UPDATE finance_accounts fa
SET 
  balance = (
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
    )
  ),
  updated_at = NOW()
WHERE fa.is_active = true;

-- Show results after update
SELECT '═══════════════════════════════════════════════' as "═══════════════════════════════════════════════";
SELECT '   AFTER: Updated Account Balances' as "STATUS";
SELECT '═══════════════════════════════════════════════' as "═══════════════════════════════════════════════";

SELECT 
  fa.name,
  fa.type,
  fa.balance as updated_balance,
  fa.currency,
  CASE 
    WHEN fa.balance > 0 THEN '✅ HAS BALANCE'
    WHEN fa.balance = 0 THEN '⚪ ZERO BALANCE'
    ELSE '⚠️ NEGATIVE'
  END as status,
  fa.is_active,
  fa.is_payment_method
FROM finance_accounts fa
ORDER BY fa.balance DESC;

-- Show summary
SELECT '═══════════════════════════════════════════════' as "═══════════════════════════════════════════════";
SELECT '   SUMMARY' as "STATUS";
SELECT '═══════════════════════════════════════════════' as "═══════════════════════════════════════════════";

SELECT 
  'Total Accounts Updated' as metric,
  COUNT(*)::TEXT as value
FROM finance_accounts
WHERE is_active = true
UNION ALL
SELECT 
  'Total Balance (TZS)',
  TO_CHAR(SUM(balance), 'FM999,999,999,999')
FROM finance_accounts
WHERE is_active = true AND currency = 'TZS'
UNION ALL
SELECT 
  'Accounts with Balance',
  COUNT(*)::TEXT
FROM finance_accounts
WHERE is_active = true AND balance > 0;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Account balances have been synchronized!';
  RAISE NOTICE '✅ All balances now match transaction history';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Refresh your browser';
  RAISE NOTICE '2. Check Payment Accounts tab';
  RAISE NOTICE '3. Verify balances are no longer TSh 0';
  RAISE NOTICE '';
END $$;

