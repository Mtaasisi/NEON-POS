-- ============================================
-- ADD BRANCH COLUMNS - SIMPLIFIED VERSION
-- ============================================
-- Run this if the complex version has syntax errors
-- ============================================

-- 1. Add branch_id to lats_products
ALTER TABLE lats_products 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES store_locations(id) ON DELETE SET NULL;

ALTER TABLE lats_products 
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_lats_products_branch_id ON lats_products(branch_id);
CREATE INDEX IF NOT EXISTS idx_lats_products_is_shared ON lats_products(is_shared);

-- 2. Add branch_id to lats_product_variants
ALTER TABLE lats_product_variants 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES store_locations(id) ON DELETE SET NULL;

ALTER TABLE lats_product_variants 
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_lats_product_variants_branch_id ON lats_product_variants(branch_id);
CREATE INDEX IF NOT EXISTS idx_lats_product_variants_is_shared ON lats_product_variants(is_shared);

-- 3. Add branch_id to inventory_items
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES store_locations(id) ON DELETE SET NULL;

ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_inventory_items_branch_id ON inventory_items(branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_is_shared ON inventory_items(is_shared);

-- 4. Add branch_id to customers (skip if table doesn't exist)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES store_locations(id) ON DELETE SET NULL;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT true;
    CREATE INDEX IF NOT EXISTS idx_customers_branch_id ON customers(branch_id);
    CREATE INDEX IF NOT EXISTS idx_customers_is_shared ON customers(is_shared);
  END IF;
END $$;

-- 5. Add branch_id to lats_sales
ALTER TABLE lats_sales 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES store_locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lats_sales_branch_id ON lats_sales(branch_id);

-- 6. Add branch_id to lats_purchase_orders
ALTER TABLE lats_purchase_orders 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES store_locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lats_purchase_orders_branch_id ON lats_purchase_orders(branch_id);

-- 7. Add is_shared to lats_suppliers
ALTER TABLE lats_suppliers 
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT true;

-- 8. Add is_shared to lats_categories
ALTER TABLE lats_categories 
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT true;

-- 9. Add branch_id to employees (skip if table doesn't exist)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') THEN
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES store_locations(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_employees_branch_id ON employees(branch_id);
  END IF;
END $$;

-- 10. Assign existing data to main store
DO $$
DECLARE
  main_store_id UUID;
BEGIN
  -- Get the main store ID
  SELECT id INTO main_store_id 
  FROM store_locations 
  WHERE is_main = true OR is_active = true
  ORDER BY is_main DESC, created_at ASC
  LIMIT 1;

  IF main_store_id IS NOT NULL THEN
    -- Update products
    UPDATE lats_products 
    SET branch_id = main_store_id,
        is_shared = true  -- Make existing products shared by default
    WHERE branch_id IS NULL;
    
    -- Update variants
    UPDATE lats_product_variants 
    SET branch_id = main_store_id,
        is_shared = true
    WHERE branch_id IS NULL;
    
    -- Update inventory items
    UPDATE inventory_items 
    SET branch_id = main_store_id 
    WHERE branch_id IS NULL;
    
    -- Update customers (if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
      UPDATE customers 
      SET branch_id = main_store_id,
          is_shared = true  -- Make customers shared by default
      WHERE branch_id IS NULL;
    END IF;
    
    -- Update sales
    UPDATE lats_sales 
    SET branch_id = main_store_id 
    WHERE branch_id IS NULL;
    
    -- Update purchase orders
    UPDATE lats_purchase_orders 
    SET branch_id = main_store_id 
    WHERE branch_id IS NULL;
    
    -- Update employees (if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') THEN
      UPDATE employees 
      SET branch_id = main_store_id 
      WHERE branch_id IS NULL;
    END IF;
    
    RAISE NOTICE '✅ Assigned all existing data to main store: %', main_store_id;
  ELSE
    RAISE WARNING '⚠️ No store found! Please create a store first.';
  END IF;
END $$;

-- Verify the changes
SELECT 
  '✅ BRANCH COLUMNS ADDED' as status,
  table_name,
  column_name
FROM information_schema.columns
WHERE column_name IN ('branch_id', 'is_shared')
  AND table_schema = 'public'
ORDER BY table_name, column_name;

