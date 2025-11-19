-- ============================================
-- PARENT-CHILD VARIANT SYSTEM WITH IMEI TRACKING
-- ============================================
-- This migration creates a hierarchical variant system where:
-- - Parent Variants: Represent variant attributes (e.g., "128GB", "Black")
-- - Child Variants: Individual items with unique IMEI numbers
-- 
-- Example:
--   Product: iPhone 6
--   └── Parent Variant: "128GB" (Stock: 5)
--       ├── Child: IMEI 123456789012345
--       ├── Child: IMEI 234567890123456
--       ├── Child: IMEI 345678901234567
--       ├── Child: IMEI 456789012345678
--       └── Child: IMEI 567890123456789

-- Step 0: Temporarily disable existing IMEI triggers to allow migration
DROP TRIGGER IF EXISTS enforce_unique_imei ON lats_product_variants;

-- Step 1: Add parent_variant_id column if it doesn't exist
ALTER TABLE lats_product_variants 
ADD COLUMN IF NOT EXISTS parent_variant_id UUID REFERENCES lats_product_variants(id) ON DELETE CASCADE;

-- Step 2: Add is_parent flag to distinguish parent variants from child IMEI variants
ALTER TABLE lats_product_variants 
ADD COLUMN IF NOT EXISTS is_parent BOOLEAN DEFAULT FALSE;

-- Step 3: Add variant_type to clearly identify the type
ALTER TABLE lats_product_variants 
ADD COLUMN IF NOT EXISTS variant_type VARCHAR(20) DEFAULT 'standard';
-- variant_type options: 'standard', 'parent', 'imei_child'

-- Step 4: Create index on parent_variant_id for fast child lookup
CREATE INDEX IF NOT EXISTS idx_variant_parent_id 
ON lats_product_variants(parent_variant_id) 
WHERE parent_variant_id IS NOT NULL;

-- Step 5: Create index on variant_type for filtering
CREATE INDEX IF NOT EXISTS idx_variant_type 
ON lats_product_variants(variant_type);

-- Step 6: Create index on is_parent for filtering
CREATE INDEX IF NOT EXISTS idx_variant_is_parent 
ON lats_product_variants(is_parent) 
WHERE is_parent = TRUE;

