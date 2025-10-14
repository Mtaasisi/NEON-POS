-- ============================================
-- 🔧 FIX EXPENSE TRACKING IN PAYMENT ACCOUNTS
-- Ensures expenses reduce account balances correctly
-- ============================================

-- ============================================
-- 1. VERIFY EXPENSE TRIGGER EXISTS
-- ============================================

-- Check if the trigger exists and is working
SELECT 
  tgname as trigger_name,
  tgtype,
  tgenabled
FROM pg_trigger
WHERE tgname = 'trigger_update_account_balance';

-- ============================================
-- 2. UPDATE THE ACCOUNT BALANCE TRIGGER TO HANDLE EXPENSES
-- ============================================

-- Recreate the function with better expense handling
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
DECLARE
  current_balance DECIMAL(15,2);
  new_balance DECIMAL(15,2);
BEGIN
  -- Get current balance
  SELECT balance INTO current_balance
  FROM finance_accounts
  WHERE id = NEW.account_id;

  -- Store balance before transaction
  NEW.balance_before := current_balance;

  -- Calculate new balance based on transaction type
  IF NEW.transaction_type IN ('payment_received', 'transfer_in') THEN
    -- These increase the balance
    new_balance := current_balance + NEW.amount;
  ELSIF NEW.transaction_type IN ('payment_made', 'expense', 'transfer_out') THEN
    -- These decrease the balance (expenses reduce account balance)
    new_balance := current_balance - NEW.amount;
  ELSIF NEW.transaction_type = 'adjustment' THEN
    -- Adjustments can go either way based on the sign
    new_balance := NEW.amount;
  ELSE
    -- Default: no change
    new_balance := current_balance;
  END IF;

  -- Store balance after transaction
  NEW.balance_after := new_balance;

  -- Update the account balance
  UPDATE finance_accounts 
  SET 
    balance = new_balance,
    updated_at = NOW()
  WHERE id = NEW.account_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger is active
DROP TRIGGER IF EXISTS trigger_update_account_balance ON account_transactions;
CREATE TRIGGER trigger_update_account_balance
  BEFORE INSERT ON account_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_account_balance();

