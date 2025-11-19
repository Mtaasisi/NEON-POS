-- Add missing columns to lats_stock_movements table
-- These columns are needed for proper stock movement tracking

-- Add previous_quantity column to track stock before movement
ALTER TABLE lats_stock_movements 
ADD COLUMN IF NOT EXISTS previous_quantity INTEGER;

-- Add new_quantity column to track stock after movement
ALTER TABLE lats_stock_movements 
ADD COLUMN IF NOT EXISTS new_quantity INTEGER;

-- Add reason column for movement description
ALTER TABLE lats_stock_movements 
ADD COLUMN IF NOT EXISTS reason TEXT;

-- Add reference column for text-based references (in addition to reference_id)
ALTER TABLE lats_stock_movements 
ADD COLUMN IF NOT EXISTS reference TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_variant 
ON lats_stock_movements(product_id, variant_id);

CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at 
ON lats_stock_movements(created_at DESC);

-- Comment the table for clarity
COMMENT ON TABLE lats_stock_movements IS 'Tracks all stock movements including sales, purchases, adjustments, and transfers';
COMMENT ON COLUMN lats_stock_movements.previous_quantity IS 'Stock quantity before the movement';
COMMENT ON COLUMN lats_stock_movements.new_quantity IS 'Stock quantity after the movement';
COMMENT ON COLUMN lats_stock_movements.reason IS 'Human-readable reason for the movement (e.g., "Sale", "Shipment receipt")';
COMMENT ON COLUMN lats_stock_movements.reference IS 'Text reference for the movement (e.g., "Sale #123")';

