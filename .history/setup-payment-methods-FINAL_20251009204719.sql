-- ================================================================================
-- COMPLETE PAYMENT METHODS SETUP FOR POS - FINAL ROBUST VERSION
-- ================================================================================
-- This script handles ANY table structure and adds missing columns safely
-- Compatible with Neon Database
-- Run this in your Neon Database SQL Editor
-- ================================================================================

BEGIN;

-- ============================================================
-- 1. CREATE FINANCE ACCOUNTS TABLE (if it doesn't exist)
-- ============================================================

CREATE TABLE IF NOT EXISTS finance_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  account_type TEXT,
  balance NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

RAISE NOTICE '✅ Ensured finance_accounts table exists';

-- ============================================================
-- 2. ADD ALL REQUIRED COLUMNS (if they don't exist)
-- ============================================================

-- Add 'account_name' column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'finance_accounts' AND column_name = 'account_name'
  ) THEN
    ALTER TABLE finance_accounts ADD COLUMN account_name TEXT;
    RAISE NOTICE '✅ Added account_name column';
  ELSE
    RAISE NOTICE '✅ account_name column already exists';
  END IF;
END $$;

-- Add 'account_number' column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'finance_accounts' AND column_name = 'account_number'
  ) THEN
    ALTER TABLE finance_accounts ADD COLUMN account_number TEXT;
    RAISE NOTICE '✅ Added account_number column';
  ELSE
    RAISE NOTICE '✅ account_number column already exists';
  END IF;
END $$;

-- Add 'type' column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'finance_accounts' AND column_name = 'type'
  ) THEN
    ALTER TABLE finance_accounts ADD COLUMN type TEXT;
    RAISE NOTICE '✅ Added type column';
  ELSE
    RAISE NOTICE '✅ type column already exists';
  END IF;
END $$;

-- Add 'current_balance' column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'finance_accounts' AND column_name = 'current_balance'
  ) THEN
    ALTER TABLE finance_accounts ADD COLUMN current_balance NUMERIC DEFAULT 0;
    RAISE NOTICE '✅ Added current_balance column';
  ELSE
    RAISE NOTICE '✅ current_balance column already exists';
  END IF;
END $$;

-- Add 'is_payment_method' column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'finance_accounts' AND column_name = 'is_payment_method'
  ) THEN
    ALTER TABLE finance_accounts ADD COLUMN is_payment_method BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Added is_payment_method column';
  ELSE
    RAISE NOTICE '✅ is_payment_method column already exists';
  END IF;
END $$;

-- Add 'is_active' column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'finance_accounts' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE finance_accounts ADD COLUMN is_active BOOLEAN DEFAULT true;
    RAISE NOTICE '✅ Added is_active column';
  ELSE
    RAISE NOTICE '✅ is_active column already exists';
  END IF;
END $$;

-- Add 'icon' column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'finance_accounts' AND column_name = 'icon'
  ) THEN
    ALTER TABLE finance_accounts ADD COLUMN icon TEXT;
    RAISE NOTICE '✅ Added icon column';
  ELSE
    RAISE NOTICE '✅ icon column already exists';
  END IF;
END $$;

-- Add 'color' column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'finance_accounts' AND column_name = 'color'
  ) THEN
    ALTER TABLE finance_accounts ADD COLUMN color TEXT;
    RAISE NOTICE '✅ Added color column';
  ELSE
    RAISE NOTICE '✅ color column already exists';
  END IF;
END $$;

-- Add 'description' column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'finance_accounts' AND column_name = 'description'
  ) THEN
    ALTER TABLE finance_accounts ADD COLUMN description TEXT;
    RAISE NOTICE '✅ Added description column';
  ELSE
    RAISE NOTICE '✅ description column already exists';
  END IF;
END $$;

-- ============================================================
-- 3. SYNCHRONIZE DATA BETWEEN COLUMNS
-- ============================================================

-- Sync type with account_type
UPDATE finance_accounts 
SET type = account_type 
WHERE type IS NULL AND account_type IS NOT NULL;

UPDATE finance_accounts 
SET account_type = type 
WHERE account_type IS NULL AND type IS NOT NULL;

-- Sync name with account_name
UPDATE finance_accounts 
SET account_name = name 
WHERE account_name IS NULL AND name IS NOT NULL;

UPDATE finance_accounts 
SET name = account_name 
WHERE name IS NULL AND account_name IS NOT NULL;

-- Sync balance with current_balance
UPDATE finance_accounts 
SET current_balance = balance 
WHERE current_balance IS NULL AND balance IS NOT NULL;

UPDATE finance_accounts 
SET balance = current_balance 
WHERE balance IS NULL AND current_balance IS NOT NULL;

RAISE NOTICE '✅ Synchronized data between columns';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_finance_accounts_type ON finance_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_finance_accounts_payment ON finance_accounts(is_payment_method);
CREATE INDEX IF NOT EXISTS idx_finance_accounts_active ON finance_accounts(is_active);

-- ============================================================
-- 4. FIX EXISTING PAYMENT METHODS (if any)
-- ============================================================

-- Fix 'card' type to 'credit_card'
UPDATE finance_accounts
SET 
    type = 'credit_card', 
    account_type = 'credit_card'
WHERE (type = 'card' OR account_type = 'card') 
  AND is_payment_method = true;

-- Ensure all payment methods are active
UPDATE finance_accounts
SET is_active = true
WHERE is_payment_method = true;

