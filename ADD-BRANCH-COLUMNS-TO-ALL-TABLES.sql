-- ============================================
-- ADD BRANCH COLUMNS TO ALL TABLES FOR MULTI-BRANCH SUPPORT
-- ============================================
-- This adds branch_id and is_shared columns to all relevant tables
-- to enable proper branch data isolation
-- ============================================

-- ============================================
-- 1. ADD BRANCH COLUMNS TO PRODUCTS
-- ============================================

-- Add branch_id to lats_products
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_products' AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE lats_products 
    ADD COLUMN branch_id UUID REFERENCES store_locations(id) ON DELETE SET NULL;
    
    RAISE NOTICE '✅ Added branch_id to lats_products';
  ELSE
    RAISE NOTICE '✔️ branch_id already exists in lats_products';
  END IF;
END $$;

-- Add is_shared to lats_products
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_products' AND column_name = 'is_shared'
  ) THEN
    ALTER TABLE lats_products 
    ADD COLUMN is_shared BOOLEAN DEFAULT true;
    
    RAISE NOTICE '✅ Added is_shared to lats_products';
  ELSE
    RAISE NOTICE '✔️ is_shared already exists in lats_products';
  END IF;
END $$;

-- Create index for branch filtering
CREATE INDEX IF NOT EXISTS idx_lats_products_branch_id ON lats_products(branch_id);
CREATE INDEX IF NOT EXISTS idx_lats_products_is_shared ON lats_products(is_shared);


-- ============================================
-- 2. ADD BRANCH COLUMNS TO PRODUCT VARIANTS
-- ============================================

-- Add branch_id to lats_product_variants
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_product_variants' AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE lats_product_variants 
    ADD COLUMN branch_id UUID REFERENCES store_locations(id) ON DELETE SET NULL;
    
    RAISE NOTICE '✅ Added branch_id to lats_product_variants';
  ELSE
    RAISE NOTICE '✔️ branch_id already exists in lats_product_variants';
  END IF;
END $$;

-- Add is_shared to lats_product_variants
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_product_variants' AND column_name = 'is_shared'
  ) THEN
    ALTER TABLE lats_product_variants 
    ADD COLUMN is_shared BOOLEAN DEFAULT true;
    
    RAISE NOTICE '✅ Added is_shared to lats_product_variants';
  ELSE
    RAISE NOTICE '✔️ is_shared already exists in lats_product_variants';
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_lats_product_variants_branch_id ON lats_product_variants(branch_id);
CREATE INDEX IF NOT EXISTS idx_lats_product_variants_is_shared ON lats_product_variants(is_shared);


-- ============================================
-- 3. ADD BRANCH COLUMNS TO INVENTORY ITEMS
-- ============================================

-- Add branch_id to inventory_items
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory_items' AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE inventory_items 
    ADD COLUMN branch_id UUID REFERENCES store_locations(id) ON DELETE SET NULL;
    
    RAISE NOTICE '✅ Added branch_id to inventory_items';
  ELSE
    RAISE NOTICE '✔️ branch_id already exists in inventory_items';
  END IF;
END $$;

-- Add is_shared to inventory_items
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory_items' AND column_name = 'is_shared'
  ) THEN
    ALTER TABLE inventory_items 
    ADD COLUMN is_shared BOOLEAN DEFAULT false;
    
    RAISE NOTICE '✅ Added is_shared to inventory_items';
  ELSE
    RAISE NOTICE '✔️ is_shared already exists in inventory_items';
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_inventory_items_branch_id ON inventory_items(branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_is_shared ON inventory_items(is_shared);


-- ============================================
-- 4. ADD BRANCH COLUMNS TO CUSTOMERS
-- ============================================

-- Add branch_id to customers (check if table exists first)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'customers'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'customers' AND column_name = 'branch_id'
    ) THEN
      ALTER TABLE customers 
      ADD COLUMN branch_id UUID REFERENCES store_locations(id) ON DELETE SET NULL;
      
      RAISE NOTICE '✅ Added branch_id to customers';
    ELSE
      RAISE NOTICE '✔️ branch_id already exists in customers';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ customers table does not exist, skipping';
  END IF;
