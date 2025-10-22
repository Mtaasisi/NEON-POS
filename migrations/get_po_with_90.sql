-- Get the purchase order with total 90 and paid 90
SELECT 
  id,
  order_number,
  status,
  payment_status,
  total_amount,
  total_paid,
  created_at,
  supplier_id,
  (SELECT name FROM lats_suppliers WHERE id = lats_purchase_orders.supplier_id) as supplier_name
FROM lats_purchase_orders
WHERE (total_amount = 90 OR total_paid = 90)
  AND payment_status = 'paid'
ORDER BY created_at DESC
LIMIT 1;

