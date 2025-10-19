-- ============================================================================
-- 🔧 FIX DATA SHARING MIGRATION
-- ============================================================================
-- Date: October 19, 2025
-- Purpose: Add is_shared column to enable proper data sharing between branches
-- Issue: Data sharing toggles save but don't affect actual data visibility
-- ============================================================================

-- ============================================================================
-- STEP 1: Add is_shared column to all relevant tables
-- ============================================================================

-- Products
ALTER TABLE lats_products 
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;

COMMENT ON COLUMN lats_products.is_shared IS 
'When true, this product is visible to all branches regardless of branch_id';

-- Product Variants (inherit from parent product)
ALTER TABLE lats_product_variants 
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;

COMMENT ON COLUMN lats_product_variants.is_shared IS 
'When true, this variant is visible to all branches regardless of branch_id';

-- Customers
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;

COMMENT ON COLUMN customers.is_shared IS 
'When true, this customer is visible to all branches regardless of branch_id';

-- Categories
ALTER TABLE lats_categories 
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;

COMMENT ON COLUMN lats_categories.is_shared IS 
'When true, this category is visible to all branches regardless of branch_id';

-- Suppliers
ALTER TABLE lats_suppliers 
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;

COMMENT ON COLUMN lats_suppliers.is_shared IS 
'When true, this supplier is visible to all branches regardless of branch_id';

-- Employees
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;

COMMENT ON COLUMN employees.is_shared IS 
'When true, this employee is visible to all branches (can_work_at_all_branches)';

-- ============================================================================
-- STEP 2: Create function to sync is_shared based on branch settings
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_product_sharing()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update products based on their branch's share_products setting
  UPDATE lats_products p
  SET is_shared = s.share_products
  FROM store_locations s
  WHERE p.branch_id = s.id
    AND p.branch_id IS NOT NULL;

  -- Update variants to match their parent product
  UPDATE lats_product_variants v
  SET is_shared = p.is_shared
  FROM lats_products p
  WHERE v.product_id = p.id;

  RAISE NOTICE 'Product sharing synced successfully';
END;
$$;

CREATE OR REPLACE FUNCTION sync_customer_sharing()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update customers based on their branch's share_customers setting
  UPDATE customers c
  SET is_shared = s.share_customers
  FROM store_locations s
  WHERE c.branch_id = s.id
    AND c.branch_id IS NOT NULL;

  RAISE NOTICE 'Customer sharing synced successfully';
END;
$$;

CREATE OR REPLACE FUNCTION sync_category_sharing()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update categories based on their branch's share_categories setting
  UPDATE lats_categories c
  SET is_shared = s.share_categories
  FROM store_locations s
  WHERE c.branch_id = s.id
    AND c.branch_id IS NOT NULL;

  RAISE NOTICE 'Category sharing synced successfully';
END;
$$;

CREATE OR REPLACE FUNCTION sync_supplier_sharing()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update suppliers based on their branch's share_suppliers setting
  UPDATE lats_suppliers sp
  SET is_shared = s.share_suppliers
  FROM store_locations s
  WHERE sp.branch_id = s.id
    AND sp.branch_id IS NOT NULL;

  RAISE NOTICE 'Supplier sharing synced successfully';
END;
$$;

CREATE OR REPLACE FUNCTION sync_employee_sharing()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update employees based on their branch's share_employees setting
  -- OR if they have can_work_at_all_branches flag
  UPDATE employees e
  SET is_shared = COALESCE(e.can_work_at_all_branches, false) OR COALESCE(s.share_employees, false)
  FROM store_locations s
  WHERE e.branch_id = s.id
    AND e.branch_id IS NOT NULL;

  RAISE NOTICE 'Employee sharing synced successfully';
END;
$$;

