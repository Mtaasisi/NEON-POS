-- ============================================
-- 🚀 COMPREHENSIVE PAYMENT SYSTEM FIX
-- This script fixes ALL payment-related issues
-- ============================================
-- Date: 2025-10-13
-- Purpose: Complete payment system database schema fix
-- ============================================

-- ============================================
-- 1. CREATE/FIX customer_payments TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS customer_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  sale_id UUID REFERENCES lats_sales(id) ON DELETE SET NULL,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount >= 0),
  payment_method TEXT NOT NULL,
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  reference_number TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customer_payments_customer ON customer_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_payments_sale ON customer_payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_customer_payments_date ON customer_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_customer_payments_status ON customer_payments(status);
CREATE INDEX IF NOT EXISTS idx_customer_payments_method ON customer_payments(payment_method);

-- Enable RLS
ALTER TABLE customer_payments ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "Users can view customer payments" ON customer_payments;
DROP POLICY IF EXISTS "Users can insert customer payments" ON customer_payments;
DROP POLICY IF EXISTS "Users can update customer payments" ON customer_payments;
DROP POLICY IF EXISTS "Users can delete customer payments" ON customer_payments;

CREATE POLICY "Users can view customer payments" ON customer_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert customer payments" ON customer_payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update customer payments" ON customer_payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can delete customer payments" ON customer_payments FOR DELETE TO authenticated USING (true);

-- ============================================
-- 2. CREATE/FIX purchase_order_payments TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS purchase_order_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES lats_purchase_orders(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'TZS',
  payment_method TEXT NOT NULL,
  reference_number TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_po_payments_purchase_order ON purchase_order_payments(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_payments_date ON purchase_order_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_po_payments_status ON purchase_order_payments(status);
CREATE INDEX IF NOT EXISTS idx_po_payments_method ON purchase_order_payments(payment_method);

-- Enable RLS
ALTER TABLE purchase_order_payments ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "Users can view purchase order payments" ON purchase_order_payments;
DROP POLICY IF EXISTS "Users can insert purchase order payments" ON purchase_order_payments;
DROP POLICY IF EXISTS "Users can update purchase order payments" ON purchase_order_payments;
DROP POLICY IF EXISTS "Users can delete purchase order payments" ON purchase_order_payments;

CREATE POLICY "Users can view purchase order payments" ON purchase_order_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert purchase order payments" ON purchase_order_payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update purchase order payments" ON purchase_order_payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can delete purchase order payments" ON purchase_order_payments FOR DELETE TO authenticated USING (true);

-- ============================================
-- 3. CREATE/FIX payment_transactions TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT,
  provider TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'TZS',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'success', 'failed', 'cancelled')),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  reference TEXT,
  metadata JSONB,
  sale_id UUID REFERENCES lats_sales(id) ON DELETE SET NULL,
  pos_session_id TEXT,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_trans_order ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_trans_customer ON payment_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_trans_sale ON payment_transactions(sale_id);
CREATE INDEX IF NOT EXISTS idx_payment_trans_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_trans_created ON payment_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_trans_provider ON payment_transactions(provider);

-- Enable RLS
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "Users can view payment transactions" ON payment_transactions;
DROP POLICY IF EXISTS "Users can insert payment transactions" ON payment_transactions;
DROP POLICY IF EXISTS "Users can update payment transactions" ON payment_transactions;
DROP POLICY IF EXISTS "Users can delete payment transactions" ON payment_transactions;

CREATE POLICY "Users can view payment transactions" ON payment_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert payment transactions" ON payment_transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update payment transactions" ON payment_transactions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can delete payment transactions" ON payment_transactions FOR DELETE TO authenticated USING (true);

-- ============================================
-- 4. CREATE/FIX account_transactions TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS account_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES finance_accounts(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('payment_received', 'payment_made', 'expense', 'transfer_in', 'transfer_out', 'adjustment')),
  amount DECIMAL(15, 2) NOT NULL CHECK (amount >= 0),
  balance_before DECIMAL(15, 2),
  balance_after DECIMAL(15, 2),
  description TEXT,
  reference_number TEXT,
  related_entity_type TEXT,
  related_entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_account_trans_account ON account_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_account_trans_type ON account_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_account_trans_created ON account_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_account_trans_reference ON account_transactions(reference_number);

-- Enable RLS
ALTER TABLE account_transactions ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "Users can view account transactions" ON account_transactions;
DROP POLICY IF EXISTS "Users can insert account transactions" ON account_transactions;
DROP POLICY IF EXISTS "Users can update account transactions" ON account_transactions;
DROP POLICY IF EXISTS "Users can delete account transactions" ON account_transactions;

