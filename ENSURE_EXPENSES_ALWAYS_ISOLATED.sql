-- ============================================================================
-- ENSURE ALL NEW EXPENSES ARE ALWAYS ISOLATED WITH BRANCH_ID
-- ============================================================================
-- This trigger ensures that every new expense is automatically isolated
-- and assigned to a branch, even if the application code doesn't set it
-- ============================================================================

-- ============================================================================
-- 1. TRIGGER FOR 'expenses' TABLE
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS ensure_expense_isolation ON expenses;
DROP FUNCTION IF EXISTS ensure_expense_isolation() CASCADE;

-- Create function to ensure expense isolation
CREATE OR REPLACE FUNCTION ensure_expense_isolation()
RETURNS TRIGGER AS $$
DECLARE
  default_branch_id UUID;
BEGIN
  -- If branch_id is not set, get the first active branch
  IF NEW.branch_id IS NULL THEN
    SELECT id INTO default_branch_id
    FROM store_locations
    WHERE is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF default_branch_id IS NOT NULL THEN
      NEW.branch_id := default_branch_id;
      RAISE NOTICE 'Expense % assigned to default branch %', NEW.description, default_branch_id;
    ELSE
      RAISE WARNING 'No active branch found. Expense % created without branch_id', NEW.description;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run before insert on expenses
CREATE TRIGGER ensure_expense_isolation
  BEFORE INSERT ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION ensure_expense_isolation();

-- Add comment
COMMENT ON FUNCTION ensure_expense_isolation() IS 'Ensures all new expenses have branch_id assigned';

-- ============================================================================
-- 2. TRIGGER FOR 'finance_expenses' TABLE
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS ensure_finance_expense_isolation ON finance_expenses;
DROP FUNCTION IF EXISTS ensure_finance_expense_isolation() CASCADE;

-- Create function to ensure finance_expense isolation
CREATE OR REPLACE FUNCTION ensure_finance_expense_isolation()
RETURNS TRIGGER AS $$
DECLARE
  default_branch_id UUID;
BEGIN
  -- If branch_id is not set, get the first active branch
  IF NEW.branch_id IS NULL THEN
    SELECT id INTO default_branch_id
    FROM store_locations
    WHERE is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF default_branch_id IS NOT NULL THEN
      NEW.branch_id := default_branch_id;
      RAISE NOTICE 'Finance expense % assigned to default branch %', NEW.description, default_branch_id;
    ELSE
      RAISE WARNING 'No active branch found. Finance expense % created without branch_id', NEW.description;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run before insert on finance_expenses
CREATE TRIGGER ensure_finance_expense_isolation
  BEFORE INSERT ON finance_expenses
  FOR EACH ROW
  EXECUTE FUNCTION ensure_finance_expense_isolation();

-- Add comment
COMMENT ON FUNCTION ensure_finance_expense_isolation() IS 'Ensures all new finance_expenses have branch_id assigned';

-- ============================================================================
-- 3. TRIGGER FOR 'account_transactions' WITH transaction_type = 'expense'
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS ensure_expense_transaction_isolation ON account_transactions;
DROP FUNCTION IF EXISTS ensure_expense_transaction_isolation() CASCADE;

-- Create function to ensure expense transaction isolation
CREATE OR REPLACE FUNCTION ensure_expense_transaction_isolation()
RETURNS TRIGGER AS $$
DECLARE
  default_branch_id UUID;
  account_branch_id UUID;
BEGIN
  -- Only process expense transactions
  IF NEW.transaction_type = 'expense' THEN
    -- Try to get branch_id from account first
    IF NEW.account_id IS NOT NULL THEN
      SELECT branch_id INTO account_branch_id
      FROM finance_accounts
      WHERE id = NEW.account_id;
    END IF;
    
    -- Use account's branch_id, or provided branch_id, or get default
    IF account_branch_id IS NOT NULL THEN
      NEW.branch_id := account_branch_id;
    ELSIF NEW.branch_id IS NULL THEN
      -- Get default branch
      SELECT id INTO default_branch_id
      FROM store_locations
      WHERE is_active = true
      ORDER BY created_at ASC
      LIMIT 1;
      
      IF default_branch_id IS NOT NULL THEN
        NEW.branch_id := default_branch_id;
        RAISE NOTICE 'Expense transaction % assigned to default branch %', NEW.description, default_branch_id;
      ELSE
        RAISE WARNING 'No active branch found. Expense transaction % created without branch_id', NEW.description;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run before insert on account_transactions
CREATE TRIGGER ensure_expense_transaction_isolation
  BEFORE INSERT ON account_transactions
  FOR EACH ROW
  EXECUTE FUNCTION ensure_expense_transaction_isolation();

-- Add comment
COMMENT ON FUNCTION ensure_expense_transaction_isolation() IS 'Ensures all expense transactions (transaction_type=expense) have branch_id assigned';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify triggers were created
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name IN ('ensure_expense_isolation', 'ensure_finance_expense_isolation', 'ensure_expense_transaction_isolation')
ORDER BY trigger_name;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ All expense isolation triggers created successfully!';
  RAISE NOTICE 'All new expenses will now be automatically isolated with branch_id assigned.';
END $$;
