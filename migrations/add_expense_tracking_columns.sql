-- =====================================================
-- ADD EXPENSE TRACKING COLUMNS
-- =====================================================
-- Add columns to link expenses to purchase orders and products
-- for better tracking and reporting

-- Add purchase_order_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expenses' 
    AND column_name = 'purchase_order_id'
  ) THEN
    ALTER TABLE expenses 
    ADD COLUMN purchase_order_id UUID REFERENCES lats_purchase_orders(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_expenses_purchase_order_id ON expenses(purchase_order_id);
    
    RAISE NOTICE 'Added purchase_order_id column to expenses table';
  ELSE
    RAISE NOTICE 'Column purchase_order_id already exists';
  END IF;
END $$;

-- Add product_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expenses' 
    AND column_name = 'product_id'
  ) THEN
    ALTER TABLE expenses 
    ADD COLUMN product_id UUID REFERENCES lats_products(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_expenses_product_id ON expenses(product_id);
    
    RAISE NOTICE 'Added product_id column to expenses table';
  ELSE
    RAISE NOTICE 'Column product_id already exists';
  END IF;
END $$;

-- Add created_by column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expenses' 
    AND column_name = 'created_by'
  ) THEN
    ALTER TABLE expenses 
    ADD COLUMN created_by UUID REFERENCES auth_users(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by);
    
    RAISE NOTICE 'Added created_by column to expenses table';
  ELSE
    RAISE NOTICE 'Column created_by already exists';
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN expenses.purchase_order_id IS 'Reference to the purchase order this expense is related to (e.g., shipping, customs)';
COMMENT ON COLUMN expenses.product_id IS 'Reference to the specific product this expense is allocated to';
COMMENT ON COLUMN expenses.created_by IS 'User who created this expense record';

