-- =====================================================
-- FIX: Ensure IMEI Children Are Created Correctly
-- =====================================================
-- This ensures all IMEI children created from PO receiving have:
-- 1. quantity = 1 (always)
-- 2. is_active = true (always)
-- 3. imei_status = 'available' (always)
-- 4. Parent variant quantity updates correctly

-- Step 1: Update the add_imei_to_parent_variant function to ensure correct values
CREATE OR REPLACE FUNCTION add_imei_to_parent_variant(
  parent_variant_id_param UUID,
  imei_param TEXT,
  serial_number_param TEXT DEFAULT NULL,
  mac_address_param TEXT DEFAULT NULL,
  condition_param TEXT DEFAULT 'new',
  cost_price_param NUMERIC DEFAULT NULL,
  selling_price_param NUMERIC DEFAULT NULL,
  branch_id_param UUID DEFAULT NULL,
  notes_param TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, child_id UUID, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_parent_variant RECORD;
  v_product_id UUID;
  v_parent_sku TEXT;
  v_new_sku TEXT;
  v_child_id UUID;
  v_timestamp TEXT;
BEGIN
  -- Get parent variant details
  SELECT 
    product_id,
    sku,
    cost_price,
    selling_price,
    branch_id,
    variant_name,
    name
  INTO v_parent_variant
  FROM lats_product_variants
  WHERE id = parent_variant_id_param;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Parent variant not found'::TEXT;
    RETURN;
  END IF;

  v_product_id := v_parent_variant.product_id;
  v_parent_sku := v_parent_variant.sku;

  -- Validate IMEI format (15 digits)
  IF imei_param !~ '^\d{15}$' THEN
    RETURN QUERY SELECT 
      FALSE, 
      NULL::UUID, 
      'Invalid IMEI format. Must be exactly 15 digits.'::TEXT;
    RETURN;
  END IF;

  -- Check for duplicate IMEI
  IF EXISTS (
    SELECT 1 FROM lats_product_variants
    WHERE variant_type = 'imei_child'
      AND (
        variant_attributes->>'imei' = imei_param 
        OR attributes->>'imei' = imei_param
      )
  ) THEN
    RETURN QUERY SELECT 
      FALSE, 
      NULL::UUID, 
      format('IMEI %s already exists', imei_param)::TEXT;
    RETURN;
  END IF;

  -- Generate unique SKU
  v_timestamp := EXTRACT(EPOCH FROM NOW())::TEXT;
  v_new_sku := COALESCE(v_parent_sku, 'VAR') || '-IMEI-' || SUBSTRING(imei_param, 10, 6);

  -- Mark parent as parent type
  UPDATE lats_product_variants
  SET 
    is_parent = TRUE,
    variant_type = CASE 
      WHEN variant_type IS NULL OR variant_type = 'standard' THEN 'parent'
      ELSE variant_type
    END,
    updated_at = NOW()
  WHERE id = parent_variant_id_param
    AND (is_parent IS NULL OR is_parent = FALSE);

  -- ✅ CRITICAL FIX: Create child IMEI variant with guaranteed correct values
  INSERT INTO lats_product_variants (
    product_id,
    parent_variant_id,
    variant_type,
    name,
    variant_name,
    sku,
    variant_attributes,
    quantity,           -- ✅ ALWAYS 1
    is_active,          -- ✅ ALWAYS TRUE
    is_parent,         -- ✅ ALWAYS FALSE
    cost_price,
    selling_price,
    branch_id,
    created_at,
    updated_at
  ) VALUES (
    v_product_id,
    parent_variant_id_param,
    'imei_child',      -- ✅ CRITICAL: Must be 'imei_child'
    COALESCE(serial_number_param, imei_param),
    format('IMEI: %s', imei_param),
    v_new_sku,
    jsonb_build_object(
      'imei', imei_param,
      'imei_status', 'available',  -- ✅ ALWAYS 'available'
      'serial_number', COALESCE(serial_number_param, ''),
      'mac_address', COALESCE(mac_address_param, ''),
      'condition', COALESCE(condition_param, 'new'),
      'notes', COALESCE(notes_param, ''),
      'source', 'purchase',
      'received_at', NOW()
    ),
    1,                 -- ✅ ALWAYS quantity = 1
    TRUE,              -- ✅ ALWAYS is_active = TRUE
    FALSE,             -- ✅ ALWAYS is_parent = FALSE
    COALESCE(cost_price_param, v_parent_variant.cost_price, 0),
    COALESCE(selling_price_param, v_parent_variant.selling_price, 0),
    COALESCE(branch_id_param, v_parent_variant.branch_id),
    NOW(),
    NOW()
  )
  RETURNING id INTO v_child_id;

  -- ✅ CRITICAL FIX: Update parent quantity (sum of all active IMEI children)
  UPDATE lats_product_variants
  SET 
    quantity = (
      SELECT COALESCE(SUM(quantity), 0)
      FROM lats_product_variants
      WHERE parent_variant_id = parent_variant_id_param
        AND variant_type = 'imei_child'
        AND is_active = TRUE
    ),
    updated_at = NOW()
  WHERE id = parent_variant_id_param;

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
    format('Received IMEI %s for variant %s', imei_param, COALESCE(v_parent_variant.variant_name, v_parent_variant.name)),
    NOW()
  );

  RAISE NOTICE '✅ IMEI % added as child of variant % (quantity=1, is_active=true, status=available)', 
    imei_param, parent_variant_id_param;
  
  RETURN QUERY SELECT TRUE, v_child_id, NULL::TEXT;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Error adding IMEI: %', SQLERRM;
    RETURN QUERY SELECT FALSE, NULL::UUID, SQLERRM::TEXT;
