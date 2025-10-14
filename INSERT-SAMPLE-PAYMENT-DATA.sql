-- ================================================================
-- SAMPLE PAYMENT DATA GENERATOR
-- Inserts realistic payment data across different days, times, and methods
-- to test Payment Management Dashboard graphs
-- ================================================================

-- Clean up existing sample data (optional - comment out if you want to keep existing data)
-- DELETE FROM payment_transactions WHERE reference LIKE 'SAMPLE-%';
-- DELETE FROM purchase_order_payments WHERE reference LIKE 'SAMPLE-%';
-- DELETE FROM customer_payments WHERE reference LIKE 'SAMPLE-%';

-- ================================================================
-- 1. INSERT SAMPLE PAYMENT TRANSACTIONS
-- Spanning last 90 days with various payment methods and statuses
-- ================================================================

-- Insert 200+ sample payment transactions
WITH date_series AS (
  SELECT 
    CURRENT_DATE - (n || ' days')::INTERVAL AS payment_date,
    n AS day_offset
  FROM generate_series(0, 89) AS n
),
hour_series AS (
  SELECT h AS hour
  FROM generate_series(8, 20) AS h -- Business hours 8 AM to 8 PM
),
sample_data AS (
  SELECT 
    ds.payment_date + (hs.hour || ' hours')::INTERVAL AS created_at,
    ds.payment_date AS payment_date,
    hs.hour,
    -- Vary amounts realistically
    CASE 
      WHEN RANDOM() < 0.3 THEN 50000 + (RANDOM() * 100000)::INTEGER  -- Small: 50K-150K
      WHEN RANDOM() < 0.7 THEN 150000 + (RANDOM() * 350000)::INTEGER -- Medium: 150K-500K
      ELSE 500000 + (RANDOM() * 1500000)::INTEGER                     -- Large: 500K-2M
    END AS amount,
    -- Vary payment methods
    CASE (RANDOM() * 4)::INTEGER
      WHEN 0 THEN 'cash'
      WHEN 1 THEN 'mobile_money'
      WHEN 2 THEN 'card'
      ELSE 'bank_transfer'
    END AS payment_method,
    -- Vary status (mostly completed, some pending, few failed)
    CASE 
      WHEN RANDOM() < 0.85 THEN 'completed'
      WHEN RANDOM() < 0.93 THEN 'pending'
      ELSE 'failed'
    END AS status,
    -- Vary providers for mobile money
    CASE (RANDOM() * 3)::INTEGER
      WHEN 0 THEN 'M-Pesa'
      WHEN 1 THEN 'Tigo Pesa'
      ELSE 'Airtel Money'
    END AS provider,
    'TZS' AS currency
  FROM date_series ds
  CROSS JOIN hour_series hs
  WHERE RANDOM() < 0.4 -- ~40% of possible combinations to create realistic gaps
)
INSERT INTO payment_transactions (
  order_id,
  amount,
  currency,
  payment_method,
  provider,
  status,
  reference,
  transaction_id,
  customer_name,
  customer_email,
  customer_phone,
  metadata,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid()::TEXT AS order_id,
  amount,
  currency,
  payment_method,
  provider,
  status,
  'SAMPLE-PT-' || TO_CHAR(created_at, 'YYYYMMDD') || '-' || LPAD((ROW_NUMBER() OVER (PARTITION BY DATE(created_at) ORDER BY created_at))::TEXT, 4, '0') AS reference,
  'TXN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 12)) AS transaction_id,
  'Sample Customer ' || (1 + (RANDOM() * 50)::INTEGER)::TEXT AS customer_name,
  'customer' || (1 + (RANDOM() * 50)::INTEGER)::TEXT || '@example.com' AS customer_email,
  '+255' || (700000000 + (RANDOM() * 99999999)::INTEGER)::TEXT AS customer_phone,
  jsonb_build_object(
    'sample_data', true,
    'day_of_week', TO_CHAR(created_at, 'Day'),
    'hour', hour,
    'payment_type', 'pos_sale'
  ) AS metadata,
  created_at,
  created_at AS updated_at
FROM sample_data
ON CONFLICT (transaction_id) DO NOTHING;

-- ================================================================
-- 2. INSERT SAMPLE PURCHASE ORDER PAYMENTS
-- Spanning last 60 days
-- ================================================================

WITH date_series AS (
  SELECT 
    CURRENT_DATE - (n || ' days')::INTERVAL AS payment_date,
    n AS day_offset
  FROM generate_series(0, 59) AS n
),
sample_po_payments AS (
  SELECT 
    ds.payment_date + ((8 + RANDOM() * 10)::INTEGER || ' hours')::INTERVAL AS created_at,
    ds.payment_date AS payment_date,
    -- Larger amounts for purchase orders
    500000 + (RANDOM() * 5000000)::INTEGER AS amount,
    -- Mostly bank transfers and mobile money for POs
    CASE (RANDOM() * 2)::INTEGER
      WHEN 0 THEN 'bank_transfer'
      ELSE 'mobile_money'
    END AS payment_method,
    -- Mostly completed
    CASE 
      WHEN RANDOM() < 0.90 THEN 'completed'
      WHEN RANDOM() < 0.95 THEN 'pending'
      ELSE 'cancelled'
    END AS status,
    'TZS' AS currency
  FROM date_series ds
  WHERE RANDOM() < 0.5 -- ~50% of days have PO payments
)
INSERT INTO purchase_order_payments (
  purchase_order_id,
  amount,
  currency,
  payment_method,
  status,
  payment_date,
  reference,
  notes,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid() AS purchase_order_id,
  amount,
  currency,
  payment_method,
  status,
  payment_date,
  'SAMPLE-POP-' || TO_CHAR(created_at, 'YYYYMMDD') || '-' || LPAD((ROW_NUMBER() OVER (PARTITION BY DATE(created_at) ORDER BY created_at))::TEXT, 3, '0') AS reference,
  'Sample purchase order payment for testing - ' || payment_method AS notes,
  created_at,
  created_at AS updated_at
FROM sample_po_payments
ON CONFLICT DO NOTHING;

-- ================================================================
-- 3. INSERT SAMPLE CUSTOMER PAYMENTS (if table exists and has required columns)
-- Spanning last 30 days
-- ================================================================

-- First check if customer_payments table exists and has the right structure
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'customer_payments'
  ) THEN
    -- Insert sample customer payments
    INSERT INTO customer_payments (
      customer_id,
      amount,
      payment_method,
      status,
      payment_date,
      reference,
      notes,
      created_at,
      updated_at
    )
    SELECT 
      gen_random_uuid() AS customer_id,
      -- Varied amounts
      (20000 + (RANDOM() * 200000)::INTEGER) AS amount,
      -- Payment methods
      CASE (RANDOM() * 3)::INTEGER
        WHEN 0 THEN 'cash'
        WHEN 1 THEN 'mobile_money'
        ELSE 'card'
      END AS payment_method,
      -- Status
      CASE 
        WHEN RANDOM() < 0.92 THEN 'completed'
        WHEN RANDOM() < 0.97 THEN 'pending'
        ELSE 'failed'
      END AS status,
      -- Date in last 30 days
      (CURRENT_DATE - ((RANDOM() * 30)::INTEGER || ' days')::INTERVAL)::DATE AS payment_date,
      'SAMPLE-CP-' || TO_CHAR(NOW() - ((RANDOM() * 30)::INTEGER || ' days')::INTERVAL, 'YYYYMMDD') || '-' || LPAD((RANDOM() * 9999)::INTEGER::TEXT, 4, '0') AS reference,
      'Sample customer payment for testing' AS notes,
      (NOW() - ((RANDOM() * 30)::INTEGER || ' days')::INTERVAL) AS created_at,
      (NOW() - ((RANDOM() * 30)::INTEGER || ' days')::INTERVAL) AS updated_at
    FROM generate_series(1, 100) -- 100 customer payments
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '✅ Inserted sample customer payments';
  ELSE
    RAISE NOTICE 'ℹ️ customer_payments table not found, skipping';
  END IF;
END $$;

-- ================================================================
-- 4. INSERT SAMPLE FAILED PAYMENT DATA (for failed payment analysis)
-- ================================================================

INSERT INTO payment_transactions (
  order_id,
  amount,
  currency,
  payment_method,
  provider,
  status,
  reference,
  transaction_id,
  customer_name,
  customer_email,
  metadata,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid()::TEXT AS order_id,
  (50000 + (RANDOM() * 300000)::INTEGER) AS amount,
  'TZS' AS currency,
  CASE (RANDOM() * 2)::INTEGER
    WHEN 0 THEN 'mobile_money'
    ELSE 'card'
  END AS payment_method,
  CASE (RANDOM() * 3)::INTEGER
    WHEN 0 THEN 'M-Pesa'
    WHEN 1 THEN 'Tigo Pesa'
    ELSE 'Visa/Mastercard'
  END AS provider,
  'failed' AS status,
  'SAMPLE-FAILED-' || LPAD(n::TEXT, 3, '0') AS reference,
  'TXN-FAILED-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 10)) AS transaction_id,
  'Customer ' || (1 + (RANDOM() * 30)::INTEGER)::TEXT AS customer_name,
  'customer' || (1 + (RANDOM() * 30)::INTEGER)::TEXT || '@example.com' AS customer_email,
  jsonb_build_object(
    'sample_data', true,
    'failure_reason', CASE (RANDOM() * 4)::INTEGER
      WHEN 0 THEN 'Insufficient Funds'
      WHEN 1 THEN 'Network Timeout'
      WHEN 2 THEN 'Invalid Card'
      ELSE 'Transaction Declined'
    END,
    'payment_type', 'failed_test'
  ) AS metadata,
  (NOW() - ((RANDOM() * 30)::INTEGER || ' days')::INTERVAL - ((RANDOM() * 12)::INTEGER || ' hours')::INTERVAL) AS created_at,
  (NOW() - ((RANDOM() * 30)::INTEGER || ' days')::INTERVAL - ((RANDOM() * 12)::INTEGER || ' hours')::INTERVAL) AS updated_at
FROM generate_series(1, 15) AS n -- 15 failed payments with different reasons
ON CONFLICT (transaction_id) DO NOTHING;

-- ================================================================
-- 5. SUMMARY STATISTICS
-- ================================================================

DO $$
DECLARE
  pt_count INTEGER;
  pop_count INTEGER;
  cp_count INTEGER;
  total_amount NUMERIC;
  failed_count INTEGER;
BEGIN
  -- Count payment_transactions
  SELECT COUNT(*), COALESCE(SUM(amount), 0), COUNT(*) FILTER (WHERE status = 'failed')
  INTO pt_count, total_amount, failed_count
  FROM payment_transactions
  WHERE reference LIKE 'SAMPLE-%';
  
  -- Count purchase_order_payments
  SELECT COUNT(*)
  INTO pop_count
  FROM purchase_order_payments
  WHERE reference LIKE 'SAMPLE-%';
  
  -- Count customer_payments (if exists)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customer_payments') THEN
    SELECT COUNT(*)
    INTO cp_count
    FROM customer_payments
    WHERE reference LIKE 'SAMPLE-%';
  ELSE
    cp_count := 0;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SAMPLE DATA INSERTION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Payment Transactions: % records', pt_count;
  RAISE NOTICE '📦 Purchase Order Payments: % records', pop_count;
  RAISE NOTICE '👥 Customer Payments: % records', cp_count;
  RAISE NOTICE '💰 Total Sample Amount: TZS %', TO_CHAR(total_amount, 'FM999,999,999,999');
  RAISE NOTICE '❌ Failed Payments: % records', failed_count;
  RAISE NOTICE '';
  RAISE NOTICE '📈 CHARTS THAT WILL NOW DISPLAY:';
  RAISE NOTICE '   ✅ Daily Performance (last 7-30 days)';
  RAISE NOTICE '   ✅ Monthly Trends (last 3 months)';
  RAISE NOTICE '   ✅ Hourly Trends (8 AM - 8 PM)';
  RAISE NOTICE '   ✅ Payment Methods Distribution';
  RAISE NOTICE '   ✅ Payment Status Breakdown';
  RAISE NOTICE '   ✅ Failed Payment Analysis';
  RAISE NOTICE '   ✅ Currency Usage (TZS)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next Steps:';
  RAISE NOTICE '   1. Refresh Payment Management dashboard';
  RAISE NOTICE '   2. Navigate to Tracking tab';
  RAISE NOTICE '   3. All 11 graphs should now display data';
  RAISE NOTICE '';
  RAISE NOTICE '🗑️  To Remove Sample Data Later:';
  RAISE NOTICE '   DELETE FROM payment_transactions WHERE reference LIKE ''SAMPLE-%'';';
  RAISE NOTICE '   DELETE FROM purchase_order_payments WHERE reference LIKE ''SAMPLE-%'';';
  RAISE NOTICE '   DELETE FROM customer_payments WHERE reference LIKE ''SAMPLE-%'';';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

-- ================================================================
-- 6. VERIFICATION QUERIES
-- ================================================================

-- Uncomment to see sample data distribution

-- Payment methods distribution
-- SELECT 
--   payment_method,
--   status,
--   COUNT(*) as count,
--   TO_CHAR(SUM(amount), 'FM999,999,999') as total_amount
-- FROM payment_transactions
-- WHERE reference LIKE 'SAMPLE-%'
-- GROUP BY payment_method, status
-- ORDER BY payment_method, status;

-- Daily distribution (last 30 days)
-- SELECT 
--   DATE(created_at) as payment_date,
--   COUNT(*) as transactions,
--   TO_CHAR(SUM(amount), 'FM999,999,999') as total_amount
-- FROM payment_transactions
-- WHERE reference LIKE 'SAMPLE-%'
--   AND created_at >= CURRENT_DATE - INTERVAL '30 days'
-- GROUP BY DATE(created_at)
-- ORDER BY payment_date DESC
-- LIMIT 30;

-- Hourly distribution
-- SELECT 
--   EXTRACT(HOUR FROM created_at) as hour,
--   COUNT(*) as transactions,
--   TO_CHAR(AVG(amount), 'FM999,999') as avg_amount
-- FROM payment_transactions
-- WHERE reference LIKE 'SAMPLE-%'
-- GROUP BY EXTRACT(HOUR FROM created_at)
-- ORDER BY hour;

-- Failed payments analysis
-- SELECT 
--   metadata->>'failure_reason' as failure_reason,
--   COUNT(*) as failure_count,
--   TO_CHAR(SUM(amount), 'FM999,999,999') as total_amount
-- FROM payment_transactions
-- WHERE reference LIKE 'SAMPLE-%'
--   AND status = 'failed'
--   AND metadata ? 'failure_reason'
-- GROUP BY metadata->>'failure_reason'
-- ORDER BY failure_count DESC;

