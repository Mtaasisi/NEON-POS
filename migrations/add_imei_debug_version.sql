-- ============================================
-- DEBUG VERSION: add_imei_to_parent_variant
-- ============================================
-- This version includes RAISE NOTICE at every step
-- to help identify where issues occur

DROP FUNCTION IF EXISTS add_imei_to_parent_variant(UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT);

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
  RAISE NOTICE '   - Preparing INSERT statement...';

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

    RAISE NOTICE '✅ Child variant created successfully!';
    RAISE NOTICE '   - Child ID: %', v_child_variant_id;
    RAISE NOTICE '   - Name: IMEI: %', imei_param;
    RAISE NOTICE '   - SKU: %', v_parent_sku || '-IMEI-' || SUBSTRING(imei_param, 10, 6);
    RAISE NOTICE '   - Quantity: 1';
    RAISE NOTICE '   - Cost Price: %', v_cost_price;
    RAISE NOTICE '   - Selling Price: %', v_selling_price;

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR during INSERT:';
    RAISE NOTICE '   - SQL State: %', SQLSTATE;
    RAISE NOTICE '   - Error Message: %', SQLERRM;
    RETURN QUERY SELECT 
      FALSE, 
      NULL::UUID, 
      format('Failed to create child variant: %s', SQLERRM)::TEXT;
    RETURN;
  END;

  RAISE NOTICE '';

  -- ============================================
  -- STEP 7: Update Parent Variant
  -- ============================================
  RAISE NOTICE '⏳ STEP 7: Updating parent variant...';
  
  BEGIN
    UPDATE lats_product_variants
    SET 
      is_parent = true,
      variant_type = COALESCE(variant_type, 'parent'),
      updated_at = NOW()
    WHERE id = parent_variant_id_param
      AND (is_parent IS NULL OR is_parent = false);

    IF FOUND THEN
      RAISE NOTICE '✅ Parent variant updated (marked as parent)';
    ELSE
      RAISE NOTICE 'ℹ️  Parent already marked (no update needed)';
    END IF;

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Warning during parent update: %', SQLERRM;
    -- Don't fail, parent update is not critical
  END;

  RAISE NOTICE '';

  -- ============================================
  -- STEP 8: Create Stock Movement
  -- ============================================
  RAISE NOTICE '⏳ STEP 8: Creating stock movement record...';
  
  BEGIN
    INSERT INTO lats_stock_movements (
      product_id,
      variant_id,
      movement_type,
      quantity,
      notes,
      branch_id
    ) VALUES (
      v_parent_product_id,
      v_child_variant_id,
      'purchase',
      1,
      format('IMEI %s received - %s', imei_param, COALESCE(notes_param, 'Purchase order')),
      v_parent_branch_id
    );

    RAISE NOTICE '✅ Stock movement created';

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Warning: Stock movement failed: %', SQLERRM;
    -- Don't fail, stock movement is helpful but not critical
  END;

  RAISE NOTICE '';

  -- ============================================
  -- STEP 9: Success - Return Result
  -- ============================================
  RAISE NOTICE '╔════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ SUCCESS: IMEI Added Successfully!              ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════╝';
  RAISE NOTICE '📤 OUTPUT:';
  RAISE NOTICE '   - Success: TRUE';
  RAISE NOTICE '   - Child Variant ID: %', v_child_variant_id;
  RAISE NOTICE '   - IMEI: %', imei_param;
  RAISE NOTICE '';
  RAISE NOTICE 'ℹ️  NOTE: Trigger will now auto-update parent stock...';
  RAISE NOTICE '';

  RETURN QUERY SELECT 
    TRUE, 
    v_child_variant_id, 
    NULL::TEXT;

EXCEPTION WHEN OTHERS THEN
  -- ============================================
  -- UNEXPECTED ERROR
  -- ============================================
  RAISE NOTICE '╔════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ❌ UNEXPECTED ERROR!                              ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════╝';
  RAISE NOTICE '   - SQL State: %', SQLSTATE;
  RAISE NOTICE '   - Error Message: %', SQLERRM;
  RAISE NOTICE '   - Error Detail: %', COALESCE(SQLERRM, 'No details');
  RAISE NOTICE '';

  RETURN QUERY SELECT 
    FALSE, 
    NULL::UUID, 
    format('Unexpected error: %s', SQLERRM)::TEXT;
END;
$$;

-- Add comment
COMMENT ON FUNCTION add_imei_to_parent_variant IS 'DEBUG VERSION: Add IMEI as child of parent variant with detailed logging';

-- Test message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  🔧 DEBUG FUNCTION INSTALLED!                      ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '📋 This debug version includes detailed logging at every step:';
  RAISE NOTICE '   ✓ Input parameter validation';
  RAISE NOTICE '   ✓ IMEI format checking';
  RAISE NOTICE '   ✓ Duplicate detection';
  RAISE NOTICE '   ✓ Parent variant lookup';
  RAISE NOTICE '   ✓ Child variant creation';
  RAISE NOTICE '   ✓ Parent update tracking';
  RAISE NOTICE '   ✓ Stock movement recording';
  RAISE NOTICE '   ✓ Error details';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 To see debug output:';
  RAISE NOTICE '   1. In Neon: Check "Logs" section after query';
  RAISE NOTICE '   2. In psql: Logs show in terminal';
  RAISE NOTICE '   3. In app: Check browser console for function errors';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Test with:';
  RAISE NOTICE '   SELECT * FROM add_imei_to_parent_variant(';
  RAISE NOTICE '     parent_variant_id_param := ''your-parent-uuid'',';
  RAISE NOTICE '     imei_param := ''123456789012345'',';
  RAISE NOTICE '     serial_number_param := ''SN-001'',';
  RAISE NOTICE '     cost_price_param := 1000,';
  RAISE NOTICE '     selling_price_param := 1200,';
  RAISE NOTICE '     condition_param := ''new'',';
  RAISE NOTICE '     notes_param := ''Debug test''';
  RAISE NOTICE '   );';
  RAISE NOTICE '';
END $$;

