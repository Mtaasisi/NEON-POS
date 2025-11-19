-- ============================================
-- FIX: get_child_imeis() Function
-- ============================================
-- This creates the function to retrieve child IMEI variants
-- Run this if you're getting syntax errors with the main migration

-- Drop the function if it exists (to ensure clean creation)
DROP FUNCTION IF EXISTS get_child_imeis(UUID);

-- Create the function with proper syntax
CREATE OR REPLACE FUNCTION get_child_imeis(parent_variant_id_param UUID)
RETURNS TABLE (
  child_id UUID,
  imei TEXT,
  serial_number TEXT,
  status TEXT,
  quantity INTEGER,
  cost_price NUMERIC,
  selling_price NUMERIC,
  variant_attributes JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id as child_id,
    (v.variant_attributes->>'imei')::TEXT as imei,
    (v.variant_attributes->>'serial_number')::TEXT as serial_number,
    CASE 
      WHEN v.is_active = TRUE AND v.quantity > 0 THEN 'available'::TEXT
      WHEN v.is_active = FALSE THEN 'sold'::TEXT
      ELSE 'unavailable'::TEXT
    END as status,
    v.quantity::INTEGER,
    v.cost_price::NUMERIC,
    v.selling_price::NUMERIC,
    v.variant_attributes::JSONB,
    v.created_at::TIMESTAMPTZ
  FROM lats_product_variants v
  WHERE v.parent_variant_id = parent_variant_id_param
    AND v.variant_type = 'imei_child'
    AND v.is_active = TRUE
  ORDER BY v.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add documentation
COMMENT ON FUNCTION get_child_imeis(UUID) IS 'Get all child IMEI variants for a parent variant';

-- Verify it was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'get_child_imeis'
  ) THEN
    RAISE NOTICE '✅ Function get_child_imeis() created successfully!';
  ELSE
    RAISE EXCEPTION '❌ Failed to create function get_child_imeis()';
  END IF;
END $$;

