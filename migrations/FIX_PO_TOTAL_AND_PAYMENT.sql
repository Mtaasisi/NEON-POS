-- Fix the purchase order total amount and payment status
DO $$
DECLARE
  v_po_id UUID;
  v_item_total DECIMAL;
  v_total_paid DECIMAL;
  v_payment_status VARCHAR;
BEGIN
  -- Get the PO ID
  SELECT id INTO v_po_id
  FROM lats_purchase_orders
  WHERE order_number = 'PO-1761051715078';
  
  RAISE NOTICE 'PO ID: %', v_po_id;
  
  -- Calculate total from items
  SELECT COALESCE(SUM(quantity_ordered * unit_cost), 0) INTO v_item_total
  FROM lats_purchase_order_items
  WHERE purchase_order_id = v_po_id;
  
  RAISE NOTICE 'Item total: %', v_item_total;
  
  -- Calculate total paid from payments
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM purchase_order_payments
  WHERE purchase_order_id = v_po_id AND status = 'completed';
  
  RAISE NOTICE 'Total paid: %', v_total_paid;
  
  -- Determine payment status
  IF v_total_paid >= v_item_total THEN
    v_payment_status := 'paid';
  ELSIF v_total_paid > 0 THEN
    v_payment_status := 'partial';
  ELSE
    v_payment_status := 'unpaid';
  END IF;
  
  RAISE NOTICE 'Payment status: %', v_payment_status;
  
  -- Update the PO
  UPDATE lats_purchase_orders
  SET 
    total_amount = v_item_total,
    total_paid = v_total_paid,
    payment_status = v_payment_status,
    updated_at = NOW()
  WHERE id = v_po_id;
  
  RAISE NOTICE '✅ Updated PO %: total_amount=%, total_paid=%, payment_status=%', 
    'PO-1761051715078', v_item_total, v_total_paid, v_payment_status;
END $$;

