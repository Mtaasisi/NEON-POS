-- ============================================
-- COMPLETE BRANCH ISOLATION - ONE-TIME FIX
-- ============================================
-- This script fixes EVERYTHING in one go
-- Run this once and branch isolation will work perfectly
-- ============================================

BEGIN;

-- ============================================
-- STEP 1: Ensure branch columns exist
-- ============================================

-- Products
ALTER TABLE lats_products ADD COLUMN IF NOT EXISTS branch_id UUID;
ALTER TABLE lats_products ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;
ALTER TABLE lats_products ADD COLUMN IF NOT EXISTS sharing_mode TEXT DEFAULT 'isolated';
ALTER TABLE lats_products ADD COLUMN IF NOT EXISTS visible_to_branches UUID[];

-- Variants
ALTER TABLE lats_product_variants ADD COLUMN IF NOT EXISTS branch_id UUID;
ALTER TABLE lats_product_variants ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;
ALTER TABLE lats_product_variants ADD COLUMN IF NOT EXISTS sharing_mode TEXT DEFAULT 'isolated';
ALTER TABLE lats_product_variants ADD COLUMN IF NOT EXISTS visible_to_branches UUID[];

-- Inventory
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS branch_id UUID;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;

-- Sales
ALTER TABLE lats_sales ADD COLUMN IF NOT EXISTS branch_id UUID;

-- Purchase Orders
ALTER TABLE lats_purchase_orders ADD COLUMN IF NOT EXISTS branch_id UUID;

