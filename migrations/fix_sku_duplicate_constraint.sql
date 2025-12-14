-- ============================================================================
-- FIX: SKU Duplicate Constraint Violation in add_imei_to_parent_variant
-- ============================================================================
-- This script fixes the duplicate SKU issue when creating IMEI child variants
-- The problem: SKU generation only used a substring of IMEI + timestamp,
-- which could create duplicates when multiple IMEIs are added quickly
-- 
-- Solution: Use full IMEI + UUID substring + collision detection loop
-- ============================================================================

-- Drop existing internal function to recreate with fix
DROP FUNCTION IF EXISTS add_imei_to_parent_variant_internal(UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT) CASCADE;

-- Recreate internal function with unique SKU generation
CREATE OR REPLACE FUNCTION add_imei_to_parent_variant_internal(
  parent_variant_id_param UUID,
  imei_param TEXT,
  serial_number_param TEXT DEFAULT NULL,
  mac_address_param TEXT DEFAULT NULL,
  cost_price_param NUMERIC DEFAULT NULL,
  selling_price_param NUMERIC DEFAULT NULL,
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
  v_serial_number TEXT;
  v_child_name TEXT;
  v_new_sku TEXT;
  v_sku_exists BOOLEAN;
  v_sku_suffix INT;
BEGIN
  -- Handle NULL prices
  v_cost_price := COALESCE(cost_price_param, 0);
  v_selling_price := COALESCE(selling_price_param, 0);
  
  -- ✅ UNIFIED: Serial number and IMEI are the same - use imei_param for both
  v_serial_number := imei_param::TEXT;
  v_child_name := imei_param::TEXT;

  -- Validate IMEI format
  IF imei_param IS NULL OR imei_param = '' THEN
    RETURN QUERY SELECT 
      FALSE, 
      NULL::UUID, 
      'IMEI cannot be empty' AS error_message;
    RETURN;
  END IF;

  -- Check for duplicate IMEI
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

  -- Mark parent as parent type if not already
  UPDATE lats_product_variants
  SET 
    is_parent = TRUE,
    variant_type = 'parent',
    updated_at = NOW()
  WHERE id = parent_variant_id_param
    AND variant_type NOT IN ('parent');

  -- Generate new UUID for child variant
  v_child_variant_id := gen_random_uuid();

  -- ✅ FIX: Generate unique SKU with collision detection
  -- Use full IMEI + UUID substring to ensure uniqueness
  v_new_sku := COALESCE(v_parent_sku, 'VAR') || '-IMEI-' || imei_param || '-' || SUBSTRING(REPLACE(v_child_variant_id::TEXT, '-', ''), 1, 8);
  
  -- Check if SKU already exists and generate a new one if needed
  v_sku_exists := TRUE;
  v_sku_suffix := 0;
  WHILE v_sku_exists LOOP
    SELECT EXISTS(SELECT 1 FROM lats_product_variants WHERE sku = v_new_sku) INTO v_sku_exists;
    IF v_sku_exists THEN
      v_sku_suffix := v_sku_suffix + 1;
      v_new_sku := COALESCE(v_parent_sku, 'VAR') || '-IMEI-' || imei_param || '-' || SUBSTRING(REPLACE(v_child_variant_id::TEXT, '-', ''), 1, 8) || '-' || v_sku_suffix::TEXT;
    END IF;
  END LOOP;

  -- Create IMEI child variant
  INSERT INTO lats_product_variants (
    id,
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
    branch_id,
    created_at,
    updated_at
  ) VALUES (
    v_child_variant_id,
    v_parent_product_id,
    parent_variant_id_param,
    'imei_child',
    v_child_name,
    format('IMEI: %s', imei_param),
    v_new_sku,
    jsonb_build_object(
      'imei', imei_param,
      'serial_number', imei_param,
      'mac_address', mac_address_param,
      'condition', condition_param,
      'imei_status', 'available',
      'parent_variant_name', v_parent_variant_name,
      'added_at', NOW(),
      'notes', notes_param
    ),
    jsonb_build_object(
      'imei', imei_param,
      'serial_number', imei_param,
      'mac_address', mac_address_param,
      'condition', condition_param,
      'imei_status', 'available',
      'parent_variant_name', v_parent_variant_name,
      'added_at', NOW(),
      'notes', notes_param
    ),
    1,
    v_cost_price,
    v_selling_price,
    TRUE,
    v_parent_branch_id,
    NOW(),
    NOW()
  );

  -- Recalculate parent variant's quantity from children
  UPDATE lats_product_variants
  SET 
    quantity = COALESCE((
      SELECT SUM(quantity)
      FROM lats_product_variants
      WHERE parent_variant_id = parent_variant_id_param
        AND variant_type = 'imei_child'
        AND is_active = TRUE
    ), 0),
    updated_at = NOW()
  WHERE id = parent_variant_id_param;

  -- Return success
  RETURN QUERY SELECT 
    TRUE, 
    v_child_variant_id, 
    NULL::TEXT AS error_message;

EXCEPTION WHEN OTHERS THEN
  -- Return error
  RETURN QUERY SELECT 
    FALSE, 
    NULL::UUID, 
    format('Error creating IMEI variant: %s', SQLERRM) AS error_message;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔══════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ SKU Duplicate Fix Applied Successfully              ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE 'The add_imei_to_parent_variant function now generates unique SKUs';
  RAISE NOTICE 'by using the full IMEI + UUID substring with collision detection.';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now retry receiving your Purchase Order!';
  RAISE NOTICE '';
END $$;

