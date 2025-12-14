-- ============================================
-- ADD CURRENCY COLUMN TO CUSTOMER_PAYMENTS
-- ============================================
-- This migration adds the currency column to customer_payments table
-- to support multi-currency payment tracking

-- Add currency column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_payments' 
    AND column_name = 'currency'
  ) THEN
    ALTER TABLE customer_payments 
    ADD COLUMN currency VARCHAR(10) DEFAULT 'TZS';
    RAISE NOTICE 'Added currency column to customer_payments';
  ELSE
    RAISE NOTICE 'currency column already exists in customer_payments';
  END IF;
END $$;

-- Update existing records to have default currency if NULL
UPDATE customer_payments 
SET currency = 'TZS' 
WHERE currency IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN customer_payments.currency IS 'Currency code for the payment (TZS, USD, EUR, etc.)';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_customer_payments_currency ON customer_payments(currency);

-- Verification
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'customer_payments' AND column_name = 'currency';

