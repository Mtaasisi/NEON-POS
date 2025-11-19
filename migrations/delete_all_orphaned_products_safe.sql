-- ================================================================================
-- SAFE DELETE: Orphaned Products (Products with non-existent branch IDs)
-- ================================================================================
-- This handles all foreign key constraints properly
-- ================================================================================

BEGIN;

-- Show what will be deleted
SELECT 
  '🔍 ORPHANED PRODUCTS TO DELETE' as status,
  p.branch_id,
  COUNT(*) as product_count
FROM lats_products p
LEFT JOIN lats_store_locations l ON p.branch_id = l.id
WHERE l.id IS NULL
GROUP BY p.branch_id;

-- Count variants to be deleted
SELECT 
  '🔍 ORPHANED VARIANTS TO DELETE' as status,
  COUNT(*) as variant_count
FROM lats_product_variants v
LEFT JOIN lats_store_locations l ON v.branch_id = l.id
WHERE l.id IS NULL;

-- ================================================================================
-- STEP 1: Clean up references
-- ================================================================================

-- 1a. Delete branch transfers referencing orphaned variants
DELETE FROM branch_transfers
WHERE entity_type = 'variant'
AND entity_id IN (
  SELECT v.id
  FROM lats_product_variants v
  LEFT JOIN lats_store_locations l ON v.branch_id = l.id
  WHERE l.id IS NULL
);

SELECT '✅ Deleted branch transfers' as status;

-- 1b. Set purchase order items variant_id to NULL (preserve purchase history)
UPDATE lats_purchase_order_items
SET variant_id = NULL
WHERE variant_id IN (
  SELECT v.id
  FROM lats_product_variants v
  LEFT JOIN lats_store_locations l ON v.branch_id = l.id
  WHERE l.id IS NULL
);

SELECT '✅ Updated purchase order items' as status;

-- 1c. Set purchase order items product_id to NULL (preserve purchase history)
UPDATE lats_purchase_order_items
SET product_id = NULL
WHERE product_id IN (
  SELECT p.id
  FROM lats_products p
  LEFT JOIN lats_store_locations l ON p.branch_id = l.id
  WHERE l.id IS NULL
);

SELECT '✅ Updated purchase order items (products)' as status;

-- 1d. Set sale items product_id to NULL (preserve sales history)
UPDATE lats_sale_items
SET product_id = NULL
WHERE product_id IN (
  SELECT p.id
  FROM lats_products p
  LEFT JOIN lats_store_locations l ON p.branch_id = l.id
  WHERE l.id IS NULL
);

SELECT '✅ Updated sale items' as status;

-- 1e. Set stock movements product_id to NULL (preserve stock history)
UPDATE lats_stock_movements
SET product_id = NULL
WHERE product_id IN (
  SELECT p.id
  FROM lats_products p
  LEFT JOIN lats_store_locations l ON p.branch_id = l.id
  WHERE l.id IS NULL
);

SELECT '✅ Updated stock movements (products)' as status;

-- 1f. Set stock movements variant_id to NULL (preserve stock history)
UPDATE lats_stock_movements
SET variant_id = NULL
WHERE variant_id IN (
  SELECT v.id
  FROM lats_product_variants v
  LEFT JOIN lats_store_locations l ON v.branch_id = l.id
  WHERE l.id IS NULL
);

SELECT '✅ Updated stock movements (variants)' as status;

-- ================================================================================
-- STEP 2: Delete variants
-- ================================================================================

DELETE FROM lats_product_variants
WHERE branch_id IN (
  SELECT DISTINCT v.branch_id
  FROM lats_product_variants v
  LEFT JOIN lats_store_locations l ON v.branch_id = l.id
  WHERE l.id IS NULL
);

SELECT '✅ Deleted orphaned variants' as status;

-- ================================================================================
-- STEP 3: Delete products
-- ================================================================================

DELETE FROM lats_products
WHERE branch_id IN (
  SELECT DISTINCT p.branch_id
  FROM lats_products p
  LEFT JOIN lats_store_locations l ON p.branch_id = l.id
  WHERE l.id IS NULL
);

SELECT '✅ Deleted orphaned products' as status;

COMMIT;

-- ================================================================================
-- VERIFICATION
-- ================================================================================

SELECT 
  '✅ DELETION COMPLETE' as status,
  COUNT(*) as remaining_orphaned_products
FROM lats_products p
LEFT JOIN lats_store_locations l ON p.branch_id = l.id
WHERE l.id IS NULL;

SELECT 
  '📊 PRODUCTS BY BRANCH (After Cleanup)' as status,
  COALESCE(l.name, 'NO BRANCH') as branch_name,
  COUNT(p.id) as product_count
FROM lats_products p
LEFT JOIN lats_store_locations l ON p.branch_id = l.id
GROUP BY l.name;

SELECT '🎉 All orphaned products deleted successfully!' as final_status;

