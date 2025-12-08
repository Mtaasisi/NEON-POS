-- ============================================================================
-- FIX PAYMENTS - Add Missing branch_id
-- ============================================================================
-- This script fixes payments that are missing branch_id
-- Assigns branch_id from related records (sales, purchase orders, etc.)
-- ============================================================================

DO $$
DECLARE
  target_branch_id UUID := '4cc81573-e86c-484b-a487-9d7a63a1b9e9'::UUID;
  customers_updated INT := 0;
  po_payments_updated INT := 0;
  payment_transactions_updated INT := 0;
  account_transactions_updated INT := 0;
  temp_count INT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FIXING PAYMENTS - Adding branch_id';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Target Branch ID: %', target_branch_id;
  RAISE NOTICE '';
  
  -- ============================================================================
  -- 1. FIX CUSTOMER PAYMENTS
  -- ============================================================================
  RAISE NOTICE '1. Fixing customer_payments...';
  
  -- Update customer_payments from related sales
  UPDATE customer_payments cp
  SET 
    branch_id = COALESCE(cp.branch_id, s.branch_id, target_branch_id),
    is_shared = false,
    updated_at = now()
  FROM lats_sales s
  WHERE cp.sale_id = s.id
    AND cp.branch_id IS NULL;
  
  GET DIAGNOSTICS customers_updated = ROW_COUNT;
  RAISE NOTICE '   ✅ Updated % customer_payments from sales', customers_updated;
  
  -- Update remaining customer_payments from devices
  UPDATE customer_payments cp
  SET 
    branch_id = COALESCE(cp.branch_id, d.branch_id, target_branch_id),
    is_shared = false,
    updated_at = now()
  FROM devices d
  WHERE cp.device_id = d.id
    AND cp.branch_id IS NULL;
  
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  customers_updated := customers_updated + temp_count;
  RAISE NOTICE '   ✅ Updated % customer_payments from devices', temp_count;
  
  -- Update remaining customer_payments to target branch
  UPDATE customer_payments
  SET 
    branch_id = target_branch_id,
    is_shared = false,
    updated_at = now()
  WHERE branch_id IS NULL;
  
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  customers_updated := customers_updated + temp_count;
  RAISE NOTICE '   ✅ Updated % customer_payments to target branch', temp_count;
  
  -- ============================================================================
  -- 2. FIX PURCHASE ORDER PAYMENTS
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '2. Fixing purchase_order_payments...';
  
  -- Update from purchase orders
  UPDATE purchase_order_payments pop
  SET 
    branch_id = COALESCE(pop.branch_id, po.branch_id, target_branch_id),
    updated_at = now()
  FROM lats_purchase_orders po
  WHERE pop.purchase_order_id = po.id
    AND pop.branch_id IS NULL;
  
  GET DIAGNOSTICS po_payments_updated = ROW_COUNT;
  RAISE NOTICE '   ✅ Updated % purchase_order_payments from POs', po_payments_updated;
  
  -- Update remaining to target branch
  UPDATE purchase_order_payments
  SET 
    branch_id = target_branch_id,
    updated_at = now()
  WHERE branch_id IS NULL;
  
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  po_payments_updated := po_payments_updated + temp_count;
  RAISE NOTICE '   ✅ Updated % purchase_order_payments to target branch', temp_count;
  
  -- ============================================================================
  -- 3. FIX PAYMENT TRANSACTIONS
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '3. Fixing payment_transactions...';
  
  -- Update from sales
  UPDATE payment_transactions pt
  SET 
    branch_id = COALESCE(pt.branch_id, s.branch_id, target_branch_id),
    is_shared = false,
    updated_at = now()
  FROM lats_sales s
  WHERE pt.sale_id = s.id
    AND pt.branch_id IS NULL;
  
  GET DIAGNOSTICS payment_transactions_updated = ROW_COUNT;
  RAISE NOTICE '   ✅ Updated % payment_transactions from sales', payment_transactions_updated;
  
  -- Update from metadata if branch_id is stored there
  UPDATE payment_transactions
  SET 
    branch_id = COALESCE(branch_id, (metadata->>'branch_id')::UUID, target_branch_id),
    is_shared = false,
    updated_at = now()
  WHERE branch_id IS NULL
    AND metadata->>'branch_id' IS NOT NULL;
  
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  payment_transactions_updated := payment_transactions_updated + temp_count;
  RAISE NOTICE '   ✅ Updated % payment_transactions from metadata', temp_count;
  
  -- Update remaining to target branch
  UPDATE payment_transactions
  SET 
    branch_id = target_branch_id,
    is_shared = false,
    updated_at = now()
  WHERE branch_id IS NULL;
  
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  payment_transactions_updated := payment_transactions_updated + temp_count;
  RAISE NOTICE '   ✅ Updated % payment_transactions to target branch', temp_count;
  
  -- ============================================================================
  -- 4. FIX ACCOUNT TRANSACTIONS
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '4. Fixing account_transactions...';
  
  -- Update from finance accounts
  UPDATE account_transactions at
  SET 
    branch_id = COALESCE(at.branch_id, fa.branch_id, target_branch_id),
    updated_at = now()
  FROM finance_accounts fa
  WHERE at.account_id = fa.id
    AND at.branch_id IS NULL;
  
  GET DIAGNOSTICS account_transactions_updated = ROW_COUNT;
  RAISE NOTICE '   ✅ Updated % account_transactions from accounts', account_transactions_updated;
  
  -- Update from purchase order payments
  UPDATE account_transactions at
  SET 
    branch_id = COALESCE(at.branch_id, pop.branch_id, po.branch_id, target_branch_id),
    updated_at = now()
  FROM purchase_order_payments pop
  LEFT JOIN lats_purchase_orders po ON po.id = pop.purchase_order_id
  WHERE at.related_entity_type = 'purchase_order_payment'
    AND at.related_entity_id = pop.id
    AND at.branch_id IS NULL;
  
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  account_transactions_updated := account_transactions_updated + temp_count;
  RAISE NOTICE '   ✅ Updated % account_transactions from PO payments', temp_count;
  
  -- Update remaining to target branch
  UPDATE account_transactions
  SET 
    branch_id = target_branch_id,
    updated_at = now()
  WHERE branch_id IS NULL;
  
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  account_transactions_updated := account_transactions_updated + temp_count;
  RAISE NOTICE '   ✅ Updated % account_transactions to target branch', temp_count;
  
  -- ============================================================================
  -- SUMMARY
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ FIX COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Customer payments updated: %', customers_updated;
  RAISE NOTICE 'PO payments updated: %', po_payments_updated;
  RAISE NOTICE 'Payment transactions updated: %', payment_transactions_updated;
  RAISE NOTICE 'Account transactions updated: %', account_transactions_updated;
  RAISE NOTICE '';
  RAISE NOTICE '💡 Refresh your application to see the changes!';
  
END $$;
