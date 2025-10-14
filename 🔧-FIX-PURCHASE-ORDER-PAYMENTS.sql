-- ============================================
-- 🔧 FIX PURCHASE ORDER PAYMENT TRACKING
-- Automatically updates total_paid and payment_status
-- ============================================

-- ============================================
-- 1. CREATE FUNCTION TO UPDATE PURCHASE ORDER PAYMENT STATUS
-- ============================================

CREATE OR REPLACE FUNCTION update_purchase_order_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  order_total DECIMAL(15,2);
  total_payments DECIMAL(15,2);
  new_payment_status TEXT;
BEGIN
  -- Get the total amount for the purchase order
  SELECT total_amount INTO order_total
  FROM lats_purchase_orders
  WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);

  -- Calculate total payments for this purchase order
  SELECT COALESCE(SUM(amount), 0) INTO total_payments
  FROM purchase_order_payments
  WHERE purchase_order_id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id)
    AND status = 'completed';

  -- Determine payment status
  IF total_payments >= order_total THEN
    new_payment_status := 'paid';
  ELSIF total_payments > 0 THEN
    new_payment_status := 'partial';
  ELSE
    new_payment_status := 'unpaid';
  END IF;

  -- Update the purchase order
  UPDATE lats_purchase_orders
  SET 
    total_paid = total_payments,
    payment_status = new_payment_status,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. CREATE TRIGGERS
-- ============================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_update_po_payment_status_insert ON purchase_order_payments;
DROP TRIGGER IF EXISTS trigger_update_po_payment_status_update ON purchase_order_payments;
DROP TRIGGER IF EXISTS trigger_update_po_payment_status_delete ON purchase_order_payments;

-- Trigger on INSERT
CREATE TRIGGER trigger_update_po_payment_status_insert
  AFTER INSERT ON purchase_order_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_purchase_order_payment_status();

-- Trigger on UPDATE
CREATE TRIGGER trigger_update_po_payment_status_update
  AFTER UPDATE ON purchase_order_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_purchase_order_payment_status();

-- Trigger on DELETE
CREATE TRIGGER trigger_update_po_payment_status_delete
  AFTER DELETE ON purchase_order_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_purchase_order_payment_status();

-- ============================================
-- 3. SYNC EXISTING PURCHASE ORDERS
-- ============================================

-- Show current state before sync
SELECT '═══════════════════════════════════════════════' as "═══════════════════════════════════════════════";
SELECT '   BEFORE: Purchase Order Payment Status' as "STATUS";
SELECT '═══════════════════════════════════════════════' as "═══════════════════════════════════════════════";

SELECT 
  po.order_number as "Order Number",
  po.total_amount as "Total Amount",
  po.total_paid as "DB Total Paid",
  COALESCE(
    (SELECT SUM(amount) 
     FROM purchase_order_payments 
     WHERE purchase_order_id = po.id AND status = 'completed'),
    0
  ) as "Actual Paid",
  po.payment_status as "DB Status",
  CASE 
    WHEN COALESCE((SELECT SUM(amount) FROM purchase_order_payments WHERE purchase_order_id = po.id AND status = 'completed'), 0) >= po.total_amount THEN 'paid'
    WHEN COALESCE((SELECT SUM(amount) FROM purchase_order_payments WHERE purchase_order_id = po.id AND status = 'completed'), 0) > 0 THEN 'partial'
    ELSE 'unpaid'
  END as "Should Be"
FROM lats_purchase_orders po
ORDER BY po.created_at DESC
LIMIT 10;

-- Update all purchase orders with correct payment status and total_paid
UPDATE lats_purchase_orders po
SET 
  total_paid = COALESCE(
    (SELECT SUM(amount) 
     FROM purchase_order_payments 
     WHERE purchase_order_id = po.id 
       AND status = 'completed'),
    0
  ),
  payment_status = CASE 
    WHEN COALESCE(
      (SELECT SUM(amount) 
       FROM purchase_order_payments 
       WHERE purchase_order_id = po.id 
         AND status = 'completed'),
      0
    ) >= po.total_amount THEN 'paid'
    WHEN COALESCE(
      (SELECT SUM(amount) 
       FROM purchase_order_payments 
       WHERE purchase_order_id = po.id 
         AND status = 'completed'),
      0
    ) > 0 THEN 'partial'
    ELSE 'unpaid'
  END,
  updated_at = NOW();

-- Show results after sync
SELECT '═══════════════════════════════════════════════' as "═══════════════════════════════════════════════";
SELECT '   AFTER: Updated Purchase Order Payment Status' as "STATUS";
SELECT '═══════════════════════════════════════════════' as "═══════════════════════════════════════════════";

SELECT 
  po.order_number as "Order Number",
  po.total_amount as "Total Amount",
  po.total_paid as "Total Paid",
  po.payment_status as "Status",
  CASE 
    WHEN po.total_paid >= po.total_amount THEN '✅ FULLY PAID'
    WHEN po.total_paid > 0 THEN '⚠️ PARTIAL'
    ELSE '❌ UNPAID'
  END as "Payment State",
  po.total_amount - po.total_paid as "Remaining"
FROM lats_purchase_orders po
ORDER BY po.created_at DESC
LIMIT 10;

-- ============================================
-- 4. SHOW SUMMARY
-- ============================================

SELECT '═══════════════════════════════════════════════' as "═══════════════════════════════════════════════";
SELECT '   SUMMARY' as "STATUS";
SELECT '═══════════════════════════════════════════════' as "═══════════════════════════════════════════════";

SELECT 
  'Total Purchase Orders' as metric,
  COUNT(*)::TEXT as value
FROM lats_purchase_orders
UNION ALL
SELECT 
  'Fully Paid Orders',
  COUNT(*)::TEXT
FROM lats_purchase_orders
WHERE payment_status = 'paid' AND total_paid >= total_amount
UNION ALL
SELECT 
  'Partially Paid Orders',
  COUNT(*)::TEXT
FROM lats_purchase_orders
WHERE payment_status = 'partial' AND total_paid > 0 AND total_paid < total_amount
UNION ALL
SELECT 
  'Unpaid Orders',
  COUNT(*)::TEXT
FROM lats_purchase_orders
WHERE payment_status = 'unpaid' OR total_paid = 0
UNION ALL
SELECT 
  'Total Payments Recorded',
  COUNT(*)::TEXT
FROM purchase_order_payments;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Purchase order payment tracking has been fixed!';
  RAISE NOTICE '✅ Automatic triggers created';
  RAISE NOTICE '✅ All purchase orders synchronized';
  RAISE NOTICE '';
  RAISE NOTICE 'Benefits:';
  RAISE NOTICE '- total_paid updates automatically when payments are made';
  RAISE NOTICE '- payment_status updates automatically (unpaid/partial/paid)';
  RAISE NOTICE '- Pay button will be hidden for fully paid orders';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Refresh your browser';
  RAISE NOTICE '2. Check Purchase Orders tab';
  RAISE NOTICE '3. Fully paid orders should not show Pay button';
  RAISE NOTICE '';
END $$;

