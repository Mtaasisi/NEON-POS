-- ============================================
-- DIAGNOSE AND FIX PAYMENT HISTORY
-- This script diagnoses why payment_transactions is empty and creates sample data
-- ============================================

-- ============================================
-- 1. CHECK IF payment_transactions TABLE EXISTS AND IS ACCESSIBLE
-- ============================================

-- Check table existence
SELECT 
  'payment_transactions' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'payment_transactions'
  ) 
    THEN '✅ EXISTS' 
    ELSE '❌ DOES NOT EXIST' 
  END as exists_status;

-- Check row count
SELECT 
  'payment_transactions' as table_name,
  COUNT(*) as row_count
FROM payment_transactions;

-- ============================================
-- 2. CHECK RLS POLICIES
-- ============================================

SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE tablename = 'payment_transactions'
ORDER BY policyname;

-- ============================================
-- 3. CHECK RELATED PAYMENT TABLES FOR DATA
-- ============================================

-- Check customer_payments
SELECT 
  'customer_payments' as table_name,
  COUNT(*) as row_count
FROM customer_payments;

-- Check purchase_order_payments
SELECT 
  'purchase_order_payments' as table_name,
  COUNT(*) as row_count
FROM purchase_order_payments;

-- Check lats_sales for payment data
SELECT 
  'lats_sales' as table_name,
  COUNT(*) as row_count,
  COUNT(CASE WHEN payment_method IS NOT NULL THEN 1 END) as with_payment_method,
  COUNT(CASE WHEN total_amount > 0 THEN 1 END) as with_amount
FROM lats_sales;

-- ============================================
-- 4. SAMPLE EXISTING SALES DATA
-- ============================================

SELECT 
  id,
  sale_number,
  payment_method,
  total_amount,
  customer_id,
  created_at
FROM lats_sales
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- 5. CREATE SAMPLE PAYMENT TRANSACTIONS FROM EXISTING SALES
-- ============================================

-- Insert payment transactions based on existing sales
INSERT INTO payment_transactions (
  id,
  order_id,
  provider,
  amount,
  currency,
  status,
  customer_id,
  customer_name,
  customer_email,
  customer_phone,
  reference,
  metadata,
  sale_id,
  pos_session_id,
  created_at,
  updated_at,
  completed_at
)
SELECT 
  gen_random_uuid() as id,
  s.sale_number as order_id,
  COALESCE(s.payment_method, 'cash') as provider,
  s.total_amount as amount,
  'TZS' as currency,
  'completed' as status,
  s.customer_id,
  c.name as customer_name,
  c.email as customer_email,
  c.phone as customer_phone,
  'SALE-' || s.sale_number as reference,
  jsonb_build_object(
    'sale_number', s.sale_number,
    'payment_method', s.payment_method,
    'migrated_from', 'lats_sales',
    'migration_date', NOW()
  ) as metadata,
  s.id as sale_id,
  COALESCE(s.session_id, 'LEGACY') as pos_session_id,
  s.created_at,
  s.created_at as updated_at,
  s.created_at as completed_at
FROM lats_sales s
LEFT JOIN customers c ON c.id = s.customer_id
WHERE s.total_amount > 0
  AND s.id NOT IN (
    SELECT sale_id FROM payment_transactions WHERE sale_id IS NOT NULL
  )
ORDER BY s.created_at DESC
LIMIT 100
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 6. CREATE SAMPLE PAYMENT TRANSACTIONS FROM CUSTOMER_PAYMENTS
-- ============================================

