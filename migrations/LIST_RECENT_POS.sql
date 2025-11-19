-- List all purchase orders with their payment status
SELECT 
  id,
  order_number,
  status,
  payment_status,
  total_amount,
  total_paid,
  created_at
FROM lats_purchase_orders
ORDER BY created_at DESC
LIMIT 5;

