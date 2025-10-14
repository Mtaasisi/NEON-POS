-- ============================================
-- FIX PRODUCTS LOADING ERROR
-- ============================================
-- This script adds missing columns that the code expects
-- ============================================

BEGIN;

-- 1. Add branch assignment columns for flexible control
ALTER TABLE lats_products 
ADD COLUMN IF NOT EXISTS visible_to_branches UUID[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sharing_mode TEXT DEFAULT 'shared' CHECK (sharing_mode IN ('isolated', 'shared', 'custom'));

ALTER TABLE lats_product_variants 
ADD COLUMN IF NOT EXISTS visible_to_branches UUID[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sharing_mode TEXT DEFAULT 'shared' CHECK (sharing_mode IN ('isolated', 'shared', 'custom'));

-- 2. Create indexes for array lookups
CREATE INDEX IF NOT EXISTS idx_products_visible_branches ON lats_products USING GIN(visible_to_branches);
CREATE INDEX IF NOT EXISTS idx_variants_visible_branches ON lats_product_variants USING GIN(visible_to_branches);
CREATE INDEX IF NOT EXISTS idx_products_sharing_mode ON lats_products(sharing_mode);
CREATE INDEX IF NOT EXISTS idx_variants_sharing_mode ON lats_product_variants(sharing_mode);

-- 3. Set default sharing mode to 'shared' for all existing products
-- This makes all products visible to all branches by default
UPDATE lats_products 
SET sharing_mode = 'shared'
WHERE sharing_mode IS NULL;

UPDATE lats_product_variants 
SET sharing_mode = 'shared'
WHERE sharing_mode IS NULL;

-- 4. For products with is_shared = false, set them to isolated mode
UPDATE lats_products 
SET sharing_mode = 'isolated',
    visible_to_branches = CASE 
        WHEN branch_id IS NOT NULL THEN ARRAY[branch_id]
        ELSE NULL
    END
WHERE is_shared = false;

UPDATE lats_product_variants 
SET sharing_mode = 'isolated',
    visible_to_branches = CASE 
        WHEN branch_id IS NOT NULL THEN ARRAY[branch_id]
        ELSE NULL
    END
WHERE is_shared = false;

-- 5. Add comments
COMMENT ON COLUMN lats_products.visible_to_branches IS 'Array of branch IDs that can see this product (NULL means all)';
COMMENT ON COLUMN lats_products.sharing_mode IS 'isolated: only owner branch, shared: all branches, custom: specific branches';
COMMENT ON COLUMN lats_product_variants.visible_to_branches IS 'Array of branch IDs that can see this variant (NULL means all)';
COMMENT ON COLUMN lats_product_variants.sharing_mode IS 'isolated: only owner branch, shared: all branches, custom: specific branches';

COMMIT;

-- 6. Verify setup
SELECT 
  '✅ PRODUCTS LOADING ERROR FIXED!' as status,
  'All products now have sharing_mode column' as result;

-- Show sharing modes distribution
SELECT 
  '📊 Products by sharing mode:' as info;

SELECT 
  sharing_mode,
  COUNT(*) as product_count
FROM lats_products
GROUP BY sharing_mode
ORDER BY product_count DESC;

-- Show branch distribution
SELECT 
  '📍 Products by branch:' as info;

SELECT 
  COALESCE(sl.name, 'No Branch') as branch_name,
  COUNT(*) as product_count,
  COUNT(CASE WHEN sharing_mode = 'shared' THEN 1 END) as shared_count,
  COUNT(CASE WHEN sharing_mode = 'isolated' THEN 1 END) as isolated_count
FROM lats_products p
LEFT JOIN store_locations sl ON p.branch_id = sl.id
GROUP BY sl.name
ORDER BY product_count DESC;

SELECT '✅ Please refresh your browser now!' as action;

