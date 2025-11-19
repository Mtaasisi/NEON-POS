-- =====================================================
-- RENAME PURCHASE ORDER ITEMS COLUMNS
-- =====================================================
-- This migration renames columns in lats_purchase_order_items table
-- to be more descriptive and consistent with the SQL functions

-- Rename quantity to quantity_ordered (if not already renamed)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_purchase_order_items' 
    AND column_name = 'quantity'
  ) THEN
    ALTER TABLE lats_purchase_order_items 
    RENAME COLUMN quantity TO quantity_ordered;
    RAISE NOTICE 'Renamed column quantity to quantity_ordered';
  ELSE
    RAISE NOTICE 'Column quantity_ordered already exists, skipping';
  END IF;
END $$;

-- Rename received_quantity to quantity_received (if not already renamed)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_purchase_order_items' 
    AND column_name = 'received_quantity'
  ) THEN
    ALTER TABLE lats_purchase_order_items 
    RENAME COLUMN received_quantity TO quantity_received;
    RAISE NOTICE 'Renamed column received_quantity to quantity_received';
  ELSE
    RAISE NOTICE 'Column quantity_received already exists, skipping';
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN lats_purchase_order_items.quantity_ordered IS 
  'The total quantity ordered for this item in the purchase order';

COMMENT ON COLUMN lats_purchase_order_items.quantity_received IS 
  'The quantity received so far for this item';

