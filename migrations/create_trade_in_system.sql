-- ================================================
-- TRADE-IN/EXCHANGE SYSTEM
-- ================================================
-- Creates tables for mobile device trade-in and exchange system
-- Supports device valuation, condition assessment, contracts, and inventory integration
-- ================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================
-- TRADE-IN PRICING MANAGEMENT
-- ================================================
-- Base trade-in prices for different device models
CREATE TABLE IF NOT EXISTS lats_trade_in_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES lats_products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES lats_product_variants(id) ON DELETE CASCADE,
    device_name TEXT NOT NULL,
    device_model TEXT NOT NULL,
    base_trade_in_price NUMERIC NOT NULL DEFAULT 0,
    branch_id UUID REFERENCES lats_branches(id),
    -- Condition multipliers (percentage)
    excellent_multiplier NUMERIC DEFAULT 1.0, -- 100%
    good_multiplier NUMERIC DEFAULT 0.85, -- 85%
    fair_multiplier NUMERIC DEFAULT 0.70, -- 70%
    poor_multiplier NUMERIC DEFAULT 0.50, -- 50%
    -- Additional fields
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth_users(id),
    updated_by UUID REFERENCES auth_users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================
-- TRADE-IN TRANSACTIONS
-- ================================================
-- Records of trade-in transactions
CREATE TABLE IF NOT EXISTS lats_trade_in_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_number TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES lats_customers(id) NOT NULL,
    branch_id UUID REFERENCES lats_branches(id) DEFAULT '00000000-0000-0000-0000-000000000001',
    
    -- Device being traded in
    device_name TEXT NOT NULL,
    device_model TEXT NOT NULL,
    device_imei TEXT,
    device_serial_number TEXT,
    
    -- Pricing
    base_trade_in_price NUMERIC NOT NULL DEFAULT 0,
    condition_rating TEXT NOT NULL, -- 'excellent', 'good', 'fair', 'poor'
    condition_multiplier NUMERIC NOT NULL DEFAULT 1.0,
    condition_description TEXT,
    
    -- Damage deductions
    total_damage_deductions NUMERIC DEFAULT 0,
    damage_items JSONB, -- Array of {spare_part_id, spare_part_name, price, description}
    
    -- Final valuation
    final_trade_in_value NUMERIC NOT NULL DEFAULT 0,
    
    -- New device being purchased (if any)
    new_product_id UUID REFERENCES lats_products(id),
    new_variant_id UUID REFERENCES lats_product_variants(id),
    new_device_price NUMERIC,
    customer_payment_amount NUMERIC DEFAULT 0, -- Additional payment by customer
    
    -- Contract details
    contract_id UUID,
    contract_signed BOOLEAN DEFAULT false,
    contract_signed_at TIMESTAMPTZ,
    customer_signature_data TEXT, -- Base64 signature
    staff_signature_data TEXT, -- Base64 signature
    customer_id_number TEXT,
    customer_id_type TEXT, -- 'national_id', 'passport', 'drivers_license'
    customer_id_photo_url TEXT,
    
    -- Device condition photos
    device_photos JSONB, -- Array of {url, caption, timestamp}
    
    -- Status tracking
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'completed', 'cancelled'
    
    -- Inventory integration
    inventory_item_id UUID, -- Reference to inventory item created from trade-in
    needs_repair BOOLEAN DEFAULT false,
    repair_status TEXT, -- 'pending', 'in_repair', 'completed', 'ready_for_resale'
    repair_cost NUMERIC DEFAULT 0,
    ready_for_resale BOOLEAN DEFAULT false,
    resale_price NUMERIC,
    
    -- Sale integration
    sale_id UUID REFERENCES lats_sales(id), -- If this trade-in was part of a sale
    
    -- Audit fields
    created_by UUID REFERENCES auth_users(id),
    approved_by UUID REFERENCES auth_users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    approved_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Notes
    staff_notes TEXT,
    internal_notes TEXT
);

-- ================================================
-- TRADE-IN CONTRACTS
-- ================================================
-- Legal contracts for trade-in purchases
CREATE TABLE IF NOT EXISTS lats_trade_in_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_number TEXT UNIQUE NOT NULL,
    transaction_id UUID REFERENCES lats_trade_in_transactions(id) ON DELETE CASCADE,
    
    -- Customer information
    customer_id UUID REFERENCES lats_customers(id) NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    customer_address TEXT,
    customer_id_number TEXT NOT NULL,
    customer_id_type TEXT NOT NULL,
    customer_id_photo_url TEXT,
    
    -- Device information
    device_name TEXT NOT NULL,
    device_model TEXT NOT NULL,
    device_imei TEXT NOT NULL,
    device_serial_number TEXT,
    device_condition TEXT NOT NULL,
    agreed_value NUMERIC NOT NULL,
    
    -- Legal terms
    terms_and_conditions TEXT NOT NULL,
    ownership_declaration TEXT NOT NULL,
    customer_agreed_terms BOOLEAN DEFAULT false,
    
    -- Signatures
    customer_signature_data TEXT,
    staff_signature_data TEXT,
    customer_signed_at TIMESTAMPTZ,
    staff_signed_at TIMESTAMPTZ,
    
    -- Witnesses (optional)
    witness_name TEXT,
    witness_signature_data TEXT,
    witness_signed_at TIMESTAMPTZ,
    
    -- Contract status
    status TEXT DEFAULT 'draft', -- 'draft', 'signed', 'voided'
    
    -- Audit
    created_by UUID REFERENCES auth_users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    voided_at TIMESTAMPTZ,
    voided_by UUID REFERENCES auth_users(id),
    void_reason TEXT
);

