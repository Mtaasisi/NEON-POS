-- ============================================================================
-- CRITICAL FIX: PO RECEIVING WITH IMEI & INVENTORY TRACKING
-- ============================================================================
-- This fixes the variant type mismatch and ensures proper stock updates
-- ============================================================================

-- ============================================================================
-- SECTION 1: DROP CONFLICTING TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Drop old triggers
DROP TRIGGER IF EXISTS trigger_sync_parent_quantity ON lats_product_variants;
DROP TRIGGER IF EXISTS trigger_update_parent_stock ON lats_product_variants;

-- Drop old functions
DROP FUNCTION IF EXISTS sync_parent_quantity_on_imei_change CASCADE;
DROP FUNCTION IF EXISTS update_parent_variant_stock CASCADE;
DROP FUNCTION IF EXISTS add_imei_to_parent_variant CASCADE;

-- ============================================================================
-- SECTION 2: CREATE UNIFIED PARENT STOCK UPDATE TRIGGER
-- ============================================================================

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
            AND (variant_type != 'imei_child' OR parent_variant_id IS NULL)
        ),
        updated_at = NOW()
      WHERE id = v_product_id;
    END IF;
    
    RAISE NOTICE 'Parent % stock updated to % (Product: %)', v_parent_id, v_new_total, v_product_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic parent quantity sync
CREATE TRIGGER trigger_update_parent_stock
  AFTER INSERT OR UPDATE OR DELETE ON lats_product_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_parent_stock_from_children();

-- ============================================================================
-- SECTION 3: CREATE COMPREHENSIVE ADD IMEI FUNCTION
-- ============================================================================

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
    RETURN QUERY SELECT FALSE, NULL::UUID, 'IMEI must be exactly 15 numeric digits';
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
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Parent variant not found';
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

-- ============================================================================
-- SECTION 4: CREATE HELPER FUNCTION TO MARK IMEI AS SOLD
-- ============================================================================

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
    AND variant_attributes->>'imei_status' = 'available'
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

-- ============================================================================
-- SECTION 5: CREATE HELPER FUNCTION TO GET AVAILABLE IMEIS
-- ============================================================================

-- Drop the existing function first (it may have different signature)
DROP FUNCTION IF EXISTS get_available_imeis_for_pos(UUID);

CREATE OR REPLACE FUNCTION get_available_imeis_for_pos(
  parent_variant_id_param UUID
)
RETURNS TABLE(
  child_variant_id UUID,
  imei TEXT,
  serial_number TEXT,
  mac_address TEXT,
  condition TEXT,
  cost_price NUMERIC,
  selling_price NUMERIC,
  received_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id,
    variant_attributes->>'imei',
    variant_attributes->>'serial_number',
    variant_attributes->>'mac_address',
    variant_attributes->>'condition',
    lats_product_variants.cost_price,
    lats_product_variants.selling_price,
    (variant_attributes->>'received_at')::TIMESTAMP
  FROM lats_product_variants
  WHERE parent_variant_id = parent_variant_id_param
    AND variant_type = 'imei_child'
    AND variant_attributes->>'imei_status' = 'available'
    AND quantity > 0
    AND is_active = TRUE
  ORDER BY created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 6: FIX EXISTING DATA (RECALCULATE ALL PARENT STOCKS)
-- ============================================================================

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
      p.name,
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
    GROUP BY p.id, p.name, p.quantity
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
-- SECTION 7: RUN IMMEDIATE FIXES
-- ============================================================================

-- Fix any variants with wrong type (should be 'imei_child' not 'imei')
UPDATE lats_product_variants
SET 
  variant_type = 'imei_child',
  updated_at = NOW()
WHERE parent_variant_id IS NOT NULL
  AND variant_attributes ? 'imei'
  AND variant_type = 'imei';

-- Recalculate all parent stocks
SELECT * FROM recalculate_all_parent_stocks();

-- ============================================================================
-- SECTION 8: VERIFICATION QUERIES
-- ============================================================================

DO $$
DECLARE
  v_trigger_count INT;
  v_function_count INT;
  v_parent_count INT;
  v_child_count INT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '🔧 CRITICAL FIX APPLIED SUCCESSFULLY';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '';
  
  -- Check triggers
  SELECT COUNT(*) INTO v_trigger_count
  FROM information_schema.triggers
  WHERE trigger_name = 'trigger_update_parent_stock'
    AND event_object_table = 'lats_product_variants';
  
  RAISE NOTICE '✅ Triggers: % active', v_trigger_count;
  
  -- Check functions
  SELECT COUNT(*) INTO v_function_count
  FROM pg_proc
  WHERE proname IN (
    'add_imei_to_parent_variant',
    'mark_imei_as_sold',
    'get_available_imeis_for_pos',
    'update_parent_stock_from_children',
    'recalculate_all_parent_stocks'
  );
  
  RAISE NOTICE '✅ Functions: % created', v_function_count;
  
  -- Check parent variants
  SELECT COUNT(*) INTO v_parent_count
  FROM lats_product_variants
  WHERE is_parent = TRUE OR variant_type = 'parent';
  
  RAISE NOTICE '✅ Parent variants: %', v_parent_count;
  
  -- Check IMEI children
  SELECT COUNT(*) INTO v_child_count
  FROM lats_product_variants
  WHERE variant_type = 'imei_child';
  
  RAISE NOTICE '✅ IMEI children: %', v_child_count;
  
  RAISE NOTICE '';
  RAISE NOTICE '📋 Available Functions:';
  RAISE NOTICE '  • add_imei_to_parent_variant(parent_id, imei, ...)';
  RAISE NOTICE '  • mark_imei_as_sold(imei, sale_ref)';
  RAISE NOTICE '  • get_available_imeis_for_pos(parent_id)';
  RAISE NOTICE '  • recalculate_all_parent_stocks()';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 System ready for PO receiving with IMEI tracking!';
  RAISE NOTICE '================================================================';
END $$;

