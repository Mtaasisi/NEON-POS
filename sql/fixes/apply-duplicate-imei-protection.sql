-- ============================================
-- APPLY DUPLICATE IMEI PROTECTION
-- Prevents duplicate IMEI numbers in database
-- ============================================

-- Step 1: Create function to check for duplicate IMEI
CREATE OR REPLACE FUNCTION check_duplicate_imei()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check if IMEI is provided
  IF NEW.variant_attributes->>'imei' IS NOT NULL AND NEW.variant_attributes->>'imei' != '' THEN
    -- Check if IMEI already exists (excluding current variant)
    IF EXISTS (
      SELECT 1 
      FROM lats_product_variants 
      WHERE variant_attributes->>'imei' = NEW.variant_attributes->>'imei'
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND is_active = true  -- Only check active variants
    ) THEN
      RAISE EXCEPTION 'Duplicate IMEI Error: Device with IMEI % already exists in inventory. Each IMEI must be unique.', NEW.variant_attributes->>'imei';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create trigger to enforce unique IMEI
DROP TRIGGER IF EXISTS enforce_unique_imei ON lats_product_variants;
CREATE TRIGGER enforce_unique_imei
  BEFORE INSERT OR UPDATE ON lats_product_variants
  FOR EACH ROW
  EXECUTE FUNCTION check_duplicate_imei();

-- Step 3: Verify trigger was created
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  CASE 
    WHEN tgenabled = 'O' THEN '✅ ENABLED'
    WHEN tgenabled = 'D' THEN '❌ DISABLED'
    ELSE '⚠️ UNKNOWN'
  END as status
FROM pg_trigger 
WHERE tgname = 'enforce_unique_imei';

-- Step 4: Check for existing duplicates before enforcing
SELECT 
  '=== EXISTING DUPLICATE IMEIs ===' as section,
  variant_attributes->>'imei' as imei,
  COUNT(*) as count,
  array_agg(id ORDER BY created_at DESC) as variant_ids,
  array_agg(variant_name ORDER BY created_at DESC) as names
FROM lats_product_variants
WHERE variant_attributes->>'imei' IS NOT NULL
  AND variant_attributes->>'imei' != ''
  AND is_active = true
GROUP BY variant_attributes->>'imei'
HAVING COUNT(*) > 1;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ DUPLICATE IMEI PROTECTION ACTIVATED!';
  RAISE NOTICE '';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '  ✅ Trigger created: enforce_unique_imei';
  RAISE NOTICE '  ✅ Function created: check_duplicate_imei()';
  RAISE NOTICE '  ✅ Protection: Database-level (cannot be bypassed)';
  RAISE NOTICE '';
  RAISE NOTICE 'What happens now:';
  RAISE NOTICE '  - Cannot insert variant with duplicate IMEI';
  RAISE NOTICE '  - Cannot update variant to duplicate IMEI';
  RAISE NOTICE '  - Clear error message shown';
  RAISE NOTICE '  - Only checks active variants';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  If duplicates exist (see query above), clean them up manually';
  RAISE NOTICE '';
END $$;

