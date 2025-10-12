-- ============================================================================
-- FIX PAYMENT ACCOUNTS SCHEMA
-- ============================================================================
-- This fixes the finance_accounts table schema and creates account_transactions
-- Run this in your Neon SQL Editor
-- ============================================================================

-- Step 1: Update finance_accounts table to match what the code expects
-- Add missing columns if they don't exist
DO $$ 
BEGIN
  -- Add name column (mapped from account_name)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='finance_accounts' AND column_name='name') THEN
    ALTER TABLE finance_accounts ADD COLUMN name TEXT;
    UPDATE finance_accounts SET name = account_name WHERE name IS NULL;
  END IF;

  -- Add type column (mapped from account_type)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='finance_accounts' AND column_name='type') THEN
    ALTER TABLE finance_accounts ADD COLUMN type TEXT;
    UPDATE finance_accounts SET type = LOWER(account_type) WHERE type IS NULL;
  END IF;

  -- Add balance column (mapped from current_balance)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='finance_accounts' AND column_name='balance') THEN
    ALTER TABLE finance_accounts ADD COLUMN balance NUMERIC DEFAULT 0;
    UPDATE finance_accounts SET balance = COALESCE(current_balance, 0) WHERE balance IS NULL OR balance = 0;
  END IF;

  -- Add is_payment_method column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='finance_accounts' AND column_name='is_payment_method') THEN
    ALTER TABLE finance_accounts ADD COLUMN is_payment_method BOOLEAN DEFAULT true;
  END IF;

  -- Add requires_reference column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='finance_accounts' AND column_name='requires_reference') THEN
    ALTER TABLE finance_accounts ADD COLUMN requires_reference BOOLEAN DEFAULT false;
  END IF;

  -- Add requires_account_number column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='finance_accounts' AND column_name='requires_account_number') THEN
    ALTER TABLE finance_accounts ADD COLUMN requires_account_number BOOLEAN DEFAULT false;
  END IF;

  -- Add description column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='finance_accounts' AND column_name='description') THEN
    ALTER TABLE finance_accounts ADD COLUMN description TEXT;
  END IF;

  -- Add icon column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='finance_accounts' AND column_name='icon') THEN
    ALTER TABLE finance_accounts ADD COLUMN icon TEXT;
  END IF;

  -- Add color column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='finance_accounts' AND column_name='color') THEN
    ALTER TABLE finance_accounts ADD COLUMN color TEXT;
  END IF;
END $$;

-- Step 2: Create account_transactions table
CREATE TABLE IF NOT EXISTS account_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES finance_accounts(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL, -- 'payment_received', 'payment_made', 'expense', 'transfer_in', 'transfer_out'
  amount NUMERIC NOT NULL,
  balance_before NUMERIC DEFAULT 0,
  balance_after NUMERIC DEFAULT 0,
  reference_number TEXT,
  description TEXT,
  related_transaction_id UUID, -- For transfers, links the two sides
  metadata JSONB, -- Store additional data like customer_id, order_id, etc.
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_account_transactions_account_id 
  ON account_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_account_transactions_type 
  ON account_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_account_transactions_created_at 
  ON account_transactions(created_at DESC);

-- Step 3: Create a function to automatically create account transactions
CREATE OR REPLACE FUNCTION create_account_transaction(
  p_account_id UUID,
  p_transaction_type TEXT,
  p_amount NUMERIC,
  p_reference_number TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  -- Get current balance
  SELECT balance INTO v_current_balance
  FROM finance_accounts
  WHERE id = p_account_id;

  -- Calculate new balance based on transaction type
  IF p_transaction_type IN ('payment_received', 'transfer_in') THEN
    v_new_balance := v_current_balance + p_amount;
  ELSE
    v_new_balance := v_current_balance - p_amount;
  END IF;

  -- Insert transaction
  INSERT INTO account_transactions (
    account_id,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    reference_number,
    description,
    metadata,
    created_by
  ) VALUES (
    p_account_id,
    p_transaction_type,
    p_amount,
    v_current_balance,
    v_new_balance,
    p_reference_number,
    p_description,
    p_metadata,
    p_created_by
  ) RETURNING id INTO v_transaction_id;

  -- Update account balance
  UPDATE finance_accounts
  SET balance = v_new_balance,
      updated_at = NOW()
  WHERE id = p_account_id;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Set default icons and colors for existing accounts based on type
UPDATE finance_accounts
SET 
  icon = CASE 
    WHEN type = 'cash' OR account_type ILIKE '%cash%' THEN 'Wallet'
    WHEN type = 'bank' OR account_type ILIKE '%bank%' THEN 'Building2'
    WHEN type = 'mobile_money' OR account_type ILIKE '%mobile%' OR account_type ILIKE '%mpesa%' OR account_type ILIKE '%tigo%' THEN 'Smartphone'
    WHEN type = 'card' OR account_type ILIKE '%card%' THEN 'CreditCard'
    WHEN type = 'savings' OR account_type ILIKE '%saving%' THEN 'PiggyBank'
    WHEN type = 'investment' OR account_type ILIKE '%invest%' THEN 'TrendingUp'
    ELSE 'DollarSign'
  END,
  color = CASE 
    WHEN type = 'cash' OR account_type ILIKE '%cash%' THEN '#10B981'
    WHEN type = 'bank' OR account_type ILIKE '%bank%' THEN '#3B82F6'
    WHEN type = 'mobile_money' OR account_type ILIKE '%mobile%' OR account_type ILIKE '%mpesa%' OR account_type ILIKE '%tigo%' THEN '#8B5CF6'
    WHEN type = 'card' OR account_type ILIKE '%card%' THEN '#EC4899'
    WHEN type = 'savings' OR account_type ILIKE '%saving%' THEN '#F59E0B'
    WHEN type = 'investment' OR account_type ILIKE '%invest%' THEN '#14B8A6'
    ELSE '#6B7280'
  END
WHERE icon IS NULL OR color IS NULL;

-- Step 5: Ensure all accounts have the required fields populated
UPDATE finance_accounts
SET 
  name = account_name
WHERE name IS NULL OR name = '';

UPDATE finance_accounts
SET 
  type = LOWER(account_type)
WHERE type IS NULL OR type = '';

UPDATE finance_accounts
SET 
  balance = COALESCE(current_balance, 0)
WHERE balance IS NULL;

UPDATE finance_accounts
SET 
  is_payment_method = true,
  is_active = true
WHERE is_payment_method IS NULL;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check finance_accounts structure
SELECT 
  'finance_accounts columns' as check_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'finance_accounts'
  AND column_name IN ('id', 'name', 'type', 'balance', 'is_payment_method', 
                      'is_active', 'currency', 'icon', 'color');

-- Check account_transactions table
SELECT 
  'account_transactions exists' as check_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'account_transactions'
  ) THEN 'YES' ELSE 'NO' END as result;

-- Show sample accounts
SELECT 
  id,
  name,
  type,
  balance,
  currency,
  is_payment_method,
  is_active,
  icon,
  color
FROM finance_accounts
LIMIT 5;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
SELECT '✅ Payment accounts schema fixed successfully!' as status;
SELECT '✅ account_transactions table created!' as status;
SELECT '✅ Transaction helper function created!' as status;

