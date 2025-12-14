-- Fix payment status for purchase orders where total_paid equals total_amount but status is not 'paid'
DO $$
DECLARE
  v_po_record RECORD;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting payment status fix...';
  
  -- Find and fix all purchase orders with mismatched payment status
  FOR v_po_record IN 
    SELECT 
      id,
      order_number,
      total_amount,
      total_paid,
      payment_status
    FROM lats_purchase_orders
    WHERE 
      total_paid IS NOT NULL 
      AND total_amount IS NOT NULL
      AND total_paid >= total_amount
      AND total_amount > 0
      AND payment_status != 'paid'
  LOOP
    RAISE NOTICE 'Fixing PO %: total_amount=%, total_paid=%, current_status=%', 
      v_po_record.order_number, 
      v_po_record.total_amount, 
      v_po_record.total_paid,
      v_po_record.payment_status;
    
    -- Update payment status to 'paid'
    UPDATE lats_purchase_orders
    SET 
      payment_status = 'paid',
      updated_at = NOW()
    WHERE id = v_po_record.id;
    
    v_count := v_count + 1;
  END LOOP;
  
  RAISE NOTICE '✅ Fixed % purchase order(s) with mismatched payment status', v_count;
  
  -- Also check for orders that should be 'partial' or 'unpaid'
  UPDATE lats_purchase_orders
  SET payment_status = 'partial'
  WHERE 
    total_paid > 0 
    AND total_paid < total_amount
    AND payment_status != 'partial';
    
  UPDATE lats_purchase_orders
  SET payment_status = 'unpaid'
  WHERE 
    (total_paid IS NULL OR total_paid = 0)
    AND payment_status != 'unpaid'
    AND total_amount > 0;
  
  RAISE NOTICE '✅ Payment status synchronization complete';
END $$;

-- Show summary of payment statuses
SELECT 
  payment_status,
  COUNT(*) as count,
  SUM(total_amount) as total_amount_sum,
  SUM(total_paid) as total_paid_sum
FROM lats_purchase_orders
WHERE total_amount IS NOT NULL
GROUP BY payment_status
ORDER BY payment_status;