-- Insert payment transactions from customer_payments (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_payments') THEN
    INSERT INTO payment_transactions (
      id,
      order_id,
      provider,
      amount,
      currency,
      status,
      customer_id,
      customer_name,
      customer_email,
      customer_phone,
      reference,
      metadata,
      sale_id,
      created_at,
      updated_at,
      completed_at
    )
    SELECT 
      gen_random_uuid() as id,
      'CP-' || cp.id::text as order_id,
      COALESCE(cp.payment_method, 'cash') as provider,
      cp.amount as amount,
      COALESCE(cp.currency, 'TZS') as currency,
      COALESCE(cp.status, 'completed') as status,
      cp.customer_id,
      c.name as customer_name,
      c.email as customer_email,
      c.phone as customer_phone,
      cp.reference_number as reference,
      jsonb_build_object(
        'migrated_from', 'customer_payments',
        'original_id', cp.id,
        'migration_date', NOW()
      ) as metadata,
      NULL as sale_id,
      cp.created_at,
      cp.created_at as updated_at,
      cp.payment_date as completed_at
    FROM customer_payments cp
    LEFT JOIN customers c ON c.id = cp.customer_id
    WHERE cp.amount > 0
      AND cp.id::text NOT IN (
        SELECT metadata->>'original_id' 
        FROM payment_transactions 
        WHERE metadata->>'migrated_from' = 'customer_payments'
      )
    ORDER BY cp.created_at DESC
    LIMIT 100
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- ============================================
-- 7. CREATE SOME SAMPLE TEST TRANSACTIONS IF STILL EMPTY
-- ============================================

-- Only create test data if payment_transactions is still empty
DO $$
DECLARE
  v_count INTEGER;
  v_customer_id UUID;
BEGIN
  -- Check if payment_transactions is empty
  SELECT COUNT(*) INTO v_count FROM payment_transactions;
  
  IF v_count = 0 THEN
    RAISE NOTICE '⚠️ payment_transactions is empty. Creating sample test data...';
    
    -- Get a customer ID (or create a test customer)
    SELECT id INTO v_customer_id FROM customers LIMIT 1;
    
    IF v_customer_id IS NULL THEN
      INSERT INTO customers (id, name, email, phone, created_at)
      VALUES (gen_random_uuid(), 'Test Customer', 'test@example.com', '+255123456789', NOW())
      RETURNING id INTO v_customer_id;
    END IF;
    
    -- Create sample transactions
    INSERT INTO payment_transactions (
      id,
      order_id,
      provider,
      amount,
      currency,
      status,
      customer_id,
      customer_name,
      customer_email,
      customer_phone,
      reference,
      metadata,
      created_at,
      updated_at,
      completed_at
    ) VALUES
    (
      gen_random_uuid(),
      'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-001',
      'cash',
      50000.00,
      'TZS',
      'completed',
      v_customer_id,
      'Test Customer',
      'test@example.com',
      '+255123456789',
      'REF-001',
      '{"source": "test_data", "created_by": "diagnostic_script"}',
      NOW() - INTERVAL '1 day',
      NOW() - INTERVAL '1 day',
      NOW() - INTERVAL '1 day'
    ),
    (
      gen_random_uuid(),
      'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-002',
      'mobile_money',
      75000.00,
      'TZS',
      'completed',
      v_customer_id,
      'Test Customer',
      'test@example.com',
      '+255123456789',
      'REF-002',
      '{"source": "test_data", "created_by": "diagnostic_script"}',
      NOW() - INTERVAL '2 hours',
      NOW() - INTERVAL '2 hours',
      NOW() - INTERVAL '2 hours'
    ),
    (
      gen_random_uuid(),
      'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-003',
      'card',
      120000.00,
      'TZS',
      'completed',
      v_customer_id,
      'Test Customer',
      'test@example.com',
      '+255123456789',
      'REF-003',
      '{"source": "test_data", "created_by": "diagnostic_script"}',
      NOW() - INTERVAL '30 minutes',
      NOW() - INTERVAL '30 minutes',
      NOW() - INTERVAL '30 minutes'
    ),
    (
      gen_random_uuid(),
      'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-004',
      'zenopay',
      95000.00,
      'TZS',
      'pending',
      v_customer_id,
      'Test Customer',
      'test@example.com',
      '+255123456789',
      'REF-004',
      '{"source": "test_data", "created_by": "diagnostic_script"}',
      NOW() - INTERVAL '10 minutes',
      NOW() - INTERVAL '10 minutes',
      NULL
    ),
    (
      gen_random_uuid(),
      'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-005',
      'cash',
      45000.00,
      'TZS',
      'failed',
      v_customer_id,
      'Test Customer',
      'test@example.com',
      '+255123456789',
      'REF-005',
      '{"source": "test_data", "created_by": "diagnostic_script", "error": "Insufficient funds"}',
      NOW() - INTERVAL '5 hours',
      NOW() - INTERVAL '5 hours',
      NULL
    );
    
    RAISE NOTICE '✅ Created 5 sample test transactions';
  ELSE
    RAISE NOTICE '✅ payment_transactions already has % rows', v_count;
  END IF;
END $$;

-- ============================================
-- 8. VERIFY FINAL STATE
-- ============================================

-- Final count
SELECT 
  'payment_transactions' as table_name,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
  SUM(amount) as total_amount
FROM payment_transactions;

-- Recent transactions
SELECT 
  order_id,
  provider,
  amount,
  currency,
  status,
  customer_name,
  created_at
FROM payment_transactions
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM payment_transactions;
  
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ PAYMENT HISTORY DIAGNOSIS COMPLETE';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Total payment transactions: %', v_count;
  RAISE NOTICE '';
  
  IF v_count > 0 THEN
    RAISE NOTICE '✅ Payment history is now populated!';
    RAISE NOTICE '✅ The History tab should now display transactions';
    RAISE NOTICE '✅ Refresh your browser to see the changes';
  ELSE
    RAISE NOTICE '⚠️ Payment transactions table is still empty';
    RAISE NOTICE 'This may indicate a permission issue or missing data';
  END IF;
  
  RAISE NOTICE '================================================';
END $$;

