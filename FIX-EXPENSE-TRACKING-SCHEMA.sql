-- ============================================
-- FIX EXPENSE TRACKING SCHEMA
-- ============================================
-- This fixes the expense tracking system to work with your existing schema
-- and integrates it with payment accounts
-- ============================================

-- ============================================
-- 1. VERIFY AND FIX EXISTING TABLES
-- ============================================

-- Ensure finance_expenses table has all needed columns
ALTER TABLE finance_expenses 
ADD COLUMN IF NOT EXISTS title TEXT;

ALTER TABLE finance_expenses 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved';

ALTER TABLE finance_expenses 
ADD COLUMN IF NOT EXISTS receipt_url TEXT;

ALTER TABLE finance_expenses
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES store_locations(id) ON DELETE SET NULL;

-- Add check constraint for status if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'finance_expenses_status_check'
  ) THEN
    ALTER TABLE finance_expenses 
    ADD CONSTRAINT finance_expenses_status_check 
    CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- Update existing records to have default status
UPDATE finance_expenses 
SET status = 'approved' 
WHERE status IS NULL;

-- ============================================
-- 2. POPULATE EXPENSE CATEGORIES
-- ============================================

INSERT INTO finance_expense_categories (category_name, description, is_active) VALUES
  ('Rent', 'Office or shop rent payments', true),
  ('Utilities', 'Electricity, water, internet bills', true),
  ('Salaries', 'Employee salaries and wages', true),
  ('Office Supplies', 'Stationery, equipment, consumables', true),
  ('Marketing', 'Advertising, promotions, campaigns', true),
  ('Transportation', 'Fuel, vehicle maintenance, transport', true),
  ('Repairs & Maintenance', 'Equipment repairs, building maintenance', true),
  ('Insurance', 'Business insurance premiums', true),
  ('Taxes & Fees', 'Government taxes, licenses, permits', true),
  ('Bank Charges', 'Bank fees, transaction charges', true),
  ('Inventory Purchase', 'Stock purchases, supplier payments', true),
  ('Software & Subscriptions', 'Software licenses, SaaS subscriptions', true),
  ('Cleaning & Sanitation', 'Cleaning supplies, sanitation services', true),
  ('Security', 'Security services, guards, systems', true),
  ('Professional Services', 'Legal, accounting, consulting fees', true),
  ('Training & Development', 'Employee training, courses', true),
  ('Food & Beverages', 'Office refreshments, client entertainment', true),
  ('Telecommunications', 'Phone bills, mobile airtime', true),
  ('Miscellaneous', 'Other business expenses', true)
ON CONFLICT (category_name) DO NOTHING;

-- ============================================
-- 3. CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_finance_expenses_category_id ON finance_expenses(expense_category_id);
CREATE INDEX IF NOT EXISTS idx_finance_expenses_account ON finance_expenses(account_id);
CREATE INDEX IF NOT EXISTS idx_finance_expenses_date ON finance_expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_finance_expenses_status ON finance_expenses(status);
CREATE INDEX IF NOT EXISTS idx_finance_expenses_branch ON finance_expenses(branch_id);

-- ============================================
-- 4. CREATE TRIGGER TO AUTO-UPDATE ACCOUNT_TRANSACTIONS
-- ============================================

CREATE OR REPLACE FUNCTION create_expense_account_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_account_name TEXT;
  v_category_name TEXT;
BEGIN
  -- Only create transaction if account_id is provided and status is approved
  IF NEW.account_id IS NOT NULL AND NEW.status = 'approved' THEN
    
    -- Get account name for description
    SELECT name INTO v_account_name
    FROM finance_accounts
    WHERE id = NEW.account_id;
    
    -- Get category name
    SELECT category_name INTO v_category_name
    FROM finance_expense_categories
    WHERE id = NEW.expense_category_id;
    
    -- Create account transaction
    INSERT INTO account_transactions (
      account_id,
      transaction_type,
      amount,
      description,
      reference_number,
      related_entity_type,
      related_entity_id,
      metadata,
      created_at,
      created_by
    ) VALUES (
      NEW.account_id,
      'expense',
      NEW.amount,
      COALESCE(NEW.title, COALESCE(NEW.description, 'Expense')) || 
        CASE WHEN v_category_name IS NOT NULL THEN ' - ' || v_category_name ELSE '' END,
      COALESCE(NEW.receipt_number, 'EXP-' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8)),
      'expense',
      NEW.id,
      jsonb_build_object(
        'expense_id', NEW.id,
        'category_id', NEW.expense_category_id,
        'category_name', v_category_name,
        'vendor', NEW.vendor,
        'expense_date', NEW.expense_date
      ),
      NEW.created_at,
      NEW.created_by
    );
    
    RAISE NOTICE '✅ Account transaction created for expense: % (Account: %)', 
      COALESCE(NEW.title, NEW.description), v_account_name;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_expense_creates_account_transaction ON finance_expenses;

