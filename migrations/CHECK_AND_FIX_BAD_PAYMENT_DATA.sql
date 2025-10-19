-- ============================================
-- CHECK AND FIX BAD PAYMENT DATA
-- ============================================
-- This script identifies and fixes suspiciously large amounts
-- ============================================

-- Step 1: Check for suspicious payments (amounts > 100 billion TZS)
SELECT 
  id,
  customer_id,
  amount,
  method,
  payment_date,
  status,
  'customer_payments' as table_name
FROM customer_payments
WHERE amount > 100000000000
ORDER BY amount DESC;

-- Step 2: Check all payment amounts to see the range
SELECT 
  'Min Amount' as metric,
  MIN(amount) as value
FROM customer_payments
UNION ALL
SELECT 
  'Max Amount',
  MAX(amount)
FROM customer_payments
UNION ALL
SELECT 
  'Average Amount',
  AVG(amount)
FROM customer_payments
UNION ALL
SELECT 
  'Total Records',
  COUNT(*)::numeric
FROM customer_payments;

-- Step 3: Check payment methods with suspicious totals
SELECT 
  method,
  COUNT(*) as transaction_count,
  SUM(amount) as total_amount,
  AVG(amount) as average_amount,
  MAX(amount) as max_amount
FROM customer_payments
WHERE status = 'completed'
GROUP BY method
ORDER BY total_amount DESC;

-- ============================================
-- FIX OPTIONS (Uncomment to apply)
-- ============================================

-- Option 1: Delete payments with suspicious amounts (> 100 billion TZS)
-- DELETE FROM customer_payments
-- WHERE amount > 100000000000;

-- Option 2: Divide suspicious amounts by 1 billion (if they were entered in wrong unit)
-- UPDATE customer_payments
-- SET amount = amount / 1000000000
-- WHERE amount > 100000000000;

-- Option 3: Set suspicious amounts to 0 (safest)
-- UPDATE customer_payments
-- SET amount = 0, status = 'failed'
-- WHERE amount > 100000000000;

-- Option 4: Set specific payment to a reasonable amount
-- UPDATE customer_payments
-- SET amount = 50000  -- Example: 50,000 TZS
-- WHERE id = 'PAYMENT_ID_HERE';

-- ============================================
-- VERIFICATION: Check payment_transactions table too
-- ============================================

SELECT 
  id,
  customer_id,
  amount,
  provider,
  status,
  created_at,
  'payment_transactions' as table_name
FROM payment_transactions
WHERE amount > 100000000000
ORDER BY amount DESC
LIMIT 20;

-- ============================================
-- RECOMMENDATION
-- ============================================
-- 
-- Based on what you see:
-- 
-- 1. If amounts are 1 billion times too large:
--    - Use Option 2 to divide by 1 billion
-- 
-- 2. If these are test/bad data:
--    - Use Option 1 to delete them
--    - Or use Option 3 to mark as failed
-- 
-- 3. If just a few records:
--    - Use Option 4 to manually fix each one
-- 
-- ============================================

