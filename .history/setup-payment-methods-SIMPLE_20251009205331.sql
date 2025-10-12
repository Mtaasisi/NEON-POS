-- ================================================================================
-- PAYMENT METHODS SETUP - SIMPLE VERSION
-- ================================================================================
-- Run this in your Neon Database
-- ================================================================================

-- Step 1: Add missing columns to finance_accounts table
DO $$ 
BEGIN
  -- Add account_name if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_accounts' AND column_name = 'account_name') THEN
    ALTER TABLE finance_accounts ADD COLUMN account_name TEXT;
  END IF;
  
  -- Add account_number if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_accounts' AND column_name = 'account_number') THEN
    ALTER TABLE finance_accounts ADD COLUMN account_number TEXT;
  END IF;
  
  -- Add type if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_accounts' AND column_name = 'type') THEN
    ALTER TABLE finance_accounts ADD COLUMN type TEXT;
  END IF;
  
  -- Add current_balance if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_accounts' AND column_name = 'current_balance') THEN
    ALTER TABLE finance_accounts ADD COLUMN current_balance NUMERIC DEFAULT 0;
  END IF;
  
  -- Add is_payment_method if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_accounts' AND column_name = 'is_payment_method') THEN
    ALTER TABLE finance_accounts ADD COLUMN is_payment_method BOOLEAN DEFAULT false;
  END IF;
  
  -- Add is_active if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_accounts' AND column_name = 'is_active') THEN
    ALTER TABLE finance_accounts ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
  
  -- Add icon if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_accounts' AND column_name = 'icon') THEN
    ALTER TABLE finance_accounts ADD COLUMN icon TEXT;
  END IF;
  
  -- Add color if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_accounts' AND column_name = 'color') THEN
    ALTER TABLE finance_accounts ADD COLUMN color TEXT;
  END IF;
  
  -- Add description if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_accounts' AND column_name = 'description') THEN
    ALTER TABLE finance_accounts ADD COLUMN description TEXT;
  END IF;
  
  RAISE NOTICE 'Columns added successfully';
END $$;

-- Step 2: Sync data between columns
UPDATE finance_accounts SET type = account_type WHERE type IS NULL AND account_type IS NOT NULL;
UPDATE finance_accounts SET account_type = type WHERE account_type IS NULL AND type IS NOT NULL;
UPDATE finance_accounts SET account_name = name WHERE account_name IS NULL AND name IS NOT NULL;
UPDATE finance_accounts SET name = account_name WHERE name IS NULL AND account_name IS NOT NULL;
UPDATE finance_accounts SET current_balance = balance WHERE current_balance IS NULL AND balance IS NOT NULL;
UPDATE finance_accounts SET balance = current_balance WHERE balance IS NULL AND current_balance IS NOT NULL;

-- Step 3: Fix existing payment methods
UPDATE finance_accounts
SET type = 'credit_card', account_type = 'credit_card'
WHERE (type = 'card' OR account_type = 'card') AND is_payment_method = true;

UPDATE finance_accounts
SET is_active = true
WHERE is_payment_method = true;

UPDATE finance_accounts
SET balance = COALESCE(balance, 0),
    current_balance = COALESCE(current_balance, 0)
WHERE is_payment_method = true;

-- Step 4: Create default payment methods if none exist
INSERT INTO finance_accounts (
  name, account_name, type, account_type, balance, current_balance, 
  currency, is_active, is_payment_method, icon, color, description
)
SELECT * FROM (VALUES
  ('Cash', 'Cash', 'cash', 'cash', 0, 0, 'USD', true, true, 'Wallet', '#10B981', 'Cash payments'),
  ('Mobile Money', 'Mobile Money', 'mobile_money', 'mobile_money', 0, 0, 'USD', true, true, 'Smartphone', '#8B5CF6', 'Mobile money payments (M-Pesa, etc.)'),
  ('Credit/Debit Card', 'Credit/Debit Card', 'credit_card', 'credit_card', 0, 0, 'USD', true, true, 'CreditCard', '#EC4899', 'Card payments'),
  ('Bank Transfer', 'Bank Transfer', 'bank', 'bank', 0, 0, 'USD', true, true, 'Building2', '#3B82F6', 'Bank transfer payments')
) AS new_methods(name, account_name, type, account_type, balance, current_balance, currency, is_active, is_payment_method, icon, color, description)
WHERE NOT EXISTS (
  SELECT 1 FROM finance_accounts WHERE is_payment_method = true
);

-- Step 5: Update icons and colors for all payment methods
UPDATE finance_accounts
SET 
    icon = CASE 
        WHEN COALESCE(type, account_type) = 'cash' THEN 'Wallet'
        WHEN COALESCE(type, account_type) = 'mobile_money' THEN 'Smartphone'
        WHEN COALESCE(type, account_type) = 'credit_card' THEN 'CreditCard'
        WHEN COALESCE(type, account_type) = 'bank' THEN 'Building2'
        ELSE COALESCE(icon, 'Wallet')
    END,
    color = CASE 
        WHEN COALESCE(type, account_type) = 'cash' THEN '#10B981'
        WHEN COALESCE(type, account_type) = 'mobile_money' THEN '#8B5CF6'
        WHEN COALESCE(type, account_type) = 'credit_card' THEN '#EC4899'
        WHEN COALESCE(type, account_type) = 'bank' THEN '#3B82F6'
        ELSE COALESCE(color, '#6B7280')
    END
WHERE is_payment_method = true;

-- Step 6: Grant permissions
DO $$
BEGIN
  BEGIN
    GRANT ALL ON finance_accounts TO authenticated;
  EXCEPTION WHEN undefined_object THEN
    GRANT ALL ON finance_accounts TO public;
  END;
END $$;

-- Step 7: Disable RLS
DO $$
BEGIN
  ALTER TABLE finance_accounts DISABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Verification query
SELECT 
    '✅ Payment Methods Setup Complete' as status,
    COUNT(*) as total_methods,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_methods
FROM finance_accounts
WHERE is_payment_method = true;

-- Show all payment methods
SELECT 
    id,
    name,
    COALESCE(type, account_type) as payment_type,
    balance,
    is_active,
    icon,
    color
FROM finance_accounts
WHERE is_payment_method = true
ORDER BY name;

