-- ============================================
-- COMPLETE BRANCH ISOLATION - ALL FEATURES
-- ============================================
-- This adds branch columns to ALL remaining tables
-- Run this AFTER the initial migration
-- ============================================

-- 1. Add branch_id to customers (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
    -- Add columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'branch_id') THEN
      ALTER TABLE customers ADD COLUMN branch_id UUID;
      RAISE NOTICE '✅ Added branch_id to customers';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'is_shared') THEN
      ALTER TABLE customers ADD COLUMN is_shared BOOLEAN DEFAULT false;
      RAISE NOTICE '✅ Added is_shared to customers';
    END IF;
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_customers_branch_id ON customers(branch_id);
    CREATE INDEX IF NOT EXISTS idx_customers_is_shared ON customers(is_shared);
    
    -- Assign existing customers to main store with is_shared = false
    UPDATE customers
    SET 
      branch_id = (SELECT id FROM store_locations WHERE is_main = true LIMIT 1),
      is_shared = false
    WHERE branch_id IS NULL;
    
    RAISE NOTICE '✅ Customers configured for isolation';
  END IF;
END $$;

-- 2. Make sure sales have branch_id and NOT shared
UPDATE lats_sales
SET branch_id = (SELECT id FROM store_locations WHERE is_main = true LIMIT 1)
WHERE branch_id IS NULL;

-- 3. Make sure purchase orders have branch_id and NOT shared
UPDATE lats_purchase_orders
SET branch_id = (SELECT id FROM store_locations WHERE is_main = true LIMIT 1)
WHERE branch_id IS NULL;

-- 4. Make sure ALL existing data is NOT shared (complete isolation)
UPDATE lats_products SET is_shared = false WHERE is_shared IS NULL OR is_shared = true;
UPDATE lats_product_variants SET is_shared = false WHERE is_shared IS NULL OR is_shared = true;
UPDATE inventory_items SET is_shared = false WHERE is_shared IS NULL OR is_shared = true;
UPDATE lats_suppliers SET is_shared = false WHERE is_shared IS NULL OR is_shared = true;
UPDATE lats_categories SET is_shared = false WHERE is_shared IS NULL OR is_shared = true;

-- 5. Verify complete isolation
SELECT 
  '🔒 COMPLETE ISOLATION ACTIVE!' as status,
  COUNT(*) as total_tables_with_branch_columns
FROM (
  SELECT DISTINCT table_name
  FROM information_schema.columns
  WHERE column_name IN ('branch_id', 'is_shared')
    AND table_schema = 'public'
) subquery;

-- Show isolation status
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE column_name IN ('branch_id', 'is_shared')
  AND table_schema = 'public'
ORDER BY table_name, column_name;

-- Verify no shared data exists
SELECT 
  '📊 ISOLATION VERIFICATION' as check_type,
  (SELECT COUNT(*) FROM lats_products WHERE is_shared = true) as shared_products,
  (SELECT COUNT(*) FROM lats_product_variants WHERE is_shared = true) as shared_variants,
  (SELECT COUNT(*) FROM inventory_items WHERE is_shared = true) as shared_inventory,
  (SELECT COUNT(*) FROM lats_suppliers WHERE is_shared = true) as shared_suppliers,
  (SELECT COUNT(*) FROM lats_categories WHERE is_shared = true) as shared_categories;

-- Should all be 0 for complete isolation!

