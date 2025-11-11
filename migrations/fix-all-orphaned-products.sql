-- ============================================================================
-- FIX ALL ORPHANED PRODUCTS - Assign NULL branch_id to appropriate branch
-- ============================================================================
-- Critical Issue: 94 products have branch_id = NULL, making them unusable
-- This migration assigns all orphaned products to the main branch
-- ============================================================================

-- First, let's see what we're dealing with
DO $$
DECLARE
  v_orphaned_count INTEGER;
  v_orphaned_stock INTEGER;
  v_main_branch_id UUID;
  v_main_branch_name TEXT;
BEGIN
  -- Count orphaned products
  SELECT COUNT(*), SUM(quantity)
  INTO v_orphaned_count, v_orphaned_stock
  FROM lats_product_variants
  WHERE branch_id IS NULL;

  RAISE NOTICE '🔍 Found % orphaned products with % total units', v_orphaned_count, v_orphaned_stock;

  -- Get the main branch
  SELECT id, name 
  INTO v_main_branch_id, v_main_branch_name
  FROM store_locations 
  WHERE is_main = true 
  ORDER BY created_at ASC 
  LIMIT 1;

  IF v_main_branch_id IS NULL THEN
    -- If no main branch, get the first active branch
    SELECT id, name 
    INTO v_main_branch_id, v_main_branch_name
    FROM store_locations 
    WHERE is_active = true
    ORDER BY created_at ASC 
    LIMIT 1;
  END IF;

  RAISE NOTICE '📍 Main branch: % (ID: %)', v_main_branch_name, v_main_branch_id;

  IF v_main_branch_id IS NULL THEN
    RAISE EXCEPTION '❌ No active branches found! Cannot assign products.';
  END IF;
END $$;

-- ============================================================================
-- OPTION 1: Assign ALL orphaned products to the MAIN branch (DAR)
-- ============================================================================
-- Uncomment this if you want all products in one central branch:

UPDATE lats_product_variants
SET branch_id = (
  SELECT id FROM store_locations 
  WHERE is_main = true 
  ORDER BY created_at ASC 
  LIMIT 1
)
WHERE branch_id IS NULL;

-- ============================================================================
-- OPTION 2: Distribute products evenly across branches
-- ============================================================================
-- Uncomment this if you want to split products between branches:

/*
WITH branches AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as branch_num
  FROM store_locations
  WHERE is_active = true
),
orphaned AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as product_num
  FROM lats_product_variants
  WHERE branch_id IS NULL
)
UPDATE lats_product_variants pv
SET branch_id = b.id
FROM orphaned o
JOIN branches b ON (o.product_num % (SELECT COUNT(*) FROM branches)) + 1 = b.branch_num
WHERE pv.id = o.id;
*/

-- ============================================================================
-- Verify the fix
-- ============================================================================
DO $$
DECLARE
  v_remaining_orphaned INTEGER;
  v_branch_record RECORD;
BEGIN
  -- Check for remaining orphaned products
  SELECT COUNT(*)
  INTO v_remaining_orphaned
  FROM lats_product_variants
  WHERE branch_id IS NULL;

  IF v_remaining_orphaned > 0 THEN
    RAISE WARNING '⚠️  Still have % orphaned products!', v_remaining_orphaned;
  ELSE
    RAISE NOTICE '✅ All products successfully assigned to branches!';
  END IF;

  -- Show distribution
  RAISE NOTICE '';
  RAISE NOTICE '📊 Product Distribution After Fix:';
  RAISE NOTICE '==================================';
  
  FOR v_branch_record IN
    SELECT 
      sl.name,
      sl.code,
      COUNT(lpv.id) as product_count,
      SUM(lpv.quantity) as total_stock
    FROM store_locations sl
    LEFT JOIN lats_product_variants lpv ON lpv.branch_id = sl.id
    WHERE sl.is_active = true
    GROUP BY sl.id, sl.name, sl.code
    ORDER BY sl.name
  LOOP
    RAISE NOTICE '  % (%): % products, % units', 
      v_branch_record.name, 
      v_branch_record.code,
      v_branch_record.product_count,
      v_branch_record.total_stock;
  END LOOP;
END $$;

-- ============================================================================
-- Add constraint to prevent this in the future
-- ============================================================================

-- First, ensure all products have a branch_id (done above)
-- Then add NOT NULL constraint
ALTER TABLE lats_product_variants
ALTER COLUMN branch_id SET NOT NULL;

-- Add a check constraint for good measure
ALTER TABLE lats_product_variants
ADD CONSTRAINT lats_product_variants_branch_id_not_null
CHECK (branch_id IS NOT NULL);

-- Verify constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'lats_product_variants' 
    AND column_name = 'branch_id' 
    AND is_nullable = 'NO'
  ) THEN
    RAISE NOTICE '✅ NOT NULL constraint added successfully!';
  ELSE
    RAISE WARNING '⚠️  NOT NULL constraint may not be active';
  END IF;
END $$;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Summary:
-- - Assigned all orphaned products to branches
-- - Added NOT NULL constraint to prevent future orphans
-- - System now enforces branch assignment at database level
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '🎉 Migration Complete!';
RAISE NOTICE '✅ All products now have branch assignments';
RAISE NOTICE '🔒 Database constraint added to prevent orphaned products';
RAISE NOTICE '';