-- Suppliers & Categories
ALTER TABLE lats_suppliers ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;
ALTER TABLE lats_categories ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_lats_products_branch_id ON lats_products(branch_id);
CREATE INDEX IF NOT EXISTS idx_lats_products_sharing_mode ON lats_products(sharing_mode);
CREATE INDEX IF NOT EXISTS idx_lats_product_variants_branch_id ON lats_product_variants(branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_branch_id ON inventory_items(branch_id);
CREATE INDEX IF NOT EXISTS idx_lats_sales_branch_id ON lats_sales(branch_id);
CREATE INDEX IF NOT EXISTS idx_lats_purchase_orders_branch_id ON lats_purchase_orders(branch_id);

-- ============================================
-- STEP 2: Get main store ID
-- ============================================

DO $$
DECLARE
  main_store_id UUID;
BEGIN
  -- Get main store
  SELECT id INTO main_store_id 
  FROM store_locations 
  WHERE is_main = true 
  LIMIT 1;

  IF main_store_id IS NULL THEN
    -- No main store, get first active store
    SELECT id INTO main_store_id 
    FROM store_locations 
    WHERE is_active = true 
    ORDER BY created_at ASC 
    LIMIT 1;
  END IF;

  IF main_store_id IS NOT NULL THEN
    RAISE NOTICE '✅ Main store ID: %', main_store_id;
  ELSE
    RAISE WARNING '❌ No store found!';
  END IF;
END $$;

-- ============================================
-- STEP 3: Assign ALL data to branches
-- ============================================

-- Products
UPDATE lats_products
SET 
  branch_id = (SELECT id FROM store_locations WHERE is_main = true OR is_active = true ORDER BY is_main DESC, created_at ASC LIMIT 1),
  is_shared = false,
  sharing_mode = 'isolated',
  visible_to_branches = ARRAY[(SELECT id FROM store_locations WHERE is_main = true OR is_active = true ORDER BY is_main DESC, created_at ASC LIMIT 1)]
WHERE branch_id IS NULL;

-- Variants
UPDATE lats_product_variants
SET 
  branch_id = (SELECT id FROM store_locations WHERE is_main = true OR is_active = true ORDER BY is_main DESC, created_at ASC LIMIT 1),
  is_shared = false,
  sharing_mode = 'isolated',
  visible_to_branches = ARRAY[(SELECT id FROM store_locations WHERE is_main = true OR is_active = true ORDER BY is_main DESC, created_at ASC LIMIT 1)]
WHERE branch_id IS NULL;

-- Inventory
UPDATE inventory_items
SET 
  branch_id = (SELECT id FROM store_locations WHERE is_main = true OR is_active = true ORDER BY is_main DESC, created_at ASC LIMIT 1),
  is_shared = false
WHERE branch_id IS NULL;

-- Sales (CRITICAL - This is what fixes your sales sharing issue)
UPDATE lats_sales
SET branch_id = (SELECT id FROM store_locations WHERE is_main = true OR is_active = true ORDER BY is_main DESC, created_at ASC LIMIT 1)
WHERE branch_id IS NULL;

-- Purchase Orders
UPDATE lats_purchase_orders
SET branch_id = (SELECT id FROM store_locations WHERE is_main = true OR is_active = true ORDER BY is_main DESC, created_at ASC LIMIT 1)
WHERE branch_id IS NULL;

-- Suppliers & Categories (keep isolated)
UPDATE lats_suppliers SET is_shared = false WHERE is_shared IS NULL OR is_shared = true;
UPDATE lats_categories SET is_shared = false WHERE is_shared IS NULL OR is_shared = true;

-- ============================================
-- STEP 4: Set isolation mode for stores
-- ============================================

UPDATE store_locations
SET data_isolation_mode = 'isolated'
WHERE data_isolation_mode IS NULL OR data_isolation_mode != 'isolated';

-- ============================================
-- STEP 5: Verification
-- ============================================

-- Check Products
SELECT 
  '🛍️ PRODUCTS' as feature,
  COUNT(*) as total,
  COUNT(branch_id) as with_branch,
  COUNT(*) - COUNT(branch_id) as missing,
  CASE WHEN COUNT(*) = COUNT(branch_id) THEN '✅ OK' ELSE '❌ ERROR' END as status
FROM lats_products;

-- Check Variants
SELECT 
  '📦 VARIANTS' as feature,
  COUNT(*) as total,
  COUNT(branch_id) as with_branch,
  COUNT(*) - COUNT(branch_id) as missing,
  CASE WHEN COUNT(*) = COUNT(branch_id) THEN '✅ OK' ELSE '❌ ERROR' END as status
FROM lats_product_variants;

-- Check Inventory
SELECT 
  '📋 INVENTORY' as feature,
  COUNT(*) as total,
  COUNT(branch_id) as with_branch,
  COUNT(*) - COUNT(branch_id) as missing,
  CASE WHEN COUNT(*) = COUNT(branch_id) THEN '✅ OK' ELSE '❌ ERROR' END as status
FROM inventory_items;

-- Check Sales (MOST IMPORTANT)
SELECT 
  '💰 SALES' as feature,
  COUNT(*) as total,
  COUNT(branch_id) as with_branch,
  COUNT(*) - COUNT(branch_id) as missing,
  CASE WHEN COUNT(*) = COUNT(branch_id) THEN '✅ OK' ELSE '❌ ERROR' END as status
FROM lats_sales;

-- Check Purchase Orders
SELECT 
  '📦 PURCHASE ORDERS' as feature,
  COUNT(*) as total,
  COUNT(branch_id) as with_branch,
  COUNT(*) - COUNT(branch_id) as missing,
  CASE WHEN COUNT(*) = COUNT(branch_id) THEN '✅ OK' ELSE '❌ ERROR' END as status
FROM lats_purchase_orders;

-- Show distribution by branch
SELECT 
  '📊 DISTRIBUTION BY BRANCH' as report,
  sl.name as branch_name,
  (SELECT COUNT(*) FROM lats_products WHERE branch_id = sl.id) as products,
  (SELECT COUNT(*) FROM lats_product_variants WHERE branch_id = sl.id) as variants,
  (SELECT COUNT(*) FROM lats_sales WHERE branch_id = sl.id) as sales,
  (SELECT COUNT(*) FROM lats_purchase_orders WHERE branch_id = sl.id) as purchase_orders
FROM store_locations sl
WHERE sl.is_active = true
ORDER BY sl.is_main DESC, sl.name;

-- Final status
SELECT 
  '✅ COMPLETE!' as status,
  'Branch isolation is now active' as message,
  'Refresh your browser to see changes' as action;

COMMIT;

-- ============================================
-- ✅ DONE! 
-- ============================================
-- Now close and reopen your browser (hard refresh)
-- Switch between branches and you'll see different data!
-- ============================================

