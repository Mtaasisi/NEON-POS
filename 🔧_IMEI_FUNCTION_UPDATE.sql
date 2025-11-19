-- ============================================================================
-- UPDATED IMEI Functions to Use New Schema
-- ============================================================================
-- This updates the IMEI functions to use variant_name and variant_attributes
-- instead of the legacy name and attributes columns
-- ============================================================================

-- ============================================================================
-- 1. Updated: add_imei_to_parent_variant
-- ============================================================================
-- This function creates IMEI child variants under a parent variant
-- UPDATED to use variant_name and variant_attributes (new schema)

CREATE OR REPLACE FUNCTION add_imei_to_parent_variant(
  parent_variant_id_param UUID,
  imei_param TEXT,
  serial_number_param TEXT DEFAULT NULL,
  mac_address_param TEXT DEFAULT NULL,
  cost_price_param DECIMAL DEFAULT NULL,
  selling_price_param DECIMAL DEFAULT NULL,
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
  v_parent_variant_name TEXT;  -- ✅ NEW: Get parent's variant_name
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

  -- Check for duplicate IMEI in variant_attributes (NEW schema)
  SELECT COUNT(*) INTO v_duplicate_count
  FROM lats_product_variants
  WHERE variant_type IN ('imei', 'imei_child')
    AND (
      variant_attributes->>'imei' = imei_param 
      OR attributes->>'imei' = imei_param  -- Check old column too
      OR name = imei_param  -- Check old name column
    );

  IF v_duplicate_count > 0 THEN
    RETURN QUERY SELECT 
      FALSE, 
      NULL::UUID, 
      format('IMEI %s already exists in the system', imei_param) AS error_message;
    RETURN;
  END IF;

  -- Get parent variant details (use variant_name from NEW schema)
  SELECT 
    product_id, 
    sku, 
    COALESCE(variant_name, name) as variant_name,  -- ✅ NEW: Prefer variant_name
    branch_id
  INTO 
    v_parent_product_id, 
    v_parent_sku, 
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

  -- Create IMEI child variant using NEW schema columns
  INSERT INTO lats_product_variants (
    product_id,
    parent_variant_id,
    variant_type,
    name,                     -- ✅ Keep for NOT NULL constraint (use IMEI as name)
    variant_name,             -- ✅ NEW: Store parent reference or IMEI
    sku,
    attributes,               -- ✅ Keep for backward compatibility
    variant_attributes,       -- ✅ NEW: Primary IMEI storage
    quantity,
    cost_price,
    selling_price,
    is_active,
    branch_id
  ) VALUES (
    v_parent_product_id,
    parent_variant_id_param,
    'imei_child',             -- ✅ NEW: Use 'imei_child' instead of just 'imei'
    COALESCE(serial_number_param, imei_param),  -- ✅ Use serial or IMEI for NOT NULL name
    format('IMEI: %s', imei_param),  -- ✅ NEW: Descriptive variant_name
    v_parent_sku || '-IMEI-' || SUBSTRING(imei_param, 10, 6),  -- Shorter SKU
    jsonb_build_object(       -- ✅ Keep for backward compatibility
      'imei', imei_param,
      'serial_number', serial_number_param,
      'mac_address', mac_address_param,
      'condition', condition_param,
      'imei_status', 'available',
      'parent_variant_name', v_parent_variant_name,  -- ✅ Store parent name for reference
      'added_at', NOW(),
      'notes', notes_param
    ),
    jsonb_build_object(       -- ✅ NEW: Primary storage in variant_attributes
      'imei', imei_param,
      'serial_number', serial_number_param,
      'mac_address', mac_address_param,
      'condition', condition_param,
      'imei_status', 'available',
      'parent_variant_name', v_parent_variant_name,  -- ✅ NEW: Store parent's name
      'added_at', NOW(),
      'notes', notes_param,
      'warranty_start', NULLIF(NULLIF(notes_param, ''), 'null'),  -- Will be set separately if provided
      'warranty_end', NULLIF(NULLIF(notes_param, ''), 'null')
    ),
    1,  -- Each IMEI = 1 unit
    COALESCE(cost_price_param, 0),
    COALESCE(selling_price_param, 0),
    true,
    v_parent_branch_id  -- ✅ Inherit parent's branch
  ) RETURNING id INTO v_child_variant_id;

  -- Update parent variant to mark as parent (if not already)
  UPDATE lats_product_variants
  SET 
    is_parent = true,
    variant_type = COALESCE(variant_type, 'parent'),
    updated_at = NOW()
  WHERE id = parent_variant_id_param
    AND (is_parent IS NULL OR is_parent = false);

  -- Parent quantity will be synced automatically by trigger sync_parent_quantity_on_imei_change

  RAISE NOTICE 'IMEI % added successfully as child of variant % (parent name: %)', 
    imei_param, parent_variant_id_param, v_parent_variant_name;

  RETURN QUERY SELECT 
    TRUE, 
    v_child_variant_id, 
    NULL::TEXT AS error_message;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION add_imei_to_parent_variant IS 
'Creates an IMEI child variant under a parent variant. Uses NEW schema with variant_name and variant_attributes. Stores parent''s variant_name for reference.';

-- ============================================================================
-- 2. Test the Updated Function
-- ============================================================================

-- Example test (commented out - run manually if needed):
/*
SELECT * FROM add_imei_to_parent_variant(
  '<parent-variant-id>'::UUID,
  '123456789012345',  -- IMEI
  'SN123456',         -- Serial number
  'AA:BB:CC:DD:EE:FF', -- MAC address
  800.00,             -- Cost price
  1200.00,            -- Selling price
  'excellent',        -- Condition
  'Received from PO#123'  -- Notes
);
*/

-- ============================================================================
-- 3. Verify Function Works with New Schema
-- ============================================================================

-- Check that function signature matches what code calls
SELECT 
  routine_name,
  STRING_AGG(
    parameter_name || ' ' || 
    CASE 
      WHEN data_type = 'USER-DEFINED' THEN udt_name
      ELSE data_type 
    END,
    ', ' ORDER BY ordinal_position
  ) as parameters
FROM information_schema.parameters
WHERE specific_schema = 'public'
  AND routine_name = 'add_imei_to_parent_variant'
GROUP BY routine_name, specific_name;

