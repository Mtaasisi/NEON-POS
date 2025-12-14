-- =====================================================
-- ADD PENDING_PRICING STATUS FOR IMEI WORKFLOW
-- =====================================================
-- This migration adds support for the pending_pricing status
-- used in the IMEI receive workflow where items need pricing
-- before being added to available inventory
--
-- Date: October 21, 2025
-- Purpose: Enable 3-step workflow: Receive → Price → Inventory

-- 1. Check if status column exists and verify current constraints
DO $$ 
BEGIN
  -- Check if inventory_items table exists
  IF EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'inventory_items'
  ) THEN
    RAISE NOTICE 'inventory_items table exists, proceeding with status check...';
    
    -- Check if status column exists
    IF EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'inventory_items' 
      AND column_name = 'status'
    ) THEN
      RAISE NOTICE 'status column exists in inventory_items';
    ELSE
      RAISE NOTICE 'status column does not exist, creating it...';
      ALTER TABLE inventory_items ADD COLUMN status VARCHAR(50) DEFAULT 'available';
      RAISE NOTICE 'status column created with default value "available"';
    END IF;
  ELSE
    RAISE EXCEPTION 'inventory_items table does not exist! Please create it first.';
  END IF;
END $$;

-- 2. Add purchase_order_id column if it doesn't exist (for easier querying)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'inventory_items' 
    AND column_name = 'purchase_order_id'
  ) THEN
    RAISE NOTICE 'Adding purchase_order_id column...';
    ALTER TABLE inventory_items 
    ADD COLUMN purchase_order_id UUID REFERENCES lats_purchase_orders(id) ON DELETE SET NULL;
    
    RAISE NOTICE 'purchase_order_id column added successfully';
  ELSE
    RAISE NOTICE 'purchase_order_id column already exists';
  END IF;
END $$;

-- 3. Create index on status and purchase_order_id for better query performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_status 
ON inventory_items(status);

CREATE INDEX IF NOT EXISTS idx_inventory_items_purchase_order 
ON inventory_items(purchase_order_id);

CREATE INDEX IF NOT EXISTS idx_inventory_items_status_po 
ON inventory_items(status, purchase_order_id);

RAISE NOTICE 'Indexes created for optimized queries';

-- 4. Add check constraint to ensure valid status values (if not already exists)
-- Note: This will only add the constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_constraint 
    WHERE conname = 'inventory_items_status_check'
  ) THEN
    ALTER TABLE inventory_items 
    ADD CONSTRAINT inventory_items_status_check 
    CHECK (status IN (
      'available', 
      'sold', 
      'reserved', 
      'damaged', 
      'returned', 
      'in_transit', 
      'pending_pricing',  -- NEW STATUS
      'on_hold',
      'pending_quality_check'
    ));
    RAISE NOTICE 'Status check constraint added with pending_pricing status';
  ELSE
    -- If constraint exists, we need to drop and recreate with new value
    ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS inventory_items_status_check;
    
    ALTER TABLE inventory_items 
    ADD CONSTRAINT inventory_items_status_check 
    CHECK (status IN (
      'available', 
      'sold', 
      'reserved', 
      'damaged', 
      'returned', 
      'in_transit', 
      'pending_pricing',  -- NEW STATUS
      'on_hold',
      'pending_quality_check'
    ));
    RAISE NOTICE 'Status check constraint updated to include pending_pricing status';
  END IF;
END $$;

-- 5. Update serial_number_movements table to support pending_pricing status
DO $$ 
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'serial_number_movements'
  ) THEN
    -- Check if to_status column has the right type
    RAISE NOTICE 'Updating serial_number_movements table...';
    
    -- Drop existing constraint if any
    ALTER TABLE serial_number_movements 
    DROP CONSTRAINT IF EXISTS serial_number_movements_to_status_check;
    
    -- Add updated constraint
    ALTER TABLE serial_number_movements 
    ADD CONSTRAINT serial_number_movements_to_status_check 
    CHECK (to_status IN (
      'available', 
      'sold', 
      'reserved', 
      'damaged', 
      'returned', 
      'in_transit', 
      'pending_pricing',  -- NEW STATUS
      'on_hold',
      'pending_quality_check'
    ));
    
    RAISE NOTICE 'serial_number_movements table updated';
  ELSE
    RAISE NOTICE 'serial_number_movements table does not exist, skipping...';
  END IF;
END $$;

-- 6. Create a view to easily see items pending pricing
CREATE OR REPLACE VIEW v_items_pending_pricing AS
SELECT 
  ii.id AS inventory_item_id,
  ii.serial_number,
  ii.imei,
  ii.purchase_order_id,
  ii.product_id,
  ii.variant_id,
  p.name AS product_name,
  pv.name AS variant_name,
  ii.cost_price,
  ii.selling_price,
  ii.location,
  ii.created_at AS received_at,
  po.order_number AS purchase_order_number,
  po.status AS purchase_order_status
FROM inventory_items ii
LEFT JOIN lats_products p ON ii.product_id = p.id
LEFT JOIN lats_product_variants pv ON ii.variant_id = pv.id
LEFT JOIN lats_purchase_orders po ON ii.purchase_order_id = po.id
WHERE ii.status = 'pending_pricing'
ORDER BY ii.created_at DESC;

COMMENT ON VIEW v_items_pending_pricing IS 
'View showing all inventory items that have been received but are pending price setting';

