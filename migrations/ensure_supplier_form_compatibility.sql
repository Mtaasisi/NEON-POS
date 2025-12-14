-- ================================================
-- ENSURE SUPPLIER FORM 100% DATABASE COMPATIBILITY
-- ================================================
-- This migration ensures all fields from EnhancedAddSupplierModal
-- are properly stored in the database
-- ================================================

-- Ensure all required columns exist in lats_suppliers table
ALTER TABLE lats_suppliers
-- Basic Information (Already exist, but ensuring they're there)
ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS contact_person TEXT,

-- Contact Information
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS whatsapp TEXT,
ADD COLUMN IF NOT EXISTS wechat TEXT,  -- For Chinese suppliers

-- Location
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,

-- Financial
ADD COLUMN IF NOT EXISTS tax_id TEXT,
ADD COLUMN IF NOT EXISTS payment_terms TEXT,
ADD COLUMN IF NOT EXISTS preferred_currency TEXT DEFAULT 'TZS',
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC,

-- Additional Information
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS rating NUMERIC CHECK (rating >= 0 AND rating <= 5),

-- Status
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_trade_in_customer BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT true,

-- Metadata
ADD COLUMN IF NOT EXISTS branch_id UUID,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lats_suppliers_name ON lats_suppliers(name);
CREATE INDEX IF NOT EXISTS idx_lats_suppliers_country ON lats_suppliers(country);
CREATE INDEX IF NOT EXISTS idx_lats_suppliers_city ON lats_suppliers(city);
CREATE INDEX IF NOT EXISTS idx_lats_suppliers_is_active ON lats_suppliers(is_active);
CREATE INDEX IF NOT EXISTS idx_lats_suppliers_is_trade_in ON lats_suppliers(is_trade_in_customer);
CREATE INDEX IF NOT EXISTS idx_lats_suppliers_preferred_currency ON lats_suppliers(preferred_currency);
CREATE INDEX IF NOT EXISTS idx_lats_suppliers_created_at ON lats_suppliers(created_at DESC);

-- Add comments for clarity
COMMENT ON COLUMN lats_suppliers.name IS 'Supplier name (required)';
COMMENT ON COLUMN lats_suppliers.company_name IS 'Official registered company name';
COMMENT ON COLUMN lats_suppliers.contact_person IS 'Primary contact person(s) at supplier - stored as text with names and phone numbers';
COMMENT ON COLUMN lats_suppliers.phone IS 'Primary phone number';
COMMENT ON COLUMN lats_suppliers.email IS 'Primary email address';
COMMENT ON COLUMN lats_suppliers.whatsapp IS 'WhatsApp number for direct communication';
COMMENT ON COLUMN lats_suppliers.wechat IS 'WeChat ID for Chinese suppliers';
COMMENT ON COLUMN lats_suppliers.address IS 'Full street address (can include GPS coordinates)';
COMMENT ON COLUMN lats_suppliers.city IS 'City name with autocomplete suggestions';
COMMENT ON COLUMN lats_suppliers.country IS 'Country (Tanzania, USA, UAE, China)';
COMMENT ON COLUMN lats_suppliers.tax_id IS 'Tax identification number';
COMMENT ON COLUMN lats_suppliers.payment_terms IS 'Payment terms (e.g., Net 30, Cash on Delivery)';
COMMENT ON COLUMN lats_suppliers.preferred_currency IS 'Preferred currency (TZS, USD, EUR, CNY, AED) - auto-set based on country';
COMMENT ON COLUMN lats_suppliers.notes IS 'Additional notes including product categories and payment information';
COMMENT ON COLUMN lats_suppliers.description IS 'Brief description of supplier products/services';
COMMENT ON COLUMN lats_suppliers.is_active IS 'Whether supplier is currently active';
COMMENT ON COLUMN lats_suppliers.is_trade_in_customer IS 'Flag to distinguish trade-in customers from real suppliers';

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_lats_suppliers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_lats_suppliers_updated_at ON lats_suppliers;
CREATE TRIGGER trigger_update_lats_suppliers_updated_at
    BEFORE UPDATE ON lats_suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_lats_suppliers_updated_at();

-- ================================================
-- VERIFICATION QUERIES (Run these to verify)
-- ================================================
-- Check all columns exist:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'lats_suppliers' 
-- ORDER BY ordinal_position;

-- Test insert with all form fields:
-- INSERT INTO lats_suppliers (
--   name, company_name, contact_person, phone, email, 
--   whatsapp, wechat, address, city, country,
--   tax_id, payment_terms, preferred_currency, notes, is_active
-- ) VALUES (
--   'Test Supplier', 'Test Company Ltd', 'John Doe (123456789)',
--   '+255123456789', 'test@example.com', '+255987654321', 'wechat123',
--   'Test Address, Dar es Salaam', 'Dar es Salaam', 'Tanzania',
--   'TIN123456', 'Net 30', 'TZS', 'Product Categories: Smartphones, Laptops', true
-- ) RETURNING *;

-- ================================================
-- MIGRATION COMPLETE ✅
-- ================================================
-- All fields from EnhancedAddSupplierModal are now properly mapped
-- to the lats_suppliers table in the database.
-- ================================================

