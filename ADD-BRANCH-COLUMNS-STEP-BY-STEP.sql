-- ============================================
-- ADD BRANCH COLUMNS - STEP BY STEP VERSION
-- ============================================
-- Copy and paste each section ONE AT A TIME
-- Wait for each to complete before running the next
-- ============================================

-- STEP 1: Add columns to lats_products
-- Copy and run this entire section:

ALTER TABLE lats_products 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES store_locations(id) ON DELETE SET NULL;

ALTER TABLE lats_products 
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_lats_products_branch_id ON lats_products(branch_id);
CREATE INDEX IF NOT EXISTS idx_lats_products_is_shared ON lats_products(is_shared);

-- ✅ STEP 1 COMPLETE! Proceed to STEP 2


-- STEP 2: Add columns to lats_product_variants
-- Copy and run this entire section:

ALTER TABLE lats_product_variants 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES store_locations(id) ON DELETE SET NULL;

ALTER TABLE lats_product_variants 
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_lats_product_variants_branch_id ON lats_product_variants(branch_id);
CREATE INDEX IF NOT EXISTS idx_lats_product_variants_is_shared ON lats_product_variants(is_shared);

-- ✅ STEP 2 COMPLETE! Proceed to STEP 3


-- STEP 3: Add columns to inventory_items
-- Copy and run this entire section:

ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES store_locations(id) ON DELETE SET NULL;

ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_inventory_items_branch_id ON inventory_items(branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_is_shared ON inventory_items(is_shared);

-- ✅ STEP 3 COMPLETE! Proceed to STEP 4


-- STEP 4: Add columns to lats_sales
-- Copy and run this entire section:

ALTER TABLE lats_sales 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES store_locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lats_sales_branch_id ON lats_sales(branch_id);

-- ✅ STEP 4 COMPLETE! Proceed to STEP 5


-- STEP 5: Add columns to lats_purchase_orders
-- Copy and run this entire section:

ALTER TABLE lats_purchase_orders 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES store_locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lats_purchase_orders_branch_id ON lats_purchase_orders(branch_id);

-- ✅ STEP 5 COMPLETE! Proceed to STEP 6


-- STEP 6: Add columns to lats_suppliers
-- Copy and run this entire section:

ALTER TABLE lats_suppliers 
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT true;

-- ✅ STEP 6 COMPLETE! Proceed to STEP 7


-- STEP 7: Add columns to lats_categories
-- Copy and run this entire section:

ALTER TABLE lats_categories 
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT true;

-- ✅ STEP 7 COMPLETE! Proceed to STEP 8


-- STEP 8: Set all existing data to main store and make shared
-- Copy and run this entire section:

UPDATE lats_products 
SET 
  branch_id = (SELECT id FROM store_locations WHERE is_main = true LIMIT 1),
  is_shared = true
WHERE branch_id IS NULL;

UPDATE lats_product_variants 
SET 
  branch_id = (SELECT id FROM store_locations WHERE is_main = true LIMIT 1),
  is_shared = true
WHERE branch_id IS NULL;

UPDATE inventory_items 
SET branch_id = (SELECT id FROM store_locations WHERE is_main = true LIMIT 1)
WHERE branch_id IS NULL;

UPDATE lats_sales 
SET branch_id = (SELECT id FROM store_locations WHERE is_main = true LIMIT 1)
WHERE branch_id IS NULL;

UPDATE lats_purchase_orders 
SET branch_id = (SELECT id FROM store_locations WHERE is_main = true LIMIT 1)
WHERE branch_id IS NULL;

-- ✅ STEP 8 COMPLETE! All done!


-- STEP 9: Verify everything worked
-- Copy and run this to see what was added:

SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE column_name IN ('branch_id', 'is_shared')
  AND table_schema = 'public'
  AND table_name LIKE 'lats_%'
ORDER BY table_name, column_name;

-- ✅ You should see branch_id and is_shared columns in multiple tables!

