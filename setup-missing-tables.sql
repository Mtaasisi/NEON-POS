-- Setup Missing Tables for POS System
-- Run this to fix the warnings about missing tables

-- ============================================
-- 1. Create lats_receipts table
-- ============================================
CREATE TABLE IF NOT EXISTS lats_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID,
    receipt_number TEXT NOT NULL,
    customer_name TEXT,
    customer_phone TEXT,
    total_amount NUMERIC(10, 2) NOT NULL,
    payment_method TEXT NOT NULL,
    items_count INTEGER NOT NULL,
    generated_by TEXT,
    receipt_content JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_lats_receipts_sale_id ON lats_receipts(sale_id);
CREATE INDEX IF NOT EXISTS idx_lats_receipts_receipt_number ON lats_receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_lats_receipts_customer_phone ON lats_receipts(customer_phone);
CREATE INDEX IF NOT EXISTS idx_lats_receipts_created_at ON lats_receipts(created_at DESC);

-- ============================================
-- 2. Create lats_stock_movements table
-- ============================================
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
CREATE INDEX IF NOT EXISTS idx_lats_stock_movements_created_at ON lats_stock_movements(created_at DESC);

-- ============================================
-- 3. Create updated_at trigger function if it doesn't exist
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger for lats_receipts
DROP TRIGGER IF EXISTS update_lats_receipts_updated_at ON lats_receipts;
CREATE TRIGGER update_lats_receipts_updated_at
    BEFORE UPDATE ON lats_receipts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. Add comments for documentation
-- ============================================
COMMENT ON TABLE lats_receipts IS 'Stores all generated receipts for sales transactions';
COMMENT ON TABLE lats_stock_movements IS 'Tracks all inventory stock movements including sales, purchases, adjustments, and transfers';

-- ============================================
-- 5. Verification Query
-- ============================================
SELECT 
    '✅ Missing tables created successfully!' as status,
    (SELECT COUNT(*) FROM lats_receipts) as receipts_count,
    (SELECT COUNT(*) FROM lats_stock_movements) as stock_movements_count;

