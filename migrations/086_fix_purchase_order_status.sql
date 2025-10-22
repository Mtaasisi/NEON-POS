-- Migration: Fix Purchase Order Status Data Corruption
-- Description: Fixes purchase orders with invalid status values (UUIDs instead of actual statuses)
-- Date: 2025-10-21

-- Step 1: Check for corrupted data
DO $$
DECLARE
  corrupted_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO corrupted_count
  FROM lats_purchase_orders 
  WHERE status ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     OR status NOT IN ('draft', 'pending_approval', 'approved', 'sent', 'confirmed', 'shipped', 'partial_received', 'received', 'completed', 'cancelled');
  
  IF corrupted_count > 0 THEN
    RAISE NOTICE '⚠️  Found % purchase orders with corrupted status values', corrupted_count;
  ELSE
    RAISE NOTICE '✅ No corrupted status values found';
  END IF;
END $$;

-- Step 2: Log corrupted records before fixing
INSERT INTO audit_log (table_name, action, details, user_id, created_at)
SELECT 
  'lats_purchase_orders' as table_name,
  'FIX_CORRUPTED_STATUS' as action,
  json_build_object(
    'po_id', id,
    'po_number', po_number,
    'corrupted_status', status,
    'new_status', 'draft'
  )::text as details,
  'system' as user_id,
  NOW() as created_at
FROM lats_purchase_orders 
WHERE status ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   OR status NOT IN ('draft', 'pending_approval', 'approved', 'sent', 'confirmed', 'shipped', 'partial_received', 'received', 'completed', 'cancelled');

-- Step 3: Fix corrupted statuses by setting them to 'draft'
UPDATE lats_purchase_orders 
SET 
  status = 'draft',
  updated_at = NOW()
WHERE status ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   OR status NOT IN ('draft', 'pending_approval', 'approved', 'sent', 'confirmed', 'shipped', 'partial_received', 'received', 'completed', 'cancelled');

-- Step 4: Add CHECK constraint to prevent future corruption
ALTER TABLE lats_purchase_orders 
DROP CONSTRAINT IF EXISTS lats_purchase_orders_status_check;

ALTER TABLE lats_purchase_orders 
ADD CONSTRAINT lats_purchase_orders_status_check 
CHECK (status IN ('draft', 'pending_approval', 'approved', 'sent', 'confirmed', 'shipped', 'partial_received', 'received', 'completed', 'cancelled'));

-- Step 5: Create index on status for better query performance
CREATE INDEX IF NOT EXISTS idx_lats_purchase_orders_status ON lats_purchase_orders(status);

-- Step 6: Verify the fix
DO $$
DECLARE
  draft_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO draft_count FROM lats_purchase_orders WHERE status = 'draft';
  SELECT COUNT(*) INTO total_count FROM lats_purchase_orders;
  
  RAISE NOTICE '✅ Migration complete';
  RAISE NOTICE '📊 Total purchase orders: %', total_count;
  RAISE NOTICE '📝 Draft orders: %', draft_count;
END $$;

