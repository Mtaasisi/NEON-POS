-- ============================================
-- COMPREHENSIVE EXPENSE TRACKING SYSTEM
-- ============================================
-- This sets up a complete expense tracking system that integrates
-- with payment accounts and automatically updates "Spent" amounts
-- ============================================

-- ============================================
-- 1. ENSURE TABLES EXIST
-- ============================================

-- Finance Expenses Table (enhanced)
CREATE TABLE IF NOT EXISTS finance_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  account_id UUID REFERENCES finance_accounts(id) ON DELETE SET NULL,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  description TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'cash',
  status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  receipt_url TEXT,
  receipt_number TEXT,
  vendor TEXT,
  branch_id UUID REFERENCES store_locations(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expense Categories Table
CREATE TABLE IF NOT EXISTS finance_expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT,
  is_active BOOLEAN DEFAULT true,
  is_shared BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_finance_expenses_category ON finance_expenses(category);
CREATE INDEX IF NOT EXISTS idx_finance_expenses_account ON finance_expenses(account_id);
CREATE INDEX IF NOT EXISTS idx_finance_expenses_date ON finance_expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_finance_expenses_status ON finance_expenses(status);
CREATE INDEX IF NOT EXISTS idx_finance_expenses_branch ON finance_expenses(branch_id);

-- ============================================
-- 3. INSERT DEFAULT EXPENSE CATEGORIES
-- ============================================

INSERT INTO finance_expense_categories (name, description, icon, color) VALUES
  ('Rent', 'Office or shop rent payments', '🏢', '#3B82F6'),
  ('Utilities', 'Electricity, water, internet bills', '💡', '#10B981'),
  ('Salaries', 'Employee salaries and wages', '👥', '#8B5CF6'),
  ('Office Supplies', 'Stationery, equipment, consumables', '📝', '#F59E0B'),
  ('Marketing', 'Advertising, promotions, campaigns', '📢', '#EC4899'),
  ('Transportation', 'Fuel, vehicle maintenance, transport', '🚗', '#6366F1'),
  ('Repairs & Maintenance', 'Equipment repairs, building maintenance', '🔧', '#EF4444'),
  ('Insurance', 'Business insurance premiums', '🛡️', '#14B8A6'),
  ('Taxes & Fees', 'Government taxes, licenses, permits', '📊', '#F97316'),
  ('Bank Charges', 'Bank fees, transaction charges', '🏦', '#64748B'),
  ('Inventory Purchase', 'Stock purchases, supplier payments', '📦', '#0EA5E9'),
  ('Software & Subscriptions', 'Software licenses, SaaS subscriptions', '💻', '#A855F7'),
  ('Cleaning & Sanitation', 'Cleaning supplies, sanitation services', '🧹', '#22C55E'),
  ('Security', 'Security services, guards, systems', '🔒', '#DC2626'),
  ('Professional Services', 'Legal, accounting, consulting fees', '💼', '#7C3AED'),
  ('Training & Development', 'Employee training, courses', '📚', '#059669'),
  ('Food & Beverages', 'Office refreshments, client entertainment', '☕', '#F472B6'),
  ('Telecommunications', 'Phone bills, mobile airtime', '📞', '#06B6D4'),
  ('Miscellaneous', 'Other business expenses', '📋', '#94A3B8')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 4. CREATE TRIGGER FUNCTION TO AUTO-UPDATE ACCOUNT_TRANSACTIONS
-- ============================================

-- Function to create account transaction when expense is added
CREATE OR REPLACE FUNCTION create_expense_account_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_account_name TEXT;
BEGIN
  -- Only create transaction if account_id is provided and status is approved
  IF NEW.account_id IS NOT NULL AND NEW.status = 'approved' THEN
    
    -- Get account name for description
    SELECT name INTO v_account_name
    FROM finance_accounts
    WHERE id = NEW.account_id;
    
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
      COALESCE(NEW.title, 'Expense') || ' - ' || NEW.category,
      COALESCE(NEW.receipt_number, 'EXP-' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8)),
      'expense',
      NEW.id,
      jsonb_build_object(
        'expense_id', NEW.id,
        'category', NEW.category,
        'vendor', NEW.vendor,
        'expense_date', NEW.expense_date
      ),
      NEW.created_at,
      NEW.created_by
    );
    
    RAISE NOTICE '✅ Account transaction created for expense: % (Account: %)', NEW.title, v_account_name;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_expense_creates_account_transaction ON finance_expenses;

-- Create trigger
CREATE TRIGGER trigger_expense_creates_account_transaction
  AFTER INSERT ON finance_expenses
  FOR EACH ROW
  EXECUTE FUNCTION create_expense_account_transaction();

-- ============================================
-- 5. CREATE FUNCTION FOR UPDATING EXPENSES
-- ============================================

