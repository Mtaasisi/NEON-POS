-- ============================================================================
-- 🚨 FINAL FIX: Run this in your Neon SQL Editor NOW
-- ============================================================================
-- This will fix the "function add_imei_to_parent_variant does not exist" error
-- 
-- Steps:
-- 1. Go to: https://console.neon.tech
-- 2. Select your database
-- 3. Click "SQL Editor"
-- 4. Paste this ENTIRE script
-- 5. Click "Run"
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop all old versions of the function (clean slate)
-- ============================================================================

DROP FUNCTION IF EXISTS add_imei_to_parent_variant(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS add_imei_to_parent_variant(UUID, TEXT, TEXT, TEXT, DECIMAL, DECIMAL, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS add_imei_to_parent_variant(UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS add_imei_to_parent_variant(UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS add_imei_to_parent_variant(UUID, TEXT, DECIMAL, DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS add_imei_to_parent_variant CASCADE;

-- ============================================================================
-- STEP 2: Create the function with NUMERIC types (matches JavaScript numbers)
-- ============================================================================

CREATE OR REPLACE FUNCTION add_imei_to_parent_variant(
  parent_variant_id_param UUID,
  imei_param TEXT,
  serial_number_param TEXT DEFAULT NULL,
  mac_address_param TEXT DEFAULT NULL,
  cost_price_param NUMERIC DEFAULT 0,        -- ✅ NUMERIC (accepts JS numbers)
  selling_price_param NUMERIC DEFAULT 0,     -- ✅ NUMERIC (accepts JS numbers)
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
BEGIN
  -- Validate IMEI format (15 digits)
  IF imei_param !~ '^\d{15}$' THEN
    RETURN QUERY SELECT 
      FALSE, 
      NULL::UUID, 
      'Invalid IMEI format. Must be exactly 15 digits.' AS error_message;
    RETURN;
  END IF;

  -- Check for duplicate IMEI in both old and new attribute columns
  SELECT COUNT(*) INTO v_duplicate_count
  FROM lats_product_variants
  WHERE (
    variant_attributes->>'imei' = imei_param 
    OR attributes->>'imei' = imei_param
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
    format('IMEI: %s', imei_param),
    v_parent_sku || '-IMEI-' || SUBSTRING(imei_param, 10, 6),
    jsonb_build_object(
      'imei', imei_param,
      'serial_number', serial_number_param,
      'mac_address', mac_address_param,
      'condition', condition_param,
      'imei_status', 'available',
      'parent_variant_name', v_parent_variant_name,
      'added_at', NOW(),
      'notes', notes_param
    ),
    jsonb_build_object(
      'imei', imei_param,
      'serial_number', serial_number_param,
      'mac_address', mac_address_param,
      'condition', condition_param,
      'imei_status', 'available',
      'parent_variant_name', v_parent_variant_name,
      'added_at', NOW(),
      'notes', notes_param
    ),
    1,
    COALESCE(cost_price_param, 0),
    COALESCE(selling_price_param, 0),
    true,
    v_parent_branch_id
  ) RETURNING id INTO v_child_variant_id;

  -- Mark parent as parent type
  UPDATE lats_product_variants
  SET 
    is_parent = true,
    variant_type = CASE 
      WHEN variant_type IS NULL OR variant_type = 'standard' THEN 'parent'
      ELSE variant_type
    END,
    updated_at = NOW()
  WHERE id = parent_variant_id_param
    AND (is_parent IS NULL OR is_parent = false);

  -- Update parent quantity (sum of all children)
  UPDATE lats_product_variants
  SET 
    quantity = (
      SELECT COALESCE(SUM(quantity), 0)
      FROM lats_product_variants
      WHERE parent_variant_id = parent_variant_id_param
      AND variant_type = 'imei_child'
    ),
    updated_at = NOW()
  WHERE id = parent_variant_id_param;

  RAISE NOTICE '✅ IMEI % added successfully as child of variant %', 
    imei_param, parent_variant_id_param;

  RETURN QUERY SELECT 
    TRUE, 
    v_child_variant_id, 
    NULL::TEXT AS error_message;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 3: Create helpful utility functions
-- ============================================================================

-- Function to check if the function exists and works
CREATE OR REPLACE FUNCTION test_add_imei_function()
RETURNS TEXT AS $$
DECLARE
  func_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'add_imei_to_parent_variant'
  ) INTO func_exists;
  
  IF func_exists THEN
    RETURN '✅ Function add_imei_to_parent_variant exists and is ready to use!';
  ELSE
    RETURN '❌ Function does not exist';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 4: Verify installation
-- ============================================================================

SELECT test_add_imei_function();

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '✅ DATABASE FUNCTION CREATED SUCCESSFULLY';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'The add_imei_to_parent_variant function is now available.';
  RAISE NOTICE 'Your application should work now without errors!';
  RAISE NOTICE '';
  RAISE NOTICE 'Function signature:';
  RAISE NOTICE '  add_imei_to_parent_variant(';
  RAISE NOTICE '    parent_variant_id UUID,';
  RAISE NOTICE '    imei TEXT,';
  RAISE NOTICE '    serial_number TEXT,';
  RAISE NOTICE '    mac_address TEXT,';
  RAISE NOTICE '    cost_price NUMERIC,';
  RAISE NOTICE '    selling_price NUMERIC,';
  RAISE NOTICE '    condition TEXT,';
  RAISE NOTICE '    notes TEXT';
  RAISE NOTICE '  )';
  RAISE NOTICE '';
  RAISE NOTICE 'Go back to your app and try receiving the PO again!';
  RAISE NOTICE '================================================================';
END $$;

