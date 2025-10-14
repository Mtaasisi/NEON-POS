-- ============================================
-- PAYMENT ACCOUNT TRANSACTIONS DIAGNOSTICS
-- ============================================
-- This script helps diagnose why "Spent" amounts show TSh 0
-- and verifies transaction types in the account_transactions table

-- ============================================
-- 1. CHECK ALL TRANSACTION TYPES IN DATABASE
-- ============================================

SELECT '═══════════════════════════════════════════════════' as "═══════════════════════════════════════════════════";
SELECT '   TRANSACTION TYPES CURRENTLY IN DATABASE' as "CHECK";
SELECT '═══════════════════════════════════════════════════' as "═══════════════════════════════════════════════════";

SELECT 
  transaction_type,
  COUNT(*) as count,
  SUM(amount) as total_amount,
  CASE 
    WHEN transaction_type IN ('payment_received', 'transfer_in') THEN '📈 Money IN'
    WHEN transaction_type IN ('payment_made', 'expense', 'transfer_out') THEN '📉 Money OUT'
    ELSE '⚠️ Unknown'
  END as flow_direction
FROM account_transactions
GROUP BY transaction_type
ORDER BY count DESC;

-- ============================================
-- 2. CHECK TRANSACTIONS PER ACCOUNT
-- ============================================

SELECT '═══════════════════════════════════════════════════' as "═══════════════════════════════════════════════════";
SELECT '   TRANSACTIONS BY ACCOUNT' as "CHECK";
SELECT '═══════════════════════════════════════════════════' as "═══════════════════════════════════════════════════";

SELECT 
  fa.name as account_name,
  fa.type as account_type,
  at.transaction_type,
  COUNT(*) as transaction_count,
  SUM(at.amount) as total_amount,
  fa.currency
FROM finance_accounts fa
LEFT JOIN account_transactions at ON fa.id = at.account_id
WHERE fa.is_payment_method = true
  AND fa.is_active = true
GROUP BY fa.name, fa.type, at.transaction_type, fa.currency
ORDER BY fa.name, at.transaction_type;

-- ============================================
-- 3. CALCULATE RECEIVED VS SPENT BY ACCOUNT
-- ============================================

SELECT '═══════════════════════════════════════════════════' as "═══════════════════════════════════════════════════";
SELECT '   RECEIVED vs SPENT SUMMARY' as "CHECK";
SELECT '═══════════════════════════════════════════════════' as "═══════════════════════════════════════════════════";

SELECT 
  fa.name as account_name,
  fa.type as account_type,
  fa.currency,
  -- Money IN (Received)
  COALESCE(
    (SELECT SUM(amount) 
     FROM account_transactions 
     WHERE account_id = fa.id 
       AND transaction_type IN ('payment_received', 'transfer_in')),
    0
  ) as total_received,
  -- Money OUT (Spent)
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
  ) as calculated_balance,
  -- Database Balance
  fa.balance as db_balance,
  -- Transaction Count
  (SELECT COUNT(*) FROM account_transactions WHERE account_id = fa.id) as total_transactions
FROM finance_accounts fa
WHERE fa.is_payment_method = true
  AND fa.is_active = true
ORDER BY fa.name;

-- ============================================
-- 4. RECENT TRANSACTIONS (Last 20)
-- ============================================

SELECT '═══════════════════════════════════════════════════' as "═══════════════════════════════════════════════════";
SELECT '   RECENT TRANSACTIONS (Last 20)' as "CHECK";
SELECT '═══════════════════════════════════════════════════' as "═══════════════════════════════════════════════════";

SELECT 
  fa.name as account_name,
  at.transaction_type,
  at.amount,
  at.description,
  at.reference_number,
  at.balance_before,
  at.balance_after,
  CASE 
    WHEN at.transaction_type IN ('payment_received', 'transfer_in') THEN '📈 IN'
    WHEN at.transaction_type IN ('payment_made', 'expense', 'transfer_out') THEN '📉 OUT'
    ELSE '⚠️'
  END as direction,
  at.created_at
