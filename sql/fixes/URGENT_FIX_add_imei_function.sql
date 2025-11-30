-- ⚡ URGENT FIX: Create add_imei_to_parent_variant Function
-- This fixes the "function add_imei_to_parent_variant does not exist" error
-- Run this in your Neon SQL Editor: https://console.neon.tech

-- ==============================================================================
-- STEP 1: Drop any old versions of the function
-- ==============================================================================

DROP FUNCTION IF EXISTS add_imei_to_parent_variant(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS add_imei_to_parent_variant(UUID, TEXT, TEXT, TEXT, DECIMAL, DECIMAL, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS add_imei_to_parent_variant(UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS add_imei_to_parent_variant(UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS add_imei_to_parent_variant CASCADE;

-- ==============================================================================
-- STEP 2: Create the function with correct signature
-- ==============================================================================

CREATE OR REPLACE FUNCTION add_imei_to_parent_variant(
  parent_variant_id_param UUID,
  imei_param TEXT,
  serial_number_param TEXT DEFAULT NULL,
  mac_address_param TEXT DEFAULT NULL,
  cost_price_param TEXT DEFAULT NULL,        -- ✅ Accept as TEXT (JavaScript sends string)
  selling_price_param TEXT DEFAULT NULL,     -- ✅ Accept as TEXT (JavaScript sends string)
  condition_param TEXT DEFAULT 'new',
  notes_param TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  child_variant_id UUID,
  error_message TEXT
) AS $$
DECLARE
  v_child_variant_id UUID;
  v_parent_product_id UUID;
  v_parent_sku TEXT;
  v_parent_name TEXT;
  v_parent_variant_name TEXT;
  v_parent_branch_id UUID;
  v_duplicate_count INT;
  v_cost_price NUMERIC;
  v_selling_price NUMERIC;
BEGIN
  -- Convert TEXT prices to NUMERIC (JavaScript sends as strings)
  BEGIN
    v_cost_price := COALESCE(cost_price_param::NUMERIC, 0);
    v_selling_price := COALESCE(selling_price_param::NUMERIC, 0);
  EXCEPTION WHEN OTHERS THEN
    v_cost_price := 0;
    v_selling_price := 0;
  END;

  -- Validate IMEI format (15 digits)
  IF imei_param !~ '^\d{15}$' THEN
    RETURN QUERY SELECT 
      FALSE, 
      NULL::UUID, 
      'Invalid IMEI format. Must be exactly 15 digits.' AS error_message;
    RETURN;
  END IF;

  -- Check for duplicate IMEI (check both old and new columns)
  SELECT COUNT(*) INTO v_duplicate_count
  FROM lats_product_variants
  WHERE variant_type IN ('imei', 'imei_child')
    AND (
      variant_attributes->>'imei' = imei_param 
      OR attributes->>'imei' = imei_param
      OR name = imei_param
    );

  IF v_duplicate_count > 0 THEN
    RETURN QUERY SELECT 
      FALSE, 
      NULL::UUID, 
      format('IMEI %s already exists in the system', imei_param) AS error_message;
    RETURN;
  END IF;

  -- Get parent variant details
  SELECT 
    product_id, 
    sku, 
    name,
    COALESCE(variant_name, name) as variant_name,
    branch_id
  INTO 
    v_parent_product_id, 
    v_parent_sku, 
    v_parent_name,
    v_parent_variant_name,
    v_parent_branch_id
  FROM lats_product_variants
  WHERE id = parent_variant_id_param;

  IF v_parent_product_id IS NULL THEN
    RETURN QUERY SELECT 
      FALSE, 
      NULL::UUID, 
      format('Parent variant %s not found', parent_variant_id_param) AS error_message;
    RETURN;
  END IF;

  -- Mark parent as is_parent if not already
  UPDATE lats_product_variants
  SET 
    is_parent = TRUE,
    variant_type = 'parent'
  WHERE id = parent_variant_id_param
    AND (is_parent IS NULL OR is_parent = FALSE);

  -- Create IMEI child variant
  INSERT INTO lats_product_variants (
    product_id,
    parent_variant_id,
    variant_type,
    name,
    variant_name,
    sku,
    attributes,
    variant_attributes,
    quantity,
    cost_price,
    selling_price,
    is_active,
    branch_id
  ) VALUES (
    v_parent_product_id,
    parent_variant_id_param,
    'imei_child',
    COALESCE(serial_number_param, imei_param),
    format('%s - IMEI: %s', v_parent_variant_name, imei_param),
    format('%s-%s', v_parent_sku, imei_param),
    jsonb_build_object(
      'imei', imei_param,
      'serial_number', COALESCE(serial_number_param, ''),
      'mac_address', COALESCE(mac_address_param, ''),
      'condition', condition_param,
      'notes', COALESCE(notes_param, '')
    ),
    jsonb_build_object(
      'imei', imei_param,
      'serial_number', COALESCE(serial_number_param, ''),
      'mac_address', COALESCE(mac_address_param, ''),
      'condition', condition_param,
      'notes', COALESCE(notes_param, '')
    ),
    1,
    v_cost_price,
    v_selling_price,
    TRUE,
    v_parent_branch_id
  )
  RETURNING id INTO v_child_variant_id;

  -- Update parent variant quantity (sum of all children)
  UPDATE lats_product_variants parent
  SET quantity = (
    SELECT COALESCE(SUM(child.quantity), 0)
    FROM lats_product_variants child
    WHERE child.parent_variant_id = parent.id
      AND child.variant_type = 'imei_child'
  )
  WHERE parent.id = parent_variant_id_param;

  -- Create stock movement record
  INSERT INTO lats_stock_movements (
    product_id,
    variant_id,
    movement_type,
    quantity,
    reference_type,
    reference_id,
    notes,
    branch_id
  ) VALUES (
    v_parent_product_id,
    v_child_variant_id,
    'in',
    1,
    'imei_receive',
    parent_variant_id_param,
    format('IMEI %s received: %s', imei_param, COALESCE(notes_param, 'Purchase Order')),
    v_parent_branch_id
  );

  -- Return success
  RETURN QUERY SELECT 
    TRUE, 
    v_child_variant_id, 
    NULL::TEXT;

EXCEPTION WHEN OTHERS THEN
  -- Return error
  RETURN QUERY SELECT 
    FALSE, 
    NULL::UUID, 
    format('Error creating IMEI child: %s', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- STEP 3: Grant permissions
-- ==============================================================================

GRANT EXECUTE ON FUNCTION add_imei_to_parent_variant TO authenticated;
GRANT EXECUTE ON FUNCTION add_imei_to_parent_variant TO anon;

-- ==============================================================================
-- STEP 4: Verify function was created
-- ==============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'add_imei_to_parent_variant'
  ) THEN
    RAISE NOTICE '✅ SUCCESS: add_imei_to_parent_variant function created!';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 You can now:';
    RAISE NOTICE '   1. Refresh your browser (Cmd+Shift+R or Ctrl+Shift+R)';
    RAISE NOTICE '   2. Try receiving your Purchase Order with IMEI numbers';
    RAISE NOTICE '   3. The error should be gone!';
  ELSE
    RAISE NOTICE '❌ ERROR: Function was not created';
  END IF;
END $$;

