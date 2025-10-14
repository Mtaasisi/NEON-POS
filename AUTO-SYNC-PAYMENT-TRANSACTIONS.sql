-- ============================================
-- AUTOMATIC PAYMENT TRANSACTION SYNC
-- This creates triggers to automatically populate payment_transactions
-- ============================================

-- ============================================
-- 0. CHECK METADATA COLUMN TYPE
-- ============================================

-- Check metadata column type (JSON or JSONB - both work fine)
DO $$
DECLARE
  v_data_type TEXT;
BEGIN
  SELECT data_type INTO v_data_type
  FROM information_schema.columns 
  WHERE table_name = 'payment_transactions' 
  AND column_name = 'metadata';
  
  IF v_data_type IS NOT NULL THEN
    RAISE NOTICE '✅ metadata column type: %', v_data_type;
    RAISE NOTICE 'ℹ️ This script works with both JSON and JSONB types';
  ELSE
    RAISE NOTICE '⚠️ metadata column not found';
  END IF;
END $$;

-- ============================================
-- 1. CREATE TRIGGER FUNCTION FOR SALES
-- ============================================

CREATE OR REPLACE FUNCTION sync_sale_to_payment_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_name TEXT;
  v_customer_email TEXT;
  v_customer_phone TEXT;
BEGIN
  -- Only process if sale has an amount
  IF NEW.total_amount > 0 THEN
    
    -- Get customer details if customer_id exists
    IF NEW.customer_id IS NOT NULL THEN
      SELECT name, email, phone 
      INTO v_customer_name, v_customer_email, v_customer_phone
      FROM customers 
      WHERE id = NEW.customer_id;
    END IF;
    
    -- Insert or update payment transaction
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
    ) VALUES (
      gen_random_uuid(),
      COALESCE(NEW.sale_number, 'SALE-' || NEW.id::text),
      COALESCE(NEW.payment_method, 'cash'),
      NEW.total_amount,
      'TZS',
      CASE 
        WHEN NEW.status = 'completed' THEN 'completed'
        WHEN NEW.status = 'pending' THEN 'pending'
        WHEN NEW.status = 'cancelled' THEN 'cancelled'
        ELSE 'completed'
      END,
      NEW.customer_id,
      v_customer_name,
      v_customer_email,
      v_customer_phone,
      'SALE-' || COALESCE(NEW.sale_number, NEW.id::text),
      jsonb_build_object(
        'sale_number', COALESCE(NEW.sale_number, 'N/A'),
        'payment_method', COALESCE(NEW.payment_method, 'cash'),
        'auto_synced', true,
        'sync_date', NOW()::text
      )::json,
      NEW.id,
      COALESCE(NEW.session_id, 'SYSTEM'),
      NEW.created_at,
      NEW.created_at,
      CASE WHEN NEW.status = 'completed' THEN NEW.created_at ELSE NULL END
    )
    ON CONFLICT (sale_id) 
    WHERE sale_id IS NOT NULL
    DO UPDATE SET
      amount = EXCLUDED.amount,
      status = EXCLUDED.status,
      provider = EXCLUDED.provider,
      customer_name = EXCLUDED.customer_name,
      customer_email = EXCLUDED.customer_email,
      customer_phone = EXCLUDED.customer_phone,
      updated_at = NOW(),
      completed_at = CASE 
        WHEN EXCLUDED.status = 'completed' THEN NOW() 
        ELSE payment_transactions.completed_at 
      END;
    
    RAISE NOTICE '✅ Auto-synced sale % to payment_transactions', NEW.sale_number;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. CREATE TRIGGER ON lats_sales
-- ============================================

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_sync_sale_payment ON lats_sales;

-- Create trigger for INSERT and UPDATE
CREATE TRIGGER trigger_sync_sale_payment
  AFTER INSERT OR UPDATE ON lats_sales
  FOR EACH ROW
  WHEN (NEW.total_amount > 0)
  EXECUTE FUNCTION sync_sale_to_payment_transaction();

COMMENT ON TRIGGER trigger_sync_sale_payment ON lats_sales IS 
  'Automatically syncs sales to payment_transactions table';

-- ============================================
-- 3. CREATE UNIQUE INDEX TO PREVENT DUPLICATES
-- ============================================

-- Create unique index on sale_id to prevent duplicate transactions from same sale
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_transactions_sale_id_unique 
  ON payment_transactions(sale_id) 
  WHERE sale_id IS NOT NULL;

-- ============================================
-- 4. CREATE TRIGGER FUNCTION FOR CUSTOMER PAYMENTS
-- ============================================

CREATE OR REPLACE FUNCTION sync_customer_payment_to_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_name TEXT;
  v_customer_email TEXT;
  v_customer_phone TEXT;
  v_order_id TEXT;
