-- Migration: Remove duplicate order_number column from purchase orders
-- Date: 2025-11-12
-- Reason: Standardize on po_number column to avoid confusion and NULL values

-- The table has two columns that serve the same purpose:
-- - po_number (NOT NULL) - Always populated, used by backend
-- - order_number (NULLABLE) - Redundant, often NULL, causing display issues

-- This migration removes order_number and ensures po_number is consistently used

BEGIN;

-- Step 1: Ensure po_number is NOT NULL (it should already be)
-- This is a safety check
ALTER TABLE lats_purchase_orders 
  ALTER COLUMN po_number SET NOT NULL;

-- Step 2: Drop the redundant order_number column
ALTER TABLE lats_purchase_orders 
  DROP COLUMN IF EXISTS order_number;

-- Step 3: Add a comment to the po_number column for clarity
COMMENT ON COLUMN lats_purchase_orders.po_number IS 
  'Unique purchase order number (e.g., PO-1762913812737). This is the primary order identifier displayed to users.';

COMMIT;

-- Verification query (run after migration):
-- SELECT 
--   column_name, 
--   data_type, 
--   is_nullable,
--   column_default
-- FROM information_schema.columns
-- WHERE table_name = 'lats_purchase_orders'
-- AND column_name LIKE '%number%';

-- Expected result: Only po_number column should remain