-- 7. Create helper function to check pending pricing items
CREATE OR REPLACE FUNCTION has_pending_pricing_items(p_purchase_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM inventory_items
  WHERE purchase_order_id = p_purchase_order_id
    AND status = 'pending_pricing';
  
  RETURN v_count > 0;
END;
$$;

COMMENT ON FUNCTION has_pending_pricing_items IS 
'Check if a purchase order has items pending pricing';

-- 8. Create helper function to get pending pricing items count
CREATE OR REPLACE FUNCTION get_pending_pricing_count(p_purchase_order_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM inventory_items
  WHERE purchase_order_id = p_purchase_order_id
    AND status = 'pending_pricing';
  
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION get_pending_pricing_count IS 
'Get count of items pending pricing for a purchase order';

-- 9. Create trigger to log when items move from pending_pricing to available
CREATE OR REPLACE FUNCTION log_pricing_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If status changed from pending_pricing to available, log it
  IF OLD.status = 'pending_pricing' AND NEW.status = 'available' THEN
    INSERT INTO serial_number_movements (
      inventory_item_id,
      movement_type,
      from_status,
      to_status,
      reference_id,
      reference_type,
      notes,
      created_by,
      created_at
    ) VALUES (
      NEW.id,
      'status_change',
      'pending_pricing',
      'available',
      NEW.purchase_order_id,
      'pricing_completion',
      'Item priced and added to available inventory',
      NULL,  -- System change
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trg_log_pricing_completion ON inventory_items;

CREATE TRIGGER trg_log_pricing_completion
AFTER UPDATE ON inventory_items
FOR EACH ROW
WHEN (OLD.status = 'pending_pricing' AND NEW.status = 'available')
EXECUTE FUNCTION log_pricing_completion();

COMMENT ON TRIGGER trg_log_pricing_completion ON inventory_items IS 
'Automatically logs when items complete the pricing process and become available';

-- 10. Create report function for pending pricing summary
CREATE OR REPLACE FUNCTION get_pending_pricing_summary()
RETURNS TABLE (
  purchase_order_id UUID,
  order_number TEXT,
  pending_count BIGINT,
  total_cost_price NUMERIC,
  oldest_pending TIMESTAMP WITH TIME ZONE,
  supplier_name TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ii.purchase_order_id,
    po.order_number,
    COUNT(ii.id) AS pending_count,
    SUM(ii.cost_price) AS total_cost_price,
    MIN(ii.created_at) AS oldest_pending,
    s.name AS supplier_name
  FROM inventory_items ii
  LEFT JOIN lats_purchase_orders po ON ii.purchase_order_id = po.id
  LEFT JOIN lats_suppliers s ON po.supplier_id = s.id
  WHERE ii.status = 'pending_pricing'
  GROUP BY ii.purchase_order_id, po.order_number, s.name
  ORDER BY MIN(ii.created_at) ASC;
END;
$$;

COMMENT ON FUNCTION get_pending_pricing_summary IS 
'Get summary of all purchase orders with pending pricing items';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check that status column exists and has correct type
SELECT 
  table_name,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'inventory_items'
  AND column_name = 'status';

-- Check that purchase_order_id column exists
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'inventory_items'
  AND column_name = 'purchase_order_id';

-- Check indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'inventory_items'
  AND (indexname LIKE '%status%' OR indexname LIKE '%purchase_order%');

-- Check constraints
SELECT 
  conname,
  pg_get_constraintdef(c.oid)
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
WHERE t.relname = 'inventory_items'
  AND conname LIKE '%status%';

-- Test the view
SELECT COUNT(*) AS pending_pricing_items
FROM v_items_pending_pricing;

-- Test the helper functions
SELECT 
  'has_pending_pricing_items function exists' AS test,
  COUNT(*) AS function_count
FROM pg_proc
WHERE proname = 'has_pending_pricing_items';

SELECT 
  'get_pending_pricing_count function exists' AS test,
  COUNT(*) AS function_count
FROM pg_proc
WHERE proname = 'get_pending_pricing_count';

-- =====================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- =====================================================
/*
-- To rollback this migration, run these commands:

-- Drop trigger and function
DROP TRIGGER IF EXISTS trg_log_pricing_completion ON inventory_items;
DROP FUNCTION IF EXISTS log_pricing_completion();

-- Drop helper functions
DROP FUNCTION IF EXISTS get_pending_pricing_summary();
DROP FUNCTION IF EXISTS get_pending_pricing_count(UUID);
DROP FUNCTION IF EXISTS has_pending_pricing_items(UUID);

-- Drop view
DROP VIEW IF EXISTS v_items_pending_pricing;

-- Drop indexes
DROP INDEX IF EXISTS idx_inventory_items_status_po;
DROP INDEX IF EXISTS idx_inventory_items_purchase_order;
DROP INDEX IF EXISTS idx_inventory_items_status;

-- Remove column (BE CAREFUL - this will delete data)
-- ALTER TABLE inventory_items DROP COLUMN purchase_order_id;

-- Update constraint to remove pending_pricing (keep other statuses)
ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS inventory_items_status_check;
ALTER TABLE inventory_items 
ADD CONSTRAINT inventory_items_status_check 
CHECK (status IN (
  'available', 
  'sold', 
  'reserved', 
  'damaged', 
  'returned', 
  'in_transit', 
  'on_hold',
  'pending_quality_check'
));

-- Update serial_number_movements constraint
ALTER TABLE serial_number_movements DROP CONSTRAINT IF EXISTS serial_number_movements_to_status_check;
ALTER TABLE serial_number_movements 
ADD CONSTRAINT serial_number_movements_to_status_check 
CHECK (to_status IN (
  'available', 
  'sold', 
  'reserved', 
  'damaged', 
  'returned', 
  'in_transit', 
  'on_hold',
  'pending_quality_check'
));
*/

-- =====================================================
-- END OF MIGRATION
-- =====================================================

SELECT '✅ Migration completed successfully! pending_pricing status is now available.' AS status;