BEGIN
  -- Only process if payment has an amount
  IF NEW.amount > 0 THEN
    
    -- Get customer details
    IF NEW.customer_id IS NOT NULL THEN
      SELECT name, email, phone 
      INTO v_customer_name, v_customer_email, v_customer_phone
      FROM customers 
      WHERE id = NEW.customer_id;
    END IF;
    
    -- Generate order ID
    v_order_id := 'CP-' || NEW.id::text;
    
    -- Insert payment transaction
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
    ) VALUES (
      gen_random_uuid(),
      v_order_id,
      COALESCE(NEW.payment_method, 'cash'),
      NEW.amount,
      COALESCE(NEW.currency, 'TZS'),
      COALESCE(NEW.status, 'completed'),
      NEW.customer_id,
      v_customer_name,
      v_customer_email,
      v_customer_phone,
      NEW.reference_number,
      jsonb_build_object(
        'source', 'customer_payments',
        'original_id', NEW.id::text,
        'auto_synced', true,
        'sync_date', NOW()::text
      )::json,
      COALESCE(NEW.created_at, NOW()),
      NEW.created_at,
      NEW.payment_date
    )
    ON CONFLICT (order_id) DO UPDATE SET
      amount = EXCLUDED.amount,
      status = EXCLUDED.status,
      provider = EXCLUDED.provider,
      customer_name = EXCLUDED.customer_name,
      customer_email = EXCLUDED.customer_email,
      customer_phone = EXCLUDED.customer_phone,
      updated_at = NOW();
    
    RAISE NOTICE '✅ Auto-synced customer payment % to payment_transactions', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. CREATE TRIGGER ON customer_payments
-- ============================================

-- Check if customer_payments table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_payments') THEN
    -- Drop trigger if exists
    DROP TRIGGER IF EXISTS trigger_sync_customer_payment ON customer_payments;
    
    -- Create trigger
    CREATE TRIGGER trigger_sync_customer_payment
      AFTER INSERT OR UPDATE ON customer_payments
      FOR EACH ROW
      WHEN (NEW.amount > 0)
      EXECUTE FUNCTION sync_customer_payment_to_transaction();
    
    RAISE NOTICE '✅ Created trigger on customer_payments';
  ELSE
    RAISE NOTICE '⚠️ customer_payments table does not exist, skipping trigger';
  END IF;
END $$;

-- ============================================
-- 6. SYNC ALL EXISTING SALES (ONE-TIME MIGRATION)
-- ============================================

-- Sync existing sales that don't have payment transactions yet
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
  COALESCE(s.sale_number, 'SALE-' || s.id::text) as order_id,
  COALESCE(s.payment_method, 'cash') as provider,
  s.total_amount as amount,
  'TZS' as currency,
  CASE 
    WHEN s.status = 'completed' THEN 'completed'
    WHEN s.status = 'pending' THEN 'pending'
    WHEN s.status = 'cancelled' THEN 'cancelled'
    ELSE 'completed'
  END as status,
  s.customer_id,
  COALESCE(c.name, 'Walk-in Customer') as customer_name,
  c.email as customer_email,
  c.phone as customer_phone,
  'SALE-' || COALESCE(s.sale_number, s.id::text) as reference,
  jsonb_build_object(
    'sale_number', COALESCE(s.sale_number, 'N/A'),
    'payment_method', COALESCE(s.payment_method, 'cash'),
    'migrated_from', 'lats_sales',
    'migration_date', NOW()::text
  )::json as metadata,
  s.id as sale_id,
  COALESCE(s.session_id, 'LEGACY') as pos_session_id,
  COALESCE(s.created_at, NOW()) as created_at,
  COALESCE(s.created_at, NOW()) as updated_at,
  CASE WHEN s.status = 'completed' THEN COALESCE(s.created_at, NOW()) ELSE NULL END as completed_at
FROM lats_sales s
LEFT JOIN customers c ON c.id = s.customer_id
WHERE s.total_amount > 0
  AND NOT EXISTS (
    SELECT 1 FROM payment_transactions pt WHERE pt.sale_id = s.id
  )
ORDER BY s.created_at DESC
LIMIT 1000
ON CONFLICT (sale_id) WHERE sale_id IS NOT NULL DO NOTHING;

-- ============================================
-- 7. SYNC EXISTING CUSTOMER PAYMENTS (ONE-TIME MIGRATION)
-- ============================================

DO $$
DECLARE
  v_synced_count INTEGER := 0;
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
      COALESCE(c.name, 'Walk-in Customer') as customer_name,
      c.email as customer_email,
      c.phone as customer_phone,
      cp.reference_number as reference,
      jsonb_build_object(
        'source', 'customer_payments',
        'original_id', cp.id::text,
        'migrated_from', 'customer_payments',
        'migration_date', NOW()::text
      )::json as metadata,
      COALESCE(cp.created_at, NOW()) as created_at,
      COALESCE(cp.created_at, NOW()) as updated_at,
      COALESCE(cp.payment_date, cp.created_at, NOW()) as completed_at
    FROM customer_payments cp
    LEFT JOIN customers c ON c.id = cp.customer_id
    WHERE cp.amount > 0
      AND NOT EXISTS (
        SELECT 1 FROM payment_transactions pt 
        WHERE pt.order_id = 'CP-' || cp.id::text
      )
    ORDER BY cp.created_at DESC
    LIMIT 1000
    ON CONFLICT (order_id) DO NOTHING;
    
    GET DIAGNOSTICS v_synced_count = ROW_COUNT;
    RAISE NOTICE '✅ Synced % customer payments', v_synced_count;
  END IF;
