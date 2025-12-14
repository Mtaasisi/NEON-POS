-- ============================================
-- PARENT-CHILD VARIANT SYSTEM - SIMPLE VERSION
-- ============================================
-- This version has no notices, just executes cleanly
-- Copy and paste this entire file into Neon SQL editor

-- Add columns
ALTER TABLE lats_product_variants 
ADD COLUMN IF NOT EXISTS parent_variant_id UUID REFERENCES lats_product_variants(id) ON DELETE CASCADE;

ALTER TABLE lats_product_variants 
ADD COLUMN IF NOT EXISTS is_parent BOOLEAN DEFAULT FALSE;

ALTER TABLE lats_product_variants 
ADD COLUMN IF NOT EXISTS variant_type VARCHAR(20) DEFAULT 'standard';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_variant_parent_id 
ON lats_product_variants(parent_variant_id) 
WHERE parent_variant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_variant_type 
ON lats_product_variants(variant_type);

CREATE INDEX IF NOT EXISTS idx_variant_is_parent 
ON lats_product_variants(is_parent) 
WHERE is_parent = TRUE;

-- Update existing IMEI variants
UPDATE lats_product_variants 
SET variant_type = 'imei_child'
WHERE variant_attributes->>'imei' IS NOT NULL 
  AND variant_type = 'standard';

-- Function: get_child_imeis
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
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    (v.variant_attributes->>'imei')::TEXT,
    (v.variant_attributes->>'serial_number')::TEXT,
    CASE 
      WHEN v.is_active = TRUE AND v.quantity > 0 THEN 'available'::TEXT
      WHEN v.is_active = FALSE THEN 'sold'::TEXT
      ELSE 'unavailable'::TEXT
    END,
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

-- Function: calculate_parent_variant_stock
DROP FUNCTION IF EXISTS calculate_parent_variant_stock(UUID);

CREATE FUNCTION calculate_parent_variant_stock(parent_variant_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql STABLE
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

-- Function: update_parent_variant_stock (trigger function)
DROP FUNCTION IF EXISTS update_parent_variant_stock() CASCADE;

CREATE FUNCTION update_parent_variant_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_parent_id UUID;
  v_new_stock INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_parent_id := OLD.parent_variant_id;
  ELSE
    v_parent_id := NEW.parent_variant_id;
  END IF;
  
  IF v_parent_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;
  
  v_new_stock := calculate_parent_variant_stock(v_parent_id);
  
  UPDATE lats_product_variants
  SET quantity = v_new_stock, updated_at = NOW()
  WHERE id = v_parent_id;
  
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
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_parent_stock ON lats_product_variants;

CREATE TRIGGER trigger_update_parent_stock
  AFTER INSERT OR UPDATE OF quantity, is_active OR DELETE ON lats_product_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_parent_variant_stock();

-- Function: get_purchase_order_items_with_products
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
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    poi.id,
    poi.purchase_order_id,
    poi.product_id,
    poi.variant_id,
    COALESCE(poi.quantity_ordered, 0)::INTEGER,
    COALESCE(poi.quantity_received, 0)::INTEGER,
    COALESCE(poi.unit_cost, 0),
    (COALESCE(poi.quantity_ordered, 0) * COALESCE(poi.unit_cost, 0)),
    COALESCE(poi.notes, '')::TEXT,
    poi.created_at,
    COALESCE(poi.updated_at, poi.created_at),
    COALESCE(p.name, 'Unknown Product'),
    COALESCE(p.sku, ''),
    COALESCE(pv.variant_name, pv.name, 'Default Variant'),
    COALESCE(pv.sku, '')
  FROM lats_purchase_order_items poi
  LEFT JOIN lats_products p ON poi.product_id = p.id
  LEFT JOIN lats_product_variants pv ON poi.variant_id = pv.id
  WHERE poi.purchase_order_id = purchase_order_id_param
  ORDER BY poi.created_at ASC;
END;
$$;

-- Add documentation
COMMENT ON TABLE lats_product_variants IS 'Product variants with parent-child IMEI tracking';
COMMENT ON COLUMN lats_product_variants.parent_variant_id IS 'Reference to parent variant';
COMMENT ON COLUMN lats_product_variants.is_parent IS 'TRUE if variant has IMEI children';
COMMENT ON COLUMN lats_product_variants.variant_type IS 'Type: standard, parent, or imei_child';

-- Done! System is ready.

