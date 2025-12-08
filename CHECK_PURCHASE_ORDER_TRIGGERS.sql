-- ============================================================================
-- CHECK PURCHASE ORDER ISOLATION TRIGGERS
-- ============================================================================
-- This script verifies that all purchase order-related triggers are in place
-- ============================================================================

-- Check all purchase order triggers
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name IN (
  'ensure_purchase_order_isolation',
  'ensure_purchase_order_payment_isolation'
)
ORDER BY event_object_table, trigger_name;

-- Check if purchase_order_payments table has branch_id column
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'purchase_order_payments'
  AND column_name = 'branch_id';

-- Summary
DO $$
DECLARE
  po_trigger_count INTEGER;
  po_payment_trigger_count INTEGER;
  branch_id_column_exists BOOLEAN;
BEGIN
  -- Count triggers
  SELECT COUNT(*) INTO po_trigger_count
  FROM information_schema.triggers
  WHERE trigger_name = 'ensure_purchase_order_isolation';
  
  SELECT COUNT(*) INTO po_payment_trigger_count
  FROM information_schema.triggers
  WHERE trigger_name = 'ensure_purchase_order_payment_isolation';
  
  -- Check if branch_id column exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'purchase_order_payments'
      AND column_name = 'branch_id'
  ) INTO branch_id_column_exists;
  
  -- Report status
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PURCHASE ORDER ISOLATION STATUS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Purchase Order Trigger: %', 
    CASE WHEN po_trigger_count > 0 THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE 'Purchase Order Payment Trigger: %', 
    CASE WHEN po_payment_trigger_count > 0 THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE 'Purchase Order Payments branch_id Column: %', 
    CASE WHEN branch_id_column_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '========================================';
  
  IF po_trigger_count = 0 THEN
    RAISE WARNING '⚠️ Purchase order trigger is missing! Run ENSURE_PURCHASE_ORDERS_ALWAYS_ISOLATED.sql';
  END IF;
  
  IF po_payment_trigger_count = 0 THEN
    RAISE WARNING '⚠️ Purchase order payment trigger is missing! Run ENSURE_PURCHASE_ORDERS_ALWAYS_ISOLATED.sql';
  END IF;
  
  IF NOT branch_id_column_exists THEN
    RAISE WARNING '⚠️ purchase_order_payments table is missing branch_id column!';
  END IF;
END $$;
