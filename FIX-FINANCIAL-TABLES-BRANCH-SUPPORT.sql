-- ============================================================================
-- ADD BRANCH SUPPORT TO FINANCIAL TABLES
-- ============================================================================
-- This script adds branch_id columns to finance_expenses and customer_payments
-- tables to enable branch filtering and data isolation
-- ============================================================================

-- Add branch_id to finance_expenses table
ALTER TABLE finance_expenses 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES store_locations(id) ON DELETE SET NULL;

-- Add branch_id to customer_payments table
ALTER TABLE customer_payments 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES store_locations(id) ON DELETE SET NULL;

-- Add branch_id to finance_accounts table (accounts can be branch-specific)
ALTER TABLE finance_accounts 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES store_locations(id) ON DELETE SET NULL;

ALTER TABLE finance_accounts 
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;

-- Add branch_id to finance_transfers table
ALTER TABLE finance_transfers 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES store_locations(id) ON DELETE SET NULL;

-- Add branch_id to finance_expense_categories table
ALTER TABLE finance_expense_categories 
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT true;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_finance_expenses_branch_id 
ON finance_expenses(branch_id);

CREATE INDEX IF NOT EXISTS idx_customer_payments_branch_id 
ON customer_payments(branch_id);

CREATE INDEX IF NOT EXISTS idx_finance_accounts_branch_id 
ON finance_accounts(branch_id);

CREATE INDEX IF NOT EXISTS idx_finance_transfers_branch_id 
ON finance_transfers(branch_id);

-- ============================================================================
-- ASSIGN EXISTING RECORDS TO MAIN STORE
-- ============================================================================
-- This ensures all existing records are assigned to the main store
-- ============================================================================

DO $$
DECLARE
  main_store_id UUID;
BEGIN
  -- Get the main store ID (first created store_location)
  SELECT id INTO main_store_id
  FROM store_locations
  ORDER BY created_at ASC
  LIMIT 1;

  IF main_store_id IS NOT NULL THEN
    -- Update finance_expenses records without branch_id
    UPDATE finance_expenses
    SET branch_id = main_store_id
    WHERE branch_id IS NULL;
    
    RAISE NOTICE '✅ Updated % finance_expenses records with main store branch_id', 
      (SELECT COUNT(*) FROM finance_expenses WHERE branch_id = main_store_id);

    -- Update customer_payments records without branch_id
    UPDATE customer_payments
    SET branch_id = main_store_id
    WHERE branch_id IS NULL;
    
    RAISE NOTICE '✅ Updated % customer_payments records with main store branch_id', 
      (SELECT COUNT(*) FROM customer_payments WHERE branch_id = main_store_id);

    -- Update finance_accounts records without branch_id
    UPDATE finance_accounts
    SET branch_id = main_store_id, is_shared = true
    WHERE branch_id IS NULL;
    
    RAISE NOTICE '✅ Updated % finance_accounts records with main store branch_id', 
      (SELECT COUNT(*) FROM finance_accounts WHERE branch_id = main_store_id);

    -- Update finance_transfers records without branch_id
    UPDATE finance_transfers
    SET branch_id = main_store_id
    WHERE branch_id IS NULL;
    
    RAISE NOTICE '✅ Updated % finance_transfers records with main store branch_id', 
      (SELECT COUNT(*) FROM finance_transfers WHERE branch_id = main_store_id);
  ELSE
    RAISE NOTICE '⚠️ No store_locations found. Please create a store location first.';
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify all financial tables have branch_id column
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('finance_expenses', 'customer_payments', 'finance_accounts', 'finance_transfers')
  AND column_name = 'branch_id'
ORDER BY table_name;

-- Show record counts by branch for all financial tables
SELECT 
  'finance_expenses' as table_name,
  branch_id,
  sl.name as branch_name,
  COUNT(*) as record_count
FROM finance_expenses fe
LEFT JOIN store_locations sl ON fe.branch_id = sl.id
GROUP BY branch_id, sl.name

UNION ALL

SELECT 
  'customer_payments' as table_name,
  branch_id,
  sl.name as branch_name,
  COUNT(*) as record_count
FROM customer_payments cp
LEFT JOIN store_locations sl ON cp.branch_id = sl.id
GROUP BY branch_id, sl.name

UNION ALL

SELECT 
  'finance_accounts' as table_name,
  branch_id,
  sl.name as branch_name,
  COUNT(*) as record_count
FROM finance_accounts fa
LEFT JOIN store_locations sl ON fa.branch_id = sl.id
GROUP BY branch_id, sl.name

UNION ALL

SELECT 
  'finance_transfers' as table_name,
  branch_id,
  sl.name as branch_name,
  COUNT(*) as record_count
FROM finance_transfers ft
LEFT JOIN store_locations sl ON ft.branch_id = sl.id
GROUP BY branch_id, sl.name
ORDER BY table_name, branch_name;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '✅ BRANCH SUPPORT ADDED TO FINANCIAL TABLES';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '';
  RAISE NOTICE '✓ finance_expenses table updated with branch_id';
  RAISE NOTICE '✓ customer_payments table updated with branch_id';
  RAISE NOTICE '✓ finance_accounts table updated with branch_id + is_shared';
  RAISE NOTICE '✓ finance_transfers table updated with branch_id';
  RAISE NOTICE '✓ finance_expense_categories updated with is_shared';
  RAISE NOTICE '✓ Indexes created for better performance';
  RAISE NOTICE '✓ Existing records assigned to main store';
  RAISE NOTICE '';
  RAISE NOTICE '⚡ You can now filter ALL financial data by branch!';
  RAISE NOTICE '⚡ Shared accounts can be used across all branches';
  RAISE NOTICE '============================================';
END $$;

