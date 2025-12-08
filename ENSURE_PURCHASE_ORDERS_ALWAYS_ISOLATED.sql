-- ============================================================================
-- ENSURE ALL NEW PURCHASE ORDERS ARE ALWAYS ISOLATED WITH BRANCH_ID
-- ============================================================================
-- This trigger ensures that every new purchase order is automatically isolated
-- and assigned to a branch, even if the application code doesn't set it
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS ensure_purchase_order_isolation ON lats_purchase_orders;
DROP FUNCTION IF EXISTS ensure_purchase_order_isolation() CASCADE;

-- Create function to ensure purchase order isolation
CREATE OR REPLACE FUNCTION ensure_purchase_order_isolation()
RETURNS TRIGGER AS $$
DECLARE
  default_branch_id UUID;
  supplier_branch_id UUID;
BEGIN
  -- If branch_id is not set, try to get from supplier first
  IF NEW.branch_id IS NULL AND NEW.supplier_id IS NOT NULL THEN
    SELECT branch_id INTO supplier_branch_id
    FROM lats_suppliers
    WHERE id = NEW.supplier_id;
    
    IF supplier_branch_id IS NOT NULL THEN
      NEW.branch_id := supplier_branch_id;
      RAISE NOTICE 'Purchase order % assigned to supplier branch %', NEW.po_number, supplier_branch_id;
    END IF;
  END IF;
  
  -- If still no branch_id, get the first active branch
  IF NEW.branch_id IS NULL THEN
    SELECT id INTO default_branch_id
    FROM store_locations
    WHERE is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF default_branch_id IS NOT NULL THEN
      NEW.branch_id := default_branch_id;
      RAISE NOTICE 'Purchase order % assigned to default branch %', NEW.po_number, default_branch_id;
    ELSE
      RAISE WARNING 'No active branch found. Purchase order % created without branch_id', NEW.po_number;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run before insert on lats_purchase_orders
CREATE TRIGGER ensure_purchase_order_isolation
  BEFORE INSERT ON lats_purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION ensure_purchase_order_isolation();

-- Add comment
COMMENT ON FUNCTION ensure_purchase_order_isolation() IS 'Ensures all new purchase orders have branch_id assigned (tries supplier branch first, then default branch)';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify trigger was created
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'ensure_purchase_order_isolation';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Trigger created successfully!';
  RAISE NOTICE 'All new purchase orders will now be automatically isolated with branch_id assigned.';
  RAISE NOTICE 'The trigger will try to use the supplier branch_id first, then default to the first active branch.';
END $$;

-- ============================================================================
-- ENSURE ALL NEW PURCHASE ORDER PAYMENTS ARE ALWAYS ISOLATED WITH BRANCH_ID
-- ============================================================================
-- This trigger ensures that every new purchase order payment is automatically isolated
-- and assigned to a branch, even if the application code doesn't set it
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS ensure_purchase_order_payment_isolation ON purchase_order_payments;
DROP FUNCTION IF EXISTS ensure_purchase_order_payment_isolation() CASCADE;

-- Create function to ensure purchase order payment isolation
CREATE OR REPLACE FUNCTION ensure_purchase_order_payment_isolation()
RETURNS TRIGGER AS $$
DECLARE
  default_branch_id UUID;
  po_branch_id UUID;
  account_branch_id UUID;
BEGIN
  -- If branch_id is not set, try to get from purchase order first
  IF NEW.branch_id IS NULL AND NEW.purchase_order_id IS NOT NULL THEN
    SELECT branch_id INTO po_branch_id
    FROM lats_purchase_orders
    WHERE id = NEW.purchase_order_id;
    
    IF po_branch_id IS NOT NULL THEN
      NEW.branch_id := po_branch_id;
      RAISE NOTICE 'Purchase order payment assigned to purchase order branch %', po_branch_id;
    END IF;
  END IF;
  
  -- If still no branch_id, try to get from payment account
  IF NEW.branch_id IS NULL AND NEW.payment_account_id IS NOT NULL THEN
    SELECT branch_id INTO account_branch_id
    FROM finance_accounts
    WHERE id = NEW.payment_account_id;
    
    IF account_branch_id IS NOT NULL THEN
      NEW.branch_id := account_branch_id;
      RAISE NOTICE 'Purchase order payment assigned to payment account branch %', account_branch_id;
    END IF;
  END IF;
  
  -- If still no branch_id, get the first active branch
  IF NEW.branch_id IS NULL THEN
    SELECT id INTO default_branch_id
    FROM store_locations
    WHERE is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF default_branch_id IS NOT NULL THEN
      NEW.branch_id := default_branch_id;
      RAISE NOTICE 'Purchase order payment assigned to default branch %', default_branch_id;
    ELSE
      RAISE WARNING 'No active branch found. Purchase order payment created without branch_id';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run before insert on purchase_order_payments
CREATE TRIGGER ensure_purchase_order_payment_isolation
  BEFORE INSERT ON purchase_order_payments
  FOR EACH ROW
  EXECUTE FUNCTION ensure_purchase_order_payment_isolation();

-- Add comment
COMMENT ON FUNCTION ensure_purchase_order_payment_isolation() IS 'Ensures all new purchase order payments have branch_id assigned (tries PO branch, then account branch, then default branch)';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify both triggers were created
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name IN ('ensure_purchase_order_isolation', 'ensure_purchase_order_payment_isolation')
ORDER BY trigger_name;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ All triggers created successfully!';
  RAISE NOTICE 'All new purchase orders and purchase order payments will now be automatically isolated with branch_id assigned.';
END $$;
