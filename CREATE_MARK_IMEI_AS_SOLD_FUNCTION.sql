-- ============================================================================
-- CREATE mark_imei_as_sold FUNCTION
-- ============================================================================
-- This function marks an IMEI child variant as sold when processing a POS sale
-- Function signature: mark_imei_as_sold(child_variant_id_param UUID, sale_id_param UUID)
-- ============================================================================

-- Drop all existing versions of the function to avoid conflicts
DROP FUNCTION IF EXISTS mark_imei_as_sold(text, text) CASCADE;
DROP FUNCTION IF EXISTS mark_imei_as_sold(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS mark_imei_as_sold(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS mark_imei_as_sold(text, uuid) CASCADE;

-- Create the correct function signature that matches the code
CREATE OR REPLACE FUNCTION mark_imei_as_sold(
  child_variant_id_param UUID,
  sale_id_param UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_variant_id UUID;
  v_parent_id UUID;
BEGIN
  -- Find the variant by ID
  SELECT id, parent_variant_id INTO v_variant_id, v_parent_id
  FROM lats_product_variants
  WHERE id = child_variant_id_param
    AND variant_type = 'imei_child'
    AND is_active = TRUE
    AND quantity > 0
  LIMIT 1;

  IF v_variant_id IS NULL THEN
    -- Try to find if it exists but is already sold or inactive
    SELECT id INTO v_variant_id
    FROM lats_product_variants
    WHERE id = child_variant_id_param
      AND variant_type = 'imei_child'
    LIMIT 1;
    
    IF v_variant_id IS NULL THEN
      RAISE EXCEPTION 'IMEI child variant % not found', child_variant_id_param;
    ELSE
      RAISE EXCEPTION 'IMEI child variant % is already sold or inactive', child_variant_id_param;
    END IF;
  END IF;

  -- Mark as sold and set quantity to 0
  UPDATE lats_product_variants
  SET 
    quantity = 0,
    is_active = FALSE,
    variant_attributes = jsonb_set(
      jsonb_set(
        COALESCE(variant_attributes, '{}'::jsonb),
        '{sold_at}',
        to_jsonb(NOW())
      ),
      '{sale_id}',
      CASE 
        WHEN sale_id_param IS NOT NULL THEN to_jsonb(sale_id_param::TEXT)
        ELSE 'null'::jsonb
      END
    ),
    updated_at = NOW()
  WHERE id = v_variant_id;

  -- Create stock movement record
  INSERT INTO lats_stock_movements (
    product_id,
    variant_id,
    movement_type,
    quantity,
    reference_type,
    reference_id,
    notes,
    created_at
  )
  SELECT 
    product_id,
    v_variant_id,
    'sale',
    -1,
    'pos_sale',
    sale_id_param,
    'IMEI child variant ' || v_variant_id || ' sold' || COALESCE(' - Sale: ' || sale_id_param::TEXT, ''),
    NOW()
  FROM lats_product_variants
  WHERE id = v_variant_id;

  -- Parent stock will be updated automatically by trigger
  RETURN TRUE;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Error marking IMEI as sold: %', SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION mark_imei_as_sold(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_imei_as_sold(UUID, UUID) TO anon;

-- Verify the function was created successfully
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_result(oid) as return_type
FROM pg_proc
WHERE proname = 'mark_imei_as_sold'
ORDER BY oid DESC
LIMIT 1;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Function mark_imei_as_sold(UUID, UUID) created successfully!';
END $$;
