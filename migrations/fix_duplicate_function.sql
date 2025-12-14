-- ============================================
-- FIX: Remove Duplicate add_imei_to_parent_variant Functions
-- ============================================
-- This script removes ALL versions of the function
-- before creating the debug version

-- ============================================
-- STEP 1: Find all versions of the function
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '🔍 Searching for all versions of add_imei_to_parent_variant...';
  RAISE NOTICE '';
END $$;

-- Show all versions
SELECT 
  proname as function_name,
  oidvectortypes(proargtypes) as argument_types,
  pg_get_function_identity_arguments(oid) as full_signature
FROM pg_proc
WHERE proname = 'add_imei_to_parent_variant';

-- ============================================
-- STEP 2: Drop ALL versions (CASCADE to be safe)
-- ============================================
DO $$
DECLARE
  r RECORD;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🗑️  Dropping all versions of add_imei_to_parent_variant...';
  
  FOR r IN 
    SELECT 
      oid,
      pg_get_function_identity_arguments(oid) as args
    FROM pg_proc
    WHERE proname = 'add_imei_to_parent_variant'
  LOOP
    BEGIN
      EXECUTE format('DROP FUNCTION IF EXISTS add_imei_to_parent_variant(%s) CASCADE', r.args);
      v_count := v_count + 1;
      RAISE NOTICE '   ✅ Dropped version %: add_imei_to_parent_variant(%)', v_count, r.args;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '   ⚠️  Could not drop: %', SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Removed % version(s) of the function', v_count;
  RAISE NOTICE '';
END $$;

-- ============================================
-- STEP 3: Verify all versions are gone
-- ============================================
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_proc
  WHERE proname = 'add_imei_to_parent_variant';
  
  IF v_count = 0 THEN
    RAISE NOTICE '✅ All versions successfully removed';
  ELSE
    RAISE NOTICE '⚠️  Warning: % version(s) still exist', v_count;
  END IF;
  RAISE NOTICE '';
END $$;

