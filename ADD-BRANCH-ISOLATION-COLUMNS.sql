-- ============================================
-- ADD BRANCH ISOLATION SUPPORT TO EXISTING TABLES
-- Date: October 12, 2025
-- Purpose: Enable multi-branch data isolation
-- ============================================

-- ============================================
-- STEP 1: Add branch_id column to main tables
-- ============================================

-- Products Table
ALTER TABLE IF EXISTS lats_products 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES store_locations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_products_branch ON lats_products(branch_id);
CREATE INDEX IF NOT EXISTS idx_products_shared ON lats_products(is_shared);

-- Customers Table
ALTER TABLE IF EXISTS customers 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES store_locations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS preferred_branch_id UUID REFERENCES store_locations(id);

CREATE INDEX IF NOT EXISTS idx_customers_branch ON customers(branch_id);
CREATE INDEX IF NOT EXISTS idx_customers_shared ON customers(is_shared);
CREATE INDEX IF NOT EXISTS idx_customers_preferred_branch ON customers(preferred_branch_id);

-- Employees Table
ALTER TABLE IF EXISTS employees 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES store_locations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS can_work_at_all_branches BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS assigned_branches UUID[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_employees_branch ON employees(branch_id);

-- Sales/Transactions Table
ALTER TABLE IF EXISTS lats_sales 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES store_locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sales_branch ON lats_sales(branch_id);

-- Inventory/Stock Table
ALTER TABLE IF EXISTS lats_product_variants 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES store_locations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS stock_per_branch JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_variants_branch ON lats_product_variants(branch_id);

-- Suppliers Table  
ALTER TABLE IF EXISTS lats_suppliers 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES store_locations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_suppliers_branch ON lats_suppliers(branch_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_shared ON lats_suppliers(is_shared);

-- Categories Table
ALTER TABLE IF EXISTS lats_categories 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES store_locations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_categories_branch ON lats_categories(branch_id);
CREATE INDEX IF NOT EXISTS idx_categories_shared ON lats_categories(is_shared);

-- Purchase Orders Table
ALTER TABLE IF EXISTS lats_purchase_orders 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES store_locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_orders_branch ON lats_purchase_orders(branch_id);

-- Stock Movements Table
ALTER TABLE IF EXISTS lats_stock_movements 
ADD COLUMN IF NOT EXISTS from_branch_id UUID REFERENCES store_locations(id),
ADD COLUMN IF NOT EXISTS to_branch_id UUID REFERENCES store_locations(id),
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES store_locations(id);

CREATE INDEX IF NOT EXISTS idx_stock_movements_from_branch ON lats_stock_movements(from_branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_to_branch ON lats_stock_movements(to_branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_branch ON lats_stock_movements(branch_id);

-- ============================================
-- STEP 2: Create Branch Transfer Tracking Table
-- ============================================

CREATE TABLE IF NOT EXISTS branch_transfers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_branch_id UUID NOT NULL REFERENCES store_locations(id),
  to_branch_id UUID NOT NULL REFERENCES store_locations(id),
  transfer_type TEXT NOT NULL CHECK (transfer_type IN ('stock', 'customer', 'product')),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  quantity INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'in_transit', 'completed', 'rejected', 'cancelled')),
  requested_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transfers_from_branch ON branch_transfers(from_branch_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to_branch ON branch_transfers(to_branch_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON branch_transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_type ON branch_transfers(transfer_type);

-- ============================================
-- STEP 3: Create User Branch Assignment Table
-- ============================================

CREATE TABLE IF NOT EXISTS user_branch_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES store_locations(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  can_manage BOOLEAN DEFAULT false,
  can_view_reports BOOLEAN DEFAULT false,
  can_manage_inventory BOOLEAN DEFAULT false,
  can_manage_staff BOOLEAN DEFAULT false,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_user_branch_assignments_user ON user_branch_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_branch_assignments_branch ON user_branch_assignments(branch_id);
CREATE INDEX IF NOT EXISTS idx_user_branch_assignments_primary ON user_branch_assignments(is_primary);

-- ============================================
-- STEP 4: Create Branch Activity Log
-- ============================================

CREATE TABLE IF NOT EXISTS branch_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES store_locations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_branch_activity_branch ON branch_activity_log(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_activity_user ON branch_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_branch_activity_type ON branch_activity_log(action_type);
CREATE INDEX IF NOT EXISTS idx_branch_activity_created ON branch_activity_log(created_at);

-- ============================================
-- STEP 5: Create Helper Functions
-- ============================================

-- Function to get user's current branch
CREATE OR REPLACE FUNCTION get_user_current_branch(p_user_id UUID)
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT branch_id 
    FROM user_branch_assignments 
    WHERE user_id = p_user_id 
    AND is_primary = true 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if user can access branch
CREATE OR REPLACE FUNCTION can_user_access_branch(p_user_id UUID, p_branch_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Admins can access all branches
  IF EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = p_user_id 
    AND role = 'admin'
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if user is assigned to the branch
  RETURN EXISTS (
    SELECT 1 FROM user_branch_assignments 
    WHERE user_id = p_user_id 
    AND branch_id = p_branch_id
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if data is shared
CREATE OR REPLACE FUNCTION is_data_shared(
  p_entity_type TEXT,
  p_branch_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_isolation_mode TEXT;
  v_share_flag BOOLEAN;
BEGIN
  -- Get branch isolation mode
  SELECT data_isolation_mode INTO v_isolation_mode
  FROM store_locations
  WHERE id = p_branch_id;
  
  -- If shared mode, everything is shared
  IF v_isolation_mode = 'shared' THEN
    RETURN true;
  END IF;
  
  -- If isolated mode, nothing is shared
  IF v_isolation_mode = 'isolated' THEN
    RETURN false;
  END IF;
  
  -- Hybrid mode - check specific flags
  CASE p_entity_type
    WHEN 'products' THEN
      SELECT share_products INTO v_share_flag FROM store_locations WHERE id = p_branch_id;
    WHEN 'customers' THEN
      SELECT share_customers INTO v_share_flag FROM store_locations WHERE id = p_branch_id;
    WHEN 'inventory' THEN
      SELECT share_inventory INTO v_share_flag FROM store_locations WHERE id = p_branch_id;
    WHEN 'suppliers' THEN
      SELECT share_suppliers INTO v_share_flag FROM store_locations WHERE id = p_branch_id;
    WHEN 'categories' THEN
      SELECT share_categories INTO v_share_flag FROM store_locations WHERE id = p_branch_id;
    WHEN 'employees' THEN
      SELECT share_employees INTO v_share_flag FROM store_locations WHERE id = p_branch_id;
    ELSE
      v_share_flag := false;
  END CASE;
  
  RETURN COALESCE(v_share_flag, false);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 6: Create View for Branch Data Access
-- ============================================

CREATE OR REPLACE VIEW branch_accessible_products AS
SELECT 
  p.*,
  sl.name as branch_name,
  sl.code as branch_code,
  CASE 
    WHEN p.is_shared = true THEN 'Shared'
    WHEN p.branch_id IS NULL THEN 'All Branches'
    ELSE 'Branch Specific'
  END as availability_scope
FROM lats_products p
LEFT JOIN store_locations sl ON p.branch_id = sl.id;

CREATE OR REPLACE VIEW branch_accessible_customers AS
SELECT 
  c.*,
  sl.name as branch_name,
  sl.code as branch_code,
  pb.name as preferred_branch_name,
  CASE 
    WHEN c.is_shared = true THEN 'Shared'
    WHEN c.branch_id IS NULL THEN 'All Branches'
    ELSE 'Branch Specific'
  END as availability_scope
FROM customers c
LEFT JOIN store_locations sl ON c.branch_id = sl.id
LEFT JOIN store_locations pb ON c.preferred_branch_id = pb.id;

-- ============================================
-- STEP 7: Update Triggers
-- ============================================

-- Trigger to automatically set branch_id on insert
CREATE OR REPLACE FUNCTION set_default_branch()
RETURNS TRIGGER AS $$
BEGIN
  -- If branch_id is not set and user has a primary branch, use that
  IF NEW.branch_id IS NULL AND NEW.created_by IS NOT NULL THEN
    NEW.branch_id := get_user_current_branch(NEW.created_by);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to products
DROP TRIGGER IF EXISTS trigger_set_product_branch ON lats_products;
CREATE TRIGGER trigger_set_product_branch
  BEFORE INSERT ON lats_products
  FOR EACH ROW
  EXECUTE FUNCTION set_default_branch();

-- Apply trigger to customers
DROP TRIGGER IF EXISTS trigger_set_customer_branch ON customers;
CREATE TRIGGER trigger_set_customer_branch
  BEFORE INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION set_default_branch();

-- ============================================
-- STEP 8: Grant Permissions
-- ============================================

GRANT ALL ON branch_transfers TO authenticated;
GRANT ALL ON user_branch_assignments TO authenticated;
GRANT ALL ON branch_activity_log TO authenticated;
GRANT SELECT ON branch_accessible_products TO authenticated;
GRANT SELECT ON branch_accessible_customers TO authenticated;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ BRANCH ISOLATION SUPPORT ADDED SUCCESSFULLY!';
  RAISE NOTICE '';
  RAISE NOTICE '📦 Tables Updated:';
  RAISE NOTICE '   - lats_products (branch_id, is_shared)';
  RAISE NOTICE '   - customers (branch_id, is_shared, preferred_branch_id)';
  RAISE NOTICE '   - employees (branch_id, can_work_at_all_branches, assigned_branches)';
  RAISE NOTICE '   - lats_sales (branch_id)';
  RAISE NOTICE '   - lats_product_variants (branch_id, stock_per_branch)';
  RAISE NOTICE '   - lats_suppliers (branch_id, is_shared)';
  RAISE NOTICE '   - lats_categories (branch_id, is_shared)';
  RAISE NOTICE '   - lats_purchase_orders (branch_id)';
  RAISE NOTICE '   - lats_stock_movements (from_branch_id, to_branch_id)';
  RAISE NOTICE '';
  RAISE NOTICE '🆕 New Tables Created:';
  RAISE NOTICE '   - branch_transfers (stock transfer tracking)';
  RAISE NOTICE '   - user_branch_assignments (user-branch permissions)';
  RAISE NOTICE '   - branch_activity_log (audit trail)';
  RAISE NOTICE '';
  RAISE NOTICE '⚙️ Helper Functions Created:';
  RAISE NOTICE '   - get_user_current_branch(user_id)';
  RAISE NOTICE '   - can_user_access_branch(user_id, branch_id)';
  RAISE NOTICE '   - is_data_shared(entity_type, branch_id)';
  RAISE NOTICE '';
  RAISE NOTICE '👁️ Views Created:';
  RAISE NOTICE '   - branch_accessible_products';
  RAISE NOTICE '   - branch_accessible_customers';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Your Multi-Branch System is Ready!';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next Steps:';
  RAISE NOTICE '   1. Configure branches in Store Management settings';
  RAISE NOTICE '   2. Choose data isolation mode per branch';
  RAISE NOTICE '   3. Assign users to branches';
  RAISE NOTICE '   4. Update your queries to filter by branch_id';
  RAISE NOTICE '   5. Test data isolation with different configurations';
END $$;

