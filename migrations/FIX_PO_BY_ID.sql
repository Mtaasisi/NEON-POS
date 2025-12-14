-- Fix the purchase order using the ID from the URL
DO $$
DECLARE
  v_po_id UUID := 'd1811637-1c56-42e6-974d-23ca24401e79';
  v_order_number VARCHAR;
  v_item_total DECIMAL;
  v_total_paid DECIMAL;
  v_payment_status VARCHAR;
BEGIN
  -- Get the order number
  SELECT order_number INTO v_order_number
  FROM lats_purchase_orders
  WHERE id = v_po_id;
  
  RAISE NOTICE 'Found PO: %', v_order_number;
  
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
  IF v_total_paid >= v_item_total AND v_item_total > 0 THEN
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
  
  RAISE NOTICE '✅ Updated PO % (ID: %): total_amount=%, total_paid=%, payment_status=%', 
    v_order_number, v_po_id, v_item_total, v_total_paid, v_payment_status;
END $$;

