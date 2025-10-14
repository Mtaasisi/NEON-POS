-- ============================================
-- CREATE TEST EXPENSE - Verify Spent Feature
-- ============================================
-- This creates a small test expense to demonstrate the "Spent" feature
-- Safe to run - only adds TSh 1,000 test expense to Cash account

-- ============================================
-- 1. ADD TEST EXPENSE TO CASH ACCOUNT
-- ============================================

INSERT INTO account_transactions (
  account_id,
  transaction_type,
  amount,
  description,
  reference_number,
  created_at
)
SELECT 
  id,
  'expense',
  1000,
  '🧪 TEST EXPENSE - Office supplies (you can delete this)',
  'TEST-EXPENSE-001',
  NOW()
FROM finance_accounts
WHERE name = 'Cash'
  AND is_payment_method = true
LIMIT 1
RETURNING 
  id as transaction_id,
  account_id,
  transaction_type,
  amount,
  description,
  '✅ Test expense created successfully!' as status;

-- ============================================
-- 2. VERIFY THE CHANGE
-- ============================================

SELECT '═══════════════════════════════════════════════════' as "═══════════════════════════════════════════════════";
SELECT '   VERIFICATION - Cash Account Updated' as "CHECK";
SELECT '═══════════════════════════════════════════════════' as "═══════════════════════════════════════════════════";

SELECT 
  fa.name as account_name,
  -- Received (Money IN)
  COALESCE(
    (SELECT SUM(amount) 
     FROM account_transactions 
     WHERE account_id = fa.id 
       AND transaction_type IN ('payment_received', 'transfer_in')),
    0
  ) as total_received,
  -- Spent (Money OUT)
  COALESCE(
    (SELECT SUM(amount) 
     FROM account_transactions 
     WHERE account_id = fa.id 
       AND transaction_type IN ('payment_made', 'expense', 'transfer_out')),
    0
  ) as total_spent,
  -- Calculated Balance
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
-- 3. SHOW RECENT CASH TRANSACTIONS
-- ============================================

SELECT '═══════════════════════════════════════════════════' as "═══════════════════════════════════════════════════";
SELECT '   Recent Cash Transactions (Last 5)' as "CHECK";
SELECT '═══════════════════════════════════════════════════' as "═══════════════════════════════════════════════════";

SELECT 
  transaction_type,
  amount,
  description,
  reference_number,
  CASE 
    WHEN transaction_type IN ('payment_received', 'transfer_in') THEN '📈 IN'
    WHEN transaction_type IN ('payment_made', 'expense', 'transfer_out') THEN '📉 OUT'
    ELSE '⚠️'
  END as direction,
  created_at
FROM account_transactions
WHERE account_id = (
  SELECT id FROM finance_accounts 
  WHERE name = 'Cash' AND is_payment_method = true 
  LIMIT 1
)
ORDER BY created_at DESC
LIMIT 5;

-- ============================================
-- 4. SUMMARY & NEXT STEPS
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '   ✅ TEST EXPENSE CREATED SUCCESSFULLY!';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 What was created:';
  RAISE NOTICE '   - Account: Cash';
  RAISE NOTICE '   - Type: expense';
  RAISE NOTICE '   - Amount: TSh 1,000';
  RAISE NOTICE '   - Description: TEST EXPENSE - Office supplies';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Expected Results in Payment Accounts Page:';
  RAISE NOTICE '   Cash Account:';
  RAISE NOTICE '   - Received: TSh 58,924.50 (unchanged)';
  RAISE NOTICE '   - Spent: TSh 1,000 ⭐ NOW SHOWING!';
  RAISE NOTICE '   - Balance: TSh 57,924.50 (decreased by 1,000)';
  RAISE NOTICE '';
  RAISE NOTICE '📋 NEXT STEPS:';
  RAISE NOTICE '   1. Open your POS app';
  RAISE NOTICE '   2. Go to Finance → Payment Accounts';
  RAISE NOTICE '   3. Click the "Refresh" button';
  RAISE NOTICE '   4. Look at the Cash account card';
  RAISE NOTICE '   5. Verify "Spent: TSh 1,000" is now displayed ✅';
  RAISE NOTICE '';
  RAISE NOTICE '🗑️  TO REMOVE THIS TEST TRANSACTION:';
  RAISE NOTICE '   DELETE FROM account_transactions';
  RAISE NOTICE '   WHERE reference_number = ''TEST-EXPENSE-001'';';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;

