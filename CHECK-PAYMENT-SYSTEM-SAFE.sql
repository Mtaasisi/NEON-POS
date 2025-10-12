-- ============================================
-- PAYMENT SYSTEM DIAGNOSTIC (SAFE VERSION)
-- ============================================
-- This version safely checks what exists without errors
-- ============================================

-- 1. Check payment methods/accounts
SELECT 
  '🔍 FINANCE ACCOUNTS' as check_type,
  id, 
  account_name, 
  account_type, 
  currency,
  current_balance,
  is_active,
  created_at
FROM finance_accounts
WHERE is_active = TRUE
ORDER BY account_name
LIMIT 20;

-- 2. Check recent POS sales
SELECT 
  '💰 RECENT POS SALES' as check_type,
  s.id,
  s.sale_number,
  s.total_amount,
  s.payment_status,
  s.created_at
FROM lats_sales s
ORDER BY s.created_at DESC
LIMIT 10;

-- 3. Check what tables actually exist
SELECT 
  '📊 EXISTING TABLES' as check_type,
  tablename as table_name
FROM pg_tables
WHERE schemaname = 'public'
  AND (
    tablename LIKE '%payment%' 
    OR tablename LIKE '%finance%'
    OR tablename LIKE '%sale%'
    OR tablename = 'lats_purchase_orders'
  )
ORDER BY tablename;

-- 4. Check for RPC functions
SELECT 
  '⚙️ RPC FUNCTIONS' as check_type,
  proname as function_name
FROM pg_proc
WHERE proname LIKE '%payment%'
   OR proname LIKE '%purchase%order%'
ORDER BY proname;

-- 5. Summary statistics
SELECT 
  '📈 SUMMARY' as info,
  (SELECT COUNT(*) FROM finance_accounts WHERE is_active = TRUE) as finance_accounts,
  (SELECT COUNT(*) FROM lats_sales) as total_sales,
  (SELECT COALESCE(SUM(total_amount), 0) FROM lats_sales WHERE payment_status = 'paid') as total_revenue,
  (SELECT COUNT(*) FROM lats_products) as total_products,
  (SELECT COUNT(*) FROM lats_suppliers) as total_suppliers;

-- 6. Recommendations
DO $$
DECLARE
  v_accounts_count INTEGER;
  v_sales_count INTEGER;
  v_po_table_exists BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '💡 PAYMENT SYSTEM STATUS';
  RAISE NOTICE '═══════════════════════════════════════';
  
  -- Check finance accounts
  SELECT COUNT(*) INTO v_accounts_count FROM finance_accounts WHERE is_active = TRUE;
  IF v_accounts_count = 0 THEN
    RAISE NOTICE '⚠️  No finance accounts configured';
    RAISE NOTICE '   → Create accounts for: Cash, M-Pesa, Bank, etc.';
  ELSE
    RAISE NOTICE '✅ Finance accounts: %', v_accounts_count;
  END IF;
  
  -- Check sales
  SELECT COUNT(*) INTO v_sales_count FROM lats_sales;
  IF v_sales_count = 0 THEN
    RAISE NOTICE 'ℹ️  No sales recorded yet';
    RAISE NOTICE '   → Test POS at: http://localhost:3000/lats/pos';
  ELSE
    RAISE NOTICE '✅ Total sales: %', v_sales_count;
  END IF;
  
  -- Check if purchase order payments table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'purchase_order_payments'
  ) INTO v_po_table_exists;
  
  IF NOT v_po_table_exists THEN
    RAISE NOTICE 'ℹ️  Purchase order payments not configured';
    RAISE NOTICE '   → Optional: For tracking supplier payments';
  ELSE
    RAISE NOTICE '✅ Purchase order payments table exists';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Payment System Ready!';
  RAISE NOTICE '   1. Test POS: http://localhost:3000/lats/pos';
  RAISE NOTICE '   2. Make a test sale';
  RAISE NOTICE '   3. Verify payment methods work';
  RAISE NOTICE '═══════════════════════════════════════';
END $$;
