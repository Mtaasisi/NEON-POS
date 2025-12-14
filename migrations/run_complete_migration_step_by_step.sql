-- ============================================
-- COMPLETE PARENT-CHILD VARIANT SYSTEM
-- STEP-BY-STEP MIGRATION (NO ERRORS)
-- ============================================
-- Run this file in your Neon database SQL editor
-- This breaks down the migration into safe, individual steps

-- ============================================
-- STEP 1: Add Columns
-- ============================================
DO $$ 
BEGIN
  -- Add parent_variant_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_product_variants' 
    AND column_name = 'parent_variant_id'
  ) THEN
    ALTER TABLE lats_product_variants 
    ADD COLUMN parent_variant_id UUID REFERENCES lats_product_variants(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Added parent_variant_id column';
  END IF;

  -- Add is_parent if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_product_variants' 
    AND column_name = 'is_parent'
  ) THEN
    ALTER TABLE lats_product_variants 
    ADD COLUMN is_parent BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '✅ Added is_parent column';
  END IF;

  -- Add variant_type if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_product_variants' 
    AND column_name = 'variant_type'
  ) THEN
    ALTER TABLE lats_product_variants 
    ADD COLUMN variant_type VARCHAR(20) DEFAULT 'standard';
    RAISE NOTICE '✅ Added variant_type column';
  END IF;
END $$;

-- ============================================
-- STEP 2: Create Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_variant_parent_id 
ON lats_product_variants(parent_variant_id) 
WHERE parent_variant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_variant_type 
ON lats_product_variants(variant_type);

CREATE INDEX IF NOT EXISTS idx_variant_is_parent 
ON lats_product_variants(is_parent) 
WHERE is_parent = TRUE;

RAISE NOTICE '✅ Indexes created';

-- ============================================
-- STEP 3: Update Existing IMEI Variants
-- ============================================
UPDATE lats_product_variants 
SET variant_type = 'imei_child'
WHERE variant_attributes->>'imei' IS NOT NULL 
  AND variant_type = 'standard';

RAISE NOTICE '✅ Existing IMEI variants updated';

-- ============================================
-- STEP 4: Create get_child_imeis() Function
-- ============================================
DROP FUNCTION IF EXISTS get_child_imeis(UUID);