END $$;

-- ============================================
-- 8. CREATE SAMPLE TEST DATA IF STILL EMPTY
-- ============================================

DO $$
DECLARE
  v_count INTEGER;
  v_customer_id UUID;
BEGIN
  SELECT COUNT(*) INTO v_count FROM payment_transactions;
  
  IF v_count = 0 THEN
    RAISE NOTICE '⚠️ No transactions found. Creating sample test data...';
    
    -- Get or create a test customer
    SELECT id INTO v_customer_id FROM customers LIMIT 1;
    
    IF v_customer_id IS NULL THEN
      INSERT INTO customers (id, name, email, phone, created_at)
      VALUES (gen_random_uuid(), 'Walk-in Customer', 'walkin@pos.local', '+255700000000', NOW())
      RETURNING id INTO v_customer_id;
    END IF;
    
    -- Create sample transactions
    INSERT INTO payment_transactions (
      id, order_id, provider, amount, currency, status,
      customer_id, customer_name, customer_email, customer_phone,
      reference, metadata, created_at, updated_at, completed_at
    ) VALUES
    (gen_random_uuid(), 'DEMO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-001', 'cash', 
     50000, 'TZS', 'completed', v_customer_id, 'Walk-in Customer', 
     'walkin@pos.local', '+255700000000', 'CASH-001',
     '{"type": "demo_data"}'::json, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
    (gen_random_uuid(), 'DEMO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-002', 'mobile_money', 
     75000, 'TZS', 'completed', v_customer_id, 'Walk-in Customer',
     'walkin@pos.local', '+255700000000', 'MM-002',
     '{"type": "demo_data"}'::json, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
    (gen_random_uuid(), 'DEMO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-003', 'card', 
     120000, 'TZS', 'completed', v_customer_id, 'Walk-in Customer',
     'walkin@pos.local', '+255700000000', 'CARD-003',
     '{"type": "demo_data"}'::json, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours'),
    (gen_random_uuid(), 'DEMO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-004', 'zenopay', 
     95000, 'TZS', 'pending', v_customer_id, 'Walk-in Customer',
     'walkin@pos.local', '+255700000000', 'ZENO-004',
     '{"type": "demo_data"}'::json, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours', NULL),
    (gen_random_uuid(), 'DEMO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-005', 'cash', 
     45000, 'TZS', 'completed', v_customer_id, 'Walk-in Customer',
     'walkin@pos.local', '+255700000000', 'CASH-005',
     '{"type": "demo_data"}'::json, NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes');
    
    RAISE NOTICE '✅ Created 5 demo transactions';
  END IF;
END $$;

-- ============================================
-- 9. VERIFY AND DISPLAY STATISTICS
-- ============================================

-- Display comprehensive statistics
DO $$
DECLARE
  v_total INTEGER;
  v_completed INTEGER;
  v_pending INTEGER;
  v_failed INTEGER;
  v_total_amount DECIMAL(15,2);
BEGIN
  SELECT 
    COUNT(*),
    COUNT(CASE WHEN status = 'completed' THEN 1 END),
    COUNT(CASE WHEN status = 'pending' THEN 1 END),
    COUNT(CASE WHEN status = 'failed' THEN 1 END),
    COALESCE(SUM(amount), 0)
  INTO v_total, v_completed, v_pending, v_failed, v_total_amount
  FROM payment_transactions;
  
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ AUTOMATIC PAYMENT SYNC ENABLED';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Total Transactions: %', v_total;
  RAISE NOTICE '  - Completed: %', v_completed;
  RAISE NOTICE '  - Pending: %', v_pending;
  RAISE NOTICE '  - Failed: %', v_failed;
  RAISE NOTICE '';
  RAISE NOTICE 'Total Amount: % TZS', v_total_amount;
  RAISE NOTICE '';
  RAISE NOTICE '🔄 TRIGGERS ACTIVE:';
  RAISE NOTICE '  ✅ Sales → Payment Transactions (auto-sync)';
  RAISE NOTICE '  ✅ Customer Payments → Payment Transactions (auto-sync)';
  RAISE NOTICE '';
  RAISE NOTICE '📊 All future sales will automatically create payment transactions';
  RAISE NOTICE '🔄 Refresh your browser to see the payment history';
  RAISE NOTICE '================================================';
END $$;

-- Show recent transactions
SELECT 
  order_id,
  provider,
  amount,
  status,
  customer_name,
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
FROM payment_transactions
ORDER BY created_at DESC
LIMIT 10;

