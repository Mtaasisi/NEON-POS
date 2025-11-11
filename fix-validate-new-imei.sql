-- ============================================================================
-- FIX validate_new_imei TRIGGER FUNCTION
-- ============================================================================
-- The function was checking NEW.imei (which doesn't exist as a column)
-- instead of NEW.variant_attributes->>'imei'
-- ============================================================================

DROP FUNCTION IF EXISTS validate_new_imei CASCADE;

CREATE OR REPLACE FUNCTION validate_new_imei()
RETURNS TRIGGER AS $$
DECLARE
  v_imei TEXT;
BEGIN
  -- Only for imei_child variants
  IF NEW.variant_type = 'imei_child' THEN
      -- Get IMEI from variant_attributes
      v_imei := NEW.variant_attributes->>'imei';
      
      -- Check if IMEI is 15 digits
      IF v_imei IS NULL OR LENGTH(v_imei) <> 15 OR v_imei !~ '^[0-9]+$' THEN
          RAISE EXCEPTION 'Invalid IMEI: % (must be exactly 15 digits)', v_imei;
      END IF;

      -- Check for duplicates in active variants (excluding self if this is an update)
      IF TG_OP = 'INSERT' THEN
        IF EXISTS (
            SELECT 1 FROM lats_product_variants
            WHERE variant_type = 'imei_child'
              AND variant_attributes->>'imei' = v_imei
              AND is_active = TRUE
        ) THEN
            RAISE EXCEPTION 'Duplicate IMEI: %', v_imei;
        END IF;
      ELSIF TG_OP = 'UPDATE' THEN
        IF EXISTS (
            SELECT 1 FROM lats_product_variants
            WHERE variant_type = 'imei_child'
              AND variant_attributes->>'imei' = v_imei
              AND is_active = TRUE
              AND id != NEW.id
        ) THEN
            RAISE EXCEPTION 'Duplicate IMEI: %', v_imei;
        END IF;
      END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trg_validate_new_imei ON lats_product_variants;

CREATE TRIGGER trg_validate_new_imei
  BEFORE INSERT OR UPDATE ON lats_product_variants
  FOR EACH ROW
  EXECUTE FUNCTION validate_new_imei();

-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ validate_new_imei function fixed';
END $$;

