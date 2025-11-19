-- ============================================================================
-- COMPLETE IMEI SYSTEM FIX - All-in-One Solution
-- ============================================================================
-- This migration creates and fixes the complete Parent-Child IMEI variant system
-- Run this file in your Neon database to fix all IMEI receiving issues
-- ============================================================================

-- ============================================================================
-- STEP 1: CLEAN UP OLD/CONFLICTING FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Drop old triggers that might conflict
DROP TRIGGER IF EXISTS enforce_unique_imei ON lats_product_variants CASCADE;
DROP TRIGGER IF EXISTS trigger_sync_parent_quantity ON lats_product_variants CASCADE;
DROP TRIGGER IF EXISTS trigger_update_parent_stock ON lats_product_variants CASCADE;

-- Drop old views first (they may depend on functions)
DROP VIEW IF EXISTS v_parent_child_variants CASCADE;

-- Drop all versions of mark_imei_as_sold (multiple signatures exist)
DROP FUNCTION IF EXISTS mark_imei_as_sold(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS mark_imei_as_sold(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS mark_imei_as_sold(UUID) CASCADE;
DROP FUNCTION IF EXISTS mark_imei_as_sold(TEXT) CASCADE;

-- Drop all versions of add_imei_to_parent_variant (multiple signatures exist)
DROP FUNCTION IF EXISTS add_imei_to_parent_variant(UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS add_imei_to_parent_variant(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT) CASCADE;

-- Drop all versions of get_available_imeis_for_pos (multiple signatures exist)
DROP FUNCTION IF EXISTS get_available_imeis_for_pos(UUID) CASCADE;

-- Drop all versions of get_child_imeis (multiple signatures exist)
DROP FUNCTION IF EXISTS get_child_imeis(UUID) CASCADE;

-- Drop all versions of get_parent_variants (multiple signatures exist)
DROP FUNCTION IF EXISTS get_parent_variants(UUID) CASCADE;

-- Drop all versions of other functions (with proper syntax)
DROP FUNCTION IF EXISTS sync_parent_quantity_on_imei_change() CASCADE;
DROP FUNCTION IF EXISTS update_parent_variant_stock() CASCADE;
DROP FUNCTION IF EXISTS update_parent_stock_from_children() CASCADE;
DROP FUNCTION IF EXISTS calculate_parent_variant_stock(UUID) CASCADE;
DROP FUNCTION IF EXISTS recalculate_all_parent_stocks() CASCADE;

-- ============================================================================
-- STEP 2: ENSURE TABLE STRUCTURE IS CORRECT
-- ============================================================================

-- Add required columns if they don't exist
ALTER TABLE lats_product_variants 
ADD COLUMN IF NOT EXISTS parent_variant_id UUID REFERENCES lats_product_variants(id) ON DELETE CASCADE;

ALTER TABLE lats_product_variants 
ADD COLUMN IF NOT EXISTS is_parent BOOLEAN DEFAULT FALSE;

ALTER TABLE lats_product_variants 
ADD COLUMN IF NOT EXISTS variant_type VARCHAR(20) DEFAULT 'standard';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_variant_parent_id 
ON lats_product_variants(parent_variant_id) 
WHERE parent_variant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_variant_type 
ON lats_product_variants(variant_type);

CREATE INDEX IF NOT EXISTS idx_variant_is_parent 
ON lats_product_variants(is_parent) 
WHERE is_parent = TRUE;

CREATE INDEX IF NOT EXISTS idx_variant_imei
ON lats_product_variants((variant_attributes->>'imei'))
WHERE variant_type = 'imei_child';

-- ============================================================================
-- STEP 3: FIX EXISTING DATA
-- ============================================================================

-- Mark existing IMEI variants as imei_child type
UPDATE lats_product_variants 
SET variant_type = 'imei_child'
WHERE variant_attributes->>'imei' IS NOT NULL 
  AND variant_type IN ('standard', 'imei');

-- Fix variants with wrong type names
UPDATE lats_product_variants
SET variant_type = 'imei_child'
WHERE parent_variant_id IS NOT NULL
  AND variant_attributes ? 'imei'
  AND variant_type = 'imei';

-- ============================================================================
-- STEP 4: CREATE CORE FUNCTIONS
-- ============================================================================

-- Function 1: Calculate parent variant stock from children
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

-- Function 2: Update parent stock trigger function
CREATE OR REPLACE FUNCTION update_parent_stock_from_children()
RETURNS TRIGGER AS $$
DECLARE
  v_parent_id UUID;
  v_new_total INT;
  v_product_id UUID;
BEGIN
  -- Determine the parent ID
  IF TG_OP = 'DELETE' THEN
    v_parent_id := OLD.parent_variant_id;
  ELSE
    v_parent_id := NEW.parent_variant_id;
  END IF;

  -- Only process if this is an IMEI child variant with a parent
  IF v_parent_id IS NOT NULL AND (
    (TG_OP = 'DELETE' AND OLD.variant_type = 'imei_child') OR
    (TG_OP IN ('INSERT', 'UPDATE') AND NEW.variant_type = 'imei_child')
  ) THEN
    -- Calculate total quantity from all active IMEI children
    SELECT COALESCE(SUM(quantity), 0)
    INTO v_new_total
    FROM lats_product_variants
    WHERE parent_variant_id = v_parent_id
      AND variant_type = 'imei_child'
      AND is_active = TRUE;

    -- Get product ID from parent
    SELECT product_id INTO v_product_id
    FROM lats_product_variants
    WHERE id = v_parent_id;

    -- Update parent variant quantity
    UPDATE lats_product_variants
    SET 
      quantity = v_new_total,
      updated_at = NOW()
    WHERE id = v_parent_id;
    
    -- Update product stock_quantity
    IF v_product_id IS NOT NULL THEN
      UPDATE lats_products
      SET 
        stock_quantity = (
          SELECT COALESCE(SUM(quantity), 0)
          FROM lats_product_variants
          WHERE product_id = v_product_id
            AND is_active = TRUE
            AND (variant_type = 'parent' OR variant_type = 'standard')
        ),
        updated_at = NOW()
      WHERE id = v_product_id;
    END IF;
    
    RAISE NOTICE '✅ Parent % stock updated to % (Product: %)', v_parent_id, v_new_total, v_product_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function 3: Add IMEI to parent variant (MAIN FUNCTION)
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
  -- Validate IMEI format (15 digits)
  IF imei_param !~ '^[0-9]{15}$' THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'IMEI must be exactly 15 numeric digits: ' || imei_param;
    RETURN;
  END IF;
  
  -- Check for duplicate IMEI
  IF EXISTS (
    SELECT 1 FROM lats_product_variants
    WHERE variant_attributes->>'imei' = imei_param
      AND variant_type = 'imei_child'
  ) THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Device with IMEI ' || imei_param || ' already exists in inventory';
    RETURN;
  END IF;
  
  -- Get parent variant info
  SELECT * INTO v_parent_variant
  FROM lats_product_variants
  WHERE id = parent_variant_id_param;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Parent variant not found: ' || parent_variant_id_param;
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
    AND (variant_type != 'parent' OR is_parent != TRUE);
  
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
    branch_id,
    created_at,
    updated_at
  ) VALUES (
    v_product_id,
    parent_variant_id_param,
    'IMEI: ' || imei_param,
    'IMEI: ' || imei_param,
    v_new_sku,
    COALESCE(cost_price_param, v_parent_variant.cost_price, 0),
    COALESCE(selling_price_param, v_parent_variant.selling_price, 0),
    1, -- Each IMEI is quantity 1
    TRUE,
    FALSE,
    'imei_child', -- CRITICAL: Must be 'imei_child' to match trigger
    jsonb_build_object(
      'imei', imei_param,
      'imei_status', 'available',
      'serial_number', serial_number_param,
      'mac_address', mac_address_param,
      'condition', condition_param,
      'notes', notes_param,
      'source', 'purchase',
      'received_at', NOW()
    ),
    COALESCE(branch_id_param, v_parent_variant.branch_id),
    NOW(),
    NOW()
  )
  RETURNING id INTO v_child_id;
  
  -- Create stock movement record
  INSERT INTO lats_stock_movements (
    product_id,
    variant_id,
    branch_id,
    movement_type,
    quantity,
    previous_quantity,
    new_quantity,
    reference_type,
    reason,
    notes,
    created_at
  ) VALUES (
    v_product_id,
    v_child_id,
    COALESCE(branch_id_param, v_parent_variant.branch_id),
    'purchase',
    1,
    0,
    1,
    'imei_receive',
    'Purchase Order Receipt',
    'Received IMEI ' || imei_param || ' for variant ' || COALESCE(v_parent_variant.variant_name, v_parent_variant.name),
    NOW()
  );
  
  RAISE NOTICE '✅ IMEI % added as child of variant %', imei_param, parent_variant_id_param;
  RETURN QUERY SELECT TRUE, v_child_id, NULL::TEXT;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Error adding IMEI: %', SQLERRM;
    RETURN QUERY SELECT FALSE, NULL::UUID, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Function 4: Get child IMEIs for a parent variant
CREATE OR REPLACE FUNCTION get_child_imeis(parent_variant_id_param UUID)
RETURNS TABLE (
  child_id UUID,
  imei TEXT,
  serial_number TEXT,
  mac_address TEXT,
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
    v.variant_attributes->>'mac_address' as mac_address,
    COALESCE(v.variant_attributes->>'imei_status', 
      CASE 
        WHEN v.is_active = TRUE AND v.quantity > 0 THEN 'available'
        WHEN v.is_active = FALSE THEN 'sold'
        ELSE 'unavailable'
      END
    ) as status,
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

-- Function 5: Get available IMEIs for POS
CREATE OR REPLACE FUNCTION get_available_imeis_for_pos(
  parent_variant_id_param UUID
)
RETURNS TABLE(
  child_id UUID,
  imei TEXT,
  serial_number TEXT,
  mac_address TEXT,
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
    v.variant_attributes->>'mac_address' as mac_address,
    COALESCE(v.variant_attributes->>'condition', 'new') as condition,
    v.cost_price,
    v.selling_price,
    v.created_at
  FROM lats_product_variants v
  WHERE v.parent_variant_id = parent_variant_id_param
    AND v.variant_type = 'imei_child'
    AND COALESCE(v.variant_attributes->>'imei_status', 'available') = 'available'
    AND v.quantity > 0
    AND v.is_active = TRUE
  ORDER BY v.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function 6: Get parent variants for PO creation
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

-- Function 7: Mark IMEI as sold (by IMEI number)
CREATE OR REPLACE FUNCTION mark_imei_as_sold(
  imei_param TEXT,
  sale_reference TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_variant_id UUID;
  v_parent_id UUID;
BEGIN
  -- Find the IMEI variant
  SELECT id, parent_variant_id INTO v_variant_id, v_parent_id
  FROM lats_product_variants
  WHERE variant_type = 'imei_child'
    AND variant_attributes->>'imei' = imei_param
    AND COALESCE(variant_attributes->>'imei_status', 'available') = 'available'
    AND quantity > 0
  LIMIT 1;

  IF v_variant_id IS NULL THEN
    RAISE EXCEPTION 'Available IMEI % not found', imei_param;
  END IF;

  -- Mark as sold and set quantity to 0
  UPDATE lats_product_variants
  SET 
    quantity = 0,
    variant_attributes = jsonb_set(
      jsonb_set(
        variant_attributes,
        '{imei_status}',
        '"sold"'
      ),
      '{sold_at}',
      to_jsonb(NOW())
    ),
    updated_at = NOW()
  WHERE id = v_variant_id;

  -- Add sale reference if provided
  IF sale_reference IS NOT NULL THEN
    UPDATE lats_product_variants
    SET variant_attributes = jsonb_set(
      variant_attributes,
      '{sale_reference}',
      to_jsonb(sale_reference)
    )
    WHERE id = v_variant_id;
  END IF;

  -- Create stock movement
  INSERT INTO lats_stock_movements (
    product_id,
    variant_id,
    movement_type,
    quantity,
    reference_type,
    notes,
    created_at
  )
  SELECT 
    product_id,
    v_variant_id,
    'sale',
    -1,
    'pos_sale',
    'IMEI ' || imei_param || ' sold' || COALESCE(' - ' || sale_reference, ''),
    NOW()
  FROM lats_product_variants
  WHERE id = v_variant_id;

  -- Parent stock will be updated automatically by trigger
  RAISE NOTICE '✅ IMEI % marked as sold', imei_param;
  RETURN TRUE;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Error marking IMEI as sold: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function 8: Recalculate all parent stocks (for fixing data)
CREATE OR REPLACE FUNCTION recalculate_all_parent_stocks()
RETURNS TABLE(
  parent_id UUID,
  parent_name TEXT,
  old_quantity INT,
  new_quantity INT,
  children_count INT
) AS $$
BEGIN
  RETURN QUERY
  WITH parent_calcs AS (
    SELECT 
      p.id,
      COALESCE(p.variant_name, p.name) as name,
      p.quantity as old_qty,
      COALESCE(SUM(c.quantity), 0)::INT as new_qty,
      COUNT(c.id)::INT as child_count
    FROM lats_product_variants p
    LEFT JOIN lats_product_variants c 
      ON c.parent_variant_id = p.id 
      AND c.variant_type = 'imei_child'
      AND c.is_active = TRUE
    WHERE (p.is_parent = TRUE OR p.variant_type = 'parent')
      OR EXISTS (
        SELECT 1 FROM lats_product_variants child 
        WHERE child.parent_variant_id = p.id
      )
    GROUP BY p.id, p.variant_name, p.name, p.quantity
  )
  SELECT 
    id,
    name,
    old_qty,
    new_qty,
    child_count
  FROM parent_calcs;
  
  -- Update all parent quantities
  UPDATE lats_product_variants p
  SET 
    quantity = subq.new_qty,
    updated_at = NOW()
  FROM (
    SELECT 
      p2.id,
      COALESCE(SUM(c.quantity), 0)::INT as new_qty
    FROM lats_product_variants p2
    LEFT JOIN lats_product_variants c 
      ON c.parent_variant_id = p2.id 
      AND c.variant_type = 'imei_child'
      AND c.is_active = TRUE
    WHERE (p2.is_parent = TRUE OR p2.variant_type = 'parent')
      OR EXISTS (
        SELECT 1 FROM lats_product_variants child 
        WHERE child.parent_variant_id = p2.id
      )
    GROUP BY p2.id
  ) subq
  WHERE p.id = subq.id;
  
  RAISE NOTICE '✅ All parent stocks recalculated';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 5: CREATE TRIGGER
-- ============================================================================

CREATE TRIGGER trigger_update_parent_stock
  AFTER INSERT OR UPDATE OR DELETE ON lats_product_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_parent_stock_from_children();

-- ============================================================================
-- STEP 6: CREATE VIEW FOR EASY QUERYING
-- ============================================================================

CREATE OR REPLACE VIEW v_parent_child_variants AS
SELECT 
  p.id as parent_id,
  p.product_id,
  COALESCE(p.variant_name, p.name) as parent_variant_name,
  p.sku as parent_sku,
  p.quantity as parent_quantity,
  p.cost_price as parent_cost_price,
  p.selling_price as parent_selling_price,
  p.is_active as parent_is_active,
  c.id as child_id,
  c.variant_attributes->>'imei' as child_imei,
  c.variant_attributes->>'serial_number' as child_serial_number,
  c.variant_attributes->>'imei_status' as child_imei_status,
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

-- ============================================================================
-- STEP 7: ADD DOCUMENTATION COMMENTS
-- ============================================================================

COMMENT ON COLUMN lats_product_variants.parent_variant_id IS 'Reference to parent variant for IMEI children';
COMMENT ON COLUMN lats_product_variants.is_parent IS 'TRUE if this variant has child IMEI variants';
COMMENT ON COLUMN lats_product_variants.variant_type IS 'Type: standard, parent, or imei_child';

COMMENT ON FUNCTION add_imei_to_parent_variant IS 'Add a new IMEI as a child of a parent variant. Returns success, child_variant_id, error_message';
COMMENT ON FUNCTION get_child_imeis(UUID) IS 'Get all child IMEI variants for a parent variant';
COMMENT ON FUNCTION get_available_imeis_for_pos(UUID) IS 'Get available IMEI variants for POS selection';
COMMENT ON FUNCTION get_parent_variants(UUID) IS 'Get parent variants for a product (used in PO creation)';
COMMENT ON FUNCTION mark_imei_as_sold IS 'Mark an IMEI variant as sold by IMEI number';
COMMENT ON FUNCTION calculate_parent_variant_stock(UUID) IS 'Calculate total stock from child IMEI variants';
COMMENT ON FUNCTION recalculate_all_parent_stocks() IS 'Recalculate all parent variant stocks (for fixing data inconsistencies)';
COMMENT ON FUNCTION update_parent_stock_from_children() IS 'Trigger function to auto-update parent stock when children change';

COMMENT ON VIEW v_parent_child_variants IS 'View showing parent variants with their IMEI children for easy querying';

-- ============================================================================
-- STEP 8: RUN DATA FIXES
-- ============================================================================

-- Recalculate all existing parent stocks
SELECT * FROM recalculate_all_parent_stocks();

-- ============================================================================
-- STEP 9: VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_trigger_count INT;
  v_function_count INT;
  v_parent_count INT;
  v_child_count INT;
  v_inconsistent_count INT;
BEGIN
  -- Check triggers
  SELECT COUNT(*) INTO v_trigger_count
  FROM information_schema.triggers
  WHERE trigger_name = 'trigger_update_parent_stock'
    AND event_object_table = 'lats_product_variants';
  
  -- Check functions
  SELECT COUNT(*) INTO v_function_count
  FROM pg_proc
  WHERE proname IN (
    'add_imei_to_parent_variant',
    'mark_imei_as_sold',
    'get_available_imeis_for_pos',
    'get_child_imeis',
    'get_parent_variants',
    'calculate_parent_variant_stock',
    'update_parent_stock_from_children',
    'recalculate_all_parent_stocks'
  );
  
  -- Check parent variants
  SELECT COUNT(*) INTO v_parent_count
  FROM lats_product_variants
  WHERE is_parent = TRUE OR variant_type = 'parent';
  
  -- Check IMEI children
  SELECT COUNT(*) INTO v_child_count
  FROM lats_product_variants
  WHERE variant_type = 'imei_child';
  
  -- Check for inconsistencies
  SELECT COUNT(*) INTO v_inconsistent_count
  FROM (
    SELECT 
      p.id,
      p.quantity as reported,
      COALESCE(SUM(c.quantity), 0) as calculated
    FROM lats_product_variants p
    LEFT JOIN lats_product_variants c 
      ON c.parent_variant_id = p.id 
      AND c.variant_type = 'imei_child'
      AND c.is_active = TRUE
    WHERE (p.is_parent = TRUE OR p.variant_type = 'parent')
    GROUP BY p.id, p.quantity
  ) calc
  WHERE reported != calculated;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '✅ COMPLETE IMEI SYSTEM FIX APPLIED SUCCESSFULLY';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 SYSTEM STATUS:';
  RAISE NOTICE '  • Triggers: % / 1 %', v_trigger_count, CASE WHEN v_trigger_count >= 1 THEN '✅' ELSE '❌' END;
  RAISE NOTICE '  • Functions: % / 8 %', v_function_count, CASE WHEN v_function_count >= 8 THEN '✅' ELSE '❌' END;
  RAISE NOTICE '  • Parent Variants: %', v_parent_count;
  RAISE NOTICE '  • IMEI Children: %', v_child_count;
  RAISE NOTICE '  • Data Inconsistencies: % %', v_inconsistent_count, CASE WHEN v_inconsistent_count = 0 THEN '✅' ELSE '⚠️' END;
  RAISE NOTICE '';
  RAISE NOTICE '📋 AVAILABLE FUNCTIONS:';
  RAISE NOTICE '  • add_imei_to_parent_variant(parent_id, imei, serial, mac, cost, selling, condition, branch, notes)';
  RAISE NOTICE '  • get_child_imeis(parent_id) - Get all IMEIs for a parent';
  RAISE NOTICE '  • get_available_imeis_for_pos(parent_id) - Get available IMEIs for POS';
  RAISE NOTICE '  • get_parent_variants(product_id) - Get parent variants for PO creation';
  RAISE NOTICE '  • mark_imei_as_sold(imei, sale_ref) - Mark IMEI as sold';
  RAISE NOTICE '  • calculate_parent_variant_stock(parent_id) - Calculate parent stock';
  RAISE NOTICE '  • recalculate_all_parent_stocks() - Fix all parent stocks';
  RAISE NOTICE '';
  
  IF v_trigger_count >= 1 AND v_function_count >= 8 AND v_inconsistent_count = 0 THEN
    RAISE NOTICE '🎉 SYSTEM IS READY FOR IMEI TRACKING!';
    RAISE NOTICE '   You can now receive Purchase Orders with IMEI numbers.';
  ELSE
    IF v_trigger_count < 1 THEN
      RAISE NOTICE '⚠️  WARNING: Trigger not found. Parent stock may not auto-update.';
    END IF;
    IF v_function_count < 8 THEN
      RAISE NOTICE '⚠️  WARNING: Not all functions created. Check for errors above.';
    END IF;
    IF v_inconsistent_count > 0 THEN
      RAISE NOTICE '⚠️  WARNING: % parent variants have incorrect stock. Run recalculate_all_parent_stocks() to fix.', v_inconsistent_count;
    END IF;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
END $$;