-- ============================================================================
-- STEP 3: Create trigger to auto-update is_shared when branch settings change
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_sync_sharing_on_branch_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- When a branch's sharing settings change, update all related records
  
  IF NEW.share_products IS DISTINCT FROM OLD.share_products THEN
    UPDATE lats_products 
    SET is_shared = NEW.share_products 
    WHERE branch_id = NEW.id;
    
    -- Also update variants
    UPDATE lats_product_variants v
    SET is_shared = NEW.share_products
    FROM lats_products p
    WHERE v.product_id = p.id AND p.branch_id = NEW.id;
    
    RAISE NOTICE 'Updated product sharing for branch %', NEW.name;
  END IF;

  IF NEW.share_customers IS DISTINCT FROM OLD.share_customers THEN
    UPDATE customers 
    SET is_shared = NEW.share_customers 
    WHERE branch_id = NEW.id;
    
    RAISE NOTICE 'Updated customer sharing for branch %', NEW.name;
  END IF;

  IF NEW.share_categories IS DISTINCT FROM OLD.share_categories THEN
    UPDATE lats_categories 
    SET is_shared = NEW.share_categories 
    WHERE branch_id = NEW.id;
    
    RAISE NOTICE 'Updated category sharing for branch %', NEW.name;
  END IF;

  IF NEW.share_suppliers IS DISTINCT FROM OLD.share_suppliers THEN
    UPDATE lats_suppliers 
    SET is_shared = NEW.share_suppliers 
    WHERE branch_id = NEW.id;
    
    RAISE NOTICE 'Updated supplier sharing for branch %', NEW.name;
  END IF;

  IF NEW.share_employees IS DISTINCT FROM OLD.share_employees THEN
    UPDATE employees 
    SET is_shared = COALESCE(can_work_at_all_branches, false) OR NEW.share_employees
    WHERE branch_id = NEW.id;
    
    RAISE NOTICE 'Updated employee sharing for branch %', NEW.name;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_auto_sync_sharing ON store_locations;

CREATE TRIGGER trigger_auto_sync_sharing
  AFTER UPDATE ON store_locations
  FOR EACH ROW
  EXECUTE FUNCTION auto_sync_sharing_on_branch_update();

-- ============================================================================
-- STEP 4: Create trigger to set is_shared on INSERT
-- ============================================================================

CREATE OR REPLACE FUNCTION set_is_shared_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_branch_settings RECORD;
BEGIN
  -- Only process if branch_id is set
  IF NEW.branch_id IS NOT NULL THEN
    -- Get the branch settings
    SELECT 
      share_products,
      share_customers,
      share_categories,
      share_suppliers,
      share_employees
    INTO v_branch_settings
    FROM store_locations
    WHERE id = NEW.branch_id;

    -- Set is_shared based on table and branch settings
    IF TG_TABLE_NAME = 'lats_products' THEN
      NEW.is_shared := COALESCE(v_branch_settings.share_products, false);
    ELSIF TG_TABLE_NAME = 'lats_product_variants' THEN
      -- Variants inherit from their product
      SELECT is_shared INTO NEW.is_shared
      FROM lats_products
      WHERE id = NEW.product_id;
    ELSIF TG_TABLE_NAME = 'customers' THEN
      NEW.is_shared := COALESCE(v_branch_settings.share_customers, false);
    ELSIF TG_TABLE_NAME = 'lats_categories' THEN
      NEW.is_shared := COALESCE(v_branch_settings.share_categories, false);
    ELSIF TG_TABLE_NAME = 'lats_suppliers' THEN
      NEW.is_shared := COALESCE(v_branch_settings.share_suppliers, false);
    ELSIF TG_TABLE_NAME = 'employees' THEN
      NEW.is_shared := COALESCE(NEW.can_work_at_all_branches, false) 
                       OR COALESCE(v_branch_settings.share_employees, false);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Apply triggers to all relevant tables
DROP TRIGGER IF EXISTS trigger_set_is_shared_products ON lats_products;
CREATE TRIGGER trigger_set_is_shared_products
  BEFORE INSERT ON lats_products
  FOR EACH ROW
  EXECUTE FUNCTION set_is_shared_on_insert();

DROP TRIGGER IF EXISTS trigger_set_is_shared_variants ON lats_product_variants;
CREATE TRIGGER trigger_set_is_shared_variants
  BEFORE INSERT ON lats_product_variants
  FOR EACH ROW
  EXECUTE FUNCTION set_is_shared_on_insert();

