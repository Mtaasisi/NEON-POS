-- ================================================================================
-- FINAL PAYMENT METHODS FIX - SCHEMA AWARE
-- ================================================================================
-- This script intelligently fixes payment methods by:
-- 1. Detecting which columns exist
-- 2. Adding missing required columns
-- 3. Synchronizing data between old/new column names
-- 4. Creating default payment methods
-- 5. Ensuring all payment methods are properly configured
-- ================================================================================
-- 
-- INSTRUCTIONS:
-- 1. First run diagnose-payment-methods.sql to see your current schema
-- 2. Then run this script to fix everything
-- 3. Restart your app to see payment methods load
-- ================================================================================

BEGIN;

-- ============================================================================
-- STEP 1: ADD MISSING COLUMNS (Only if they don't exist)
-- ============================================================================

DO $$ 
BEGIN
  RAISE NOTICE '=== STEP 1: Adding Missing Columns ===';
  
  -- Add 'name' column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='finance_accounts' AND column_name='name') THEN
    ALTER TABLE finance_accounts ADD COLUMN name TEXT;
    RAISE NOTICE '✅ Added column: name';
  ELSE
    RAISE NOTICE '✓ Column already exists: name';
  END IF;

  -- Add 'type' column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='finance_accounts' AND column_name='type') THEN
    ALTER TABLE finance_accounts ADD COLUMN type TEXT;
    RAISE NOTICE '✅ Added column: type';
  ELSE
    RAISE NOTICE '✓ Column already exists: type';
  END IF;

  -- Add 'balance' column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='finance_accounts' AND column_name='balance') THEN
    ALTER TABLE finance_accounts ADD COLUMN balance NUMERIC DEFAULT 0;
    RAISE NOTICE '✅ Added column: balance';
  ELSE
    RAISE NOTICE '✓ Column already exists: balance';
  END IF;

  -- Add 'is_payment_method' column (CRITICAL!)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='finance_accounts' AND column_name='is_payment_method') THEN
    ALTER TABLE finance_accounts ADD COLUMN is_payment_method BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Added column: is_payment_method (CRITICAL)';
  ELSE
    RAISE NOTICE '✓ Column already exists: is_payment_method';
  END IF;

  -- Add 'is_active' column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='finance_accounts' AND column_name='is_active') THEN
    ALTER TABLE finance_accounts ADD COLUMN is_active BOOLEAN DEFAULT true;
    RAISE NOTICE '✅ Added column: is_active';
  ELSE
    RAISE NOTICE '✓ Column already exists: is_active';
  END IF;

  -- Add 'currency' column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='finance_accounts' AND column_name='currency') THEN
    ALTER TABLE finance_accounts ADD COLUMN currency TEXT DEFAULT 'TZS';
    RAISE NOTICE '✅ Added column: currency';
  ELSE
    RAISE NOTICE '✓ Column already exists: currency';
  END IF;

  -- Add 'icon' column for payment method icons
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='finance_accounts' AND column_name='icon') THEN
    ALTER TABLE finance_accounts ADD COLUMN icon TEXT;
    RAISE NOTICE '✅ Added column: icon';
  ELSE
    RAISE NOTICE '✓ Column already exists: icon';
  END IF;

  -- Add 'color' column for payment method colors
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='finance_accounts' AND column_name='color') THEN
    ALTER TABLE finance_accounts ADD COLUMN color TEXT;
    RAISE NOTICE '✅ Added column: color';
  ELSE
    RAISE NOTICE '✓ Column already exists: color';
  END IF;

  -- Add 'requires_reference' column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='finance_accounts' AND column_name='requires_reference') THEN
    ALTER TABLE finance_accounts ADD COLUMN requires_reference BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Added column: requires_reference';
  ELSE
    RAISE NOTICE '✓ Column already exists: requires_reference';
  END IF;

  -- Add 'requires_account_number' column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='finance_accounts' AND column_name='requires_account_number') THEN
    ALTER TABLE finance_accounts ADD COLUMN requires_account_number BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Added column: requires_account_number';
  ELSE
    RAISE NOTICE '✓ Column already exists: requires_account_number';
  END IF;