-- ============================================
-- 3. CREATE EXPENSES TABLE IF NOT EXISTS
-- ============================================

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES finance_accounts(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  expense_date DATE DEFAULT CURRENT_DATE,
  reference_number TEXT,
  vendor_name TEXT,
  notes TEXT,
  payment_method TEXT,
  status TEXT DEFAULT 'paid' CHECK (status IN ('pending', 'paid', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_expenses_account ON expenses(account_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);

-- Enable RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can view expenses" ON expenses;
DROP POLICY IF EXISTS "Users can insert expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete expenses" ON expenses;

CREATE POLICY "Users can view expenses" ON expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert expenses" ON expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update expenses" ON expenses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can delete expenses" ON expenses FOR DELETE TO authenticated USING (true);

-- ============================================
-- 4. CREATE TRIGGER TO RECORD EXPENSE TRANSACTIONS
-- ============================================

CREATE OR REPLACE FUNCTION record_expense_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create transaction for paid expenses
  IF NEW.status = 'paid' THEN
    INSERT INTO account_transactions (
      account_id,
      transaction_type,
      amount,
      description,
      reference_number,
      related_entity_type,
      related_entity_id,
      created_at,
      created_by
    ) VALUES (
      NEW.account_id,
      'expense',
      NEW.amount,
      COALESCE(NEW.description, 'Expense: ' || NEW.category),
      NEW.reference_number,
      'expense',
      NEW.id,
      NEW.created_at,
      NEW.created_by
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_record_expense_transaction ON expenses;
CREATE TRIGGER trigger_record_expense_transaction
  AFTER INSERT ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION record_expense_transaction();

-- ============================================
-- 5. SHOW CURRENT ACCOUNT BALANCES WITH EXPENSES
-- ============================================

SELECT '═══════════════════════════════════════════════' as "═══════════════════════════════════════════════";
SELECT '   PAYMENT ACCOUNT BALANCES (Including Expenses)' as "STATUS";
SELECT '═══════════════════════════════════════════════' as "═══════════════════════════════════════════════";

SELECT 
  fa.name as "Account Name",
  fa.balance as "Current Balance",
  COALESCE(
    (SELECT SUM(amount) FROM account_transactions 
     WHERE account_id = fa.id AND transaction_type IN ('payment_received', 'transfer_in')),
    0
  ) as "Total Received",
  COALESCE(
    (SELECT SUM(amount) FROM account_transactions 
     WHERE account_id = fa.id AND transaction_type = 'expense'),
    0
  ) as "Total Expenses",
  COALESCE(
    (SELECT SUM(amount) FROM account_transactions 
     WHERE account_id = fa.id AND transaction_type IN ('payment_made', 'transfer_out')),
    0
  ) as "Other Payments",
  fa.currency as "Currency",
  fa.is_active as "Active"
FROM finance_accounts fa
WHERE fa.is_payment_method = true
ORDER BY fa.balance DESC;

-- ============================================
-- 6. SHOW RECENT EXPENSE TRANSACTIONS
-- ============================================

SELECT '═══════════════════════════════════════════════' as "═══════════════════════════════════════════════";
SELECT '   RECENT EXPENSE TRANSACTIONS' as "STATUS";
SELECT '═══════════════════════════════════════════════' as "═══════════════════════════════════════════════";

SELECT 
  at.created_at as "Date",
  fa.name as "Account",
  at.description as "Description",
  at.amount as "Amount",
  at.balance_before as "Balance Before",
  at.balance_after as "Balance After"
FROM account_transactions at
JOIN finance_accounts fa ON fa.id = at.account_id
WHERE at.transaction_type = 'expense'
ORDER BY at.created_at DESC
LIMIT 10;

-- ============================================
-- 7. CREATE EXAMPLE EXPENSE CATEGORIES
-- ============================================

-- Create a helper table for expense categories (optional)
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert common expense categories if table is empty
INSERT INTO expense_categories (name, description, icon, color)
SELECT * FROM (VALUES
  ('Rent', 'Office or shop rent payments', 'Building', 'blue'),
  ('Utilities', 'Electricity, water, internet', 'Lightbulb', 'yellow'),
  ('Salaries', 'Employee salaries and wages', 'User', 'green'),
  ('Supplies', 'Office and shop supplies', 'Package', 'purple'),
  ('Maintenance', 'Repairs and maintenance', 'Home', 'orange'),
  ('Marketing', 'Advertising and marketing', 'FileText', 'pink'),
  ('Transportation', 'Fuel, transport costs', 'Truck', 'red'),
  ('Insurance', 'Business insurance', 'Shield', 'indigo'),
  ('Taxes', 'Business taxes and fees', 'Receipt', 'gray'),
  ('Other', 'Miscellaneous expenses', 'FileText', 'slate')
) AS categories(name, description, icon, color)
WHERE NOT EXISTS (SELECT 1 FROM expense_categories);

-- Enable RLS on expense_categories
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view expense categories" ON expense_categories;
CREATE POLICY "Users can view expense categories" ON expense_categories FOR SELECT TO authenticated USING (true);

-- ============================================
-- 8. SUMMARY
-- ============================================

SELECT '═══════════════════════════════════════════════' as "═══════════════════════════════════════════════";
SELECT '   SUMMARY' as "STATUS";
SELECT '═══════════════════════════════════════════════' as "═══════════════════════════════════════════════";

SELECT 
  'Total Payment Accounts' as metric,
  COUNT(*)::TEXT as value
FROM finance_accounts
WHERE is_payment_method = true
UNION ALL
SELECT 
  'Total Expense Transactions',
  COUNT(*)::TEXT
FROM account_transactions
WHERE transaction_type = 'expense'
UNION ALL
SELECT 
  'Total Expense Amount',
  TO_CHAR(COALESCE(SUM(amount), 0), 'FM999,999,999,999') || ' TZS'
FROM account_transactions
WHERE transaction_type = 'expense'
UNION ALL
SELECT 
  'Expense Categories',
  COUNT(*)::TEXT
FROM expense_categories;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Expense tracking has been set up!';
  RAISE NOTICE '✅ Expenses will automatically reduce account balances';
  RAISE NOTICE '✅ Expense categories created';
  RAISE NOTICE '';
  RAISE NOTICE 'How it works:';
  RAISE NOTICE '1. Record expense → Creates account_transaction with type "expense"';
  RAISE NOTICE '2. Trigger fires → Reduces account balance automatically';
  RAISE NOTICE '3. UI shows → Updated balance reflecting expenses';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Refresh your browser';
  RAISE NOTICE '2. Check Payment Accounts tab';
  RAISE NOTICE '3. Balances should reflect all expenses';
  RAISE NOTICE '';
END $$;