CREATE TRIGGER trigger_expense_creates_account_transaction
  AFTER INSERT ON finance_expenses
  FOR EACH ROW
  EXECUTE FUNCTION create_expense_account_transaction();

-- ============================================
-- 5. CREATE TRIGGER FOR EXPENSE UPDATES
-- ============================================

CREATE OR REPLACE FUNCTION handle_expense_update()
RETURNS TRIGGER AS $$
DECLARE
  v_category_name TEXT;
BEGIN
  -- If expense is being approved and wasn't before
  IF NEW.status = 'approved' AND OLD.status != 'approved' AND NEW.account_id IS NOT NULL THEN
    -- Create transaction if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM account_transactions 
      WHERE related_entity_type = 'expense' 
      AND related_entity_id = NEW.id
    ) THEN
      -- Get category name
      SELECT category_name INTO v_category_name
      FROM finance_expense_categories
      WHERE id = NEW.expense_category_id;
      
      -- Create the transaction
      INSERT INTO account_transactions (
        account_id,
        transaction_type,
        amount,
        description,
        reference_number,
        related_entity_type,
        related_entity_id,
        metadata,
        created_at,
        created_by
      ) VALUES (
        NEW.account_id,
        'expense',
        NEW.amount,
        COALESCE(NEW.title, COALESCE(NEW.description, 'Expense')) || 
          CASE WHEN v_category_name IS NOT NULL THEN ' - ' || v_category_name ELSE '' END,
        COALESCE(NEW.receipt_number, 'EXP-' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8)),
        'expense',
        NEW.id,
        jsonb_build_object(
          'expense_id', NEW.id,
          'category_id', NEW.expense_category_id,
          'category_name', v_category_name,
          'vendor', NEW.vendor,
          'expense_date', NEW.expense_date
        ),
        NOW(),
        NEW.created_by
      );
    END IF;
  END IF;
  
  -- If expense is being rejected
  IF NEW.status = 'rejected' AND OLD.status = 'approved' THEN
    -- Delete the account transaction
    DELETE FROM account_transactions
    WHERE related_entity_type = 'expense' 
    AND related_entity_id = NEW.id;
    
    RAISE NOTICE '⚠️ Account transaction removed for rejected expense: %', 
      COALESCE(NEW.title, NEW.description);
  END IF;
  
  -- If amount changed and expense is approved
  IF NEW.amount != OLD.amount AND NEW.status = 'approved' AND NEW.account_id IS NOT NULL THEN
    -- Get category name
    SELECT category_name INTO v_category_name
    FROM finance_expense_categories
    WHERE id = NEW.expense_category_id;
    
    -- Update the transaction amount and description
    UPDATE account_transactions
    SET amount = NEW.amount,
        description = COALESCE(NEW.title, COALESCE(NEW.description, 'Expense')) || 
          CASE WHEN v_category_name IS NOT NULL THEN ' - ' || v_category_name ELSE '' END
    WHERE related_entity_type = 'expense' 
    AND related_entity_id = NEW.id;
    
    RAISE NOTICE '✏️ Account transaction updated for expense: %', 
      COALESCE(NEW.title, NEW.description);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_expense_update ON finance_expenses;

CREATE TRIGGER trigger_expense_update
  AFTER UPDATE ON finance_expenses
  FOR EACH ROW
  EXECUTE FUNCTION handle_expense_update();

-- ============================================
-- 6. CREATE TRIGGER FOR EXPENSE DELETION
-- ============================================

CREATE OR REPLACE FUNCTION handle_expense_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete related account transaction
  DELETE FROM account_transactions
  WHERE related_entity_type = 'expense' 
  AND related_entity_id = OLD.id;
  
  RAISE NOTICE '🗑️ Account transaction removed for deleted expense: %', 
    COALESCE(OLD.title, OLD.description);
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_expense_delete ON finance_expenses;

CREATE TRIGGER trigger_expense_delete
  BEFORE DELETE ON finance_expenses
  FOR EACH ROW
  EXECUTE FUNCTION handle_expense_delete();

-- ============================================
-- 7. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE finance_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_expense_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view expenses" ON finance_expenses;
DROP POLICY IF EXISTS "Users can insert expenses" ON finance_expenses;
DROP POLICY IF EXISTS "Users can update expenses" ON finance_expenses;
DROP POLICY IF EXISTS "Users can delete expenses" ON finance_expenses;

DROP POLICY IF EXISTS "Users can view expense categories" ON finance_expense_categories;
DROP POLICY IF EXISTS "Users can manage expense categories" ON finance_expense_categories;

