-- ================================================================================
-- PAYMENT METHODS SETUP - WORKING VERSION
-- ================================================================================
-- Tailored to your exact database structure
-- ================================================================================

-- Step 1: Add currency column if missing
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_accounts' AND column_name = 'currency') THEN
    ALTER TABLE finance_accounts ADD COLUMN currency TEXT DEFAULT 'USD';
    RAISE NOTICE 'Added currency column';
  ELSE
    RAISE NOTICE 'Currency column already exists';
  END IF;
END $$;

-- Step 2: Sync data between type and account_type columns
UPDATE finance_accounts SET type = account_type WHERE type IS NULL AND account_type IS NOT NULL;
UPDATE finance_accounts SET account_type = type WHERE account_type IS NULL AND type IS NOT NULL;
UPDATE finance_accounts SET account_name = name WHERE account_name IS NULL;
UPDATE finance_accounts SET current_balance = COALESCE(balance, 0) WHERE current_balance IS NULL;
UPDATE finance_accounts SET balance = COALESCE(current_balance, 0) WHERE balance IS NULL;

-- Step 3: Fix 'card' to 'credit_card'
UPDATE finance_accounts
SET type = 'credit_card', account_type = 'credit_card'
WHERE (type = 'card' OR account_type = 'card') AND is_payment_method = true;

-- Step 4: Ensure all payment methods are active
UPDATE finance_accounts
SET is_active = true
WHERE is_payment_method = true;

-- Step 5: Create default payment methods (only if none exist)
DO $$
DECLARE
  payment_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO payment_count FROM finance_accounts WHERE is_payment_method = true;
  
  IF payment_count = 0 THEN
    -- Insert payment methods
    INSERT INTO finance_accounts (
      name, account_name, type, account_type, balance, current_balance, 
      currency, is_active, is_payment_method, icon, color, description,
      requires_reference, requires_account_number
    ) VALUES
      ('Cash', 'Cash', 'cash', 'cash', 0, 0, 'USD', true, true, 'Wallet', '#10B981', 'Cash payments', false, false),
      ('Mobile Money', 'Mobile Money', 'mobile_money', 'mobile_money', 0, 0, 'USD', true, true, 'Smartphone', '#8B5CF6', 'Mobile money payments (M-Pesa, etc.)', false, false),
      ('Credit/Debit Card', 'Credit/Debit Card', 'credit_card', 'credit_card', 0, 0, 'USD', true, true, 'CreditCard', '#EC4899', 'Card payments', false, false),
      ('Bank Transfer', 'Bank Transfer', 'bank', 'bank', 0, 0, 'USD', true, true, 'Building2', '#3B82F6', 'Bank transfer payments', false, false);
    
    RAISE NOTICE 'Created 4 default payment methods';
  ELSE
    RAISE NOTICE 'Payment methods already exist (% found)', payment_count;
  END IF;
END $$;

-- Step 6: Update icons and colors for all payment methods
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
    END,
    description = CASE 
        WHEN description IS NULL AND COALESCE(type, account_type) = 'cash' THEN 'Cash payments'
        WHEN description IS NULL AND COALESCE(type, account_type) = 'mobile_money' THEN 'Mobile money payments'
        WHEN description IS NULL AND COALESCE(type, account_type) = 'credit_card' THEN 'Card payments'
        WHEN description IS NULL AND COALESCE(type, account_type) = 'bank' THEN 'Bank transfer payments'
        ELSE description
    END
WHERE is_payment_method = true;

-- Step 7: Grant permissions
DO $$
BEGIN
  BEGIN
    GRANT ALL ON finance_accounts TO authenticated;
    RAISE NOTICE 'Granted permissions to authenticated role';
  EXCEPTION WHEN undefined_object THEN
    GRANT ALL ON finance_accounts TO public;
    RAISE NOTICE 'Granted permissions to public role';
  END;
END $$;

-- Step 8: Disable RLS
DO $$
BEGIN
  ALTER TABLE finance_accounts DISABLE ROW LEVEL SECURITY;
  RAISE NOTICE 'Disabled Row Level Security';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS disable skipped';
END $$;

-- ======================================================================
-- VERIFICATION
-- ======================================================================

-- Summary
SELECT 
    '✅ PAYMENT METHODS SETUP COMPLETE' as status,
    COUNT(*) as total_methods,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_methods,
    COUNT(CASE WHEN COALESCE(type, account_type) = 'cash' THEN 1 END) as cash_methods,
    COUNT(CASE WHEN COALESCE(type, account_type) = 'mobile_money' THEN 1 END) as mobile_money_methods,
    COUNT(CASE WHEN COALESCE(type, account_type) = 'credit_card' THEN 1 END) as card_methods,
    COUNT(CASE WHEN COALESCE(type, account_type) = 'bank' THEN 1 END) as bank_methods
FROM finance_accounts
WHERE is_payment_method = true;

-- Show all payment methods
SELECT 
    '📊 Available Payment Methods' as info,
    name,
    COALESCE(type, account_type) as payment_type,
    balance,
    is_active,
    icon,
    color,
    description
FROM finance_accounts
WHERE is_payment_method = true
ORDER BY 
    CASE COALESCE(type, account_type)
        WHEN 'cash' THEN 1
        WHEN 'mobile_money' THEN 2
        WHEN 'credit_card' THEN 3
        WHEN 'bank' THEN 4
        ELSE 5
    END;