-- ================================================
-- TRADE-IN DAMAGE ASSESSMENTS
-- ================================================
-- Detailed damage assessments linked to spare parts
CREATE TABLE IF NOT EXISTS lats_trade_in_damage_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES lats_trade_in_transactions(id) ON DELETE CASCADE,
    
    -- Damage details
    damage_type TEXT NOT NULL, -- 'cracked_screen', 'broken_back', 'battery_issue', etc.
    damage_description TEXT,
    
    -- Spare part reference (for pricing)
    spare_part_id UUID REFERENCES lats_spare_parts(id),
    spare_part_name TEXT,
    deduction_amount NUMERIC NOT NULL DEFAULT 0,
    
    -- Assessment
    assessed_by UUID REFERENCES auth_users(id),
    assessed_at TIMESTAMPTZ DEFAULT now(),
    
    -- Photos
    damage_photos JSONB -- Array of {url, caption}
);

-- ================================================
-- INDEXES
-- ================================================

-- Trade-in prices indexes
CREATE INDEX IF NOT EXISTS idx_trade_in_prices_product ON lats_trade_in_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_trade_in_prices_variant ON lats_trade_in_prices(variant_id);
CREATE INDEX IF NOT EXISTS idx_trade_in_prices_branch ON lats_trade_in_prices(branch_id);
CREATE INDEX IF NOT EXISTS idx_trade_in_prices_active ON lats_trade_in_prices(is_active);

-- Trade-in transactions indexes
CREATE INDEX IF NOT EXISTS idx_trade_in_transactions_customer ON lats_trade_in_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_trade_in_transactions_branch ON lats_trade_in_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_trade_in_transactions_status ON lats_trade_in_transactions(status);
CREATE INDEX IF NOT EXISTS idx_trade_in_transactions_imei ON lats_trade_in_transactions(device_imei);
CREATE INDEX IF NOT EXISTS idx_trade_in_transactions_sale ON lats_trade_in_transactions(sale_id);
CREATE INDEX IF NOT EXISTS idx_trade_in_transactions_created_at ON lats_trade_in_transactions(created_at DESC);

-- Trade-in contracts indexes
CREATE INDEX IF NOT EXISTS idx_trade_in_contracts_transaction ON lats_trade_in_contracts(transaction_id);
CREATE INDEX IF NOT EXISTS idx_trade_in_contracts_customer ON lats_trade_in_contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_trade_in_contracts_status ON lats_trade_in_contracts(status);

-- Damage assessments indexes
CREATE INDEX IF NOT EXISTS idx_trade_in_damage_transaction ON lats_trade_in_damage_assessments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_trade_in_damage_spare_part ON lats_trade_in_damage_assessments(spare_part_id);

-- ================================================
-- FUNCTIONS & TRIGGERS
-- ================================================

-- Function to generate trade-in transaction number
CREATE OR REPLACE FUNCTION generate_trade_in_transaction_number()
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
    new_number TEXT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(transaction_number FROM 4) AS INTEGER)), 0) + 1
    INTO next_num
    FROM lats_trade_in_transactions
    WHERE transaction_number ~ '^TI-[0-9]+$';
    
    new_number := 'TI-' || LPAD(next_num::TEXT, 6, '0');
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate contract number
CREATE OR REPLACE FUNCTION generate_trade_in_contract_number()
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
    new_number TEXT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(contract_number FROM 5) AS INTEGER)), 0) + 1
    INTO next_num
    FROM lats_trade_in_contracts
    WHERE contract_number ~ '^TIC-[0-9]+$';
    
    new_number := 'TIC-' || LPAD(next_num::TEXT, 6, '0');
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate transaction number
CREATE OR REPLACE FUNCTION set_trade_in_transaction_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.transaction_number IS NULL OR NEW.transaction_number = '' THEN
        NEW.transaction_number := generate_trade_in_transaction_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_trade_in_transaction_number
    BEFORE INSERT ON lats_trade_in_transactions
    FOR EACH ROW
    EXECUTE FUNCTION set_trade_in_transaction_number();

-- Trigger to auto-generate contract number
CREATE OR REPLACE FUNCTION set_trade_in_contract_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.contract_number IS NULL OR NEW.contract_number = '' THEN
        NEW.contract_number := generate_trade_in_contract_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_trade_in_contract_number
    BEFORE INSERT ON lats_trade_in_contracts
    FOR EACH ROW
    EXECUTE FUNCTION set_trade_in_contract_number();

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_trade_in_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_trade_in_prices_timestamp
    BEFORE UPDATE ON lats_trade_in_prices
    FOR EACH ROW
    EXECUTE FUNCTION update_trade_in_timestamp();