END $$;

-- Add is_shared to customers
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'customers'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'customers' AND column_name = 'is_shared'
    ) THEN
      ALTER TABLE customers 
      ADD COLUMN is_shared BOOLEAN DEFAULT true;
      
      RAISE NOTICE '✅ Added is_shared to customers';
    ELSE
      RAISE NOTICE '✔️ is_shared already exists in customers';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ customers table does not exist, skipping';
  END IF;
END $$;

-- Create indexes (only if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'customers'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_customers_branch_id ON customers(branch_id);
    CREATE INDEX IF NOT EXISTS idx_customers_is_shared ON customers(is_shared);
    RAISE NOTICE '✅ Created indexes on customers';
  END IF;
END $$;


-- ============================================
-- 5. ADD BRANCH COLUMNS TO SALES
-- ============================================

-- Add branch_id to lats_sales
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_sales' AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE lats_sales 
    ADD COLUMN branch_id UUID REFERENCES store_locations(id) ON DELETE SET NULL;
    
    RAISE NOTICE '✅ Added branch_id to lats_sales';
  ELSE
    RAISE NOTICE '✔️ branch_id already exists in lats_sales';
  END IF;
END $$;

-- Create index
CREATE INDEX IF NOT EXISTS idx_lats_sales_branch_id ON lats_sales(branch_id);


-- ============================================
-- 6. ADD BRANCH COLUMNS TO PURCHASE ORDERS
-- ============================================

-- Add branch_id to lats_purchase_orders
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_purchase_orders' AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE lats_purchase_orders 
    ADD COLUMN branch_id UUID REFERENCES store_locations(id) ON DELETE SET NULL;
    
    RAISE NOTICE '✅ Added branch_id to lats_purchase_orders';
  ELSE
    RAISE NOTICE '✔️ branch_id already exists in lats_purchase_orders';
  END IF;
END $$;

-- Create index
CREATE INDEX IF NOT EXISTS idx_lats_purchase_orders_branch_id ON lats_purchase_orders(branch_id);


-- ============================================
-- 7. ADD BRANCH COLUMNS TO SUPPLIERS
-- ============================================

-- Add is_shared to lats_suppliers (suppliers are typically shared)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_suppliers' AND column_name = 'is_shared'
  ) THEN
    ALTER TABLE lats_suppliers 
    ADD COLUMN is_shared BOOLEAN DEFAULT true;
    
    RAISE NOTICE '✅ Added is_shared to lats_suppliers';
  ELSE
    RAISE NOTICE '✔️ is_shared already exists in lats_suppliers';
  END IF;
END $$;


-- ============================================
-- 8. ADD BRANCH COLUMNS TO CATEGORIES
-- ============================================

-- Add is_shared to lats_categories (categories are typically shared)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_categories' AND column_name = 'is_shared'
  ) THEN
    ALTER TABLE lats_categories 
    ADD COLUMN is_shared BOOLEAN DEFAULT true;
    
    RAISE NOTICE '✅ Added is_shared to lats_categories';
  ELSE
    RAISE NOTICE '✔️ is_shared already exists in lats_categories';
  END IF;
END $$;


-- ============================================
-- 9. ADD BRANCH COLUMNS TO EMPLOYEES
-- ============================================

-- Add branch_id to employees (if table exists)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'employees'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'employees' AND column_name = 'branch_id'
    ) THEN
      ALTER TABLE employees 
      ADD COLUMN branch_id UUID REFERENCES store_locations(id) ON DELETE SET NULL;
      
      RAISE NOTICE '✅ Added branch_id to employees';
    ELSE
      RAISE NOTICE '✔️ branch_id already exists in employees';
    END IF;
  END IF;
