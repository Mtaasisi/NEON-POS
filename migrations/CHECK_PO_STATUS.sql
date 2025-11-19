-- Check purchase order status and payments
SELECT 
  id,
  order_number,
  status,
  payment_status,
  total_amount,
  total_paid,
  created_at
FROM lats_purchase_orders
WHERE order_number = 'PO-1761051715078';

-- Also check payments for this PO
SELECT 
  id,
  purchase_order_id,
  amount,
  currency,
  payment_method,
  status,
  payment_date,
  created_at
FROM purchase_order_payments
WHERE purchase_order_id = (
  SELECT id FROM lats_purchase_orders WHERE order_number = 'PO-1761051715078'
);

