-- Show purchase order details clearly
DO $$
DECLARE
  po_record RECORD;
BEGIN
  SELECT 
    id,
    order_number,
    status,
    payment_status,
    total_amount,
    total_paid
  INTO po_record
  FROM lats_purchase_orders
  WHERE total_amount = 90 AND total_paid = 90
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF FOUND THEN
    RAISE NOTICE '=================================';
    RAISE NOTICE 'Purchase Order Found:';
    RAISE NOTICE '=================================';
    RAISE NOTICE 'ID: %', po_record.id;
    RAISE NOTICE 'Order Number: %', po_record.order_number;
    RAISE NOTICE 'Status: %', po_record.status;
    RAISE NOTICE 'Payment Status: %', po_record.payment_status;
    RAISE NOTICE 'Total Amount: %', po_record.total_amount;
    RAISE NOTICE 'Total Paid: %', po_record.total_paid;
    RAISE NOTICE '=================================';
    RAISE NOTICE 'Direct URL: http://localhost:5173/lats/purchase-orders/%', po_record.id;
    RAISE NOTICE '=================================';
  ELSE
    RAISE NOTICE 'No purchase order found with Total: 90, Paid: 90';
  END IF;
END $$;

