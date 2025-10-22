-- ============================================
-- FIX PAYMENT STATUS MISMATCHES
-- ============================================
-- This migration corrects payment_status for purchase orders
-- where total_paid equals or exceeds total_amount but status is not 'paid'

-- Show current mismatches
SELECT 
  id,
  po_number,
  total_amount,
  total_paid,
  payment_status,
  CASE 
    WHEN total_paid >= total_amount THEN 'paid'
    WHEN total_paid > 0 THEN 'partial'
    ELSE 'unpaid'
  END as correct_status
FROM lats_purchase_orders
WHERE total_amount > 0
  AND (
    -- Fully paid but status is not 'paid'
    (total_paid >= total_amount AND payment_status != 'paid')
    OR
    -- Partially paid but status is not 'partial'
    (total_paid > 0 AND total_paid < total_amount AND payment_status != 'partial')
    OR
    -- Unpaid but status is not 'unpaid'
    (total_paid = 0 AND payment_status != 'unpaid')
  );

-- Fix payment statuses
UPDATE lats_purchase_orders
SET 
  payment_status = CASE 
    WHEN total_paid >= total_amount THEN 'paid'
    WHEN total_paid > 0 THEN 'partial'
    ELSE 'unpaid'
  END,
  updated_at = NOW()
WHERE total_amount > 0
  AND (
    (total_paid >= total_amount AND payment_status != 'paid')
    OR
    (total_paid > 0 AND total_paid < total_amount AND payment_status != 'partial')
    OR
    (total_paid = 0 AND payment_status != 'unpaid')
  );

-- Display summary
DO $$
DECLARE
  fixed_count INTEGER;
BEGIN
  GET DIAGNOSTICS fixed_count = ROW_COUNT;
  RAISE NOTICE '✅ Fixed % purchase order payment statuses', fixed_count;
END $$;

-- Verify all statuses are now correct
SELECT 
  COUNT(*) as total_orders,
  SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as paid_orders,
  SUM(CASE WHEN payment_status = 'partial' THEN 1 ELSE 0 END) as partial_orders,
  SUM(CASE WHEN payment_status = 'unpaid' THEN 1 ELSE 0 END) as unpaid_orders
FROM lats_purchase_orders
WHERE total_amount > 0;