END $$;


-- ============================================
-- 10. SET DEFAULT BRANCH FOR EXISTING DATA
-- ============================================

-- Get the main store ID
DO $$
DECLARE
  main_store_id UUID;
BEGIN
  -- Get the main store (or first store if no main store exists)
  SELECT id INTO main_store_id 
  FROM store_locations 
  WHERE is_main = true OR is_active = true
  ORDER BY is_main DESC, created_at ASC
  LIMIT 1;

  IF main_store_id IS NOT NULL THEN
    -- Update existing products to belong to main store
    UPDATE lats_products 
    SET branch_id = main_store_id 
    WHERE branch_id IS NULL;
    
    RAISE NOTICE '✅ Assigned existing products to main store';

    -- Update existing product variants to belong to main store
    UPDATE lats_product_variants 
    SET branch_id = main_store_id 
    WHERE branch_id IS NULL;
    
    RAISE NOTICE '✅ Assigned existing variants to main store';

    -- Update existing inventory items to belong to main store
    UPDATE inventory_items 
    SET branch_id = main_store_id 
    WHERE branch_id IS NULL;
    
    RAISE NOTICE '✅ Assigned existing inventory items to main store';

    -- Update existing customers to belong to main store (if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
      UPDATE customers 
      SET branch_id = main_store_id 
      WHERE branch_id IS NULL;
      
      RAISE NOTICE '✅ Assigned existing customers to main store';
    END IF;

    -- Update existing sales to belong to main store
    UPDATE lats_sales 
    SET branch_id = main_store_id 
    WHERE branch_id IS NULL;
    
    RAISE NOTICE '✅ Assigned existing sales to main store';

    -- Update existing purchase orders to belong to main store
    UPDATE lats_purchase_orders 
    SET branch_id = main_store_id 
    WHERE branch_id IS NULL;
    
    RAISE NOTICE '✅ Assigned existing purchase orders to main store';

  ELSE
    RAISE WARNING '⚠️ No store found! Please create a store first.';
  END IF;
END $$;


-- ============================================
-- 11. ADD COMMENTS
-- ============================================

COMMENT ON COLUMN lats_products.branch_id IS 'Branch/store where this product is primarily managed';
COMMENT ON COLUMN lats_products.is_shared IS 'If true, product is visible to all branches';
COMMENT ON COLUMN lats_product_variants.branch_id IS 'Branch/store where this variant stock is located';
COMMENT ON COLUMN lats_product_variants.is_shared IS 'If true, variant is visible to all branches';
COMMENT ON COLUMN inventory_items.branch_id IS 'Branch/store where this item is physically located';
COMMENT ON COLUMN inventory_items.is_shared IS 'If true, item can be transferred between branches';
-- Add comments for customers (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
    COMMENT ON COLUMN customers.branch_id IS 'Primary branch where customer was registered';
    COMMENT ON COLUMN customers.is_shared IS 'If true, customer is visible to all branches';
  END IF;
END $$;
COMMENT ON COLUMN lats_sales.branch_id IS 'Branch where this sale was made';
COMMENT ON COLUMN lats_purchase_orders.branch_id IS 'Branch receiving this purchase order';


-- ============================================
-- 12. VERIFICATION
-- ============================================

-- Show updated table structures
SELECT 
  '📊 BRANCH COLUMNS VERIFICATION' as status,
  table_name,
  column_name,
  data_type,
  CASE 
    WHEN column_name = 'branch_id' THEN '🏪'
    WHEN column_name = 'is_shared' THEN '🌐'
    ELSE ''
  END as icon
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name IN ('branch_id', 'is_shared')
  AND table_name LIKE 'lats_%' OR table_name IN ('inventory_items', 'employees')
ORDER BY table_name, column_name;


-- ============================================
-- ✅ COMPLETE!
-- ============================================

SELECT '✅ Branch columns added to all tables successfully!' as final_status;