END $$;

-- ============================================================================
-- STEP 2: SYNCHRONIZE DATA BETWEEN OLD AND NEW COLUMN NAMES
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=== STEP 2: Synchronizing Column Data ===';

  -- Sync account_name -> name (if account_name exists)
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='finance_accounts' AND column_name='account_name') THEN
    UPDATE finance_accounts 
    SET name = COALESCE(name, account_name)
    WHERE name IS NULL OR name = '';
    RAISE NOTICE '✅ Synced: account_name -> name';
  END IF;

  -- Sync account_type -> type (if account_type exists)
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='finance_accounts' AND column_name='account_type') THEN
    UPDATE finance_accounts 
    SET type = COALESCE(type, LOWER(account_type))
    WHERE type IS NULL OR type = '';
    RAISE NOTICE '✅ Synced: account_type -> type';
  END IF;

  -- Sync current_balance -> balance (if current_balance exists)
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='finance_accounts' AND column_name='current_balance') THEN
    UPDATE finance_accounts 
    SET balance = COALESCE(balance::numeric, current_balance::numeric, 0)
    WHERE balance IS NULL OR balance = 0;
    RAISE NOTICE '✅ Synced: current_balance -> balance';
  END IF;

END $$;

-- ============================================================================
-- STEP 3: FIX DATA TYPES (card -> credit_card)
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=== STEP 3: Fixing Data Types ===';
  
  -- Fix 'card' type to 'credit_card' (TypeScript expects 'credit_card')
  UPDATE finance_accounts
  SET type = 'credit_card'
  WHERE type = 'card';
  
  RAISE NOTICE '✅ Fixed card -> credit_card';
END $$;

-- ============================================================================
-- STEP 4: SET PAYMENT METHOD FLAGS FOR EXISTING ACCOUNTS
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=== STEP 4: Setting Payment Method Flags ===';
  
  -- Mark common payment types as payment methods
  UPDATE finance_accounts
  SET 
    is_payment_method = true,
    is_active = true
  WHERE type IN ('cash', 'mobile_money', 'credit_card', 'bank')
    AND (is_payment_method IS NULL OR is_payment_method = false);
  
  RAISE NOTICE '✅ Marked existing accounts as payment methods';
END $$;

-- ============================================================================
-- STEP 5: ADD ICONS AND COLORS TO PAYMENT METHODS
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=== STEP 5: Adding Icons and Colors ===';
  
  UPDATE finance_accounts
  SET 
    icon = CASE 
      WHEN type = 'cash' THEN 'Wallet'
      WHEN type = 'mobile_money' THEN 'Smartphone'
      WHEN type = 'credit_card' THEN 'CreditCard'
      WHEN type = 'bank' THEN 'Building2'
      WHEN type = 'savings' THEN 'PiggyBank'
      WHEN type = 'investment' THEN 'TrendingUp'
      ELSE 'DollarSign'
    END,
    color = CASE 
      WHEN type = 'cash' THEN '#10B981'
      WHEN type = 'mobile_money' THEN '#8B5CF6'
      WHEN type = 'credit_card' THEN '#EC4899'
      WHEN type = 'bank' THEN '#3B82F6'
      WHEN type = 'savings' THEN '#F59E0B'
      WHEN type = 'investment' THEN '#14B8A6'
      ELSE '#6B7280'
    END
  WHERE is_payment_method = true
    AND (icon IS NULL OR color IS NULL);
  
  RAISE NOTICE '✅ Added icons and colors';
END $$;

-- ============================================================================
-- STEP 6: CREATE DEFAULT PAYMENT METHODS (If none exist)
-- ============================================================================

DO $$
DECLARE
  payment_count INTEGER;
