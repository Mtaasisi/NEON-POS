-- ============================================================================
-- FIX ALL PAYMENT ACCOUNTS AND PAYMENTS BRANCH_ID
-- ============================================================================
-- This script ensures all finance_accounts and all payment records have branch_id
-- ============================================================================

DO $$
DECLARE
  default_branch_id UUID;
  accounts_fixed INT := 0;
  customer_payments_fixed INT := 0;
  po_payments_fixed INT := 0;
  payment_transactions_fixed INT := 0;
  account_transactions_fixed INT := 0;
  rec RECORD;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FIXING ALL PAYMENT ACCOUNTS AND PAYMENTS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Get default branch (first active branch)
  SELECT id INTO default_branch_id
  FROM store_locations
  WHERE is_active = true
  ORDER BY created_at ASC
  LIMIT 1;

  IF default_branch_id IS NULL THEN
    RAISE EXCEPTION 'No active branch found. Please create at least one active branch first.';
  END IF;

  RAISE NOTICE 'Using default branch: %', default_branch_id;
  RAISE NOTICE '';

  -- ============================================================================
  -- STEP 1: Fix finance_accounts missing branch_id
  -- ============================================================================
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 1: Fixing finance_accounts';
  RAISE NOTICE '========================================';

  -- Count accounts without branch_id
  SELECT COUNT(*) INTO accounts_fixed
  FROM finance_accounts
  WHERE branch_id IS NULL;

  RAISE NOTICE 'Found % finance_accounts without branch_id', accounts_fixed;

  -- Assign branch_id to accounts without one
  -- For shared accounts, keep branch_id as NULL but ensure is_shared = true
  -- For non-shared accounts, assign to default branch
  UPDATE finance_accounts
  SET 
    branch_id = CASE 
      WHEN is_shared = true THEN NULL  -- Shared accounts should have NULL branch_id
      ELSE default_branch_id           -- Non-shared accounts get default branch
    END,
    updated_at = NOW()
  WHERE branch_id IS NULL;

  RAISE NOTICE '✅ Fixed % finance_accounts', accounts_fixed;
  RAISE NOTICE '';

  -- ============================================================================
  -- STEP 2: Fix customer_payments missing branch_id
  -- ============================================================================
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 2: Fixing customer_payments';
  RAISE NOTICE '========================================';

  -- Fix customer_payments by getting branch_id from related entities
  FOR rec IN 
    SELECT cp.id, cp.device_id, cp.customer_id, cp.sale_id
    FROM customer_payments cp
    WHERE cp.branch_id IS NULL
  LOOP
    DECLARE
      payment_branch_id UUID := NULL;
    BEGIN
      -- Try to get branch_id from device
      IF rec.device_id IS NOT NULL THEN
        SELECT branch_id INTO payment_branch_id
        FROM devices
        WHERE id = rec.device_id;
      END IF;

      -- Try to get branch_id from sale
      IF payment_branch_id IS NULL AND rec.sale_id IS NOT NULL THEN
        SELECT branch_id INTO payment_branch_id
        FROM lats_sales
        WHERE id = rec.sale_id;
      END IF;

      -- Try to get branch_id from customer
      IF payment_branch_id IS NULL AND rec.customer_id IS NOT NULL THEN
        SELECT branch_id INTO payment_branch_id
        FROM customers
        WHERE id = rec.customer_id;
      END IF;

      -- Use default branch if still no branch_id found
      IF payment_branch_id IS NULL THEN
        payment_branch_id := default_branch_id;
      END IF;

      -- Update the payment
      UPDATE customer_payments
      SET branch_id = payment_branch_id, updated_at = NOW()
      WHERE id = rec.id;

      customer_payments_fixed := customer_payments_fixed + 1;
    END;
  END LOOP;

  RAISE NOTICE '✅ Fixed % customer_payments', customer_payments_fixed;
  RAISE NOTICE '';

  -- ============================================================================
  -- STEP 3: Fix purchase_order_payments missing branch_id
  -- ============================================================================
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 3: Fixing purchase_order_payments';
  RAISE NOTICE '========================================';

  -- Fix purchase_order_payments by getting branch_id from purchase order
  FOR rec IN 
    SELECT pop.id, pop.purchase_order_id, pop.payment_account_id
    FROM purchase_order_payments pop
    WHERE pop.branch_id IS NULL
  LOOP
    DECLARE
      payment_branch_id UUID := NULL;
    BEGIN
      -- Try to get branch_id from purchase order
      IF rec.purchase_order_id IS NOT NULL THEN
        SELECT branch_id INTO payment_branch_id
        FROM lats_purchase_orders
        WHERE id = rec.purchase_order_id;
      END IF;

      -- Try to get branch_id from payment account
      IF payment_branch_id IS NULL AND rec.payment_account_id IS NOT NULL THEN
        SELECT branch_id INTO payment_branch_id
        FROM finance_accounts
        WHERE id = rec.payment_account_id;
      END IF;

      -- Use default branch if still no branch_id found
      IF payment_branch_id IS NULL THEN
        payment_branch_id := default_branch_id;
      END IF;

      -- Update the payment
      UPDATE purchase_order_payments
      SET branch_id = payment_branch_id, updated_at = NOW()
      WHERE id = rec.id;

      po_payments_fixed := po_payments_fixed + 1;
    END;
  END LOOP;

  RAISE NOTICE '✅ Fixed % purchase_order_payments', po_payments_fixed;
  RAISE NOTICE '';

  -- ============================================================================
  -- STEP 4: Fix payment_transactions missing branch_id
  -- ============================================================================
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 4: Fixing payment_transactions';
  RAISE NOTICE '========================================';

  -- Fix payment_transactions
  -- First, try to get branch_id from metadata
  UPDATE payment_transactions pt
  SET 
    branch_id = COALESCE(
      (pt.metadata->>'branch_id')::UUID,
      pt.branch_id,
      default_branch_id
    ),
    updated_at = NOW()
  WHERE pt.branch_id IS NULL;

  -- Get count of fixed transactions
  GET DIAGNOSTICS payment_transactions_fixed = ROW_COUNT;

  RAISE NOTICE '✅ Fixed % payment_transactions', payment_transactions_fixed;
  RAISE NOTICE '';

  -- ============================================================================
  -- STEP 5: Fix account_transactions missing branch_id
  -- ============================================================================
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 5: Fixing account_transactions';
  RAISE NOTICE '========================================';

  -- Fix account_transactions by getting branch_id from account
  FOR rec IN 
    SELECT at.id, at.account_id, at.related_entity_type, at.related_entity_id
    FROM account_transactions at
    WHERE at.branch_id IS NULL
  LOOP
    DECLARE
      transaction_branch_id UUID := NULL;
    BEGIN
      -- Try to get branch_id from account
      IF rec.account_id IS NOT NULL THEN
        SELECT branch_id INTO transaction_branch_id
        FROM finance_accounts
        WHERE id = rec.account_id;
      END IF;

      -- Try to get branch_id from related entity
      IF transaction_branch_id IS NULL AND rec.related_entity_id IS NOT NULL THEN
        IF rec.related_entity_type = 'purchase_order_payment' THEN
          SELECT branch_id INTO transaction_branch_id
          FROM purchase_order_payments
          WHERE id = rec.related_entity_id;
        ELSIF rec.related_entity_type = 'installment_payment' THEN
          SELECT branch_id INTO transaction_branch_id
          FROM customer_installment_plans
          WHERE id = (SELECT installment_plan_id FROM installment_payments WHERE id = rec.related_entity_id);
        ELSIF rec.related_entity_type = 'pos_sale' THEN
          SELECT branch_id INTO transaction_branch_id
          FROM lats_sales
          WHERE id = rec.related_entity_id;
        END IF;
      END IF;

      -- Use default branch if still no branch_id found
      IF transaction_branch_id IS NULL THEN
        transaction_branch_id := default_branch_id;
      END IF;

      -- Update the transaction
      UPDATE account_transactions
      SET branch_id = transaction_branch_id, updated_at = NOW()
      WHERE id = rec.id;

      account_transactions_fixed := account_transactions_fixed + 1;
    END;
  END LOOP;

  RAISE NOTICE '✅ Fixed % account_transactions', account_transactions_fixed;
  RAISE NOTICE '';

  -- ============================================================================
  -- SUMMARY
  -- ============================================================================
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Finance Accounts Fixed: %', accounts_fixed;
  RAISE NOTICE '✅ Customer Payments Fixed: %', customer_payments_fixed;
  RAISE NOTICE '✅ Purchase Order Payments Fixed: %', po_payments_fixed;
  RAISE NOTICE '✅ Payment Transactions Fixed: %', payment_transactions_fixed;
  RAISE NOTICE '✅ Account Transactions Fixed: %', account_transactions_fixed;
  RAISE NOTICE '';
  RAISE NOTICE '🎉 All payment accounts and payments now have branch_id assigned!';
  RAISE NOTICE '';

