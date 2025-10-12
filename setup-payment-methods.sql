-- ================================================================================
-- COMPLETE PAYMENT METHODS SETUP FOR POS
-- ================================================================================
-- This script creates the finance_accounts table and sets up default payment methods
-- Run this in your Neon Database SQL Editor
-- ================================================================================

BEGIN;

-- ============================================================
-- 1. CREATE FINANCE ACCOUNTS TABLE (if it doesn't exist)
-- ============================================================

CREATE TABLE IF NOT EXISTS finance_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  account_name TEXT,
  account_number TEXT,
  type TEXT NOT NULL,
  account_type TEXT,
  balance NUMERIC DEFAULT 0,
  current_balance NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  is_active BOOLEAN DEFAULT true,
  is_payment_method BOOLEAN DEFAULT false,
  icon TEXT,
  color TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_finance_accounts_type ON finance_accounts(type);
CREATE INDEX IF NOT EXISTS idx_finance_accounts_payment ON finance_accounts(is_payment_method);
CREATE INDEX IF NOT EXISTS idx_finance_accounts_active ON finance_accounts(is_active);

-- ============================================================
-- 2. FIX EXISTING PAYMENT METHODS (if any)
-- ============================================================

-- Fix 'card' type to 'credit_card' (TypeScript expects 'credit_card')
UPDATE finance_accounts
SET type = 'credit_card', account_type = 'credit_card'
WHERE (type = 'card' OR account_type = 'card') AND is_payment_method = true;

-- Ensure consistent name/account_name
UPDATE finance_accounts
SET name = COALESCE(name, account_name),
    account_name = COALESCE(account_name, name)
WHERE is_payment_method = true;

-- Ensure consistent balance/current_balance
UPDATE finance_accounts
SET balance = COALESCE(balance::numeric, current_balance::numeric, 0),
    current_balance = COALESCE(current_balance::numeric, balance::numeric, 0)
WHERE is_payment_method = true;

-- Ensure all payment methods are active
UPDATE finance_accounts
SET is_active = true
WHERE is_payment_method = true;

-- ============================================================
-- 3. CREATE DEFAULT PAYMENT METHODS (if none exist)
-- ============================================================

-- Only insert if no payment methods exist
DO $$
DECLARE
  payment_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO payment_count FROM finance_accounts WHERE is_payment_method = true;
  
  IF payment_count = 0 THEN
    -- Insert default payment methods
    INSERT INTO finance_accounts (name, account_name, type, account_type, balance, current_balance, currency, is_active, is_payment_method, icon, color, description)
    VALUES 
      -- Cash payment
      ('Cash', 'Cash', 'cash', 'cash', 0, 0, 'USD', true, true, 'Wallet', '#10B981', 'Cash payments'),
      
      -- Mobile Money payment
      ('Mobile Money', 'Mobile Money', 'mobile_money', 'mobile_money', 0, 0, 'USD', true, true, 'Smartphone', '#8B5CF6', 'Mobile money payments (M-Pesa, etc.)'),
      
      -- Credit Card payment
      ('Credit/Debit Card', 'Credit/Debit Card', 'credit_card', 'credit_card', 0, 0, 'USD', true, true, 'CreditCard', '#EC4899', 'Card payments'),
      
      -- Bank Transfer payment
      ('Bank Transfer', 'Bank Transfer', 'bank', 'bank', 0, 0, 'USD', true, true, 'Building2', '#3B82F6', 'Bank transfer payments');
    
    RAISE NOTICE '✅ Created 4 default payment methods';
  ELSE
    RAISE NOTICE '✅ Payment methods already exist (% found)', payment_count;
  END IF;
END $$;

-- ============================================================
-- 4. UPDATE ICONS AND COLORS FOR ALL PAYMENT METHODS
-- ============================================================

UPDATE finance_accounts
SET 
    icon = CASE 
        WHEN type IN ('cash') THEN 'Wallet'
        WHEN type IN ('mobile_money') THEN 'Smartphone'
        WHEN type IN ('credit_card') THEN 'CreditCard'
        WHEN type IN ('bank') THEN 'Building2'
        ELSE COALESCE(icon, 'Wallet')
    END,
    color = CASE 
        WHEN type IN ('cash') THEN '#10B981'
        WHEN type IN ('mobile_money') THEN '#8B5CF6'
        WHEN type IN ('credit_card') THEN '#EC4899'
        WHEN type IN ('bank') THEN '#3B82F6'
        ELSE COALESCE(color, '#6B7280')
    END
WHERE is_payment_method = true;

-- ============================================================
-- 5. GRANT PERMISSIONS (Neon compatible)
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
-- 6. DISABLE RLS (if it exists and causes issues)
-- ============================================================

DO $$
BEGIN
  ALTER TABLE finance_accounts DISABLE ROW LEVEL SECURITY;
  RAISE NOTICE '✅ Disabled Row Level Security';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️  RLS disable skipped (may not be enabled)';
END $$;

-- ============================================================
-- 7. VERIFICATION & SUMMARY
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
    COUNT(CASE WHEN type = 'cash' THEN 1 END),
    COUNT(CASE WHEN type = 'mobile_money' THEN 1 END),
    COUNT(CASE WHEN type = 'credit_card' THEN 1 END),
    COUNT(CASE WHEN type = 'bank' THEN 1 END)
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
-- VERIFICATION QUERY (run this after to verify)
-- ============================================================

SELECT 
    'Payment Methods' as category,
    id,
    name,
    type,
    balance,
    currency,
    is_active,
    is_payment_method,
    icon,
    color,
    description
FROM finance_accounts
WHERE is_payment_method = true
ORDER BY 
    CASE type
        WHEN 'cash' THEN 1
        WHEN 'mobile_money' THEN 2
        WHEN 'credit_card' THEN 3
        WHEN 'bank' THEN 4
        ELSE 5
    END;

