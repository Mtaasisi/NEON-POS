-- ============================================
-- FIX PAYMENT TRANSACTIONS TABLES
-- This fixes the 400 errors for payment_transactions and purchase_order_payments
-- ============================================

-- ============================================
-- 1. CREATE/FIX purchase_order_payments TABLE
-- ============================================

-- Create the table if it doesn't exist
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_po_payments_purchase_order ON purchase_order_payments(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_payments_date ON purchase_order_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_po_payments_status ON purchase_order_payments(status);

-- Add comments
COMMENT ON TABLE purchase_order_payments IS 'Payment records for purchase orders';

-- Enable Row Level Security
ALTER TABLE purchase_order_payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view purchase order payments" ON purchase_order_payments;
DROP POLICY IF EXISTS "Users can insert purchase order payments" ON purchase_order_payments;
DROP POLICY IF EXISTS "Users can update purchase order payments" ON purchase_order_payments;
DROP POLICY IF EXISTS "Users can delete purchase order payments" ON purchase_order_payments;

-- Create permissive RLS policies
CREATE POLICY "Users can view purchase order payments"
  ON purchase_order_payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert purchase order payments"
  ON purchase_order_payments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update purchase order payments"
  ON purchase_order_payments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete purchase order payments"
  ON purchase_order_payments FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- 2. CREATE/FIX payment_transactions TABLE
-- ============================================

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT,
  provider TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'TZS',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  customer_id UUID REFERENCES customers(id),
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  reference TEXT,
  metadata JSONB,
  sale_id UUID REFERENCES lats_sales(id),
  pos_session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_trans_order ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_trans_customer ON payment_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_trans_sale ON payment_transactions(sale_id);
CREATE INDEX IF NOT EXISTS idx_payment_trans_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_trans_created ON payment_transactions(created_at);

-- Add comments
COMMENT ON TABLE payment_transactions IS 'Payment transaction records from various sources';

-- Enable Row Level Security
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view payment transactions" ON payment_transactions;
DROP POLICY IF EXISTS "Users can insert payment transactions" ON payment_transactions;
DROP POLICY IF EXISTS "Users can update payment transactions" ON payment_transactions;
DROP POLICY IF EXISTS "Users can delete payment transactions" ON payment_transactions;

-- Create permissive RLS policies
CREATE POLICY "Users can view payment transactions"
  ON payment_transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert payment transactions"
  ON payment_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update payment transactions"
  ON payment_transactions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete payment transactions"
  ON payment_transactions FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- 3. VERIFY TABLES EXIST AND ARE ACCESSIBLE
-- ============================================

-- Check if tables exist
SELECT 
  'purchase_order_payments' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_order_payments') 
    THEN '✅ EXISTS' 
    ELSE '❌ DOES NOT EXIST' 
  END as status
UNION ALL
SELECT 
  'payment_transactions' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_transactions') 
    THEN '✅ EXISTS' 
    ELSE '❌ DOES NOT EXIST' 
  END as status;

-- Show RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('purchase_order_payments', 'payment_transactions')
ORDER BY tablename, policyname;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Payment tables have been created/fixed successfully!';
  RAISE NOTICE '✅ RLS policies have been set to permissive for authenticated users';
  RAISE NOTICE '✅ You can now use the PaymentTransactions component without 400 errors';
END $$;