-- Function to handle expense updates (e.g., status changes, amount changes)
CREATE OR REPLACE FUNCTION handle_expense_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If expense is being approved and wasn't before
  IF NEW.status = 'approved' AND OLD.status != 'approved' AND NEW.account_id IS NOT NULL THEN
    -- Create transaction if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM account_transactions 
      WHERE related_entity_type = 'expense' 
      AND related_entity_id = NEW.id
    ) THEN
      PERFORM create_expense_account_transaction();
    END IF;
  END IF;
  
  -- If expense is being rejected or amount changed, update the transaction
  IF NEW.status = 'rejected' AND OLD.status = 'approved' THEN
    -- Delete the account transaction
    DELETE FROM account_transactions
    WHERE related_entity_type = 'expense' 
    AND related_entity_id = NEW.id;
    
    RAISE NOTICE '⚠️ Account transaction removed for rejected expense: %', NEW.title;
  END IF;
  
  -- If amount changed and expense is approved
  IF NEW.amount != OLD.amount AND NEW.status = 'approved' AND NEW.account_id IS NOT NULL THEN
    -- Update the transaction amount
    UPDATE account_transactions
    SET amount = NEW.amount,
        description = COALESCE(NEW.title, 'Expense') || ' - ' || NEW.category
    WHERE related_entity_type = 'expense' 
    AND related_entity_id = NEW.id;
    
    RAISE NOTICE '✏️ Account transaction updated for expense: %', NEW.title;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_expense_update ON finance_expenses;

-- Create update trigger
CREATE TRIGGER trigger_expense_update
  AFTER UPDATE ON finance_expenses
  FOR EACH ROW
  EXECUTE FUNCTION handle_expense_update();

-- ============================================
-- 6. CREATE FUNCTION FOR DELETING EXPENSES
-- ============================================

CREATE OR REPLACE FUNCTION handle_expense_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete related account transaction
  DELETE FROM account_transactions
  WHERE related_entity_type = 'expense' 
  AND related_entity_id = OLD.id;
  
  RAISE NOTICE '🗑️ Account transaction removed for deleted expense: %', OLD.title;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_expense_delete ON finance_expenses;

-- Create delete trigger
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

-- Create permissive policies for expenses
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

-- Create policies for expense categories
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

-- View: Expenses with account details
CREATE OR REPLACE VIEW v_expenses_with_accounts AS
SELECT 
  e.id,
  e.title,
  e.category,
  e.amount,
  e.description,
  e.expense_date,
  e.payment_method,
  e.status,
  e.receipt_number,
  e.vendor,
  e.created_at,
  fa.name as account_name,
  fa.type as account_type,
  fa.currency,
  ec.icon as category_icon,
  ec.color as category_color
FROM finance_expenses e
LEFT JOIN finance_accounts fa ON e.account_id = fa.id
LEFT JOIN finance_expense_categories ec ON e.category = ec.name
ORDER BY e.expense_date DESC, e.created_at DESC;

-- View: Expense summary by category
CREATE OR REPLACE VIEW v_expense_summary_by_category AS
SELECT 
  category,
  COUNT(*) as expense_count,
  SUM(amount) as total_amount,
  AVG(amount) as average_amount,
  MIN(expense_date) as first_expense,
  MAX(expense_date) as last_expense
FROM finance_expenses
WHERE status = 'approved'
GROUP BY category
ORDER BY total_amount DESC;

-- View: Monthly expense summary
CREATE OR REPLACE VIEW v_monthly_expense_summary AS
SELECT 
  DATE_TRUNC('month', expense_date) as month,
  COUNT(*) as expense_count,
  SUM(amount) as total_amount,
  COUNT(DISTINCT category) as categories_used,
  COUNT(DISTINCT account_id) as accounts_used
FROM finance_expenses
WHERE status = 'approved'
GROUP BY DATE_TRUNC('month', expense_date)
ORDER BY month DESC;

-- ============================================
-- 9. VERIFICATION
-- ============================================

SELECT '═══════════════════════════════════════════════════' as "═══════════════════════════════════════════════════";
SELECT '   EXPENSE TRACKING SYSTEM SETUP COMPLETE!' as "STATUS";
SELECT '═══════════════════════════════════════════════════' as "═══════════════════════════════════════════════════";

-- Show expense categories
SELECT 
  'Expense Categories Installed' as "INFO",
  COUNT(*) as total_categories
FROM finance_expense_categories
WHERE is_active = true;

SELECT name, icon, description
FROM finance_expense_categories
WHERE is_active = true
ORDER BY name
LIMIT 10;

-- ============================================
-- 10. SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '   ✅ EXPENSE TRACKING SYSTEM READY!';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 What was set up:';
  RAISE NOTICE '   ✅ Enhanced finance_expenses table';
  RAISE NOTICE '   ✅ 19 expense categories installed';
  RAISE NOTICE '   ✅ Auto-update payment accounts (Spent amounts)';
  RAISE NOTICE '   ✅ Triggers for INSERT, UPDATE, DELETE';
  RAISE NOTICE '   ✅ Helper views for reporting';
  RAISE NOTICE '   ✅ Row Level Security enabled';
  RAISE NOTICE '';
  RAISE NOTICE '💡 How it works:';
  RAISE NOTICE '   1. Create an expense → Automatically creates account_transaction';
  RAISE NOTICE '   2. Approve an expense → Payment account "Spent" increases';
  RAISE NOTICE '   3. Reject an expense → Account transaction removed';
  RAISE NOTICE '   4. Delete an expense → Account transaction deleted';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next Steps:';
  RAISE NOTICE '   1. Open your app: Finance → Expenses';
  RAISE NOTICE '   2. Click "Add Expense"';
  RAISE NOTICE '   3. Select category, account, and amount';
  RAISE NOTICE '   4. Save → Check Payment Accounts page';
  RAISE NOTICE '   5. "Spent" amount will update automatically! 🎉';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;

