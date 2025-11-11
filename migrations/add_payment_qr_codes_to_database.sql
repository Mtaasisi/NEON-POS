-- ================================================
-- ADD PAYMENT QR CODES TO DATABASE
-- ================================================
-- Move payment QR codes from localStorage to database
-- for better persistence and security
-- ================================================

-- Add columns for storing payment QR codes and bank details
ALTER TABLE lats_suppliers
ADD COLUMN IF NOT EXISTS wechat_qr_code TEXT,
ADD COLUMN IF NOT EXISTS alipay_qr_code TEXT,
ADD COLUMN IF NOT EXISTS bank_account_details TEXT;

-- Add indexes for payment fields
CREATE INDEX IF NOT EXISTS idx_lats_suppliers_wechat_qr ON lats_suppliers(id) WHERE wechat_qr_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lats_suppliers_alipay_qr ON lats_suppliers(id) WHERE alipay_qr_code IS NOT NULL;

-- Add comments
COMMENT ON COLUMN lats_suppliers.wechat_qr_code IS 'WeChat Pay QR code stored as base64 image string for Chinese suppliers';
COMMENT ON COLUMN lats_suppliers.alipay_qr_code IS 'Alipay QR code stored as base64 image string for Chinese suppliers';
COMMENT ON COLUMN lats_suppliers.bank_account_details IS 'Bank account details including account number, SWIFT code, bank name, etc.';

-- ================================================
-- VERIFICATION
-- ================================================
-- Check columns exist:
-- SELECT column_name, data_type, character_maximum_length 
-- FROM information_schema.columns 
-- WHERE table_name = 'lats_suppliers' 
-- AND column_name IN ('wechat_qr_code', 'alipay_qr_code', 'bank_account_details');

-- ================================================
-- USAGE NOTES
-- ================================================
-- 1. QR codes are stored as base64 encoded strings
-- 2. Max size per image: ~2MB (base64 encoded)
-- 3. Only applicable for Chinese suppliers (country = 'China')
-- 4. Bank account details stored as TEXT for flexible formatting
-- 5. QR codes can be displayed directly in img src using base64 data URI
--
-- Example:
-- <img src="{wechat_qr_code}" alt="WeChat Pay QR Code" />
--
-- ================================================
-- MIGRATION COMPLETE ✅
-- ================================================

