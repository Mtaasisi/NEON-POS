-- ============================================================================
-- FIX IMEI ERRORS
-- ============================================================================
-- This script fixes two critical errors:
-- 1. SQL syntax error with JSONB queries (handled in code)
-- 2. Missing add_imei_to_parent_variant function with INTEGER signature
-- ============================================================================

-- Drop ALL existing versions to avoid conflicts
DROP FUNCTION IF EXISTS add_imei_to_parent_variant(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS add_imei_to_parent_variant(UUID, TEXT, TEXT, TEXT, DECIMAL, DECIMAL, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS add_imei_to_parent_variant(UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS add_imei_to_parent_variant(UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS add_imei_to_parent_variant(UUID, TEXT, TEXT, INTEGER, INTEGER, TEXT) CASCADE;
DROP FUNCTION IF EXISTS add_imei_to_parent_variant(UUID, TEXT, TEXT, INTEGER, INTEGER, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS add_imei_to_parent_variant CASCADE;

-- Drop existing internal function if it exists
DROP FUNCTION IF EXISTS add_imei_to_parent_variant_internal(UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT) CASCADE;

-- Create internal helper function with the main implementation
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
BEGIN
  -- Handle NULL prices
  v_cost_price := COALESCE(cost_price_param, 0);
  v_selling_price := COALESCE(selling_price_param, 0);
  
  -- ✅ UNIFIED: Serial number and IMEI are the same - use imei_param for both
  v_serial_number := COALESCE(serial_number_param, imei_param)::TEXT;
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
    AND is_active = TRUE
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
    v_parent_sku || '-IMEI-' || SUBSTRING(imei_param, LEAST(10, LENGTH(imei_param)), 6),
    jsonb_build_object(
      'imei', imei_param,
      'serial_number', v_serial_number,
      'mac_address', mac_address_param,
      'condition', condition_param,
      'imei_status', 'available',
      'parent_variant_name', v_parent_variant_name,
      'added_at', NOW(),
      'notes', notes_param
    ),
    jsonb_build_object(
      'imei', imei_param,
      'serial_number', v_serial_number,
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

-- ✅ CRITICAL: Create overload that accepts INTEGER types (matches the error signature)
CREATE OR REPLACE FUNCTION add_imei_to_parent_variant(
  parent_variant_id_param UUID,
  imei_param TEXT,
  serial_number_param TEXT,
  cost_price_param INTEGER,
  selling_price_param INTEGER,
  condition_param TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  child_variant_id UUID,
  error_message TEXT
) AS $$
BEGIN
  -- Convert INTEGER to NUMERIC and call the internal function
  RETURN QUERY
  SELECT * FROM add_imei_to_parent_variant_internal(
    parent_variant_id_param,
    imei_param,
    serial_number_param,
    NULL::TEXT, -- mac_address
    cost_price_param::NUMERIC,
    selling_price_param::NUMERIC,
    condition_param,
    NULL::TEXT -- notes
  );
END;
$$ LANGUAGE plpgsql;

-- ✅ Create overload with all parameters including notes
CREATE OR REPLACE FUNCTION add_imei_to_parent_variant(
  parent_variant_id_param UUID,
  imei_param TEXT,
  serial_number_param TEXT,
  cost_price_param INTEGER,
  selling_price_param INTEGER,
  condition_param TEXT,
  notes_param TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  child_variant_id UUID,
  error_message TEXT
) AS $$
BEGIN
  -- Convert INTEGER to NUMERIC and call the internal function
  RETURN QUERY
  SELECT * FROM add_imei_to_parent_variant_internal(
    parent_variant_id_param,
    imei_param,
    serial_number_param,
    NULL::TEXT, -- mac_address
    cost_price_param::NUMERIC,
    selling_price_param::NUMERIC,
    condition_param,
    notes_param
  );
END;
$$ LANGUAGE plpgsql;

-- ✅ Create standard overload with NUMERIC types
CREATE OR REPLACE FUNCTION add_imei_to_parent_variant(
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
BEGIN
  -- Call the internal implementation
  RETURN QUERY
  SELECT * FROM add_imei_to_parent_variant_internal(
    parent_variant_id_param,
    imei_param,
    serial_number_param,
    mac_address_param,
    cost_price_param,
    selling_price_param,
    condition_param,
    notes_param
  );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION add_imei_to_parent_variant(UUID, TEXT, TEXT, INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION add_imei_to_parent_variant(UUID, TEXT, TEXT, INTEGER, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION add_imei_to_parent_variant(UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT) TO authenticated;

-- Grant to anon role if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    GRANT EXECUTE ON FUNCTION add_imei_to_parent_variant(UUID, TEXT, TEXT, INTEGER, INTEGER, TEXT) TO anon;
    GRANT EXECUTE ON FUNCTION add_imei_to_parent_variant(UUID, TEXT, TEXT, INTEGER, INTEGER, TEXT, TEXT) TO anon;
    GRANT EXECUTE ON FUNCTION add_imei_to_parent_variant(UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT) TO anon;
  END IF;
END $$;

-- Verify functions were created
SELECT 
  '✅ Function created successfully' as status,
  routine_name,
  routine_type,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'add_imei_to_parent_variant'
ORDER BY proname, oid;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ IMEI ERRORS FIXED                              ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE 'Fixed issues:';
  RAISE NOTICE '  1. ✅ SQL syntax error (fixed in code)';
  RAISE NOTICE '  2. ✅ Function signature mismatch (fixed in database)';
  RAISE NOTICE '';
  RAISE NOTICE 'Function overloads created:';
  RAISE NOTICE '  - add_imei_to_parent_variant(uuid, text, text, integer, integer, text)';
  RAISE NOTICE '  - add_imei_to_parent_variant(uuid, text, text, integer, integer, text, text)';
  RAISE NOTICE '  - add_imei_to_parent_variant(uuid, text, text, text, numeric, numeric, text, text)';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 You can now refresh your application and test PO receiving!';
  RAISE NOTICE '';
END $$;

