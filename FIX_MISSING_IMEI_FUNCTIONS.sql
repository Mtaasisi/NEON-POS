-- ============================================================================
-- FIX MISSING IMEI FUNCTIONS
-- ============================================================================
-- This script creates the missing IMEI database functions:
-- 1. imei_exists(text)
-- 2. add_imei_to_parent_variant with correct signature matching the application
-- ============================================================================

-- ============================================================================
-- STEP 1: Create imei_exists function
-- ============================================================================

CREATE OR REPLACE FUNCTION imei_exists(
    check_imei TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM lats_product_variants
        WHERE variant_attributes->>'imei' = check_imei
           OR attributes->>'imei' = check_imei
           OR name = check_imei
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 2: Drop all existing versions of add_imei_to_parent_variant
-- ============================================================================
-- Drop all overloads explicitly to avoid ambiguity

DROP FUNCTION IF EXISTS add_imei_to_parent_variant CASCADE;

-- ============================================================================
-- STEP 3: Create single unified add_imei_to_parent_variant function
-- This function accepts all parameters the application sends, with sensible defaults
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
  v_cost_price NUMERIC;
  v_selling_price NUMERIC;
BEGIN
  -- Convert cost/selling prices to NUMERIC (handle INTEGER input from app)
  BEGIN
    v_cost_price := COALESCE(cost_price_param::NUMERIC, 0);
  EXCEPTION WHEN OTHERS THEN
    v_cost_price := 0;
  END;
  
  BEGIN
    v_selling_price := COALESCE(selling_price_param::NUMERIC, 0);
  EXCEPTION WHEN OTHERS THEN
    v_selling_price := 0;
  END;
  
  -- Validate IMEI
  IF imei_param IS NULL OR TRIM(imei_param) = '' THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'IMEI cannot be empty'::TEXT;
    RETURN;
  END IF;
  
  -- Check for duplicate IMEI
  IF EXISTS (
    SELECT 1 FROM lats_product_variants
    WHERE (variant_attributes->>'imei' = imei_param
       OR attributes->>'imei' = imei_param
       OR name = imei_param)
      AND variant_type = 'imei_child'
      AND is_active = true
  ) THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 
      format('Device with IMEI %s already exists in inventory', imei_param)::TEXT;
    RETURN;
  END IF;
  
  -- Get parent variant info
  SELECT * INTO v_parent_variant
  FROM lats_product_variants
  WHERE id = parent_variant_id_param;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 
      format('Parent variant not found: %s', parent_variant_id_param)::TEXT;
    RETURN;
  END IF;
  
  -- Get product ID
  v_product_id := v_parent_variant.product_id;
  
  -- Generate unique SKU for child IMEI variant
  v_timestamp := EXTRACT(EPOCH FROM NOW())::TEXT;
  v_new_sku := COALESCE(v_parent_variant.sku, 'VAR') || '-IMEI-' || 
               SUBSTRING(TRIM(imei_param), 1, 8) || '-' || 
               SUBSTRING(v_timestamp, 1, 10);
  
  -- Mark parent as parent type if not already
  UPDATE lats_product_variants
  SET 
    is_parent = TRUE,
    variant_type = COALESCE(variant_type, 'parent'),
    updated_at = NOW()
  WHERE id = parent_variant_id_param
    AND (variant_type IS NULL OR variant_type != 'parent' OR is_parent != TRUE);
  
  -- Create child IMEI variant
  INSERT INTO lats_product_variants (
    product_id,
    parent_variant_id,
    name,
    variant_name,
    sku,
    variant_type,
    variant_attributes,
    cost_price,
    selling_price,
    quantity,
    is_active,
    branch_id,
    created_at,
    updated_at
  )
  VALUES (
    v_product_id,
    parent_variant_id_param,
    COALESCE(serial_number_param, imei_param),
    COALESCE(serial_number_param, imei_param),
    v_new_sku,
    'imei_child',
    jsonb_build_object(
      'imei', imei_param,
      'serial_number', COALESCE(serial_number_param, imei_param),
      'mac_address', mac_address_param,
      'condition', COALESCE(condition_param, 'new'),
      'notes', notes_param
    ),
    v_cost_price,
    v_selling_price,
    1,
    true,
    COALESCE(branch_id_param, v_parent_variant.branch_id),
    NOW(),
    NOW()
  )
  RETURNING id INTO v_child_id;
  
  -- Update parent quantity
  UPDATE lats_product_variants
  SET 
    quantity = COALESCE(quantity, 0) + 1,
    updated_at = NOW()
  WHERE id = parent_variant_id_param;
  
  -- Return success
  RETURN QUERY SELECT TRUE, v_child_id, NULL::TEXT;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 
      format('Error creating IMEI variant: %s', SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 4: Grant permissions
-- ============================================================================
-- Grant execute permission on the functions
-- Note: For functions with DEFAULT parameters, we grant on the full signature

GRANT EXECUTE ON FUNCTION imei_exists(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION add_imei_to_parent_variant(
  UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, UUID, TEXT
) TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ IMEI functions created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions available:';
  RAISE NOTICE '  - imei_exists(text)';
  RAISE NOTICE '  - add_imei_to_parent_variant(uuid, text, text, text, numeric, numeric, text, uuid, text)';
  RAISE NOTICE '';
  RAISE NOTICE 'The function accepts all parameters with defaults, so it can be called';
  RAISE NOTICE 'with any combination of parameters the application sends.';
END $$;