-- Step 7: Update existing IMEI variants to be marked as children
-- (Keep them as standalone for now, we'll migrate them properly later)
UPDATE lats_product_variants 
SET variant_type = 'imei_child'
WHERE variant_attributes->>'imei' IS NOT NULL 
  AND variant_type = 'standard';

-- Step 8: Function to get all child IMEIs for a parent variant
CREATE OR REPLACE FUNCTION get_child_imeis(parent_variant_id_param UUID)
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
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id as child_id,
    v.variant_attributes->>'imei' as imei,
    v.variant_attributes->>'serial_number' as serial_number,
    CASE 
      WHEN v.is_active = TRUE AND v.quantity > 0 THEN 'available'
      WHEN v.is_active = FALSE THEN 'sold'
      ELSE 'unavailable'
    END as status,
    v.quantity,
    v.cost_price,
    v.selling_price,
    v.variant_attributes,
    v.created_at
  FROM lats_product_variants v
  WHERE v.parent_variant_id = parent_variant_id_param
    AND v.variant_type = 'imei_child'
  ORDER BY v.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Function to calculate parent variant stock from children
CREATE OR REPLACE FUNCTION calculate_parent_variant_stock(parent_variant_id_param UUID)
RETURNS INTEGER AS $$
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
$$ LANGUAGE plpgsql;

-- Step 10: Function to update parent variant stock automatically
CREATE OR REPLACE FUNCTION update_parent_variant_stock()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Step 11: Create trigger to auto-update parent stock when children change
DROP TRIGGER IF EXISTS trigger_update_parent_stock ON lats_product_variants;
CREATE TRIGGER trigger_update_parent_stock
  AFTER INSERT OR UPDATE OF quantity, is_active OR DELETE ON lats_product_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_parent_variant_stock();

-- Step 12: Function to get parent variants only (for PO creation)
CREATE OR REPLACE FUNCTION get_parent_variants(product_id_param UUID)
RETURNS TABLE (
  variant_id UUID,
  variant_name TEXT,
  sku TEXT,
  cost_price NUMERIC,
  selling_price NUMERIC,
  quantity INTEGER,
  available_imeis INTEGER,
  variant_attributes JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id as variant_id,
    COALESCE(v.variant_name, v.name) as variant_name,
    v.sku,
    v.cost_price,
    v.selling_price,
    v.quantity,
    (
      SELECT COUNT(*)::INTEGER
      FROM lats_product_variants child
      WHERE child.parent_variant_id = v.id
        AND child.variant_type = 'imei_child'
        AND child.is_active = TRUE
        AND child.quantity > 0
    ) as available_imeis,
    v.variant_attributes
  FROM lats_product_variants v
  WHERE v.product_id = product_id_param
    AND v.is_active = TRUE
    AND (v.variant_type = 'parent' OR v.variant_type = 'standard')
  ORDER BY v.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Step 13: Function to add IMEI to parent variant
CREATE OR REPLACE FUNCTION add_imei_to_parent_variant(
  parent_variant_id_param UUID,
  imei_param TEXT,
  serial_number_param TEXT DEFAULT NULL,
  mac_address_param TEXT DEFAULT NULL,
  cost_price_param NUMERIC DEFAULT 0,
  selling_price_param NUMERIC DEFAULT 0,
  condition_param TEXT DEFAULT 'new',
  branch_id_param UUID DEFAULT NULL,
  notes_param TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  child_variant_id UUID,
  error_message TEXT
) AS $$
DECLARE
  v_parent_variant RECORD;
  v_product_id UUID;
  v_new_sku TEXT;
  v_child_id UUID;
  v_timestamp TEXT;
BEGIN
  -- Get parent variant info
  SELECT * INTO v_parent_variant
  FROM lats_product_variants
  WHERE id = parent_variant_id_param;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Parent variant not found';
    RETURN;
  END IF;
  
  -- Check for duplicate IMEI
  IF EXISTS (
    SELECT 1 FROM lats_product_variants
    WHERE variant_attributes->>'imei' = imei_param
  ) THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Device with IMEI ' || imei_param || ' already exists in inventory';
    RETURN;
  END IF;
  
  -- Get product ID
  v_product_id := v_parent_variant.product_id;
  
  -- Generate unique SKU for child IMEI variant
  v_timestamp := EXTRACT(EPOCH FROM NOW())::TEXT;
  v_new_sku := COALESCE(v_parent_variant.sku, 'VAR') || '-IMEI-' || SUBSTRING(imei_param, 1, 8) || '-' || SUBSTRING(v_timestamp, 1, 10);
  
  -- Mark parent as parent type if not already
  UPDATE lats_product_variants
  SET 
    is_parent = TRUE,
    variant_type = 'parent',
    updated_at = NOW()
  WHERE id = parent_variant_id_param
    AND variant_type != 'parent';
  
  -- Create child IMEI variant
  INSERT INTO lats_product_variants (
    product_id,
    parent_variant_id,
    name,
    variant_name,
    sku,
    cost_price,
    selling_price,
    quantity,
    is_active,
    is_parent,
    variant_type,
    variant_attributes,
    branch_id
  ) VALUES (
    v_product_id,
    parent_variant_id_param,
    'IMEI: ' || imei_param,
    'IMEI: ' || imei_param,
    v_new_sku,
    COALESCE(cost_price_param, v_parent_variant.cost_price),
    COALESCE(selling_price_param, v_parent_variant.selling_price),
    1, -- Each IMEI is quantity 1
    TRUE,
    FALSE,
    'imei_child',
    jsonb_build_object(
      'imei', imei_param,
      'serial_number', serial_number_param,
      'mac_address', mac_address_param,
      'condition', condition_param,
      'notes', notes_param,
      'source', 'purchase',
      'created_at', NOW()
    ),
    COALESCE(branch_id_param, v_parent_variant.branch_id)
  )
  RETURNING id INTO v_child_id;
  
  -- Create stock movement record
  INSERT INTO lats_stock_movements (
    product_id,
    variant_id,
    branch_id,
    movement_type,
    quantity,
    reference_type,
    notes,
    created_at
  ) VALUES (
    v_product_id,
    v_child_id,
    COALESCE(branch_id_param, v_parent_variant.branch_id),
    'purchase',
    1,
    'imei_receive',
    'Received IMEI ' || imei_param || ' for variant ' || COALESCE(v_parent_variant.variant_name, v_parent_variant.name),
    NOW()
  );
  
  RETURN QUERY SELECT TRUE, v_child_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Step 14: Function to get available IMEI variants for POS
CREATE OR REPLACE FUNCTION get_available_imeis_for_pos(parent_variant_id_param UUID)
RETURNS TABLE (
  child_id UUID,
  imei TEXT,
  serial_number TEXT,
  condition TEXT,
  cost_price NUMERIC,
  selling_price NUMERIC,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id as child_id,
    v.variant_attributes->>'imei' as imei,
    v.variant_attributes->>'serial_number' as serial_number,
    v.variant_attributes->>'condition' as condition,
    v.cost_price,
    v.selling_price,
    v.created_at
  FROM lats_product_variants v
  WHERE v.parent_variant_id = parent_variant_id_param
    AND v.variant_type = 'imei_child'
    AND v.is_active = TRUE
    AND v.quantity > 0
  ORDER BY v.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Step 15: Function to mark IMEI as sold
CREATE OR REPLACE FUNCTION mark_imei_as_sold(
  child_variant_id_param UUID,
  sale_id_param UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE lats_product_variants
  SET 
    quantity = 0,
    is_active = FALSE,
    variant_attributes = variant_attributes || jsonb_build_object(
      'sold_at', NOW(),
      'sale_id', sale_id_param
    ),
    updated_at = NOW()
  WHERE id = child_variant_id_param
    AND variant_type = 'imei_child';
    
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Step 16: View for easy querying of parent-child relationships
CREATE OR REPLACE VIEW v_parent_child_variants AS
SELECT 
  p.id as parent_id,
  p.product_id,
  p.variant_name as parent_variant_name,
  p.sku as parent_sku,
  p.quantity as parent_quantity,
  p.cost_price as parent_cost_price,
  p.selling_price as parent_selling_price,
  c.id as child_id,
  c.variant_attributes->>'imei' as child_imei,
  c.variant_attributes->>'serial_number' as child_serial_number,
  c.quantity as child_quantity,
  c.is_active as child_is_active,
  c.cost_price as child_cost_price,
  c.selling_price as child_selling_price,
  c.created_at as child_created_at,
  (
    SELECT COUNT(*)
    FROM lats_product_variants child
    WHERE child.parent_variant_id = p.id
      AND child.variant_type = 'imei_child'
      AND child.is_active = TRUE
      AND child.quantity > 0
  ) as available_imei_count
FROM lats_product_variants p
LEFT JOIN lats_product_variants c ON c.parent_variant_id = p.id AND c.variant_type = 'imei_child'
WHERE p.variant_type = 'parent' OR p.is_parent = TRUE;

-- Step 17: Add comments for documentation
COMMENT ON COLUMN lats_product_variants.parent_variant_id IS 'Reference to parent variant for IMEI children';
COMMENT ON COLUMN lats_product_variants.is_parent IS 'TRUE if this variant has child IMEI variants';
COMMENT ON COLUMN lats_product_variants.variant_type IS 'Type: standard, parent, or imei_child';
COMMENT ON FUNCTION get_child_imeis(UUID) IS 'Get all child IMEI variants for a parent variant';
COMMENT ON FUNCTION calculate_parent_variant_stock(UUID) IS 'Calculate total stock from child IMEI variants';
COMMENT ON FUNCTION add_imei_to_parent_variant IS 'Add a new IMEI as a child of a parent variant';
COMMENT ON FUNCTION get_available_imeis_for_pos(UUID) IS 'Get available IMEI variants for POS selection';
COMMENT ON FUNCTION mark_imei_as_sold(UUID, UUID) IS 'Mark an IMEI variant as sold';

-- Step 18: Purchase Order Items Query Function
-- This function is used by PO receiving modal to display variant names correctly
CREATE OR REPLACE FUNCTION get_purchase_order_items_with_products(
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
) AS $$
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
    COALESCE(pv.variant_name, pv.name, 'Default Variant') as variant_name,  -- ✅ Read variant_name first!
    COALESCE(pv.sku, '') as variant_sku
  FROM lats_purchase_order_items poi
  LEFT JOIN lats_products p ON poi.product_id = p.id
  LEFT JOIN lats_product_variants pv ON poi.variant_id = pv.id
  WHERE poi.purchase_order_id = purchase_order_id_param
  ORDER BY poi.created_at ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_purchase_order_items_with_products IS 'Get PO items with product and variant details (variant_name column)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Parent-Child Variant System created successfully!';
  RAISE NOTICE '📦 Parent variants can now have multiple IMEI children';
  RAISE NOTICE '🔧 Use add_imei_to_parent_variant() to add IMEIs to parent variants';
  RAISE NOTICE '🛒 Use get_parent_variants() to get variants for PO creation';
  RAISE NOTICE '💰 Use get_available_imeis_for_pos() to get IMEIs for POS';
  RAISE NOTICE '📋 Use get_purchase_order_items_with_products() to fetch PO items for receiving';
END $$;