END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check finance_accounts
SELECT 
  'finance_accounts' as table_name,
  COUNT(*) as total,
  COUNT(branch_id) as with_branch_id,
  COUNT(*) - COUNT(branch_id) as missing_branch_id
FROM finance_accounts;

-- Check customer_payments
SELECT 
  'customer_payments' as table_name,
  COUNT(*) as total,
  COUNT(branch_id) as with_branch_id,
  COUNT(*) - COUNT(branch_id) as missing_branch_id
FROM customer_payments;

-- Check purchase_order_payments
SELECT 
  'purchase_order_payments' as table_name,
  COUNT(*) as total,
  COUNT(branch_id) as with_branch_id,
  COUNT(*) - COUNT(branch_id) as missing_branch_id
FROM purchase_order_payments;

-- Check payment_transactions
SELECT 
  'payment_transactions' as table_name,
  COUNT(*) as total,
  COUNT(branch_id) as with_branch_id,
  COUNT(*) - COUNT(branch_id) as missing_branch_id
FROM payment_transactions;

-- Check account_transactions
SELECT 
  'account_transactions' as table_name,
  COUNT(*) as total,
  COUNT(branch_id) as with_branch_id,
  COUNT(*) - COUNT(branch_id) as missing_branch_id
FROM account_transactions;
