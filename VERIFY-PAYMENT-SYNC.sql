-- ============================================
-- VERIFY AUTOMATIC PAYMENT SYNC STATUS
-- Run this anytime to check if everything is working
-- ============================================

-- ============================================
-- 1. CHECK TRIGGERS
-- ============================================
SELECT 
  '🔍 CHECKING TRIGGERS' as status,
  '' as detail;

SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  '✅' as status
FROM information_schema.triggers
WHERE trigger_name LIKE '%sync%payment%' OR trigger_name LIKE '%trigger_sync%'
ORDER BY event_object_table;

-- ============================================
-- 2. CHECK PAYMENT TRANSACTIONS COUNT
-- ============================================
SELECT 
  '📊 PAYMENT TRANSACTIONS SUMMARY' as status,
  '' as detail;

SELECT 
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
  COALESCE(SUM(amount), 0) as total_amount_tzs,
  ROUND(AVG(amount), 2) as average_amount,
  MIN(created_at) as oldest_transaction,
  MAX(created_at) as newest_transaction
FROM payment_transactions;

-- ============================================
-- 3. CHECK BY PROVIDER
-- ============================================
SELECT 
  '💳 TRANSACTIONS BY PROVIDER' as status,
  '' as detail;

SELECT 
  provider,
  COUNT(*) as count,
  SUM(amount) as total_amount,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
  ROUND(AVG(amount), 2) as avg_amount
FROM payment_transactions
GROUP BY provider
ORDER BY count DESC;

-- ============================================
-- 4. CHECK RECENT TRANSACTIONS
-- ============================================
SELECT 
  '📅 RECENT TRANSACTIONS (Last 10)' as status,
  '' as detail;

SELECT 
  order_id,
  provider,
  amount,
  status,
  customer_name,
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at,
  CASE 
    WHEN metadata->>'auto_synced' = 'true' THEN '🔄 Auto'
    WHEN metadata->>'migrated_from' IS NOT NULL THEN '📥 Migrated'
    WHEN metadata->>'type' = 'demo_data' THEN '🧪 Demo'
    ELSE '✏️ Manual'
  END as source
FROM payment_transactions
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- 5. CHECK TODAY'S TRANSACTIONS
-- ============================================
SELECT 
  '📆 TODAY''S TRANSACTIONS' as status,
  '' as detail;

SELECT 
  COUNT(*) as today_count,
  SUM(amount) as today_total,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as today_completed,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as today_pending
FROM payment_transactions
WHERE DATE(created_at) = CURRENT_DATE;

-- ============================================
-- 6. CHECK SALES SYNC STATUS
-- ============================================
SELECT 
  '🔗 SALES SYNC STATUS' as status,
  '' as detail;

SELECT 
  COUNT(s.id) as total_sales_with_amount,
  COUNT(pt.id) as synced_to_payment_transactions,
  COUNT(s.id) - COUNT(pt.id) as not_synced,
  CASE 
    WHEN COUNT(s.id) = COUNT(pt.id) THEN '✅ All synced'
    WHEN COUNT(pt.id) = 0 THEN '❌ None synced'
    ELSE '⚠️ Partial sync'
  END as sync_status
FROM lats_sales s
LEFT JOIN payment_transactions pt ON pt.sale_id = s.id
WHERE s.total_amount > 0;

-- ============================================
-- 7. CHECK RLS POLICIES
-- ============================================
SELECT 
  '🔒 RLS POLICIES' as status,
  '' as detail;

SELECT 
  policyname,
  cmd as operation,
  CASE 
    WHEN permissive = 'PERMISSIVE' THEN '✅ Permissive'
    ELSE '⚠️ Restrictive'
  END as type,
  roles
FROM pg_policies
WHERE tablename = 'payment_transactions'
ORDER BY cmd;

-- ============================================
-- 8. CHECK TABLE INDEXES
-- ============================================
SELECT 
  '📑 INDEXES' as status,
  '' as detail;

SELECT 
  indexname,
  indexdef,
  '✅' as status
FROM pg_indexes
WHERE tablename = 'payment_transactions'
ORDER BY indexname;

-- ============================================
-- 9. FINAL STATUS SUMMARY
-- ============================================
DO $$
DECLARE
  v_transaction_count INTEGER;
  v_trigger_count INTEGER;
  v_today_count INTEGER;
  v_total_amount DECIMAL(15,2);
BEGIN
  -- Count transactions
  SELECT COUNT(*) INTO v_transaction_count FROM payment_transactions;
  
  -- Count triggers
  SELECT COUNT(*) INTO v_trigger_count 
  FROM information_schema.triggers
  WHERE trigger_name LIKE '%sync%';
  
  -- Count today's transactions
  SELECT COUNT(*) INTO v_today_count
  FROM payment_transactions
  WHERE DATE(created_at) = CURRENT_DATE;
  
  -- Total amount
  SELECT COALESCE(SUM(amount), 0) INTO v_total_amount FROM payment_transactions;
  
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ AUTOMATIC PAYMENT SYNC - STATUS CHECK';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Triggers Active: % %', v_trigger_count, CASE WHEN v_trigger_count >= 2 THEN '✅' ELSE '⚠️' END;
  RAISE NOTICE 'Total Transactions: % %', v_transaction_count, CASE WHEN v_transaction_count > 0 THEN '✅' ELSE '⚠️' END;
  RAISE NOTICE 'Today''s Transactions: %', v_today_count;
  RAISE NOTICE 'Total Amount: % TZS', v_total_amount;
  RAISE NOTICE '';
  
  IF v_trigger_count >= 2 AND v_transaction_count > 0 THEN
    RAISE NOTICE '🎉 Status: ALL SYSTEMS OPERATIONAL';
    RAISE NOTICE '✅ Automatic sync is working correctly';
    RAISE NOTICE '✅ Payment history should be visible in the app';
  ELSIF v_trigger_count >= 2 AND v_transaction_count = 0 THEN
    RAISE NOTICE '⚠️ Status: TRIGGERS ACTIVE, NO DATA YET';
    RAISE NOTICE '💡 Create a sale to test automatic sync';
  ELSIF v_trigger_count = 0 THEN
    RAISE NOTICE '❌ Status: TRIGGERS NOT FOUND';
    RAISE NOTICE '💡 Run AUTO-SYNC-PAYMENT-TRANSACTIONS.sql';
  ELSE
    RAISE NOTICE '⚠️ Status: PARTIAL SETUP';
    RAISE NOTICE '💡 Check the output above for details';
  END IF;
  
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
END $$;

