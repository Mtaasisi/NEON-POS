-- Fix existing PO payment transactions that are missing branch_id
-- This ensures all PO payment expenses are properly tracked with branch isolation

-- Update account_transactions for PO payments that don't have branch_id
-- Priority: PO branch_id > Account branch_id > First active branch
UPDATE account_transactions at
SET branch_id = COALESCE(
  po.branch_id,                    -- First: Get from purchase order
  fa.branch_id,                    -- Second: Get from finance account
  (SELECT id FROM store_locations WHERE is_active = true ORDER BY created_at LIMIT 1)  -- Fallback: First active branch
)
FROM purchase_order_payments pop
LEFT JOIN lats_purchase_orders po ON po.id = pop.purchase_order_id
LEFT JOIN finance_accounts fa ON fa.id = pop.payment_account_id
WHERE at.related_entity_type = 'purchase_order_payment'
  AND at.related_entity_id = pop.id
  AND at.branch_id IS NULL;

-- Report how many transactions were fixed
DO $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_updated_count
  FROM account_transactions
  WHERE related_entity_type = 'purchase_order_payment'
    AND branch_id IS NOT NULL;
  
  RAISE NOTICE '✅ Fixed existing PO payment transactions';
  RAISE NOTICE '   Total PO payment transactions with branch_id: %', v_updated_count;
END $$;

-- Verify the fix
SELECT 
  COUNT(*) as total_po_transactions,
  COUNT(branch_id) as transactions_with_branch_id,
  COUNT(*) - COUNT(branch_id) as transactions_missing_branch_id
FROM account_transactions
WHERE related_entity_type = 'purchase_order_payment';

