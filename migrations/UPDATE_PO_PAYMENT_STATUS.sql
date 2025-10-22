-- Update the purchase order payment status based on the payments
DO $$
DECLARE
  v_po_id UUID;
  v_total_amount DECIMAL;
  v_total_paid DECIMAL;
  v_payment_status VARCHAR;
BEGIN
  -- Get the PO ID
  SELECT id, total_amount INTO v_po_id, v_total_amount
  FROM lats_purchase_orders
  WHERE order_number = 'PO-1761051715078';
  
  -- Calculate total paid
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM purchase_order_payments
  WHERE purchase_order_id = v_po_id AND status = 'completed';
  
  -- Determine payment status
  IF v_total_paid >= v_total_amount THEN
    v_payment_status := 'paid';
  ELSIF v_total_paid > 0 THEN
    v_payment_status := 'partial';
  ELSE
    v_payment_status := 'unpaid';
  END IF;
  
  -- Update the PO
  UPDATE lats_purchase_orders
  SET 
    total_paid = v_total_paid,
    payment_status = v_payment_status,
    updated_at = NOW()
  WHERE id = v_po_id;
  
  RAISE NOTICE 'Updated PO %: total_amount=%, total_paid=%, payment_status=%', 
    'PO-1761051715078', v_total_amount, v_total_paid, v_payment_status;
END $$;