-- Create permissive policies
CREATE POLICY "Users can view expenses"
  ON finance_expenses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert expenses"
  ON finance_expenses FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update expenses"
  ON finance_expenses FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete expenses"
  ON finance_expenses FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Users can view expense categories"
  ON finance_expense_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage expense categories"
  ON finance_expense_categories FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 8. CREATE HELPER VIEWS
-- ============================================

-- Drop existing views
DROP VIEW IF EXISTS v_expenses_with_accounts;
DROP VIEW IF EXISTS v_expense_summary_by_category;
DROP VIEW IF EXISTS v_monthly_expense_summary;

-- View: Expenses with full details
CREATE OR REPLACE VIEW v_expenses_with_accounts AS
SELECT 
  e.id,
  e.title,
  e.description,
  e.amount,
  e.expense_date,
  e.payment_method,
  e.status,
  e.receipt_number,
  e.vendor,
  e.created_at,
  ec.category_name,
  ec.description as category_description,
  fa.name as account_name,
  fa.type as account_type,
  fa.currency
FROM finance_expenses e
LEFT JOIN finance_expense_categories ec ON e.expense_category_id = ec.id
LEFT JOIN finance_accounts fa ON e.account_id = fa.id
ORDER BY e.expense_date DESC, e.created_at DESC;

-- View: Summary by category
CREATE OR REPLACE VIEW v_expense_summary_by_category AS
SELECT 
  ec.category_name,
  COUNT(e.id) as expense_count,
  COALESCE(SUM(e.amount), 0) as total_amount,
  COALESCE(AVG(e.amount), 0) as average_amount,
  MIN(e.expense_date) as first_expense,
  MAX(e.expense_date) as last_expense
FROM finance_expense_categories ec
LEFT JOIN finance_expenses e ON ec.id = e.expense_category_id AND e.status = 'approved'
GROUP BY ec.category_name
ORDER BY total_amount DESC;

-- View: Monthly summary
CREATE OR REPLACE VIEW v_monthly_expense_summary AS
SELECT 
  DATE_TRUNC('month', expense_date) as month,
  COUNT(*) as expense_count,
  SUM(amount) as total_amount,
  COUNT(DISTINCT expense_category_id) as categories_used,
  COUNT(DISTINCT account_id) as accounts_used
FROM finance_expenses
WHERE status = 'approved'
GROUP BY DATE_TRUNC('month', expense_date)
ORDER BY month DESC;

-- ============================================
-- 9. VERIFICATION
-- ============================================

SELECT '═══════════════════════════════════════════════════' as "═══════════════════════════════════════════════════";
SELECT '   EXPENSE TRACKING SYSTEM - FIXED & READY!' as "STATUS";
SELECT '═══════════════════════════════════════════════════' as "═══════════════════════════════════════════════════";

-- Show installed categories
SELECT 
  'Expense Categories' as "INFO",
  COUNT(*) as total_categories
FROM finance_expense_categories
WHERE is_active = true;

-- Show first 10 categories
SELECT 
  category_name,
  description
FROM finance_expense_categories
WHERE is_active = true
ORDER BY category_name
LIMIT 10;

-- ============================================
-- 10. SUCCESS MESSAGE
-- ============================================

DO $$
DECLARE
  v_category_count INT;
BEGIN
  SELECT COUNT(*) INTO v_category_count 
  FROM finance_expense_categories 
  WHERE is_active = true;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '   ✅ EXPENSE TRACKING FIXED & READY!';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 What was set up:';
  RAISE NOTICE '   ✅ Fixed finance_expenses table schema';
  RAISE NOTICE '   ✅ % expense categories installed', v_category_count;
  RAISE NOTICE '   ✅ Auto-update payment accounts (Spent amounts)';
  RAISE NOTICE '   ✅ Triggers for INSERT, UPDATE, DELETE';
  RAISE NOTICE '   ✅ Helper views for reporting';
  RAISE NOTICE '   ✅ Row Level Security enabled';
  RAISE NOTICE '';
  RAISE NOTICE '💡 How it works:';
  RAISE NOTICE '   1. Create expense → Select category & account';
  RAISE NOTICE '   2. Save → Automatically creates account_transaction';
  RAISE NOTICE '   3. Payment account "Spent" increases automatically';
  RAISE NOTICE '   4. Balance decreases automatically';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next Steps:';
  RAISE NOTICE '   1. Open your app: Finance → Expenses';
  RAISE NOTICE '   2. Click "Add Expense"';
  RAISE NOTICE '   3. Fill in: title, select category, amount, account';
  RAISE NOTICE '   4. Save → Check Payment Accounts page';
  RAISE NOTICE '   5. "Spent" amount will update! 🎉';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Always select an account when creating expenses!';
  RAISE NOTICE '   Without account → Expense saved but payment accounts not updated';
  RAISE NOTICE '   With account → Everything updates automatically ✅';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;