CREATE TRIGGER trigger_update_trade_in_transactions_timestamp
    BEFORE UPDATE ON lats_trade_in_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_trade_in_timestamp();

CREATE TRIGGER trigger_update_trade_in_contracts_timestamp
    BEFORE UPDATE ON lats_trade_in_contracts
    FOR EACH ROW
    EXECUTE FUNCTION update_trade_in_timestamp();

-- ================================================
-- DEFAULT TERMS AND CONDITIONS
-- ================================================

-- Create a settings table for trade-in terms
CREATE TABLE IF NOT EXISTS lats_trade_in_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default terms and conditions
INSERT INTO lats_trade_in_settings (key, value, description) VALUES
('contract_terms', 
'1. The seller confirms that they are the rightful owner of the device being traded in.
2. The device is not stolen, lost, or obtained through fraudulent means.
3. The seller has removed all personal data and accounts from the device.
4. The device is not blacklisted, reported lost, or under any financial agreement.
5. The seller acknowledges that the agreed trade-in value is final.
6. The company reserves the right to refuse any trade-in if ownership cannot be verified.
7. Any misrepresentation of device condition may result in adjusted valuation or refusal.
8. The seller releases all claims to the device upon completion of this transaction.
9. The company is not responsible for any data remaining on the device.
10. This agreement is binding and governed by local laws.',
'Default terms and conditions for trade-in contracts'),

('ownership_declaration',
'I hereby declare that:
- I am the legal owner of the device described in this contract
- The device has not been reported lost or stolen
- The device is free from any liens, loans, or payment plans
- I have the legal right to sell this device
- All information provided is accurate and truthful
- I understand that providing false information may result in legal action

I agree to indemnify and hold harmless the company from any claims arising from the sale of this device.',
'Customer ownership declaration statement')
ON CONFLICT (key) DO NOTHING;

-- ================================================
-- VIEWS
-- ================================================

-- View for trade-in transactions with full details
CREATE OR REPLACE VIEW view_trade_in_transactions_full AS
SELECT 
    t.id,
    t.transaction_number,
    t.customer_id,
    c.name as customer_name,
    c.phone as customer_phone,
    c.email as customer_email,
    t.branch_id,
    b.name as branch_name,
    t.device_name,
    t.device_model,
    t.device_imei,
    t.device_serial_number,
    t.base_trade_in_price,
    t.condition_rating,
    t.condition_multiplier,
    t.total_damage_deductions,
    t.final_trade_in_value,
    t.new_product_id,
    p.name as new_product_name,
    t.new_device_price,
    t.customer_payment_amount,
    t.status,
    t.contract_signed,
    t.needs_repair,
    t.repair_status,
    t.ready_for_resale,
    t.resale_price,
    t.sale_id,
    t.created_by,
    u.name as created_by_name,
    t.created_at,
    t.updated_at,
    t.completed_at
FROM lats_trade_in_transactions t
LEFT JOIN lats_customers c ON t.customer_id = c.id
LEFT JOIN lats_branches b ON t.branch_id = b.id
LEFT JOIN lats_products p ON t.new_product_id = p.id
LEFT JOIN auth_users u ON t.created_by = u.id;

-- ================================================
-- COMMENTS
-- ================================================

COMMENT ON TABLE lats_trade_in_prices IS 'Base trade-in pricing for device models';
COMMENT ON TABLE lats_trade_in_transactions IS 'Records of device trade-in transactions';
COMMENT ON TABLE lats_trade_in_contracts IS 'Legal contracts for device trade-in purchases';
COMMENT ON TABLE lats_trade_in_damage_assessments IS 'Detailed damage assessments with spare part pricing';
COMMENT ON TABLE lats_trade_in_settings IS 'Settings and configuration for trade-in system';

-- ================================================
-- GRANT PERMISSIONS
-- ================================================

-- Grant permissions to authenticated users (adjust based on your RLS policies)
GRANT ALL ON lats_trade_in_prices TO authenticated;
GRANT ALL ON lats_trade_in_transactions TO authenticated;
GRANT ALL ON lats_trade_in_contracts TO authenticated;
GRANT ALL ON lats_trade_in_damage_assessments TO authenticated;
GRANT ALL ON lats_trade_in_settings TO authenticated;

-- ================================================
-- COMPLETION MESSAGE
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Trade-in system tables created successfully!';
    RAISE NOTICE '📋 Created tables:';
    RAISE NOTICE '   - lats_trade_in_prices';
    RAISE NOTICE '   - lats_trade_in_transactions';
    RAISE NOTICE '   - lats_trade_in_contracts';
    RAISE NOTICE '   - lats_trade_in_damage_assessments';
    RAISE NOTICE '   - lats_trade_in_settings';
    RAISE NOTICE '🔧 Next steps:';
    RAISE NOTICE '   1. Set up base trade-in prices for your devices';
    RAISE NOTICE '   2. Configure condition multipliers as needed';
    RAISE NOTICE '   3. Review and customize terms & conditions';
END $$;

