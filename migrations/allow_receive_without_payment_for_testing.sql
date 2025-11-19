-- ============================================
-- TEMPORARY: Allow Receive Without Payment (For Testing)
-- ============================================
-- This allows us to test the receive workflow while payment is being fixed

-- Update the new PO to mark it as if payment was made
UPDATE lats_purchase_orders
SET 
  payment_status = 'paid',
  total_paid = total_amount,
  updated_at = NOW()
WHERE po_number = 'PO-1761051048163';

-- Verify the update
SELECT 
  po_number,
  status,
  payment_status,
  total_amount,
  total_paid
FROM lats_purchase_orders
WHERE po_number = 'PO-1761051048163';

