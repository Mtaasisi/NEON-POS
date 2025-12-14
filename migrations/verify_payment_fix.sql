-- Verify the payment status fix
SELECT 
  id,
  order_number,
  status,
  payment_status,
  total_amount,
  total_paid,
  (total_amount - COALESCE(total_paid, 0)) as balance,
  CASE 
    WHEN total_paid >= total_amount THEN 'CORRECT ✅'
    ELSE 'CHECK ⚠️'
  END as status_check
FROM lats_purchase_orders
WHERE total_amount = 90 OR total_paid = 90
ORDER BY created_at DESC
LIMIT 5;

