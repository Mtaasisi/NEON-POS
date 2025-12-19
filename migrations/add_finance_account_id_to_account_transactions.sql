-- ================================================
-- ADD finance_account_id TO account_transactions
-- ================================================
-- This migration adds the finance_account_id column to the account_transactions table
-- to link transactions to specific financial accounts.
-- ================================================

-- Add the finance_account_id column if it doesn't exist
ALTER TABLE account_transactions
ADD COLUMN IF NOT EXISTS finance_account_id UUID;

-- Add foreign key constraint to finance_accounts table
DO $$
BEGIN
    -- Check if the column exists and if a foreign key constraint already exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'account_transactions' AND column_name = 'finance_account_id') AND
       NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_account_transactions_finance_account_id')
    THEN
        ALTER TABLE account_transactions
        ADD CONSTRAINT fk_account_transactions_finance_account_id
        FOREIGN KEY (finance_account_id) REFERENCES finance_accounts(id) ON DELETE SET NULL;
        RAISE NOTICE '✅ Added foreign key constraint fk_account_transactions_finance_account_id to account_transactions.';
    ELSE
        RAISE NOTICE 'Skipping adding foreign key constraint: finance_account_id column or constraint already exists.';
    END IF;
END $$;


-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_account_transactions_finance_account_id ON account_transactions(finance_account_id);

-- Enable RLS for the new column if not already enabled (assuming account_transactions already has RLS)
-- No direct RLS policy needed for just adding a column, but good to ensure table has RLS enabled.
ALTER TABLE account_transactions ENABLE ROW LEVEL SECURITY;

-- Verification
DO $$
DECLARE
  column_exists BOOLEAN;
  fk_exists BOOLEAN;
BEGIN
  -- Check if column was created
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'account_transactions'
      AND column_name = 'finance_account_id'
  ) INTO column_exists;

  -- Check if foreign key constraint was created
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_account_transactions_finance_account_id'
  ) INTO fk_exists;

  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ FINANCE_ACCOUNT_ID COLUMN ADDITION COMPLETE';
  RAISE NOTICE '================================================';

  IF column_exists THEN
    RAISE NOTICE '   ✅ finance_account_id column added';
  ELSE
    RAISE EXCEPTION '   ❌ finance_account_id column FAILED to add';
  END IF;

  IF fk_exists THEN
    RAISE NOTICE '   ✅ Foreign key fk_account_transactions_finance_account_id added';
  ELSE
    RAISE NOTICE '   ⚠️ Foreign key fk_account_transactions_finance_account_id was NOT added (might exist or column not present)';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '📊 Current account_transactions structure:';

  FOR column_record IN
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'account_transactions'
    ORDER BY ordinal_position
  LOOP
    RAISE NOTICE '   - % (%)', column_record.column_name, column_record.data_type;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Migration for finance_account_id completed!';
  RAISE NOTICE '================================================';
END $$;
