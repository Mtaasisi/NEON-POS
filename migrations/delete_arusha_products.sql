-- ================================================================================
-- DELETE ALL PRODUCTS IN ARUSHA BRANCH
-- ================================================================================
-- ⚠️  WARNING: This will DELETE all products belonging to the Arusha branch
-- ⚠️  This includes:
-- ⚠️    - All product records
-- ⚠️    - Product variants
-- ⚠️    - Stock movements will be set to NULL (history preserved)
-- ⚠️    - Sale items will be set to NULL (sales history preserved)
-- ⚠️    - Purchase order items will be set to NULL (purchase history preserved)
-- ================================================================================

BEGIN;

-- Step 1: Get the Arusha branch ID
DO $$
DECLARE
  arusha_branch_id UUID;
  product_count INTEGER;
  variant_count INTEGER;
BEGIN
  -- Find Arusha branch
  SELECT id INTO arusha_branch_id
  FROM lats_store_locations
  WHERE LOWER(name) LIKE '%arusha%' OR LOWER(city) LIKE '%arusha%'
  LIMIT 1;

  -- Check if branch exists
  IF arusha_branch_id IS NULL THEN
    RAISE EXCEPTION 'Arusha branch not found in lats_store_locations table';
  END IF;

  RAISE NOTICE '🏪 Found Arusha branch: %', arusha_branch_id;

  -- Count products to be deleted
  SELECT COUNT(*) INTO product_count
  FROM lats_products
  WHERE branch_id = arusha_branch_id;

  RAISE NOTICE '📦 Products to delete: %', product_count;

  -- Count variants to be deleted
  SELECT COUNT(*) INTO variant_count
  FROM lats_product_variants
  WHERE branch_id = arusha_branch_id;

  RAISE NOTICE '🔢 Variants to delete: %', variant_count;

  -- Step 2: Delete product variants first (they reference products)
  DELETE FROM lats_product_variants
  WHERE branch_id = arusha_branch_id;

  RAISE NOTICE '✅ Deleted % product variants', variant_count;

  -- Step 3: Delete the products
  DELETE FROM lats_products
  WHERE branch_id = arusha_branch_id;

  RAISE NOTICE '✅ Deleted % products', product_count;
  RAISE NOTICE '🎉 All Arusha branch products have been deleted successfully!';
  
  -- Show summary
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE 'DELETION SUMMARY:';
  RAISE NOTICE '  Branch: Arusha (%)', arusha_branch_id;
  RAISE NOTICE '  Products deleted: %', product_count;
  RAISE NOTICE '  Variants deleted: %', variant_count;
  RAISE NOTICE '═══════════════════════════════════════════════';
END $$;

COMMIT;

-- Verify deletion
SELECT 
  '✅ DELETION COMPLETE' as status,
  COUNT(*) as remaining_arusha_products
FROM lats_products p
JOIN lats_store_locations l ON p.branch_id = l.id
WHERE LOWER(l.name) LIKE '%arusha%' OR LOWER(l.city) LIKE '%arusha%';

