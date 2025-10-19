-- ============================================
-- CLEAN RECENT TRANSACTIONS (Last 7 Days)
-- Safer option - only deletes recent data
-- ============================================

-- Uncomment to delete transactions from the last 7 days only

-- Delete recent sale items first (due to foreign keys)
-- DELETE FROM lats_sale_items 
-- WHERE sale_id IN (
--   SELECT id FROM lats_sales 
--   WHERE created_at >= NOW() - INTERVAL '7 days'
-- );

-- Delete recent sales
-- DELETE FROM lats_sales 
-- WHERE created_at >= NOW() - INTERVAL '7 days';

-- Delete recent payments
-- DELETE FROM customer_payments 
-- WHERE created_at >= NOW() - INTERVAL '7 days';

-- DELETE FROM payment_transactions 
-- WHERE created_at >= NOW() - INTERVAL '7 days';

-- Delete recent account transactions
-- DELETE FROM account_transactions 
-- WHERE created_at >= NOW() - INTERVAL '7 days';

-- Delete recent expenses
-- DELETE FROM finance_expenses 
-- WHERE created_at >= NOW() - INTERVAL '7 days';

-- ============================================
-- Check what will be deleted (Safe to run)
-- ============================================

SELECT 
  'lats_sales (last 7 days)' as description,
  COUNT(*) as records_to_delete
FROM lats_sales 
WHERE created_at >= NOW() - INTERVAL '7 days'
UNION ALL
SELECT 
  'customer_payments (last 7 days)',
  COUNT(*)
FROM customer_payments 
WHERE created_at >= NOW() - INTERVAL '7 days'
UNION ALL
SELECT 
  'payment_transactions (last 7 days)',
  COUNT(*)
FROM payment_transactions 
WHERE created_at >= NOW() - INTERVAL '7 days';

