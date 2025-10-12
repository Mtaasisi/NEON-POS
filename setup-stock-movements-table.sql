-- ============================================
-- STOCK MOVEMENTS TABLE SETUP
-- ============================================
-- This script creates the stock movements table
-- to track inventory changes
-- ============================================

-- Create stock movements table
CREATE TABLE IF NOT EXISTS lats_stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID,
    variant_id UUID,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment', 'transfer', 'sale', 'purchase', 'return')),
    quantity NUMERIC NOT NULL,
    previous_quantity NUMERIC,
    new_quantity NUMERIC,
    reference_type TEXT,
    reference_id UUID,
    reason TEXT,
    notes TEXT,
    from_location TEXT,
    to_location TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_lats_stock_movements_product_id ON lats_stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_lats_stock_movements_variant_id ON lats_stock_movements(variant_id);
CREATE INDEX IF NOT EXISTS idx_lats_stock_movements_movement_type ON lats_stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_lats_stock_movements_created_at ON lats_stock_movements(created_at);

-- Add foreign key constraints (optional, only if you want strict referential integrity)
-- Uncomment these if you want to enforce relationships:
-- ALTER TABLE lats_stock_movements 
--   ADD CONSTRAINT lats_stock_movements_product_id_fkey 
--   FOREIGN KEY (product_id) REFERENCES lats_products(id) ON DELETE CASCADE;
-- 
-- ALTER TABLE lats_stock_movements 
--   ADD CONSTRAINT lats_stock_movements_variant_id_fkey 
--   FOREIGN KEY (variant_id) REFERENCES lats_product_variants(id) ON DELETE CASCADE;

-- Enable RLS (Row Level Security)
ALTER TABLE lats_stock_movements ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to manage stock movements
CREATE POLICY "Allow authenticated users to manage stock movements"
ON lats_stock_movements
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Stock movements table created successfully!'; 
END $$;