FROM account_transactions at
JOIN finance_accounts fa ON at.account_id = fa.id
WHERE fa.is_payment_method = true
ORDER BY at.created_at DESC
LIMIT 20;

-- ============================================
-- 5. CHECK FOR MISSING SPENT TRANSACTIONS
-- ============================================

SELECT '═══════════════════════════════════════════════════' as "═══════════════════════════════════════════════════";
SELECT '   MISSING SPENT TRANSACTIONS?' as "CHECK";
SELECT '═══════════════════════════════════════════════════' as "═══════════════════════════════════════════════════";

SELECT 
  COUNT(*) FILTER (WHERE transaction_type IN ('payment_made', 'expense', 'transfer_out')) as spent_transaction_count,
  COALESCE(SUM(amount) FILTER (WHERE transaction_type IN ('payment_made', 'expense', 'transfer_out')), 0) as total_spent_amount,
  CASE 
    WHEN COUNT(*) FILTER (WHERE transaction_type IN ('payment_made', 'expense', 'transfer_out')) = 0 THEN 
      '⚠️ NO OUTGOING TRANSACTIONS - This is why "Spent" shows TSh 0'
    ELSE 
      '✅ Outgoing transactions exist'
  END as status
FROM account_transactions;

-- ============================================
-- 6. SUPPORTED TRANSACTION TYPES
-- ============================================

SELECT '═══════════════════════════════════════════════════' as "═══════════════════════════════════════════════════";
SELECT '   SUPPORTED TRANSACTION TYPES' as "INFO";
SELECT '═══════════════════════════════════════════════════' as "═══════════════════════════════════════════════════";

SELECT 
  transaction_type,
  description,
  affects_balance
FROM (
  VALUES 
    ('payment_received', 'Money received from sales/payments', '+ Increases'),
    ('transfer_in', 'Money transferred into account', '+ Increases'),
    ('payment_made', 'Payment sent to supplier/vendor', '- Decreases'),
    ('expense', 'Business expense paid', '- Decreases'),
    ('transfer_out', 'Money transferred out of account', '- Decreases'),
    ('adjustment', 'Manual balance adjustment', '± Varies')
) AS transaction_types(transaction_type, description, affects_balance);

-- ============================================
-- 7. SUMMARY MESSAGE
-- ============================================

DO $$
DECLARE
  v_spent_count INTEGER;
  v_received_count INTEGER;
BEGIN
  SELECT 
    COUNT(*) FILTER (WHERE transaction_type IN ('payment_made', 'expense', 'transfer_out')),
    COUNT(*) FILTER (WHERE transaction_type IN ('payment_received', 'transfer_in'))
  INTO v_spent_count, v_received_count
  FROM account_transactions;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '   DIAGNOSIS SUMMARY';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Total Received Transactions: %', v_received_count;
  RAISE NOTICE '📊 Total Spent Transactions: %', v_spent_count;
  RAISE NOTICE '';
  
  IF v_spent_count = 0 THEN
    RAISE NOTICE '⚠️  WHY "Spent" SHOWS TSh 0:';
    RAISE NOTICE '    You have NO outgoing transactions in your database.';
    RAISE NOTICE '';
    RAISE NOTICE '💡 TO CREATE SPENT TRANSACTIONS:';
    RAISE NOTICE '    1. Record expenses through the Expenses module';
    RAISE NOTICE '    2. Make payments to suppliers (Purchase Orders)';
    RAISE NOTICE '    3. Transfer money between accounts';
    RAISE NOTICE '';
    RAISE NOTICE '✅ The code has been UPDATED to track:';
    RAISE NOTICE '    - payment_made (payments to vendors)';
    RAISE NOTICE '    - expense (business expenses)';
    RAISE NOTICE '    - transfer_out (transfers to other accounts)';
  ELSE
    RAISE NOTICE '✅ You have outgoing transactions!';
    RAISE NOTICE '   The updated code should now display "Spent" amounts correctly.';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;