-- Ensure balances are not null
UPDATE finance_accounts
SET 
    balance = COALESCE(balance, 0),
    current_balance = COALESCE(current_balance, 0)
WHERE is_payment_method = true;

RAISE NOTICE '✅ Fixed existing payment methods';

-- ============================================================
-- 5. CREATE DEFAULT PAYMENT METHODS (if none exist)
-- ============================================================

DO $$
DECLARE
  payment_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO payment_count 
  FROM finance_accounts 
  WHERE is_payment_method = true;
  
  IF payment_count = 0 THEN
    -- Insert default payment methods
    INSERT INTO finance_accounts (
      name, 
      account_name, 
      type, 
      account_type, 
      balance, 
      current_balance, 
      currency, 
      is_active, 
      is_payment_method, 
      icon, 
      color, 
      description
    )
    VALUES 
      -- Cash payment
      (
        'Cash', 
        'Cash', 
        'cash', 
        'cash', 
        0, 
        0, 
        'USD', 
        true, 
        true, 
        'Wallet', 
        '#10B981', 
        'Cash payments'
      ),
      
      -- Mobile Money payment
      (
        'Mobile Money', 
        'Mobile Money', 
        'mobile_money', 
        'mobile_money', 
        0, 
        0, 
        'USD', 
        true, 
        true, 
        'Smartphone', 
        '#8B5CF6', 
        'Mobile money payments (M-Pesa, etc.)'
      ),
      
      -- Credit Card payment
      (
        'Credit/Debit Card', 
        'Credit/Debit Card', 
        'credit_card', 
        'credit_card', 
        0, 
        0, 
        'USD', 
        true, 
        true, 
        'CreditCard', 
        '#EC4899', 
        'Card payments'
      ),
      
      -- Bank Transfer payment
      (
        'Bank Transfer', 
        'Bank Transfer', 
        'bank', 
        'bank', 
        0, 
        0, 
        'USD', 
        true, 
        true, 
        'Building2', 
        '#3B82F6', 
        'Bank transfer payments'
      );
    
    RAISE NOTICE '✅ Created 4 default payment methods';
  ELSE
    RAISE NOTICE '✅ Payment methods already exist (% found)', payment_count;
  END IF;
END $$;

-- ============================================================
-- 6. UPDATE ICONS AND COLORS FOR ALL PAYMENT METHODS
-- ============================================================

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

RAISE NOTICE '✅ Updated icons and colors';

-- ============================================================
-- 7. GRANT PERMISSIONS (Neon compatible)
-- ============================================================

DO $$
BEGIN
  -- Try to grant to authenticated (Supabase style)
  BEGIN
    GRANT ALL ON finance_accounts TO authenticated;
    RAISE NOTICE '✅ Granted permissions to authenticated role';
  EXCEPTION WHEN undefined_object THEN
    -- If authenticated doesn't exist, grant to public (Neon style)
    GRANT ALL ON finance_accounts TO public;
    RAISE NOTICE '✅ Granted permissions to public role';
  END;
END $$;

-- ============================================================
-- 8. DISABLE RLS (if it exists and causes issues)
-- ============================================================

DO $$
BEGIN
  ALTER TABLE finance_accounts DISABLE ROW LEVEL SECURITY;
  RAISE NOTICE '✅ Disabled Row Level Security';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️  RLS disable skipped (may not be enabled)';
END $$;

-- ============================================================
-- 9. VERIFICATION & SUMMARY
-- ============================================================

DO $$
DECLARE
  total_methods INTEGER;
  active_methods INTEGER;
  cash_methods INTEGER;
  mobile_methods INTEGER;
  card_methods INTEGER;
  bank_methods INTEGER;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(CASE WHEN is_active = true THEN 1 END),
    COUNT(CASE WHEN COALESCE(type, account_type) = 'cash' THEN 1 END),
    COUNT(CASE WHEN COALESCE(type, account_type) = 'mobile_money' THEN 1 END),
    COUNT(CASE WHEN COALESCE(type, account_type) = 'credit_card' THEN 1 END),
    COUNT(CASE WHEN COALESCE(type, account_type) = 'bank' THEN 1 END)
  INTO total_methods, active_methods, cash_methods, mobile_methods, card_methods, bank_methods
  FROM finance_accounts
  WHERE is_payment_method = true;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ PAYMENT METHODS SETUP COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 SUMMARY:';
  RAISE NOTICE '  • Total Payment Methods: %', total_methods;
  RAISE NOTICE '  • Active Payment Methods: %', active_methods;
  RAISE NOTICE '  • Cash Methods: %', cash_methods;
  RAISE NOTICE '  • Mobile Money Methods: %', mobile_methods;
  RAISE NOTICE '  • Card Methods: %', card_methods;
  RAISE NOTICE '  • Bank Methods: %', bank_methods;
  RAISE NOTICE '';
  
  IF total_methods = 0 THEN
    RAISE NOTICE '❌ ERROR: No payment methods found!';
  ELSIF active_methods = 0 THEN
    RAISE NOTICE '⚠️  WARNING: No active payment methods!';
  ELSE
    RAISE NOTICE '✅ Payment methods ready to use!';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

COMMIT;

-- ============================================================
-- VERIFICATION QUERY
-- ============================================================

SELECT 
    'Payment Methods' as category,
    id,
    name,
    COALESCE(account_name, name) as account_name,
    COALESCE(type, account_type) as payment_type,
    COALESCE(balance, 0) as balance,
    currency,
    is_active,
    is_payment_method,
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