DROP TRIGGER IF EXISTS trigger_set_is_shared_customers ON customers;
CREATE TRIGGER trigger_set_is_shared_customers
  BEFORE INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION set_is_shared_on_insert();

DROP TRIGGER IF EXISTS trigger_set_is_shared_categories ON lats_categories;
CREATE TRIGGER trigger_set_is_shared_categories
  BEFORE INSERT ON lats_categories
  FOR EACH ROW
  EXECUTE FUNCTION set_is_shared_on_insert();

DROP TRIGGER IF EXISTS trigger_set_is_shared_suppliers ON lats_suppliers;
CREATE TRIGGER trigger_set_is_shared_suppliers
  BEFORE INSERT ON lats_suppliers
  FOR EACH ROW
  EXECUTE FUNCTION set_is_shared_on_insert();

DROP TRIGGER IF EXISTS trigger_set_is_shared_employees ON employees;
CREATE TRIGGER trigger_set_is_shared_employees
  BEFORE INSERT ON employees
  FOR EACH ROW
  EXECUTE FUNCTION set_is_shared_on_insert();

-- ============================================================================
-- STEP 5: Initial sync of existing data
-- ============================================================================

-- Sync all existing records based on current branch settings
SELECT sync_product_sharing();
SELECT sync_customer_sharing();
SELECT sync_category_sharing();
SELECT sync_supplier_sharing();
SELECT sync_employee_sharing();

-- ============================================================================
-- STEP 6: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_products_is_shared ON lats_products(is_shared) WHERE is_shared = true;
CREATE INDEX IF NOT EXISTS idx_variants_is_shared ON lats_product_variants(is_shared) WHERE is_shared = true;
CREATE INDEX IF NOT EXISTS idx_customers_is_shared ON customers(is_shared) WHERE is_shared = true;
CREATE INDEX IF NOT EXISTS idx_categories_is_shared ON lats_categories(is_shared) WHERE is_shared = true;
CREATE INDEX IF NOT EXISTS idx_suppliers_is_shared ON lats_suppliers(is_shared) WHERE is_shared = true;
CREATE INDEX IF NOT EXISTS idx_employees_is_shared ON employees(is_shared) WHERE is_shared = true;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check products sharing status
SELECT 
  s.name as branch_name,
  s.share_products,
  COUNT(p.id) as total_products,
  COUNT(p.id) FILTER (WHERE p.is_shared = true) as shared_products
FROM store_locations s
LEFT JOIN lats_products p ON p.branch_id = s.id
GROUP BY s.id, s.name, s.share_products
ORDER BY s.name;

-- Check customers sharing status
SELECT 
  s.name as branch_name,
  s.share_customers,
  COUNT(c.id) as total_customers,
  COUNT(c.id) FILTER (WHERE c.is_shared = true) as shared_customers
FROM store_locations s
LEFT JOIN customers c ON c.branch_id = s.id
GROUP BY s.id, s.name, s.share_customers
ORDER BY s.name;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '✅ DATA SHARING MIGRATION COMPLETE';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Added columns:';
  RAISE NOTICE '  - lats_products.is_shared';
  RAISE NOTICE '  - lats_product_variants.is_shared';
  RAISE NOTICE '  - customers.is_shared';
  RAISE NOTICE '  - lats_categories.is_shared';
  RAISE NOTICE '  - lats_suppliers.is_shared';
  RAISE NOTICE '  - employees.is_shared';
  RAISE NOTICE '';
  RAISE NOTICE 'Created functions:';
  RAISE NOTICE '  - sync_product_sharing()';
  RAISE NOTICE '  - sync_customer_sharing()';
  RAISE NOTICE '  - sync_category_sharing()';
  RAISE NOTICE '  - sync_supplier_sharing()';
  RAISE NOTICE '  - sync_employee_sharing()';
  RAISE NOTICE '';
  RAISE NOTICE 'Created triggers:';
  RAISE NOTICE '  - Auto-sync on branch settings update';
  RAISE NOTICE '  - Auto-set on record insert';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Update TypeScript code to use is_shared in queries';
  RAISE NOTICE '============================================================================';
END $$;

