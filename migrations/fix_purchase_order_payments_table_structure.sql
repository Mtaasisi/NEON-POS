-- ============================================
-- FIX PURCHASE ORDER PAYMENTS TABLE STRUCTURE
-- ============================================
-- This migration ensures the purchase_order_payments table has all required columns
-- to match the process_purchase_order_payment function expectations

-- First, check if we need to alter the table or create it fresh
-- Add missing columns if they don't exist

-- Add payment_account_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' 
    AND column_name = 'payment_account_id'
  ) THEN
    ALTER TABLE purchase_order_payments 
    ADD COLUMN payment_account_id UUID REFERENCES finance_accounts(id);
    RAISE NOTICE 'Added payment_account_id column';
  END IF;
END $$;

-- Add payment_method_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' 
    AND column_name = 'payment_method_id'
  ) THEN
    ALTER TABLE purchase_order_payments 
    ADD COLUMN payment_method_id UUID;
    RAISE NOTICE 'Added payment_method_id column';
  END IF;
END $$;

-- Add payment_method if it doesn't exist (different from 'method')
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' 
    AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE purchase_order_payments 
    ADD COLUMN payment_method VARCHAR(50);
    RAISE NOTICE 'Added payment_method column';
  END IF;
END $$;

-- Add notes if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' 
    AND column_name = 'notes'
  ) THEN
    ALTER TABLE purchase_order_payments 
    ADD COLUMN notes TEXT;
    RAISE NOTICE 'Added notes column';
  END IF;
END $$;

-- Add payment_date if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' 
    AND column_name = 'payment_date'
  ) THEN
    ALTER TABLE purchase_order_payments 
    ADD COLUMN payment_date TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added payment_date column';
  END IF;
END $$;

-- Add created_by if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' 
    AND column_name = 'created_by'
  ) THEN
    ALTER TABLE purchase_order_payments 
    ADD COLUMN created_by UUID;
    RAISE NOTICE 'Added created_by column';
  END IF;
END $$;

-- Add updated_at if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE purchase_order_payments 
    ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added updated_at column';
  END IF;
END $$;

-- Ensure currency column exists and has proper type
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' 
    AND column_name = 'currency'
  ) THEN
    ALTER TABLE purchase_order_payments 
    ADD COLUMN currency VARCHAR(10) DEFAULT 'TZS';
    RAISE NOTICE 'Added currency column';
  END IF;
END $$;

-- If the old 'method' column exists and 'payment_method' was just added, copy data over
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' 
    AND column_name = 'method'
  ) THEN
    -- Copy method to payment_method if payment_method is NULL
    UPDATE purchase_order_payments 
    SET payment_method = method 
    WHERE payment_method IS NULL;
    
    RAISE NOTICE 'Copied method to payment_method';
  END IF;
END $$;

-- If the old 'timestamp' column exists and 'payment_date' was just added, copy data over
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' 
    AND column_name = 'timestamp'
  ) THEN
    -- Copy timestamp to payment_date if payment_date is NULL
    UPDATE purchase_order_payments 
    SET payment_date = timestamp 
    WHERE payment_date IS NULL;
    
    RAISE NOTICE 'Copied timestamp to payment_date';
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON TABLE purchase_order_payments IS 'Stores payment records for purchase orders with full payment method and account tracking';
COMMENT ON COLUMN purchase_order_payments.payment_account_id IS 'Reference to the finance account used for payment';
COMMENT ON COLUMN purchase_order_payments.payment_method_id IS 'Reference to the payment method configuration';
COMMENT ON COLUMN purchase_order_payments.payment_method IS 'Name of the payment method (Cash, Bank Transfer, etc.)';
COMMENT ON COLUMN purchase_order_payments.currency IS 'Currency code for the payment (TZS, USD, EUR, etc.)';

-- Verify the table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'purchase_order_payments'
ORDER BY ordinal_position;

