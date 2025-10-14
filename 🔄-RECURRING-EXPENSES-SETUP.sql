-- ============================================
-- 🔄 RECURRING EXPENSES SYSTEM
-- Automatic expense scheduling and processing
-- ============================================

-- ============================================
-- 1. CREATE RECURRING EXPENSES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  account_id UUID NOT NULL REFERENCES finance_accounts(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE,
  next_due_date DATE NOT NULL,
  last_processed_date DATE,
  vendor_name TEXT,
  reference_prefix TEXT,
  auto_process BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  notification_days_before INTEGER DEFAULT 3,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_recurring_exp_account ON recurring_expenses(account_id);
CREATE INDEX IF NOT EXISTS idx_recurring_exp_active ON recurring_expenses(is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_exp_next_due ON recurring_expenses(next_due_date);
CREATE INDEX IF NOT EXISTS idx_recurring_exp_frequency ON recurring_expenses(frequency);
CREATE INDEX IF NOT EXISTS idx_recurring_exp_auto_process ON recurring_expenses(auto_process);

-- Comments
COMMENT ON TABLE recurring_expenses IS 'Recurring/scheduled expense definitions';
COMMENT ON COLUMN recurring_expenses.frequency IS 'How often the expense recurs: daily, weekly, monthly, yearly';
COMMENT ON COLUMN recurring_expenses.next_due_date IS 'Next date when this expense should be processed';
COMMENT ON COLUMN recurring_expenses.auto_process IS 'If true, expense is automatically created; if false, only notification is sent';

-- Enable RLS
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;

-- Drop and create policies
DROP POLICY IF EXISTS "Users can view recurring expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can insert recurring expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can update recurring expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can delete recurring expenses" ON recurring_expenses;

CREATE POLICY "Users can view recurring expenses" ON recurring_expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert recurring expenses" ON recurring_expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update recurring expenses" ON recurring_expenses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can delete recurring expenses" ON recurring_expenses FOR DELETE TO authenticated USING (true);

-- ============================================
-- 2. CREATE RECURRING EXPENSE HISTORY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS recurring_expense_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_expense_id UUID NOT NULL REFERENCES recurring_expenses(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES account_transactions(id) ON DELETE SET NULL,
  processed_date DATE NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'processed' CHECK (status IN ('processed', 'failed', 'skipped', 'pending')),
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rec_exp_history_recurring ON recurring_expense_history(recurring_expense_id);
CREATE INDEX IF NOT EXISTS idx_rec_exp_history_date ON recurring_expense_history(processed_date);
CREATE INDEX IF NOT EXISTS idx_rec_exp_history_status ON recurring_expense_history(status);

-- Enable RLS
ALTER TABLE recurring_expense_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view recurring expense history" ON recurring_expense_history;
CREATE POLICY "Users can view recurring expense history" ON recurring_expense_history FOR SELECT TO authenticated USING (true);

-- ============================================
-- 3. FUNCTION TO CALCULATE NEXT DUE DATE
-- ============================================

CREATE OR REPLACE FUNCTION calculate_next_due_date(
  p_current_date DATE,
  frequency_type TEXT
) RETURNS DATE AS $$
BEGIN
  CASE frequency_type
    WHEN 'daily' THEN
      RETURN p_current_date + INTERVAL '1 day';
    WHEN 'weekly' THEN
      RETURN p_current_date + INTERVAL '1 week';
    WHEN 'monthly' THEN
      RETURN p_current_date + INTERVAL '1 month';
    WHEN 'yearly' THEN
      RETURN p_current_date + INTERVAL '1 year';
    ELSE
      RETURN p_current_date + INTERVAL '1 month'; -- Default to monthly
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. FUNCTION TO PROCESS RECURRING EXPENSES
-- ============================================

CREATE OR REPLACE FUNCTION process_due_recurring_expenses()
RETURNS TABLE(
  processed_count INTEGER,
  failed_count INTEGER,
  skipped_count INTEGER
) AS $$
DECLARE
  recurring_exp RECORD;
  transaction_id UUID;
  v_processed_count INTEGER := 0;
  v_failed_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
BEGIN
  -- Loop through all active recurring expenses that are due today or overdue
  FOR recurring_exp IN 
    SELECT * FROM recurring_expenses
    WHERE is_active = true
      AND next_due_date <= CURRENT_DATE
      AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    ORDER BY next_due_date
  LOOP
    BEGIN
      -- Check if auto_process is enabled
      IF recurring_exp.auto_process THEN
        -- Create the expense transaction
        INSERT INTO account_transactions (
          account_id,
          transaction_type,
          amount,
          description,
          reference_number,
          metadata,
          created_at
        ) VALUES (
          recurring_exp.account_id,
          'expense',
          recurring_exp.amount,
          recurring_exp.name || ': ' || COALESCE(recurring_exp.description, ''),
          COALESCE(recurring_exp.reference_prefix, 'AUTO') || '-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD'),
          jsonb_build_object(
            'category', recurring_exp.category,
            'vendor_name', recurring_exp.vendor_name,
            'expense_date', CURRENT_DATE,
            'created_via', 'auto_recurring',
            'recurring_expense_id', recurring_exp.id,
            'frequency', recurring_exp.frequency
          ),
          NOW()
        )
        RETURNING id INTO transaction_id;

        -- Record in history
        INSERT INTO recurring_expense_history (
          recurring_expense_id,
          transaction_id,
          processed_date,
          amount,
          status
        ) VALUES (
          recurring_exp.id,
          transaction_id,
          CURRENT_DATE,
          recurring_exp.amount,
          'processed'
        );

        v_processed_count := v_processed_count + 1;
      ELSE
        -- Just record as skipped (manual processing required)
        INSERT INTO recurring_expense_history (
          recurring_expense_id,
          transaction_id,
          processed_date,
          amount,
          status
        ) VALUES (
          recurring_exp.id,
          NULL,
          CURRENT_DATE,
          recurring_exp.amount,
          'skipped'
        );

        v_skipped_count := v_skipped_count + 1;
      END IF;

      -- Update next due date
      UPDATE recurring_expenses
      SET 
        next_due_date = calculate_next_due_date(next_due_date, frequency),
        last_processed_date = CURRENT_DATE,
        updated_at = NOW()
      WHERE id = recurring_exp.id;

    EXCEPTION WHEN OTHERS THEN
      -- Log failure
      INSERT INTO recurring_expense_history (
        recurring_expense_id,
        transaction_id,
        processed_date,
        amount,
        status,
        failure_reason
      ) VALUES (
        recurring_exp.id,
        NULL,
        CURRENT_DATE,
        recurring_exp.amount,
        'failed',
        SQLERRM
      );

      v_failed_count := v_failed_count + 1;
    END;
  END LOOP;

  RETURN QUERY SELECT v_processed_count, v_failed_count, v_skipped_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. CREATE SAMPLE RECURRING EXPENSES
-- ============================================

-- Get Cash account ID
DO $$
DECLARE
  v_cash_account_id UUID;
  v_bank_account_id UUID;
BEGIN
  -- Get Cash account
  SELECT id INTO v_cash_account_id
  FROM finance_accounts
  WHERE type = 'cash' AND is_active = true
  LIMIT 1;

  -- Get Bank account
  SELECT id INTO v_bank_account_id
  FROM finance_accounts
  WHERE type = 'bank' AND is_active = true
  LIMIT 1;

  -- Only insert if we have accounts and no recurring expenses exist
  IF v_cash_account_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM recurring_expenses) THEN
    
    -- Example 1: Monthly Office Rent
    INSERT INTO recurring_expenses (
      name,
      description,
      account_id,
      category,
      amount,
      frequency,
      start_date,
      next_due_date,
      vendor_name,
      reference_prefix,
      auto_process
    ) VALUES (
      'Office Rent',
      'Monthly office rent payment',
      COALESCE(v_bank_account_id, v_cash_account_id),
      'Rent',
      150000,
      'monthly',
      DATE_TRUNC('month', CURRENT_DATE)::DATE,
      (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::DATE,
      'ABC Properties',
      'RENT',
      false  -- Manual approval required
    );

    -- Example 2: Monthly Electricity
    INSERT INTO recurring_expenses (
      name,
      description,
      account_id,
      category,
      amount,
      frequency,
      start_date,
      next_due_date,
      vendor_name,
      reference_prefix,
      auto_process
    ) VALUES (
      'Electricity Bill',
      'Monthly electricity payment',
      v_cash_account_id,
      'Utilities',
      25000,
      'monthly',
      DATE_TRUNC('month', CURRENT_DATE)::DATE,
      (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::DATE,
      'TANESCO',
      'ELEC',
      false  -- Manual approval required
    );

    -- Example 3: Weekly Cleaning Services
    INSERT INTO recurring_expenses (
      name,
      description,
      account_id,
      category,
      amount,
      frequency,
      start_date,
      next_due_date,
      reference_prefix,
      auto_process
    ) VALUES (
      'Cleaning Services',
      'Weekly office cleaning',
      v_cash_account_id,
      'Maintenance',
      15000,
      'weekly',
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '1 week',
      'CLEAN',
      false  -- Manual approval required
    );

    RAISE NOTICE '';
    RAISE NOTICE '✅ Sample recurring expenses created!';
    RAISE NOTICE '';
  END IF;
END $$;

-- ============================================
-- 6. VERIFICATION
-- ============================================

SELECT '═══════════════════════════════════════════════' as "═══════════════════════════════════════════════";
SELECT '   RECURRING EXPENSES SYSTEM STATUS' as "STATUS";
SELECT '═══════════════════════════════════════════════' as "═══════════════════════════════════════════════";

-- Show all recurring expenses
SELECT 
  name,
  category,
  amount,
  frequency,
  next_due_date,
  auto_process,
  is_active,
  CASE 
    WHEN next_due_date <= CURRENT_DATE THEN '⚠️ DUE NOW'
    WHEN next_due_date <= CURRENT_DATE + INTERVAL '7 days' THEN '📅 DUE SOON'
    ELSE '✅ SCHEDULED'
  END as status
FROM recurring_expenses
ORDER BY next_due_date;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Recurring expenses system is ready!';
  RAISE NOTICE '';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '  • Automatic expense scheduling';
  RAISE NOTICE '  • Daily/Weekly/Monthly/Yearly frequencies';
  RAISE NOTICE '  • Auto-process or manual approval';
  RAISE NOTICE '  • Complete history tracking';
  RAISE NOTICE '  • Notification system ready';
  RAISE NOTICE '';
  RAISE NOTICE 'To process due expenses manually, run:';
  RAISE NOTICE '  SELECT * FROM process_due_recurring_expenses();';
  RAISE NOTICE '';
  RAISE NOTICE 'UI components will allow you to:';
  RAISE NOTICE '  • Create recurring expenses';
  RAISE NOTICE '  • Edit schedules';
  RAISE NOTICE '  • Pause/resume';
  RAISE NOTICE '  • View history';
  RAISE NOTICE '  • Process manually';
  RAISE NOTICE '';
END $$;

