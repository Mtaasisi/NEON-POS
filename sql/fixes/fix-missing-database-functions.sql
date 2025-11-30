-- ============================================================================
-- FIX MISSING DATABASE FUNCTIONS
-- ============================================================================
-- This script creates the missing functions that are causing errors:
-- 1. add_imei_to_parent_variant (with corrected signature)
-- 2. log_purchase_order_audit (for audit logging)
-- ============================================================================

-- ============================================================================
-- 1. DROP AND RECREATE: add_imei_to_parent_variant
-- ============================================================================
-- The TypeScript code sends cost_price and selling_price as NUMBERS (not TEXT)
-- So we need to accept them as NUMERIC to match the JavaScript data types

-- Drop ALL existing versions of the function
DROP FUNCTION IF EXISTS add_imei_to_parent_variant(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS add_imei_to_parent_variant(UUID, TEXT, TEXT, TEXT, DECIMAL, DECIMAL, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS add_imei_to_parent_variant(UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS add_imei_to_parent_variant(UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS add_imei_to_parent_variant(UUID, TEXT, DECIMAL, DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS add_imei_to_parent_variant CASCADE;

-- Create the function with NUMERIC parameters (matches JavaScript number type)
CREATE OR REPLACE FUNCTION add_imei_to_parent_variant(
  parent_variant_id_param UUID,
  imei_param TEXT,
  serial_number_param TEXT DEFAULT NULL,
  mac_address_param TEXT DEFAULT NULL,
  cost_price_param NUMERIC DEFAULT NULL,     -- ✅ NUMERIC (not TEXT) - matches JavaScript
  selling_price_param NUMERIC DEFAULT NULL,  -- ✅ NUMERIC (not TEXT) - matches JavaScript
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
  -- Handle NULL prices
  v_cost_price := COALESCE(cost_price_param, 0);
  v_selling_price := COALESCE(selling_price_param, 0);

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
    stock_quantity,
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
    1,
    v_cost_price,
    v_selling_price,
    TRUE,
    v_parent_branch_id,
    NOW(),
    NOW()
  );

  -- Update parent variant's quantity
  UPDATE lats_product_variants
  SET 
    quantity = quantity + 1,
    stock_quantity = COALESCE(stock_quantity, 0) + 1,
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
-- 2. CREATE: log_purchase_order_audit function
-- ============================================================================
-- This function logs audit entries for purchase orders
-- It handles the case where user_id might be 'system' by using NULL instead

CREATE OR REPLACE FUNCTION log_purchase_order_audit(
  p_purchase_order_id UUID,
  p_action TEXT,
  p_details TEXT,
  p_user_id TEXT  -- Accept as TEXT to handle 'system' string
)
RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
  v_user_uuid UUID;
BEGIN
  -- Generate new audit ID
  v_audit_id := gen_random_uuid();
  
  -- Handle 'system' user_id by converting to NULL
  -- Or try to cast to UUID if it's a valid UUID string
  BEGIN
    IF p_user_id = 'system' OR p_user_id IS NULL OR p_user_id = '' THEN
      v_user_uuid := NULL;
    ELSE
      v_user_uuid := p_user_id::UUID;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_user_uuid := NULL;
  END;

  -- Insert into purchase_order_audit table
  -- Note: Different tables have different schemas, we'll try both
  BEGIN
    -- Try inserting into purchase_order_audit (if it exists)
    INSERT INTO purchase_order_audit (
      id,
      purchase_order_id,
      action,
      user_id,
      created_by,
      details,
      timestamp
    ) VALUES (
      v_audit_id,
      p_purchase_order_id,
      p_action,
      v_user_uuid,
      v_user_uuid,
      p_details,
      NOW()
    );
  EXCEPTION WHEN undefined_table THEN
    -- If purchase_order_audit doesn't exist, try lats_purchase_order_audit_log
    INSERT INTO lats_purchase_order_audit_log (
      id,
      purchase_order_id,
      action,
      user_id,
      notes,
      created_at
    ) VALUES (
      v_audit_id,
      p_purchase_order_id,
      p_action,
      v_user_uuid,
      p_details,
      NOW()
    );
  END;

  RETURN v_audit_id;

EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the operation
  RAISE WARNING 'Error logging audit entry: %', SQLERRM;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. CREATE AUDIT TABLE (if it doesn't exist)
-- ============================================================================
-- Ensure the audit table exists with the correct schema

CREATE TABLE IF NOT EXISTS purchase_order_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES lats_purchase_orders(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  details TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_purchase_order_audit_order_id 
  ON purchase_order_audit(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_audit_timestamp 
  ON purchase_order_audit(timestamp DESC);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test that the functions exist
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('add_imei_to_parent_variant', 'log_purchase_order_audit')
ORDER BY routine_name;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ All database functions created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '1. add_imei_to_parent_variant - Now accepts NUMERIC prices (not TEXT)';
  RAISE NOTICE '2. log_purchase_order_audit - Handles "system" user gracefully';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 You can now refresh your application and test the PO receiving flow!';
END $$;

