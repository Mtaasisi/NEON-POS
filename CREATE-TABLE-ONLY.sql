-- ============================================
-- CREATE MISSING TABLE: lats_inventory_adjustments
-- ============================================
-- Run this FIRST in your Neon SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS lats_inventory_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES lats_products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES lats_product_variants(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase_order', 'sale', 'return', 'adjustment', 'damage', 'transfer')),
  reason TEXT,
  notes TEXT,
  reference_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_product ON lats_inventory_adjustments(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_variant ON lats_inventory_adjustments(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_type ON lats_inventory_adjustments(type);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_created ON lats_inventory_adjustments(created_at);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ lats_inventory_adjustments table created successfully!';
END $$;

