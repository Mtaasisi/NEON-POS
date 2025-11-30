-- ============================================================================
-- FIX IMEI VALIDATION TRIGGERS
-- ============================================================================
-- The original triggers are checking for fields that don't exist
-- They should check variant_type instead
-- ============================================================================

-- Drop problematic triggers that reference fields incorrectly
DROP TRIGGER IF EXISTS ensure_imei_has_parent ON lats_product_variants;
DROP FUNCTION IF EXISTS check_imei_has_parent CASCADE;

-- Recreate the function to check variant_type instead of non-existent 'imei' field
CREATE OR REPLACE FUNCTION check_imei_has_parent()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check if this is an IMEI child variant
  IF NEW.variant_type = 'imei_child' AND NEW.parent_variant_id IS NULL THEN
    RAISE EXCEPTION 'IMEI child variant must have a parent_variant_id';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER ensure_imei_has_parent
  BEFORE INSERT OR UPDATE ON lats_product_variants
  FOR EACH ROW
  EXECUTE FUNCTION check_imei_has_parent();

-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ IMEI validation trigger fixed';
END $$;