-- ============================================
-- STEP 4: Create the NEW debug version
-- ============================================
CREATE OR REPLACE FUNCTION add_imei_to_parent_variant(
  parent_variant_id_param UUID,
  imei_param TEXT,
  serial_number_param TEXT DEFAULT NULL,
  mac_address_param TEXT DEFAULT NULL,
  cost_price_param NUMERIC DEFAULT 0,
  selling_price_param NUMERIC DEFAULT 0,
  condition_param TEXT DEFAULT 'new',
  notes_param TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  child_variant_id UUID,
  error_message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_child_variant_id UUID;
  v_parent_product_id UUID;
  v_parent_sku TEXT;
  v_parent_variant_name TEXT;
  v_parent_branch_id UUID;
  v_duplicate_count INT;
  v_cost_price NUMERIC;
  v_selling_price NUMERIC;
BEGIN
  -- ============================================
  -- STEP 1: Function Entry
  -- ============================================
  RAISE NOTICE '╔════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  🔧 DEBUG: add_imei_to_parent_variant STARTED     ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════╝';
  RAISE NOTICE '📥 INPUT PARAMETERS:';
  RAISE NOTICE '   - parent_variant_id: %', parent_variant_id_param;
  RAISE NOTICE '   - imei: %', imei_param;
  RAISE NOTICE '   - serial_number: %', COALESCE(serial_number_param, 'NULL');
  RAISE NOTICE '   - mac_address: %', COALESCE(mac_address_param, 'NULL');
  RAISE NOTICE '   - cost_price: %', cost_price_param;
  RAISE NOTICE '   - selling_price: %', selling_price_param;
  RAISE NOTICE '   - condition: %', condition_param;
  RAISE NOTICE '   - notes: %', COALESCE(notes_param, 'NULL');
  RAISE NOTICE '';

  -- ============================================
  -- STEP 2: Validate IMEI Format
  -- ============================================
  RAISE NOTICE '⏳ STEP 2: Validating IMEI format...';
  
  IF imei_param IS NULL OR imei_param = '' THEN
    RAISE NOTICE '❌ ERROR: IMEI is NULL or empty';
    RETURN QUERY SELECT FALSE, NULL::UUID, 'IMEI cannot be empty'::TEXT;
    RETURN;
  END IF;

  IF imei_param !~ '^\d{15}$' THEN
    RAISE NOTICE '❌ ERROR: Invalid IMEI format. Got: %, Length: %', imei_param, LENGTH(imei_param);
    RETURN QUERY SELECT 
      FALSE, 
      NULL::UUID, 
      format('Invalid IMEI format. Must be exactly 15 digits. Got: %s (length: %s)', imei_param, LENGTH(imei_param))::TEXT;
    RETURN;
  END IF;

  RAISE NOTICE '✅ IMEI format valid: %', imei_param;
  RAISE NOTICE '';

  -- ============================================
  -- STEP 3: Check for Duplicate IMEI
  -- ============================================
  RAISE NOTICE '⏳ STEP 3: Checking for duplicate IMEI...';
  
  SELECT COUNT(*) INTO v_duplicate_count
  FROM lats_product_variants
  WHERE variant_type IN ('imei', 'imei_child')
    AND (
      variant_attributes->>'imei' = imei_param 
      OR attributes->>'imei' = imei_param
      OR name = imei_param
    );

  RAISE NOTICE '   - Duplicate check result: % existing records', v_duplicate_count;

  IF v_duplicate_count > 0 THEN
    RAISE NOTICE '❌ ERROR: Duplicate IMEI found!';
    RETURN QUERY SELECT 
      FALSE, 
      NULL::UUID, 
      format('IMEI %s already exists in the system', imei_param)::TEXT;
    RETURN;
  END IF;

  RAISE NOTICE '✅ No duplicate IMEI found';
  RAISE NOTICE '';

  -- ============================================
  -- STEP 4: Get Parent Variant Details
  -- ============================================
  RAISE NOTICE '⏳ STEP 4: Fetching parent variant details...';
  
  SELECT 
    product_id, 
    sku, 
    COALESCE(variant_name, name) as variant_name,
    branch_id
  INTO 
    v_parent_product_id, 
    v_parent_sku, 
    v_parent_variant_name,
    v_parent_branch_id
  FROM lats_product_variants
  WHERE id = parent_variant_id_param;

  IF v_parent_product_id IS NULL THEN
    RAISE NOTICE '❌ ERROR: Parent variant not found!';
    RAISE NOTICE '   - Searched for ID: %', parent_variant_id_param;
    RETURN QUERY SELECT 
      FALSE, 
      NULL::UUID, 
      format('Parent variant %s not found', parent_variant_id_param)::TEXT;
    RETURN;
  END IF;

  RAISE NOTICE '✅ Parent variant found:';
  RAISE NOTICE '   - Product ID: %', v_parent_product_id;
  RAISE NOTICE '   - SKU: %', v_parent_sku;
  RAISE NOTICE '   - Variant Name: %', v_parent_variant_name;
  RAISE NOTICE '   - Branch ID: %', COALESCE(v_parent_branch_id::TEXT, 'NULL');
  RAISE NOTICE '';

  -- ============================================
  -- STEP 5: Convert Price Parameters
  -- ============================================
  RAISE NOTICE '⏳ STEP 5: Converting price parameters...';
  
  v_cost_price := COALESCE(cost_price_param, 0);
  v_selling_price := COALESCE(selling_price_param, 0);

  RAISE NOTICE '   - Cost Price: % → %', cost_price_param, v_cost_price;
  RAISE NOTICE '   - Selling Price: % → %', selling_price_param, v_selling_price;
  RAISE NOTICE '';

  -- ============================================
  -- STEP 6: Create Child IMEI Variant
  -- ============================================
  RAISE NOTICE '⏳ STEP 6: Creating child IMEI variant...';

  BEGIN
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
      v_cost_price,
      v_selling_price,
      true,
      v_parent_branch_id
    ) RETURNING id INTO v_child_variant_id;

    RAISE NOTICE '✅ Child variant created! ID: %', v_child_variant_id;

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR during INSERT: %', SQLERRM;
    RETURN QUERY SELECT FALSE, NULL::UUID, format('Insert failed: %s', SQLERRM)::TEXT;
    RETURN;
  END;

  RAISE NOTICE '';

  -- ============================================
  -- STEP 7: Update Parent Variant
  -- ============================================
  RAISE NOTICE '⏳ STEP 7: Updating parent variant...';
  
  UPDATE lats_product_variants
  SET 
    is_parent = true,
    variant_type = COALESCE(variant_type, 'parent'),
    updated_at = NOW()
  WHERE id = parent_variant_id_param
    AND (is_parent IS NULL OR is_parent = false);

  RAISE NOTICE '✅ Parent updated';
  RAISE NOTICE '';

  -- ============================================
  -- STEP 8: Success
  -- ============================================
  RAISE NOTICE '╔════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ SUCCESS: IMEI Added!                           ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════╝';
  RAISE NOTICE '';

  RETURN QUERY SELECT TRUE, v_child_variant_id, NULL::TEXT;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ UNEXPECTED ERROR: %', SQLERRM;
  RETURN QUERY SELECT FALSE, NULL::UUID, format('Error: %s', SQLERRM)::TEXT;
END;
$$;

-- ============================================
-- STEP 5: Verify new function created
-- ============================================
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_proc
  WHERE proname = 'add_imei_to_parent_variant';
  
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ FUNCTION FIXED AND RECREATED!                  ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Status:';
  RAISE NOTICE '   - Function exists: %', CASE WHEN v_count > 0 THEN 'YES ✅' ELSE 'NO ❌' END;
  RAISE NOTICE '   - Version count: %', v_count;
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next Steps:';
  RAISE NOTICE '   1. Refresh your browser (Ctrl+Shift+R)';
  RAISE NOTICE '   2. Try receiving PO with IMEI';
  RAISE NOTICE '   3. Check console for debug output';
  RAISE NOTICE '';
END $$;

-- Add comment
COMMENT ON FUNCTION add_imei_to_parent_variant IS 'DEBUG VERSION: Add IMEI with detailed step-by-step logging';

