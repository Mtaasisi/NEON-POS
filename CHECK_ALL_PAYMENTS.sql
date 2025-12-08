-- ============================================================================
-- CHECK ALL PAYMENTS IN DATABASE
-- ============================================================================
-- This script checks if all payments are being recorded correctly
-- Checks all payment tables and verifies branch_id assignment
-- ============================================================================

DO $$
DECLARE
  current_branch_id UUID := '4cc81573-e86c-484b-a487-9d7a63a1b9e9'::UUID;
  rec RECORD;
  
  -- Customer payments
  total_customer_payments INT;
  customer_payments_with_branch INT;
  customer_payments_null_branch INT;
  customer_payments_shared INT;
  
  -- Purchase order payments
  total_po_payments INT;
  po_payments_with_branch INT;
  po_payments_null_branch INT;
  
  -- Payment transactions
  total_payment_transactions INT;
  payment_transactions_with_branch INT;
  payment_transactions_null_branch INT;
  payment_transactions_shared INT;
  payment_transactions_metadata_branch INT;
  
  -- Account transactions
  total_account_transactions INT;
  account_transactions_with_branch INT;
  account_transactions_null_branch INT;
  
  -- Sales (which generate payments)
  total_sales INT;
  sales_with_payments INT;
  sales_without_payments INT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CHECKING ALL PAYMENTS IN DATABASE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Current Branch ID: %', current_branch_id;
  RAISE NOTICE '';
  
  -- ============================================================================
  -- 1. CUSTOMER PAYMENTS (Device payments, repair payments, etc.)
  -- ============================================================================
  RAISE NOTICE '========================================';
  RAISE NOTICE '1. CUSTOMER PAYMENTS';
  RAISE NOTICE '========================================';
  
  SELECT COUNT(*) INTO total_customer_payments FROM customer_payments;
  RAISE NOTICE '📊 Total customer_payments: %', total_customer_payments;
  
  SELECT COUNT(*) INTO customer_payments_with_branch 
  FROM customer_payments 
  WHERE branch_id IS NOT NULL;
  RAISE NOTICE '📊 Customer payments with branch_id: %', customer_payments_with_branch;
  
  SELECT COUNT(*) INTO customer_payments_null_branch 
  FROM customer_payments 
  WHERE branch_id IS NULL;
  RAISE NOTICE '📊 Customer payments with NULL branch_id: %', customer_payments_null_branch;
  
  SELECT COUNT(*) INTO customer_payments_shared 
  FROM customer_payments 
  WHERE is_shared = true;
  RAISE NOTICE '📊 Customer payments with is_shared = true: %', customer_payments_shared;
  
  -- Show recent customer payments
  IF total_customer_payments > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE 'Recent customer payments (last 5):';
    FOR rec IN 
      SELECT id, amount, payment_method, branch_id, is_shared, created_at
      FROM customer_payments
      ORDER BY created_at DESC
      LIMIT 5
    LOOP
      RAISE NOTICE '  Payment: % % (Method: %, Branch: %, Shared: %)',
        rec.amount,
        COALESCE(rec.payment_method, 'N/A'),
        COALESCE(rec.branch_id::TEXT, 'NULL'),
        COALESCE(rec.is_shared::TEXT, 'NULL'),
        rec.created_at;
    END LOOP;
  END IF;
  
  -- ============================================================================
  -- 2. PURCHASE ORDER PAYMENTS
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '2. PURCHASE ORDER PAYMENTS';
  RAISE NOTICE '========================================';
  
  SELECT COUNT(*) INTO total_po_payments FROM purchase_order_payments;
  RAISE NOTICE '📊 Total purchase_order_payments: %', total_po_payments;
  
  SELECT COUNT(*) INTO po_payments_with_branch 
  FROM purchase_order_payments 
  WHERE branch_id IS NOT NULL;
  RAISE NOTICE '📊 PO payments with branch_id: %', po_payments_with_branch;
  
  SELECT COUNT(*) INTO po_payments_null_branch 
  FROM purchase_order_payments 
  WHERE branch_id IS NULL;
  RAISE NOTICE '📊 PO payments with NULL branch_id: %', po_payments_null_branch;
  
  -- Show recent PO payments
  IF total_po_payments > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE 'Recent PO payments (last 5):';
    FOR rec IN 
      SELECT id, amount, payment_method, branch_id, created_at
      FROM purchase_order_payments
      ORDER BY created_at DESC
      LIMIT 5
    LOOP
      RAISE NOTICE '  Payment: % % (Method: %, Branch: %)',
        rec.amount,
        COALESCE(rec.payment_method, 'N/A'),
        COALESCE(rec.branch_id::TEXT, 'NULL'),
        rec.created_at;
    END LOOP;
  END IF;
  
  -- ============================================================================
  -- 3. PAYMENT TRANSACTIONS (General payment tracking)
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '3. PAYMENT TRANSACTIONS';
  RAISE NOTICE '========================================';
  
  SELECT COUNT(*) INTO total_payment_transactions FROM payment_transactions;
  RAISE NOTICE '📊 Total payment_transactions: %', total_payment_transactions;
  
  SELECT COUNT(*) INTO payment_transactions_with_branch 
  FROM payment_transactions 
  WHERE branch_id IS NOT NULL;
  RAISE NOTICE '📊 Payment transactions with branch_id: %', payment_transactions_with_branch;
  
  SELECT COUNT(*) INTO payment_transactions_null_branch 
  FROM payment_transactions 
  WHERE branch_id IS NULL;
  RAISE NOTICE '📊 Payment transactions with NULL branch_id: %', payment_transactions_null_branch;
  
  SELECT COUNT(*) INTO payment_transactions_shared 
  FROM payment_transactions 
  WHERE is_shared = true;
  RAISE NOTICE '📊 Payment transactions with is_shared = true: %', payment_transactions_shared;
  
  -- Check if branch_id is in metadata instead
  SELECT COUNT(*) INTO payment_transactions_metadata_branch
  FROM payment_transactions
  WHERE metadata->>'branch_id' IS NOT NULL;
  RAISE NOTICE '📊 Payment transactions with branch_id in metadata: %', payment_transactions_metadata_branch;
  
  -- Show recent payment transactions
  IF total_payment_transactions > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE 'Recent payment transactions (last 5):';
    FOR rec IN 
      SELECT id, amount, provider, status, branch_id, metadata, created_at
      FROM payment_transactions
      ORDER BY created_at DESC
      LIMIT 5
    LOOP
      RAISE NOTICE '  Transaction: % % (Provider: %, Status: %, Branch: %)',
        rec.amount,
        COALESCE(rec.provider, 'N/A'),
        rec.status,
        COALESCE(rec.branch_id::TEXT, rec.metadata->>'branch_id', 'NULL'),
        rec.created_at;
    END LOOP;
  END IF;
  
  -- ============================================================================
  -- 4. ACCOUNT TRANSACTIONS (Finance account transactions)
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '4. ACCOUNT TRANSACTIONS';
  RAISE NOTICE '========================================';
  
  SELECT COUNT(*) INTO total_account_transactions FROM account_transactions;
  RAISE NOTICE '📊 Total account_transactions: %', total_account_transactions;
  
  SELECT COUNT(*) INTO account_transactions_with_branch 
  FROM account_transactions 
  WHERE branch_id IS NOT NULL;
  RAISE NOTICE '📊 Account transactions with branch_id: %', account_transactions_with_branch;
  
  SELECT COUNT(*) INTO account_transactions_null_branch 
  FROM account_transactions 
  WHERE branch_id IS NULL;
  RAISE NOTICE '📊 Account transactions with NULL branch_id: %', account_transactions_null_branch;
  
  -- Show recent account transactions
  IF total_account_transactions > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE 'Recent account transactions (last 5):';
    FOR rec IN 
      SELECT id, amount, transaction_type, branch_id, created_at
      FROM account_transactions
      ORDER BY created_at DESC
      LIMIT 5
    LOOP
      RAISE NOTICE '  Transaction: % % (Type: %, Branch: %)',
        rec.amount,
        rec.transaction_type,
        COALESCE(rec.branch_id::TEXT, 'NULL'),
        rec.created_at;
    END LOOP;
  END IF;
  
  -- ============================================================================
  -- 5. SALES (POS Sales - which should generate payments)
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '5. SALES (POS Sales)';
  RAISE NOTICE '========================================';
  
  SELECT COUNT(*) INTO total_sales FROM lats_sales;
  RAISE NOTICE '📊 Total sales: %', total_sales;
  
  -- Sales with payment information
  -- Note: payment_method is JSONB, so we check if it's not null
  SELECT COUNT(*) INTO sales_with_payments
  FROM lats_sales
  WHERE payment_status IS NOT NULL 
    OR payment_method IS NOT NULL
    OR total_amount > 0;
  RAISE NOTICE '📊 Sales with payment info: %', sales_with_payments;
  
  -- Sales without payment information
  -- payment_method is JSONB, so we only check if it's NULL
  SELECT COUNT(*) INTO sales_without_payments
  FROM lats_sales
  WHERE (payment_status IS NULL OR payment_status = '')
    AND payment_method IS NULL
    AND total_amount = 0;
  RAISE NOTICE '📊 Sales without payment info: %', sales_without_payments;
  
  -- Show recent sales
  IF total_sales > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE 'Recent sales (last 5):';
    FOR rec IN 
      SELECT 
        id, 
        sale_number, 
        total_amount, 
        payment_method, 
        payment_status, 
        branch_id, 
        created_at,
        -- Safely extract payment method from JSONB
        CASE 
          WHEN payment_method IS NULL THEN 'N/A'
          WHEN payment_method::text = 'null' THEN 'N/A'
          WHEN payment_method ? 'name' THEN payment_method->>'name'
          WHEN payment_method ? 'method' THEN payment_method->>'method'
          WHEN payment_method ? 'type' THEN payment_method->>'type'
          ELSE 'JSON'
        END as payment_method_display
      FROM lats_sales
      ORDER BY created_at DESC
      LIMIT 5
    LOOP
      RAISE NOTICE '  Sale: % - % % (Method: %, Status: %, Branch: %)',
        rec.sale_number,
        rec.total_amount,
        rec.payment_method_display,
        COALESCE(rec.payment_status, 'N/A'),
        COALESCE(rec.branch_id::TEXT, 'NULL'),
        rec.created_at;
    END LOOP;
  END IF;
  
  -- ============================================================================
  -- 6. SUMMARY AND RECOMMENDATIONS
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Payment Tables Summary:';
  RAISE NOTICE '  - customer_payments: % total (% with branch_id, % NULL)', 
    total_customer_payments, customer_payments_with_branch, customer_payments_null_branch;
  RAISE NOTICE '  - purchase_order_payments: % total (% with branch_id, % NULL)', 
    total_po_payments, po_payments_with_branch, po_payments_null_branch;
  RAISE NOTICE '  - payment_transactions: % total (% with branch_id, % NULL)', 
    total_payment_transactions, payment_transactions_with_branch, payment_transactions_null_branch;
  RAISE NOTICE '  - account_transactions: % total (% with branch_id, % NULL)', 
    total_account_transactions, account_transactions_with_branch, account_transactions_null_branch;
  RAISE NOTICE '  - sales: % total', total_sales;
  RAISE NOTICE '';
  
  -- Check for issues
  IF customer_payments_null_branch > 0 THEN
    RAISE WARNING '⚠️ Found % customer_payments with NULL branch_id', customer_payments_null_branch;
    RAISE NOTICE '💡 Run FIX_PAYMENTS_BRANCH_ID.sql to fix this';
  END IF;
  
  IF po_payments_null_branch > 0 THEN
    RAISE WARNING '⚠️ Found % purchase_order_payments with NULL branch_id', po_payments_null_branch;
    RAISE NOTICE '💡 Run FIX_PAYMENTS_BRANCH_ID.sql to fix this';
  END IF;
  
  IF payment_transactions_null_branch > 0 THEN
    RAISE WARNING '⚠️ Found % payment_transactions with NULL branch_id', payment_transactions_null_branch;
    RAISE NOTICE '💡 Run FIX_PAYMENTS_BRANCH_ID.sql to fix this';
  END IF;
  
  IF account_transactions_null_branch > 0 THEN
    RAISE WARNING '⚠️ Found % account_transactions with NULL branch_id', account_transactions_null_branch;
    RAISE NOTICE '💡 Run FIX_PAYMENTS_BRANCH_ID.sql to fix this';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Payment check complete!';
  
END $$;

-- Show payment totals by branch
SELECT 
  'customer_payments' as payment_type,
  COALESCE(branch_id::TEXT, 'NULL') as branch_id,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM customer_payments
GROUP BY branch_id
ORDER BY count DESC;

SELECT 
  'purchase_order_payments' as payment_type,
  COALESCE(branch_id::TEXT, 'NULL') as branch_id,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM purchase_order_payments
GROUP BY branch_id
ORDER BY count DESC;

SELECT 
  'payment_transactions' as payment_type,
  branch_id_display as branch_id,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM (
  SELECT 
    amount,
    COALESCE(branch_id::TEXT, metadata->>'branch_id', 'NULL') as branch_id_display
  FROM payment_transactions
) subq
GROUP BY branch_id_display
ORDER BY count DESC;