BEGIN
  RAISE NOTICE '=== STEP 6: Creating Default Payment Methods ===';
  
  -- Check if we have any payment methods
  SELECT COUNT(*) INTO payment_count 
  FROM finance_accounts 
  WHERE is_payment_method = true AND is_active = true;
  
  IF payment_count = 0 THEN
    RAISE NOTICE 'No payment methods found. Creating defaults...';
    
    -- Insert Cash
    INSERT INTO finance_accounts (name, type, balance, currency, is_active, is_payment_method, icon, color, requires_reference, requires_account_number)
    VALUES ('Cash', 'cash', 0, 'TZS', true, true, 'Wallet', '#10B981', false, false)
    ON CONFLICT DO NOTHING;
    
    -- Insert M-Pesa
    INSERT INTO finance_accounts (name, type, balance, currency, is_active, is_payment_method, icon, color, requires_reference, requires_account_number)
    VALUES ('M-Pesa', 'mobile_money', 0, 'TZS', true, true, 'Smartphone', '#8B5CF6', true, false)
    ON CONFLICT DO NOTHING;
    
    -- Insert Airtel Money
    INSERT INTO finance_accounts (name, type, balance, currency, is_active, is_payment_method, icon, color, requires_reference, requires_account_number)
    VALUES ('Airtel Money', 'mobile_money', 0, 'TZS', true, true, 'Smartphone', '#8B5CF6', true, false)
    ON CONFLICT DO NOTHING;
    
    -- Insert Card Payments
    INSERT INTO finance_accounts (name, type, balance, currency, is_active, is_payment_method, icon, color, requires_reference, requires_account_number)
    VALUES ('Card Payments', 'credit_card', 0, 'TZS', true, true, 'CreditCard', '#EC4899', true, false)
    ON CONFLICT DO NOTHING;
    
    -- Insert Bank Account
    INSERT INTO finance_accounts (name, type, balance, currency, is_active, is_payment_method, icon, color, requires_reference, requires_account_number)
    VALUES ('Bank Account', 'bank', 0, 'TZS', true, true, 'Building2', '#3B82F6', true, true)
    ON CONFLICT DO NOTHING;
    
    -- Insert Tigo Pesa
    INSERT INTO finance_accounts (name, type, balance, currency, is_active, is_payment_method, icon, color, requires_reference, requires_account_number)
    VALUES ('Tigo Pesa', 'mobile_money', 0, 'TZS', true, true, 'Smartphone', '#8B5CF6', true, false)
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '✅ Created 6 default payment methods';
  ELSE
    RAISE NOTICE '✓ Already have % payment methods', payment_count;
  END IF;
END $$;

-- ============================================================================
-- STEP 7: VERIFICATION
-- ============================================================================

DO $$
DECLARE
  payment_count INTEGER;
BEGIN
  RAISE NOTICE '=== STEP 7: Verification ===';
  
  SELECT COUNT(*) INTO payment_count 
  FROM finance_accounts 
  WHERE is_payment_method = true AND is_active = true;
  
  RAISE NOTICE '✅ Total active payment methods: %', payment_count;
  
  IF payment_count > 0 THEN
    RAISE NOTICE '✅ SUCCESS! Payment methods are ready to use.';
  ELSE
    RAISE NOTICE '❌ WARNING: No payment methods found!';
  END IF;
END $$;

-- Show payment methods
SELECT 
  '=== ACTIVE PAYMENT METHODS ===' as section,
  id,
  name,
  type,
  balance,
  currency,
  icon,
  color,
  is_active,
  is_payment_method
FROM finance_accounts
WHERE is_payment_method = true AND is_active = true
ORDER BY type, name;

COMMIT;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ PAYMENT METHODS FIX COMPLETED SUCCESSFULLY!';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Restart your application: npm run dev';
  RAISE NOTICE '2. Open POS and try to make a sale';
  RAISE NOTICE '3. Payment modal should now show payment methods';
  RAISE NOTICE '';
  RAISE NOTICE 'Console should show:';
  RAISE NOTICE '  ✅ Direct load successful: 5+ methods';
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;

