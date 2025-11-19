-- ================================================
-- ADD CURRENCY AND EXCHANGE RATE FIELDS TO PURCHASE ORDERS
-- ================================================
-- This migration adds support for multi-currency purchase orders
-- with proper exchange rate tracking
-- ================================================

-- Add currency and exchange rate tracking columns
ALTER TABLE lats_purchase_orders
ADD COLUMN IF NOT EXISTS payment_terms TEXT,
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(10, 6) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS base_currency TEXT DEFAULT 'TZS',
ADD COLUMN IF NOT EXISTS exchange_rate_source TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS exchange_rate_date TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS total_amount_base_currency NUMERIC;

-- Add comments for documentation
COMMENT ON COLUMN lats_purchase_orders.payment_terms IS 'Payment terms agreed with the supplier (e.g., Net 30, Net 60, COD)';
COMMENT ON COLUMN lats_purchase_orders.exchange_rate IS 'Exchange rate from purchase currency to base currency at time of PO creation';
COMMENT ON COLUMN lats_purchase_orders.base_currency IS 'Base currency for the business (typically TZS)';
COMMENT ON COLUMN lats_purchase_orders.exchange_rate_source IS 'Source of exchange rate (manual, api, bank, etc.)';
COMMENT ON COLUMN lats_purchase_orders.exchange_rate_date IS 'Date when the exchange rate was applied';
COMMENT ON COLUMN lats_purchase_orders.total_amount_base_currency IS 'Total amount converted to base currency (TZS)';

-- Create index for faster currency queries
CREATE INDEX IF NOT EXISTS idx_lats_purchase_orders_currency ON lats_purchase_orders(currency);
CREATE INDEX IF NOT EXISTS idx_lats_purchase_orders_exchange_rate_date ON lats_purchase_orders(exchange_rate_date);

-- Update existing records to have proper base currency values
-- For records with TZS or NULL currency, set exchange rate to 1.0
UPDATE lats_purchase_orders
SET 
  exchange_rate = 1.0,
  base_currency = 'TZS',
  exchange_rate_source = 'manual',
  exchange_rate_date = COALESCE(exchange_rate_date, created_at),
  total_amount_base_currency = total_amount
WHERE currency IS NULL OR currency = 'TZS';

-- For records with other currencies, also set base currency values
-- (assuming they need manual exchange rate review)
UPDATE lats_purchase_orders
SET 
  base_currency = 'TZS',
  exchange_rate_source = COALESCE(exchange_rate_source, 'manual'),
  exchange_rate_date = COALESCE(exchange_rate_date, created_at),
  total_amount_base_currency = COALESCE(total_amount_base_currency, total_amount)
WHERE currency IS NOT NULL AND currency != 'TZS';

-- Verify the update
SELECT 
  COUNT(*) as total_pos,
  COUNT(*) FILTER (WHERE currency = 'TZS') as tzs_currency,
  COUNT(*) FILTER (WHERE currency IS NULL) as null_currency,
  COUNT(*) FILTER (WHERE currency NOT IN ('TZS') AND currency IS NOT NULL) as other_currencies,
  COUNT(*) FILTER (WHERE exchange_rate IS NOT NULL) as with_exchange_rate,
  COUNT(*) FILTER (WHERE total_amount_base_currency IS NOT NULL) as with_base_amount
FROM lats_purchase_orders;

-- Show sample of purchase orders with currency info
SELECT 
  po_number,
  supplier_id,
  status,
  currency,
  total_amount,
  exchange_rate,
  base_currency,
  total_amount_base_currency,
  payment_terms,
  exchange_rate_source,
  exchange_rate_date
FROM lats_purchase_orders
ORDER BY created_at DESC
LIMIT 10;

