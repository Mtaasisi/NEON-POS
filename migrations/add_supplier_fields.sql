-- ================================================
-- ADD COMPREHENSIVE SUPPLIER FIELDS
-- ================================================
-- This migration adds additional fields to the lats_suppliers table
-- to support comprehensive supplier management
-- ================================================

-- Add new columns to lats_suppliers table
ALTER TABLE lats_suppliers
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS whatsapp TEXT,
ADD COLUMN IF NOT EXISTS wechat TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS tax_id TEXT,
ADD COLUMN IF NOT EXISTS payment_terms TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS rating NUMERIC CHECK (rating >= 0 AND rating <= 5),
ADD COLUMN IF NOT EXISTS preferred_currency TEXT DEFAULT 'TZS',
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC,
ADD COLUMN IF NOT EXISTS is_trade_in_customer BOOLEAN DEFAULT false;

-- Add index on country for faster filtering
CREATE INDEX IF NOT EXISTS idx_lats_suppliers_country ON lats_suppliers(country);

-- Add index on is_active for faster filtering
CREATE INDEX IF NOT EXISTS idx_lats_suppliers_is_active ON lats_suppliers(is_active);

-- Add index on is_trade_in_customer to distinguish suppliers from trade-in customers
CREATE INDEX IF NOT EXISTS idx_lats_suppliers_is_trade_in ON lats_suppliers(is_trade_in_customer);

-- Comment on new columns
COMMENT ON COLUMN lats_suppliers.company_name IS 'Official registered company name';
COMMENT ON COLUMN lats_suppliers.description IS 'Brief description of the supplier and their products/services';
COMMENT ON COLUMN lats_suppliers.whatsapp IS 'WhatsApp number for quick communication';
COMMENT ON COLUMN lats_suppliers.wechat IS 'WeChat ID for Chinese suppliers';
COMMENT ON COLUMN lats_suppliers.preferred_currency IS 'Preferred currency for transactions with this supplier';
COMMENT ON COLUMN lats_suppliers.exchange_rate IS 'Exchange rate from preferred currency to base currency (TZS)';
COMMENT ON COLUMN lats_suppliers.is_trade_in_customer IS 'Flag to distinguish trade-in customers from real suppliers';

