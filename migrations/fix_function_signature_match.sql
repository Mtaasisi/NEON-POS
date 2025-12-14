-- ============================================
-- FIX: Match Function Signature to Frontend
-- ============================================
-- The frontend sends: (uuid, text, text, text, text, integer, text, text)
-- We need to match this exactly

-- ============================================
-- STEP 1: Drop any existing versions
-- ============================================
DROP FUNCTION IF EXISTS add_imei_to_parent_variant(
  UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT
) CASCADE;

DROP FUNCTION IF EXISTS add_imei_to_parent_variant(
  UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT
) CASCADE;

DROP FUNCTION IF EXISTS add_imei_to_parent_variant(
  UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, UUID, TEXT
) CASCADE;

-- ============================================
-- STEP 2: Create Function with EXACT Frontend Signature
-- ============================================
CREATE FUNCTION add_imei_to_parent_variant(
  parent_variant_id_param UUID,
  imei_param TEXT,
  serial_number_param TEXT,
  mac_address_param TEXT,
  cost_price_param TEXT,        -- ← Frontend sends as TEXT
  selling_price_param INTEGER,  -- ← Frontend sends as INTEGER
  condition_param TEXT,
  notes_param TEXT
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
  -- DEBUG LOGGING
  -- ============================================
  RAISE NOTICE '╔════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  🔧 DEBUG: add_imei_to_parent_variant             ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════╝';
  RAISE NOTICE '📥 INPUT:';
  RAISE NOTICE '   parent_id: %', parent_variant_id_param;
  RAISE NOTICE '   imei: %', imei_param;
  RAISE NOTICE '   serial: %', COALESCE(serial_number_param, 'NULL');
  RAISE NOTICE '   cost: % (TEXT) | sell: % (INTEGER)', cost_price_param, selling_price_param;
  RAISE NOTICE '';

  -- Validate IMEI
  IF imei_param IS NULL OR imei_param = '' THEN
    RAISE NOTICE '❌ IMEI is empty';
    RETURN QUERY SELECT FALSE, NULL::UUID, 'IMEI cannot be empty'::TEXT;
    RETURN;
  END IF;

  IF imei_param !~ '^\d{15}$' THEN
    RAISE NOTICE '❌ Invalid IMEI format: % (length: %)', imei_param, LENGTH(imei_param);
    RETURN QUERY SELECT FALSE, NULL::UUID, 
      format('Invalid IMEI. Must be 15 digits. Got: %s', imei_param)::TEXT;
    RETURN;
  END IF;

  RAISE NOTICE '✅ IMEI valid: %', imei_param;

  -- Check duplicate
  SELECT COUNT(*) INTO v_duplicate_count
  FROM lats_product_variants
  WHERE variant_type IN ('imei', 'imei_child')
    AND (
      variant_attributes->>'imei' = imei_param 
      OR attributes->>'imei' = imei_param
    );

  IF v_duplicate_count > 0 THEN
    RAISE NOTICE '❌ Duplicate IMEI found';
    RETURN QUERY SELECT FALSE, NULL::UUID, 
      format('IMEI %s already exists', imei_param)::TEXT;
    RETURN;
  END IF;

  RAISE NOTICE '✅ No duplicate';

  -- Get parent details
  SELECT 
    product_id, 
    sku, 
    COALESCE(variant_name, name),
    branch_id
  INTO 
    v_parent_product_id, 
    v_parent_sku, 
    v_parent_variant_name,
    v_parent_branch_id
  FROM lats_product_variants
  WHERE id = parent_variant_id_param;

  IF v_parent_product_id IS NULL THEN
    RAISE NOTICE '❌ Parent not found: %', parent_variant_id_param;
    RETURN QUERY SELECT FALSE, NULL::UUID, 
      format('Parent variant %s not found', parent_variant_id_param)::TEXT;
    RETURN;
  END IF;

  RAISE NOTICE '✅ Parent found: % (SKU: %)', v_parent_variant_name, v_parent_sku;

  -- Convert prices (TEXT to NUMERIC, INTEGER to NUMERIC)
  BEGIN
    v_cost_price := COALESCE(cost_price_param::NUMERIC, 0);
    v_selling_price := COALESCE(selling_price_param::NUMERIC, 0);
    RAISE NOTICE '✅ Prices converted: cost=%, sell=%', v_cost_price, v_selling_price;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Price conversion failed: %', SQLERRM;
    RETURN QUERY SELECT FALSE, NULL::UUID, 
      format('Invalid price format: cost=%s, sell=%s', cost_price_param, selling_price_param)::TEXT;
    RETURN;
  END;

  -- Create child variant
  RAISE NOTICE '⏳ Creating child variant...';
  
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

    RAISE NOTICE '✅ Child created: %', v_child_variant_id;

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ INSERT failed: %', SQLERRM;
    RETURN QUERY SELECT FALSE, NULL::UUID, 
      format('Insert failed: %s', SQLERRM)::TEXT;
    RETURN;
  END;

  -- Update parent
  UPDATE lats_product_variants
  SET 
    is_parent = true,
    variant_type = COALESCE(variant_type, 'parent'),
    updated_at = NOW()
  WHERE id = parent_variant_id_param;

  RAISE NOTICE '✅ Parent updated';

  -- Success
  RAISE NOTICE '╔════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ SUCCESS - IMEI: %                    ║', LEFT(imei_param, 20);
  RAISE NOTICE '╚════════════════════════════════════════════════════╝';
  RAISE NOTICE '';

  RETURN QUERY SELECT TRUE, v_child_variant_id, NULL::TEXT;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ ERROR: %', SQLERRM;
  RETURN QUERY SELECT FALSE, NULL::UUID, 
    format('Error: %s', SQLERRM)::TEXT;
END;
$$;

-- ============================================
-- STEP 3: Verify Function Signature
-- ============================================
DO $$
DECLARE
  v_count INTEGER;
  v_signature TEXT;
BEGIN
  SELECT 
    COUNT(*),
    STRING_AGG(pg_get_function_identity_arguments(oid), ' | ')
  INTO v_count, v_signature
  FROM pg_proc
  WHERE proname = 'add_imei_to_parent_variant';
  
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ FUNCTION CREATED WITH EXACT FRONTEND SIGNATURE! ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Function Status:';
  RAISE NOTICE '   Count: % (should be 1)', v_count;
  RAISE NOTICE '   Signature: %', v_signature;
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Expected Frontend Call:';
  RAISE NOTICE '   (uuid, text, text, text, text, integer, text, text)';
  RAISE NOTICE '';
  
  IF v_count = 1 THEN
    RAISE NOTICE '✅ Perfect! Function ready for frontend calls';
  ELSE
    RAISE NOTICE '❌ ERROR: Function count is %', v_count;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Ready to test!';
  RAISE NOTICE '   1. Refresh browser (Ctrl+Shift+R)';
  RAISE NOTICE '   2. Try receiving PO with IMEI';
  RAISE NOTICE '   3. Check console and database logs';
  RAISE NOTICE '';
END $$;

-- Add comment
COMMENT ON FUNCTION add_imei_to_parent_variant IS 
  'Add IMEI as child of parent variant - EXACT frontend signature match (uuid, text, text, text, text, integer, text, text)';