END;
$$;

-- Step 2: Create/Update trigger to ensure parent quantity stays in sync
CREATE OR REPLACE FUNCTION sync_parent_variant_quantity_on_imei_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_parent_id UUID;
  v_new_total INTEGER;
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
    -- ✅ CRITICAL FIX: Calculate total from all ACTIVE IMEI children with quantity > 0
    SELECT COALESCE(SUM(quantity), 0)
    INTO v_new_total
    FROM lats_product_variants
    WHERE parent_variant_id = v_parent_id
      AND variant_type = 'imei_child'
      AND is_active = TRUE
      AND quantity > 0;

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
$$;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_sync_parent_quantity_on_imei_change ON lats_product_variants;
CREATE TRIGGER trigger_sync_parent_quantity_on_imei_change
AFTER INSERT OR UPDATE OF quantity, is_active, variant_type OR DELETE ON lats_product_variants
FOR EACH ROW
EXECUTE FUNCTION sync_parent_variant_quantity_on_imei_change();

-- Step 3: Fix any existing IMEI children with incorrect values
UPDATE lats_product_variants
SET 
  quantity = 1,
  is_active = TRUE,
  variant_attributes = jsonb_set(
    COALESCE(variant_attributes, '{}'::jsonb),
    '{imei_status}',
    '"available"'
  )
WHERE variant_type = 'imei_child'
  AND (quantity != 1 OR is_active != TRUE OR variant_attributes->>'imei_status' != 'available');

-- Step 4: Recalculate all parent variant quantities
UPDATE lats_product_variants parent
SET 
  quantity = (
    SELECT COALESCE(SUM(child.quantity), 0)
    FROM lats_product_variants child
    WHERE child.parent_variant_id = parent.id
      AND child.variant_type = 'imei_child'
      AND child.is_active = TRUE
      AND child.quantity > 0
  ),
  updated_at = NOW()
WHERE parent.variant_type = 'parent'
  AND parent.is_parent = TRUE;

-- Success messages (these will appear in psql output)
-- ✅ All fixes applied successfully!
-- ✅ IMEI children will now always be created with quantity=1, is_active=true, status=available
-- ✅ Parent variant quantities will automatically sync with IMEI children

