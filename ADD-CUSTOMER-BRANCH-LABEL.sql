-- =====================================================
-- ADD BRANCH LABEL TO CUSTOMERS (For Tracking Only)
-- =====================================================
-- Purpose: Track which branch originally created each customer
-- Note: Customers remain SHARED across all branches
-- This is just a label to show "Added by Branch X"
-- =====================================================

BEGIN;

-- 1. Add created_by_branch_id column to track which branch added the customer
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' 
        AND column_name = 'created_by_branch_id'
    ) THEN
        ALTER TABLE customers 
        ADD COLUMN created_by_branch_id UUID REFERENCES store_locations(id) ON DELETE SET NULL;
        
        RAISE NOTICE '✅ Added created_by_branch_id to customers table';
    ELSE
        RAISE NOTICE '⏭️  created_by_branch_id already exists';
    END IF;
END $$;

-- 2. Add branch_name for quick display (denormalized for performance)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' 
        AND column_name = 'created_by_branch_name'
    ) THEN
        ALTER TABLE customers 
        ADD COLUMN created_by_branch_name TEXT;
        
        RAISE NOTICE '✅ Added created_by_branch_name to customers table';
    ELSE
        RAISE NOTICE '⏭️  created_by_branch_name already exists';
    END IF;
END $$;

-- 3. Create index for better performance when filtering by branch
CREATE INDEX IF NOT EXISTS idx_customers_created_by_branch 
ON customers(created_by_branch_id) 
WHERE created_by_branch_id IS NOT NULL;

-- 4. Update existing customers to set their branch (if they don't have one)
-- This will use the main branch as default
DO $$
DECLARE
    main_branch_record RECORD;
    updated_count INTEGER;
BEGIN
    -- Find the main branch
    SELECT id, name INTO main_branch_record
    FROM store_locations
    WHERE is_main = true
    LIMIT 1;
    
    IF main_branch_record.id IS NOT NULL THEN
        -- Update existing customers without a branch
        UPDATE customers
        SET 
            created_by_branch_id = main_branch_record.id,
            created_by_branch_name = main_branch_record.name
        WHERE created_by_branch_id IS NULL;
        
        GET DIAGNOSTICS updated_count = ROW_COUNT;
        
        RAISE NOTICE '✅ Updated % existing customers with main branch: %', 
            updated_count, main_branch_record.name;
    ELSE
        RAISE NOTICE '⚠️  No main branch found - existing customers not updated';
    END IF;
END $$;

-- 5. Create trigger to automatically set branch info on new customer creation
CREATE OR REPLACE FUNCTION set_customer_branch_on_create()
RETURNS TRIGGER AS $$
DECLARE
    branch_name TEXT;
BEGIN
    -- If branch_id is set but branch_name is not, fetch the branch name
    IF NEW.created_by_branch_id IS NOT NULL AND NEW.created_by_branch_name IS NULL THEN
        SELECT name INTO branch_name
        FROM store_locations
        WHERE id = NEW.created_by_branch_id;
        
        NEW.created_by_branch_name := branch_name;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_set_customer_branch_on_create ON customers;

CREATE TRIGGER trigger_set_customer_branch_on_create
    BEFORE INSERT ON customers
    FOR EACH ROW
    EXECUTE FUNCTION set_customer_branch_on_create();

-- 6. Create a view for easier querying with branch info
CREATE OR REPLACE VIEW customers_with_branch_info AS
SELECT 
    c.*,
    sl.name as branch_name,
    sl.code as branch_code,
    sl.city as branch_city
FROM customers c
LEFT JOIN store_locations sl ON c.created_by_branch_id = sl.id;

-- 7. Add helpful comment
COMMENT ON COLUMN customers.created_by_branch_id IS 'Branch that originally created this customer (for tracking only - customers are shared across all branches)';
COMMENT ON COLUMN customers.created_by_branch_name IS 'Name of branch that created customer (denormalized for performance)';

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
DECLARE
    total_customers INTEGER;
    customers_with_branch INTEGER;
    customers_without_branch INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_customers FROM customers;
    SELECT COUNT(*) INTO customers_with_branch FROM customers WHERE created_by_branch_id IS NOT NULL;
    SELECT COUNT(*) INTO customers_without_branch FROM customers WHERE created_by_branch_id IS NULL;
    
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '📊 CUSTOMER BRANCH TRACKING SETUP COMPLETE';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '📈 Total Customers: %', total_customers;
    RAISE NOTICE '✅ With Branch Info: %', customers_with_branch;
    RAISE NOTICE '⚠️  Without Branch: %', customers_without_branch;
    RAISE NOTICE '';
    RAISE NOTICE '💡 Note: Customers are SHARED across all branches';
    RAISE NOTICE '   The branch field is just a label showing where';
    RAISE NOTICE '   each customer was originally created.';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

