-- ============================================
-- FIX INVENTORY ITEMS STATUS CONSTRAINT
-- ============================================
-- Quick fix to add pending_pricing status

-- Drop existing constraint
ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS inventory_items_status_check;

-- Recreate with all valid statuses including pending_pricing
ALTER TABLE inventory_items 
ADD CONSTRAINT inventory_items_status_check 
CHECK (status IN (
  'available', 
  'sold', 
  'reserved', 
  'damaged', 
  'returned', 
  'in_transit', 
  'pending_pricing',
  'on_hold',
  'pending_quality_check'
));

-- Verify the constraint
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'inventory_items_status_check';

