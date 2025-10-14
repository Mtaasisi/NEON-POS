-- ============================================
-- 🔍 PAYMENT SYSTEM DIAGNOSTICS
-- Run this to check the health of your payment system
-- ============================================

-- ============================================
-- 1. CHECK TABLE EXISTENCE
-- ============================================

SELECT '═══════════════════════════════════' as "═══════════════════════════════════";
SELECT '   TABLE EXISTENCE CHECK' as "CHECK";
SELECT '═══════════════════════════════════' as "═══════════════════════════════════";

SELECT 
  'customer_payments' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_payments') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as status
UNION ALL
SELECT 
  'purchase_order_payments',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_order_payments') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END
UNION ALL
SELECT 
  'payment_transactions',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_transactions') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END
UNION ALL
SELECT 
  'account_transactions',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_transactions') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END
UNION ALL
SELECT 
  'finance_accounts',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'finance_accounts') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END;

-- ============================================
-- 2. CHECK RLS POLICIES
-- ============================================

SELECT '═══════════════════════════════════' as "═══════════════════════════════════";
SELECT '   RLS POLICIES CHECK' as "CHECK";
SELECT '═══════════════════════════════════' as "═══════════════════════════════════";

SELECT 
  tablename,
  COUNT(*) as policy_count,
  CASE WHEN COUNT(*) >= 4 THEN '✅ COMPLETE' ELSE '⚠️ INCOMPLETE' END as status
FROM pg_policies
WHERE tablename IN ('customer_payments', 'purchase_order_payments', 'payment_transactions', 'account_transactions', 'finance_accounts')
GROUP BY tablename
ORDER BY tablename;

-- ============================================
-- 3. CHECK RECORD COUNTS
-- ============================================

SELECT '═══════════════════════════════════' as "═══════════════════════════════════";
SELECT '   RECORD COUNTS' as "CHECK";
SELECT '═══════════════════════════════════' as "═══════════════════════════════════";

SELECT 
  'customer_payments' as table_name,
  COUNT(*) as records,
  CASE WHEN COUNT(*) > 0 THEN '✅ HAS DATA' ELSE '⚠️ EMPTY' END as status
FROM customer_payments
UNION ALL
SELECT 
  'purchase_order_payments',
  COUNT(*),
  CASE WHEN COUNT(*) > 0 THEN '✅ HAS DATA' ELSE '⚠️ EMPTY' END
FROM purchase_order_payments
UNION ALL
SELECT 
  'payment_transactions',
  COUNT(*),
  CASE WHEN COUNT(*) > 0 THEN '✅ HAS DATA' ELSE '⚠️ EMPTY' END
FROM payment_transactions
UNION ALL
SELECT 
  'account_transactions',
  COUNT(*),
  CASE WHEN COUNT(*) > 0 THEN '✅ HAS DATA' ELSE '⚠️ EMPTY' END
FROM account_transactions
UNION ALL
SELECT 
  'finance_accounts',
  COUNT(*),
  CASE WHEN COUNT(*) > 0 THEN '✅ HAS DATA' ELSE '⚠️ EMPTY' END
FROM finance_accounts;

-- ============================================
-- 4. CHECK INDEXES
-- ============================================

SELECT '═══════════════════════════════════' as "═══════════════════════════════════";
SELECT '   INDEX STATUS' as "CHECK";
SELECT '═══════════════════════════════════' as "═══════════════════════════════════";

SELECT 
  tablename,
  indexname,
  '✅' as status
FROM pg_indexes
WHERE tablename IN ('customer_payments', 'purchase_order_payments', 'payment_transactions', 'account_transactions', 'finance_accounts')
  AND schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================
-- 5. CHECK PAYMENT ACCOUNT BALANCES
-- ============================================

SELECT '═══════════════════════════════════' as "═══════════════════════════════════";
SELECT '   PAYMENT ACCOUNT BALANCES' as "CHECK";
SELECT '═══════════════════════════════════' as "═══════════════════════════════════";

SELECT 
  fa.id,
  fa.name,
  fa.type,
  fa.balance as db_balance,
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
  ) as calculated_balance,
  CASE 
    WHEN fa.balance = (
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
    ) THEN '✅ MATCH'
    ELSE '⚠️ MISMATCH'
  END as balance_status,
  fa.is_active,
  fa.is_payment_method
