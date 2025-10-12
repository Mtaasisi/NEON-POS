-- Complete Setup for All Missing Tables
-- Run this single script to fix all warnings about missing tables
-- Includes: receipts, stock movements, and SMS tables

-- ============================================
-- 1. CREATE LATS_RECEIPTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS lats_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID,
    receipt_number TEXT NOT NULL,
    customer_name TEXT,
    customer_phone TEXT,
    total_amount NUMERIC(10, 2) NOT NULL,
    payment_method TEXT NOT NULL,
    items_count INTEGER NOT NULL,
    generated_by TEXT,
    receipt_content JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lats_receipts_sale_id ON lats_receipts(sale_id);
CREATE INDEX IF NOT EXISTS idx_lats_receipts_receipt_number ON lats_receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_lats_receipts_customer_phone ON lats_receipts(customer_phone);
CREATE INDEX IF NOT EXISTS idx_lats_receipts_created_at ON lats_receipts(created_at DESC);

COMMENT ON TABLE lats_receipts IS 'Stores all generated receipts for sales transactions';

-- ============================================
-- 2. CREATE LATS_STOCK_MOVEMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS lats_stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID,
    variant_id UUID,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment', 'transfer', 'sale', 'purchase', 'return')),
    quantity NUMERIC NOT NULL,
    previous_quantity NUMERIC,
    new_quantity NUMERIC,
    reference_type TEXT,
    reference_id UUID,
    reason TEXT,
    notes TEXT,
    from_location TEXT,
    to_location TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lats_stock_movements_product_id ON lats_stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_lats_stock_movements_variant_id ON lats_stock_movements(variant_id);
CREATE INDEX IF NOT EXISTS idx_lats_stock_movements_movement_type ON lats_stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_lats_stock_movements_created_at ON lats_stock_movements(created_at DESC);

COMMENT ON TABLE lats_stock_movements IS 'Tracks all inventory stock movements including sales, purchases, adjustments, and transfers';

-- ============================================
-- 3. CREATE SMS_LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_phone TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'failed', 'pending')),
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    sent_by UUID,
    device_id UUID,
    cost DECIMAL(10, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_logs_recipient_phone ON sms_logs(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_sms_logs_device_id ON sms_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON sms_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(status);

COMMENT ON TABLE sms_logs IS 'Logs all SMS messages sent through the system';

-- ============================================
-- 4. CREATE CUSTOMER_COMMUNICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS customer_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID,
    type TEXT NOT NULL CHECK (type IN ('sms', 'whatsapp', 'call', 'email')),
    message TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'failed', 'pending', 'read')),
    phone_number TEXT,
    sent_by UUID,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_communications_customer_id ON customer_communications(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_communications_type ON customer_communications(type);
CREATE INDEX IF NOT EXISTS idx_customer_communications_sent_at ON customer_communications(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_communications_status ON customer_communications(status);

COMMENT ON TABLE customer_communications IS 'Tracks all communications with customers (SMS, WhatsApp, calls, emails)';

-- ============================================
-- 5. CREATE UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- 6. ADD TRIGGERS FOR UPDATED_AT
-- ============================================

-- Trigger for lats_receipts
DROP TRIGGER IF EXISTS update_lats_receipts_updated_at ON lats_receipts;
CREATE TRIGGER update_lats_receipts_updated_at
    BEFORE UPDATE ON lats_receipts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for sms_logs
DROP TRIGGER IF EXISTS update_sms_logs_updated_at ON sms_logs;
CREATE TRIGGER update_sms_logs_updated_at
    BEFORE UPDATE ON sms_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for customer_communications
DROP TRIGGER IF EXISTS update_customer_communications_updated_at ON customer_communications;
CREATE TRIGGER update_customer_communications_updated_at
    BEFORE UPDATE ON customer_communications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. VERIFICATION QUERY
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ ========================================';
    RAISE NOTICE '✅ ALL TABLES CREATED SUCCESSFULLY!';
    RAISE NOTICE '✅ ========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Tables Created:';
    RAISE NOTICE '  ✓ lats_receipts';
    RAISE NOTICE '  ✓ lats_stock_movements';
    RAISE NOTICE '  ✓ sms_logs';
    RAISE NOTICE '  ✓ customer_communications';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 Current Counts:';
    RAISE NOTICE '  - Receipts: %', (SELECT COUNT(*) FROM lats_receipts);
    RAISE NOTICE '  - Stock Movements: %', (SELECT COUNT(*) FROM lats_stock_movements);
    RAISE NOTICE '  - SMS Logs: %', (SELECT COUNT(*) FROM sms_logs);
    RAISE NOTICE '  - Communications: %', (SELECT COUNT(*) FROM customer_communications);
    RAISE NOTICE '';
    RAISE NOTICE '✅ You can now process sales without warnings!';
    RAISE NOTICE '';
END $$;

-- Final verification select
SELECT 
    '✅ Setup Complete!' as status,
    (SELECT COUNT(*) FROM lats_receipts) as receipts,
    (SELECT COUNT(*) FROM lats_stock_movements) as stock_movements,
    (SELECT COUNT(*) FROM sms_logs) as sms_logs,
    (SELECT COUNT(*) FROM customer_communications) as communications;

