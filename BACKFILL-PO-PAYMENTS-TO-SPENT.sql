-- ============================================
-- BACKFILL: Add Existing PO Payments to account_transactions
-- ============================================
-- This will add all existing completed PO payments to the 
-- account_transactions table so they show in the "Spent" section
-- ============================================

-- First, let's see what we're about to backfill
DO $$
DECLARE
  v_count INTEGER;
  v_total DECIMAL;
BEGIN
  SELECT COUNT(*), COALESCE(SUM(amount), 0) 
  INTO v_count, v_total
  FROM purchase_order_payments pop
  WHERE pop.status = 'completed'
    AND NOT EXISTS (
      SELECT 1 FROM account_transactions at
      WHERE at.related_transaction_id = pop.id
    );
  
  RAISE NOTICE '📊 Found % PO payments to backfill, totaling: %', v_count, v_total;
END $$;

-- Backfill the existing PO payments
INSERT INTO account_transactions (
  account_id,
  transaction_type,
  amount,
  balance_before,
  balance_after,
  description,
  reference_number,
  related_transaction_id,
  metadata,
  created_by,
  created_at,
  updated_at
)
SELECT 
  pop.payment_account_id,
  'expense' as transaction_type,
  pop.amount,
  0 as balance_before, -- We don't have historical balance data
  0 as balance_after,  -- We don't have historical balance data
  'PO Payment: ' || COALESCE(po.po_number, 'N/A') || ' - ' || COALESCE(s.name, 'Unknown Supplier') as description,
  COALESCE(pop.reference, 'PO-PAY-' || substring(pop.id::TEXT, 1, 8)) as reference_number,
  pop.id as related_transaction_id,
  jsonb_build_object(
    'type', 'purchase_order_payment',
    'purchase_order_id', pop.purchase_order_id,
    'payment_id', pop.id,
    'po_reference', po.po_number,
    'supplier', s.name,
    'payment_method', COALESCE(pop.payment_method, pop.method, 'Unknown'),
    'currency', pop.currency,
    'backfilled', true,
    'backfill_date', NOW()
  ) as metadata,
  pop.created_by,
  pop.created_at,
  NOW() as updated_at
FROM purchase_order_payments pop
LEFT JOIN lats_purchase_orders po ON po.id = pop.purchase_order_id
LEFT JOIN lats_suppliers s ON s.id = po.supplier_id
WHERE pop.status = 'completed'
  AND NOT EXISTS (
    -- Don't duplicate if already exists
    SELECT 1 FROM account_transactions at
    WHERE at.related_transaction_id = pop.id
  );

-- Report results
DO $$
DECLARE
  v_backfilled_count INTEGER;
  v_backfilled_total DECIMAL;
BEGIN
  SELECT COUNT(*), COALESCE(SUM(amount), 0)
  INTO v_backfilled_count, v_backfilled_total
  FROM account_transactions
  WHERE metadata->>'backfilled' = 'true';
  
  RAISE NOTICE '✅ Backfill complete!';
  RAISE NOTICE '✅ Added % PO payments to account_transactions', v_backfilled_count;
  RAISE NOTICE '✅ Total backfilled amount: TSh %', v_backfilled_total;
  RAISE NOTICE '✅ These payments will now show in the "Spent" section!';
END $$;

-- Verify the backfill
SELECT 
  'Current "Spent" Total' as metric,
  COALESCE(SUM(amount), 0) as amount
FROM account_transactions
WHERE transaction_type IN ('payment_made', 'expense', 'transfer_out')
UNION ALL
SELECT 
  'From PO Payments' as metric,
  COALESCE(SUM(amount), 0) as amount
FROM account_transactions
WHERE transaction_type = 'expense'
  AND metadata->>'type' = 'purchase_order_payment';