CREATE FUNCTION get_child_imeis(parent_variant_id_param UUID)
RETURNS TABLE (
  child_id UUID,
  imei TEXT,
  serial_number TEXT,
  status TEXT,
  quantity INTEGER,
  cost_price NUMERIC,
  selling_price NUMERIC,
  variant_attributes JSONB,
  created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id as child_id,
    (v.variant_attributes->>'imei')::TEXT as imei,
    (v.variant_attributes->>'serial_number')::TEXT as serial_number,
    CASE 
      WHEN v.is_active = TRUE AND v.quantity > 0 THEN 'available'::TEXT
      WHEN v.is_active = FALSE THEN 'sold'::TEXT
      ELSE 'unavailable'::TEXT
    END as status,
    v.quantity::INTEGER,
    v.cost_price::NUMERIC,
    v.selling_price::NUMERIC,
    v.variant_attributes::JSONB,
    v.created_at::TIMESTAMPTZ
  FROM lats_product_variants v
  WHERE v.parent_variant_id = parent_variant_id_param
    AND v.variant_type = 'imei_child'
  ORDER BY v.created_at DESC;
END;
$$;

RAISE NOTICE '✅ Function get_child_imeis() created';

-- ============================================
-- STEP 5: Create calculate_parent_variant_stock() Function
-- ============================================
DROP FUNCTION IF EXISTS calculate_parent_variant_stock(UUID);

CREATE FUNCTION calculate_parent_variant_stock(parent_variant_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  total_stock INTEGER;
BEGIN
  SELECT COALESCE(SUM(quantity), 0)
  INTO total_stock
  FROM lats_product_variants
  WHERE parent_variant_id = parent_variant_id_param
    AND variant_type = 'imei_child'
    AND is_active = TRUE
    AND quantity > 0;
    
  RETURN total_stock;
END;
$$;

RAISE NOTICE '✅ Function calculate_parent_variant_stock() created';

-- ============================================
-- STEP 6: Create update_parent_variant_stock() Function
-- ============================================
DROP FUNCTION IF EXISTS update_parent_variant_stock() CASCADE;

CREATE FUNCTION update_parent_variant_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_parent_id UUID;
  v_new_stock INTEGER;
BEGIN
  -- Get parent variant ID
  IF TG_OP = 'DELETE' THEN
    v_parent_id := OLD.parent_variant_id;
  ELSE
    v_parent_id := NEW.parent_variant_id;
  END IF;
  
  -- Only process if this is a child variant
  IF v_parent_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Calculate new stock
  v_new_stock := calculate_parent_variant_stock(v_parent_id);
  
  -- Update parent variant
  UPDATE lats_product_variants
  SET 
    quantity = v_new_stock,
    updated_at = NOW()
  WHERE id = v_parent_id;
  
  -- Also update product stock
  UPDATE lats_products p
  SET 
    stock_quantity = (
      SELECT COALESCE(SUM(v.quantity), 0)
      FROM lats_product_variants v
      WHERE v.product_id = p.id
        AND v.is_active = TRUE
        AND (v.variant_type = 'parent' OR v.parent_variant_id IS NULL)
    ),
    updated_at = NOW()
  WHERE p.id = (SELECT product_id FROM lats_product_variants WHERE id = v_parent_id);
  
  RETURN NEW;
END;
$$;

RAISE NOTICE '✅ Function update_parent_variant_stock() created';

-- ============================================
-- STEP 7: Create Trigger
-- ============================================
DROP TRIGGER IF EXISTS trigger_update_parent_stock ON lats_product_variants;

CREATE TRIGGER trigger_update_parent_stock
  AFTER INSERT OR UPDATE OF quantity, is_active OR DELETE ON lats_product_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_parent_variant_stock();

RAISE NOTICE '✅ Trigger trigger_update_parent_stock created';

-- ============================================
-- STEP 8: Create get_purchase_order_items_with_products() Function
-- ============================================
DROP FUNCTION IF EXISTS get_purchase_order_items_with_products(UUID);

CREATE FUNCTION get_purchase_order_items_with_products(
  purchase_order_id_param UUID
)
RETURNS TABLE(
  id UUID,
  purchase_order_id UUID,
  product_id UUID,
  variant_id UUID,
  quantity INTEGER,
  received_quantity INTEGER,
  unit_cost NUMERIC,
  total_cost NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  product_name TEXT,
  product_sku TEXT,
  variant_name TEXT,
  variant_sku TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    poi.id,
    poi.purchase_order_id,
    poi.product_id,
    poi.variant_id,
    COALESCE(poi.quantity_ordered, 0)::INTEGER as quantity,
    COALESCE(poi.quantity_received, 0)::INTEGER as received_quantity,
    COALESCE(poi.unit_cost, 0) as unit_cost,
    (COALESCE(poi.quantity_ordered, 0) * COALESCE(poi.unit_cost, 0)) as total_cost,
    COALESCE(poi.notes, '')::TEXT as notes,
    poi.created_at,
    COALESCE(poi.updated_at, poi.created_at) as updated_at,
    COALESCE(p.name, 'Unknown Product') as product_name,
    COALESCE(p.sku, '') as product_sku,
    COALESCE(pv.variant_name, pv.name, 'Default Variant') as variant_name,
    COALESCE(pv.sku, '') as variant_sku
  FROM lats_purchase_order_items poi
  LEFT JOIN lats_products p ON poi.product_id = p.id
  LEFT JOIN lats_product_variants pv ON poi.variant_id = pv.id
  WHERE poi.purchase_order_id = purchase_order_id_param
  ORDER BY poi.created_at ASC;
END;
$$;

RAISE NOTICE '✅ Function get_purchase_order_items_with_products() created';

-- ============================================
-- STEP 9: Add Comments
-- ============================================
COMMENT ON TABLE lats_product_variants IS 'Product variants with parent-child IMEI tracking support';
COMMENT ON COLUMN lats_product_variants.parent_variant_id IS 'Reference to parent variant (for IMEI children)';
COMMENT ON COLUMN lats_product_variants.is_parent IS 'TRUE if this variant has IMEI children';
COMMENT ON COLUMN lats_product_variants.variant_type IS 'Type: standard, parent, or imei_child';
COMMENT ON FUNCTION get_child_imeis(UUID) IS 'Get all child IMEI variants for a parent variant';
COMMENT ON FUNCTION calculate_parent_variant_stock(UUID) IS 'Calculate total stock from child IMEI variants';
COMMENT ON FUNCTION get_purchase_order_items_with_products(UUID) IS 'Get PO items with product and variant details';

-- ============================================
-- FINAL SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '╔════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ PARENT-CHILD VARIANT SYSTEM INSTALLED!        ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════╝';
  RAISE NOTICE ' ';
  RAISE NOTICE '📦 System Features:';
  RAISE NOTICE '   • Parent variants can have child IMEI variants';
  RAISE NOTICE '   • Automatic stock calculation from children';
  RAISE NOTICE '   • IMEI tracking for individual devices';
  RAISE NOTICE '   • Purchase order receiving with serial numbers';
  RAISE NOTICE ' ';
  RAISE NOTICE '🔧 Available Functions:';
  RAISE NOTICE '   • get_child_imeis(parent_id)';
  RAISE NOTICE '   • calculate_parent_variant_stock(parent_id)';
  RAISE NOTICE '   • get_purchase_order_items_with_products(po_id)';
  RAISE NOTICE ' ';
  RAISE NOTICE '✨ Ready to receive purchase orders with IMEIs!';
END $$;

