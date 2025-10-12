-- ============================================
-- PAYMENT SYSTEM DIAGNOSTIC
-- ============================================
-- Run this to check if your payment system is properly configured
-- ============================================

-- 1. Check payment methods/accounts (if table exists with is_payment_method column)
SELECT 
  '🔍 PAYMENT METHODS' as check_type,
  id, 
  account_name as name, 
  account_type, 
  currency,
  current_balance as balance,
  is_active,
  created_at
FROM finance_accounts
WHERE is_active = TRUE
ORDER BY account_name
LIMIT 20;

-- 2. Check recent POS sales with payments
SELECT 
  '💰 RECENT POS SALES' as check_type,
  s.id,
  s.sale_number,
  s.total_amount,
  s.payment_status,
  s.created_at,
  c.name as customer_name
FROM lats_sales s
LEFT JOIN customers c ON s.customer_id = c.id
ORDER BY s.created_at DESC
LIMIT 10;

-- 3. Check for purchase order payments (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_order_payments') THEN
    RAISE NOTICE '📦 Checking purchase order payments...';
    PERFORM * FROM purchase_order_payments LIMIT 1;
  ELSE
    RAISE NOTICE '⚠️  Table "purchase_order_payments" does not exist (optional feature)';
  END IF;
END $$;

-- 4. Check if required tables exist
SELECT 
  '📊 TABLE STATUS' as check_type,
  tablename as table_name,
  'EXISTS' as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'finance_accounts',
    'lats_sales',
    'lats_sale_items',
    'purchase_order_payments',
    'finance_transactions'
  )
ORDER BY tablename;

-- 5. Check for RPC functions
SELECT 
  '⚙️ RPC FUNCTIONS' as check_type,
  proname as function_name,
  'EXISTS' as status
FROM pg_proc
WHERE proname IN (
  'process_purchase_order_payment',
  'create_sale_with_items'
)
ORDER BY proname;

-- 6. Summary counts
SELECT 
  '📈 SUMMARY' as info,
  (SELECT COUNT(*) FROM finance_accounts WHERE is_active = TRUE) as finance_accounts_count,
  (SELECT COUNT(*) FROM lats_sales) as total_sales,
  (SELECT SUM(total_amount) FROM lats_sales WHERE payment_status = 'paid') as total_revenue,
  (SELECT COUNT(DISTINCT payment_method_id) FROM lats_sales WHERE payment_method_id IS NOT NULL) as payment_methods_used;

-- ============================================
-- RECOMMENDATIONS
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '💡 RECOMMENDATIONS';
  RAISE NOTICE '═══════════════════════════════════════';
  
  -- Check if finance accounts exist
  IF (SELECT COUNT(*) FROM finance_accounts WHERE is_active = TRUE) = 0 THEN
    RAISE NOTICE '⚠️  No finance accounts configured!';
    RAISE NOTICE '   Create finance accounts for payment methods';
  ELSE
    RAISE NOTICE '✅ Finance accounts configured: %', (SELECT COUNT(*) FROM finance_accounts WHERE is_active = TRUE);
  END IF;
  
  -- Check if sales exist
  IF (SELECT COUNT(*) FROM lats_sales) = 0 THEN
    RAISE NOTICE 'ℹ️  No sales recorded yet';
    RAISE NOTICE '   Test by making a sale in POS';
  ELSE
    RAISE NOTICE '✅ Total sales: %', (SELECT COUNT(*) FROM lats_sales);
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next Steps:';
  RAISE NOTICE '   1. If payment methods = 0, create payment methods';
  RAISE NOTICE '   2. Test POS payment at: http://localhost:3000/lats/pos';
  RAISE NOTICE '   3. Verify payment tracking dashboard';
  RAISE NOTICE '═══════════════════════════════════════';
END $$;