FROM finance_accounts fa
WHERE fa.is_active = true
ORDER BY fa.name;

-- ============================================
-- 6. CHECK RECENT PAYMENT ACTIVITY
-- ============================================

SELECT '═══════════════════════════════════' as "═══════════════════════════════════";
SELECT '   RECENT PAYMENT ACTIVITY (Last 10)' as "CHECK";
SELECT '═══════════════════════════════════' as "═══════════════════════════════════";

SELECT 
  'customer_payment' as source,
  id::TEXT as payment_id,
  amount,
  payment_method,
  status,
  created_at
FROM customer_payments
ORDER BY created_at DESC
LIMIT 5
UNION ALL
SELECT 
  'purchase_order_payment' as source,
  id::TEXT,
  amount,
  payment_method,
  status,
  created_at
FROM purchase_order_payments
ORDER BY created_at DESC
LIMIT 5
ORDER BY created_at DESC;

-- ============================================
-- 7. CHECK FOR DATA INTEGRITY ISSUES
-- ============================================

SELECT '═══════════════════════════════════' as "═══════════════════════════════════";
SELECT '   DATA INTEGRITY CHECKS' as "CHECK";
SELECT '═══════════════════════════════════' as "═══════════════════════════════════";

-- Check for NULL amounts
SELECT 
  'customer_payments - NULL amounts' as issue,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 0 THEN '✅ OK' ELSE '❌ ISSUE FOUND' END as status
FROM customer_payments
WHERE amount IS NULL
UNION ALL
SELECT 
  'payment_transactions - NULL amounts',
  COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN '✅ OK' ELSE '❌ ISSUE FOUND' END
FROM payment_transactions
WHERE amount IS NULL
UNION ALL
-- Check for negative amounts (should be caught by constraints)
SELECT 
  'customer_payments - negative amounts',
  COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN '✅ OK' ELSE '❌ ISSUE FOUND' END
FROM customer_payments
WHERE amount < 0
UNION ALL
SELECT 
  'payment_transactions - negative amounts',
  COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN '✅ OK' ELSE '❌ ISSUE FOUND' END
FROM payment_transactions
WHERE amount < 0
UNION ALL
-- Check for orphaned transactions
SELECT 
  'account_transactions - orphaned records',
  COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN '✅ OK' ELSE '⚠️ ORPHANED RECORDS' END
FROM account_transactions at
WHERE NOT EXISTS (SELECT 1 FROM finance_accounts fa WHERE fa.id = at.account_id);

-- ============================================
-- 8. SUMMARY STATISTICS
-- ============================================

SELECT '═══════════════════════════════════' as "═══════════════════════════════════";
SELECT '   PAYMENT SYSTEM SUMMARY' as "CHECK";
SELECT '═══════════════════════════════════' as "═══════════════════════════════════";

SELECT 
  'Total Payment Accounts' as metric,
  COUNT(*)::TEXT as value
FROM finance_accounts
WHERE is_payment_method = true
UNION ALL
SELECT 
  'Active Payment Accounts',
  COUNT(*)::TEXT
FROM finance_accounts
WHERE is_payment_method = true AND is_active = true
UNION ALL
SELECT 
  'Total Customer Payments',
  COUNT(*)::TEXT
FROM customer_payments
UNION ALL
SELECT 
  'Total Purchase Order Payments',
  COUNT(*)::TEXT
FROM purchase_order_payments
UNION ALL
SELECT 
  'Total Payment Transactions',
  COUNT(*)::TEXT
FROM payment_transactions
UNION ALL
SELECT 
  'Total Account Transactions',
  COUNT(*)::TEXT
FROM account_transactions
UNION ALL
SELECT 
  'Total Finance Account Balance',
  TO_CHAR(SUM(balance), 'FM999,999,999,999') || ' TZS'
FROM finance_accounts
WHERE is_active = true;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

SELECT '═══════════════════════════════════' as "═══════════════════════════════════";
SELECT '   DIAGNOSTIC COMPLETE' as "STATUS";
SELECT '═══════════════════════════════════' as "═══════════════════════════════════";

