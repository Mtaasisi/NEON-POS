-- ============================================
-- MERGE IMEI AND SERIAL NUMBER INTO SINGLE COLUMN
-- ============================================
-- This migration merges IMEI and serial_number into a single identifier field
-- They are treated as the same thing throughout the application

BEGIN;

-- ============================================
-- PART 1: Update inventory_items table
-- ============================================

-- Step 1: Merge IMEI into serial_number (use whichever is available)
UPDATE inventory_items
SET serial_number = COALESCE(
  NULLIF(serial_number, ''),
  NULLIF(imei, ''),
  serial_number
)
WHERE imei IS NOT NULL AND imei != '' AND (serial_number IS NULL OR serial_number = '');

-- Step 2: Also copy serial_number to imei for items that only have serial_number
UPDATE inventory_items
SET imei = serial_number
WHERE (imei IS NULL OR imei = '') AND serial_number IS NOT NULL AND serial_number != '';

-- Step 3: For items with both, ensure they match (use serial_number as source of truth)
UPDATE inventory_items
SET imei = serial_number
WHERE serial_number IS NOT NULL 
  AND serial_number != ''
  AND imei IS NOT NULL
  AND imei != ''
  AND imei != serial_number;

-- Step 4: Add constraint to ensure they stay in sync (optional, can be removed if too restrictive)
-- We'll use a trigger instead to keep them in sync

-- ============================================
-- PART 2: Update lats_product_variants table
-- ============================================

-- Step 1: Merge IMEI and serial_number in variant_attributes JSONB
UPDATE lats_product_variants
SET variant_attributes = jsonb_set(
  jsonb_set(
    COALESCE(variant_attributes, '{}'::jsonb),
    '{imei}',
    to_jsonb(COALESCE(
      NULLIF(variant_attributes->>'imei', ''),
      NULLIF(variant_attributes->>'serial_number', ''),
      variant_attributes->>'imei'
    ))
  ),
  '{serial_number}',
  to_jsonb(COALESCE(
    NULLIF(variant_attributes->>'imei', ''),
    NULLIF(variant_attributes->>'serial_number', ''),
    variant_attributes->>'serial_number'
  ))
)
WHERE variant_type = 'imei_child'
  AND variant_attributes IS NOT NULL
  AND (
    variant_attributes->>'imei' IS NOT NULL 
    OR variant_attributes->>'serial_number' IS NOT NULL
  );

-- ============================================
-- PART 3: Create trigger to keep IMEI and serial_number in sync
-- ============================================

-- Function to sync IMEI and serial_number in inventory_items
CREATE OR REPLACE FUNCTION sync_imei_serial_number()
RETURNS TRIGGER AS $$
BEGIN
  -- If serial_number is updated, sync to imei
  IF TG_OP = 'UPDATE' AND NEW.serial_number IS DISTINCT FROM OLD.serial_number THEN
    NEW.imei = COALESCE(NULLIF(NEW.serial_number, ''), NEW.imei);
  END IF;
  
  -- If imei is updated, sync to serial_number
  IF TG_OP = 'UPDATE' AND NEW.imei IS DISTINCT FROM OLD.imei THEN
    NEW.serial_number = COALESCE(NULLIF(NEW.imei, ''), NEW.serial_number);
  END IF;
  
  -- On INSERT, ensure both are set to the same value
  IF TG_OP = 'INSERT' THEN
    IF NEW.serial_number IS NOT NULL AND NEW.serial_number != '' THEN
      NEW.imei = COALESCE(NULLIF(NEW.imei, ''), NEW.serial_number);
    ELSIF NEW.imei IS NOT NULL AND NEW.imei != '' THEN
      NEW.serial_number = COALESCE(NULLIF(NEW.serial_number, ''), NEW.imei);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_sync_imei_serial_number ON inventory_items;

-- Create trigger
CREATE TRIGGER trigger_sync_imei_serial_number
  BEFORE INSERT OR UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION sync_imei_serial_number();

-- ============================================
-- PART 4: Create function to sync variant_attributes
-- ============================================

-- Function to sync IMEI and serial_number in variant_attributes
CREATE OR REPLACE FUNCTION sync_variant_imei_serial_number()
RETURNS TRIGGER AS $$
DECLARE
  v_identifier TEXT;
BEGIN
  -- Only process IMEI child variants
  IF NEW.variant_type = 'imei_child' AND NEW.variant_attributes IS NOT NULL THEN
    -- Get the identifier (IMEI or serial_number, whichever is available)
    v_identifier := COALESCE(
      NULLIF(NEW.variant_attributes->>'imei', ''),
      NULLIF(NEW.variant_attributes->>'serial_number', ''),
      ''
    );
    
    -- If we have an identifier, set both fields to the same value
    IF v_identifier != '' THEN
      NEW.variant_attributes := jsonb_set(
        jsonb_set(
          COALESCE(NEW.variant_attributes, '{}'::jsonb),
          '{imei}',
          to_jsonb(v_identifier)
        ),
        '{serial_number}',
        to_jsonb(v_identifier)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_sync_variant_imei_serial_number ON lats_product_variants;

-- Create trigger
CREATE TRIGGER trigger_sync_variant_imei_serial_number
  BEFORE INSERT OR UPDATE ON lats_product_variants
  FOR EACH ROW
  EXECUTE FUNCTION sync_variant_imei_serial_number();

-- ============================================
-- PART 5: Update comments to reflect unified field
-- ============================================

COMMENT ON COLUMN inventory_items.serial_number IS 'Serial number or IMEI - both fields store the same identifier';
COMMENT ON COLUMN inventory_items.imei IS 'IMEI or Serial Number - both fields store the same identifier (synced with serial_number)';

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check for any mismatches after migration
SELECT 
  'inventory_items' as table_name,
  COUNT(*) as total_items,
  COUNT(*) FILTER (WHERE serial_number IS DISTINCT FROM imei AND serial_number IS NOT NULL AND imei IS NOT NULL) as mismatches
FROM inventory_items
WHERE serial_number IS NOT NULL OR imei IS NOT NULL;

-- Check variant_attributes sync
SELECT 
  'lats_product_variants' as table_name,
  COUNT(*) as total_variants,
  COUNT(*) FILTER (
    WHERE variant_type = 'imei_child' 
    AND variant_attributes->>'imei' IS DISTINCT FROM variant_attributes->>'serial_number'
    AND variant_attributes->>'imei' IS NOT NULL
    AND variant_attributes->>'serial_number' IS NOT NULL
  ) as mismatches
FROM lats_product_variants
WHERE variant_type = 'imei_child';