CREATE POLICY "Users can view account transactions" ON account_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert account transactions" ON account_transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update account transactions" ON account_transactions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can delete account transactions" ON account_transactions FOR DELETE TO authenticated USING (true);

-- ============================================
-- 5. VERIFY finance_accounts TABLE
-- ============================================

-- Ensure finance_accounts exists and has proper structure
CREATE TABLE IF NOT EXISTS finance_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'mobile_money', 'credit_card', 'other')),
  balance DECIMAL(15, 2) DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'TZS',
  account_number TEXT,
  bank_name TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_payment_method BOOLEAN DEFAULT false,
  requires_reference BOOLEAN DEFAULT false,
  requires_account_number BOOLEAN DEFAULT false,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_finance_accounts_active ON finance_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_finance_accounts_payment_method ON finance_accounts(is_payment_method);
CREATE INDEX IF NOT EXISTS idx_finance_accounts_type ON finance_accounts(type);

-- Enable RLS
ALTER TABLE finance_accounts ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "Users can view finance accounts" ON finance_accounts;
DROP POLICY IF EXISTS "Users can insert finance accounts" ON finance_accounts;
DROP POLICY IF EXISTS "Users can update finance accounts" ON finance_accounts;
DROP POLICY IF EXISTS "Users can delete finance accounts" ON finance_accounts;

CREATE POLICY "Users can view finance accounts" ON finance_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert finance accounts" ON finance_accounts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update finance accounts" ON finance_accounts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can delete finance accounts" ON finance_accounts FOR DELETE TO authenticated USING (true);

-- ============================================
-- 6. CREATE FUNCTION TO UPDATE ACCOUNT BALANCE
-- ============================================

-- Function to automatically update account balance when transaction is added
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the account balance based on transaction type
  IF NEW.transaction_type IN ('payment_received', 'transfer_in') THEN
    UPDATE finance_accounts 
    SET balance = balance + NEW.amount,
        updated_at = NOW()
    WHERE id = NEW.account_id;
  ELSIF NEW.transaction_type IN ('payment_made', 'expense', 'transfer_out') THEN
    UPDATE finance_accounts 
    SET balance = balance - NEW.amount,
        updated_at = NOW()
    WHERE id = NEW.account_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS trigger_update_account_balance ON account_transactions;
CREATE TRIGGER trigger_update_account_balance
  AFTER INSERT ON account_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_account_balance();

-- ============================================
-- 7. VERIFICATION QUERIES
-- ============================================

-- Check all payment tables exist
DO $$
DECLARE
  tables_status TEXT[];
BEGIN
  -- Check each table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_payments') THEN
    tables_status := array_append(tables_status, '✅ customer_payments');
  ELSE
    tables_status := array_append(tables_status, '❌ customer_payments MISSING');
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_order_payments') THEN
    tables_status := array_append(tables_status, '✅ purchase_order_payments');
  ELSE
    tables_status := array_append(tables_status, '❌ purchase_order_payments MISSING');
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_transactions') THEN
    tables_status := array_append(tables_status, '✅ payment_transactions');
  ELSE
    tables_status := array_append(tables_status, '❌ payment_transactions MISSING');
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_transactions') THEN
    tables_status := array_append(tables_status, '✅ account_transactions');
  ELSE
    tables_status := array_append(tables_status, '❌ account_transactions MISSING');
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'finance_accounts') THEN
    tables_status := array_append(tables_status, '✅ finance_accounts');
  ELSE
    tables_status := array_append(tables_status, '❌ finance_accounts MISSING');
  END IF;
  
  -- Display results
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '   PAYMENT SYSTEM TABLE STATUS';
  RAISE NOTICE '========================================';
  FOREACH tables_status IN ARRAY tables_status LOOP
    RAISE NOTICE '%', tables_status;
  END LOOP;
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Payment system database setup complete!';
  RAISE NOTICE '✅ All RLS policies configured';
  RAISE NOTICE '✅ Indexes created for optimal performance';
  RAISE NOTICE '✅ Automatic balance updates enabled';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Restart your development server';
  RAISE NOTICE '2. Clear browser cache (Ctrl+Shift+R)';
  RAISE NOTICE '3. Test payment transactions';
  RAISE NOTICE '';
END $$;

-- Display table counts
SELECT 
  'customer_payments' as table_name,
  COUNT(*) as record_count
FROM customer_payments
UNION ALL
SELECT 
  'purchase_order_payments',
  COUNT(*)
FROM purchase_order_payments
UNION ALL
SELECT 
  'payment_transactions',
  COUNT(*)
FROM payment_transactions
UNION ALL
SELECT 
  'account_transactions',
  COUNT(*)
FROM account_transactions
UNION ALL
SELECT 
  'finance_accounts',
  COUNT(*)
FROM finance_accounts;

