-- ============================================
-- FLEXIBLE BRANCH CONTROL FOR ADMIN
-- ============================================
-- Allows admin to choose what each branch sees
-- ============================================

-- 1. Add branch assignment columns for flexible control
ALTER TABLE lats_products 
ADD COLUMN IF NOT EXISTS visible_to_branches UUID[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sharing_mode TEXT DEFAULT 'isolated' CHECK (sharing_mode IN ('isolated', 'shared', 'custom'));

ALTER TABLE lats_product_variants 
ADD COLUMN IF NOT EXISTS visible_to_branches UUID[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sharing_mode TEXT DEFAULT 'isolated' CHECK (sharing_mode IN ('isolated', 'shared', 'custom'));

ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS visible_to_branches UUID[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sharing_mode TEXT DEFAULT 'isolated' CHECK (sharing_mode IN ('isolated', 'shared', 'custom'));

-- Add to customers if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
    ALTER TABLE customers 
    ADD COLUMN IF NOT EXISTS visible_to_branches UUID[] DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS sharing_mode TEXT DEFAULT 'isolated' CHECK (sharing_mode IN ('isolated', 'shared', 'custom'));
  END IF;
END $$;

-- 2. Create indexes for array lookups
CREATE INDEX IF NOT EXISTS idx_products_visible_branches ON lats_products USING GIN(visible_to_branches);
CREATE INDEX IF NOT EXISTS idx_variants_visible_branches ON lats_product_variants USING GIN(visible_to_branches);
CREATE INDEX IF NOT EXISTS idx_inventory_visible_branches ON inventory_items USING GIN(visible_to_branches);

-- 3. Set default sharing modes based on current isolation
UPDATE lats_products 
SET sharing_mode = CASE 
  WHEN is_shared = true THEN 'shared'
  ELSE 'isolated'
END
WHERE sharing_mode IS NULL;

UPDATE lats_product_variants 
SET sharing_mode = CASE 
  WHEN is_shared = true THEN 'shared'
  ELSE 'isolated'
END
WHERE sharing_mode IS NULL;

-- 4. For isolated items, set visible_to_branches to their own branch
UPDATE lats_products 
SET visible_to_branches = ARRAY[branch_id]
WHERE sharing_mode = 'isolated' 
  AND branch_id IS NOT NULL 
  AND visible_to_branches IS NULL;

UPDATE lats_product_variants 
SET visible_to_branches = ARRAY[branch_id]
WHERE sharing_mode = 'isolated' 
  AND branch_id IS NOT NULL 
  AND visible_to_branches IS NULL;

-- 5. For shared items, set visible_to_branches to all active branches
UPDATE lats_products 
SET visible_to_branches = (
  SELECT ARRAY_AGG(id) FROM store_locations WHERE is_active = true
)
WHERE sharing_mode = 'shared' 
  AND visible_to_branches IS NULL;

UPDATE lats_product_variants 
SET visible_to_branches = (
  SELECT ARRAY_AGG(id) FROM store_locations WHERE is_active = true
)
WHERE sharing_mode = 'shared' 
  AND visible_to_branches IS NULL;

-- 6. Create helper function to check branch visibility
CREATE OR REPLACE FUNCTION is_visible_to_branch(
  item_branch_id UUID,
  item_visible_branches UUID[],
  item_sharing_mode TEXT,
  check_branch_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- If no branch specified, show everything
  IF check_branch_id IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Shared mode - visible to all
  IF item_sharing_mode = 'shared' THEN
    RETURN TRUE;
  END IF;
  
  -- Isolated mode - only visible to owner branch
  IF item_sharing_mode = 'isolated' THEN
    RETURN item_branch_id = check_branch_id;
  END IF;
  
  -- Custom mode - check array
  IF item_sharing_mode = 'custom' AND item_visible_branches IS NOT NULL THEN
    RETURN check_branch_id = ANY(item_visible_branches);
  END IF;
  
  -- Default: only visible to owner branch
  RETURN item_branch_id = check_branch_id;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 7. Add comments
COMMENT ON COLUMN lats_products.visible_to_branches IS 'Array of branch IDs that can see this product';
COMMENT ON COLUMN lats_products.sharing_mode IS 'isolated: only owner branch, shared: all branches, custom: specific branches';
COMMENT ON COLUMN lats_product_variants.visible_to_branches IS 'Array of branch IDs that can see this variant';
COMMENT ON COLUMN lats_product_variants.sharing_mode IS 'isolated: only owner branch, shared: all branches, custom: specific branches';

-- 8. Verify setup
SELECT 
  '✅ FLEXIBLE BRANCH CONTROL ENABLED!' as status,
  'Admin can now choose which branches see each item' as feature;

-- Show sharing modes distribution
SELECT 
  sharing_mode,
  COUNT(*) as product_count
FROM lats_products
GROUP BY sharing_mode;

-- Show example products with their branch visibility
SELECT 
  name,
  sharing_mode,
  (SELECT name FROM store_locations WHERE id = lats_products.branch_id) as owner_branch,
  ARRAY(
    SELECT name FROM store_locations WHERE id = ANY(visible_to_branches)
  ) as visible_to_branch_names
FROM lats_products
LIMIT 5;

