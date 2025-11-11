-- ============================================
-- CREATE SHIPPING MANAGEMENT TABLES
-- For managing shipping agents, methods, and PO shipping info
-- ============================================

-- ============================================
-- SHIPPING AGENTS TABLE
-- Store shipping agent/freight forwarder information
-- ============================================
CREATE TABLE IF NOT EXISTS lats_shipping_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    company_name TEXT,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    whatsapp TEXT,
    
    -- Specialization
    shipping_methods TEXT[] DEFAULT ARRAY['sea', 'air']::TEXT[], -- Methods they handle
    
    -- Address Information
    address TEXT,
    city TEXT,
    country TEXT,
    
    -- Agent Details
    license_number TEXT,
    website TEXT,
    notes TEXT,
    
    -- Cost Information
    base_rate_sea NUMERIC DEFAULT 0, -- Base rate for sea shipping
    base_rate_air NUMERIC DEFAULT 0, -- Base rate for air shipping
    currency TEXT DEFAULT 'USD',
    
    -- Rating & Performance
    rating NUMERIC DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    total_shipments INTEGER DEFAULT 0,
    successful_shipments INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_preferred BOOLEAN DEFAULT false, -- Mark preferred agents
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- ============================================
-- SHIPPING METHODS TABLE
-- Define available shipping methods
-- ============================================
CREATE TABLE IF NOT EXISTS lats_shipping_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- e.g., 'Air Freight', 'Sea Freight', 'Express Air'
    code TEXT NOT NULL UNIQUE, -- e.g., 'air', 'sea', 'express_air'
    description TEXT,
    
    -- Estimated delivery time
    estimated_days_min INTEGER,
    estimated_days_max INTEGER,
    
    -- Cost multiplier (relative to base)
    cost_multiplier NUMERIC DEFAULT 1.0,
    
    -- Display order
    display_order INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PURCHASE ORDER SHIPPING INFO TABLE
-- Store detailed shipping information for each PO
-- ============================================
CREATE TABLE IF NOT EXISTS lats_purchase_order_shipping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES lats_purchase_orders(id) ON DELETE CASCADE,
    
    -- Shipping Method
    shipping_method_id UUID REFERENCES lats_shipping_methods(id),
    shipping_method_code TEXT, -- 'air', 'sea', etc.
    
    -- Shipping Agent
    shipping_agent_id UUID REFERENCES lats_shipping_agents(id),
    agent_name TEXT, -- Cached name
    agent_contact TEXT,
    agent_phone TEXT,
    
    -- Shipping Address
    shipping_address_street TEXT,
    shipping_address_city TEXT DEFAULT 'Dar es Salaam',
    shipping_address_region TEXT,
    shipping_address_country TEXT DEFAULT 'Tanzania',
    shipping_address_postal_code TEXT,
    
    -- Billing Address (if different)
    billing_address_street TEXT,
    billing_address_city TEXT,
    billing_address_region TEXT,
    billing_address_country TEXT,
    billing_address_postal_code TEXT,
    use_same_address BOOLEAN DEFAULT true,
    
    -- Shipping Details
    expected_departure_date DATE,
    expected_arrival_date DATE,
    actual_departure_date DATE,
    actual_arrival_date DATE,
    
    -- Tracking Information
    tracking_number TEXT,
    container_number TEXT, -- For sea freight
    bill_of_lading TEXT, -- B/L number for sea freight
    airway_bill TEXT, -- AWB number for air freight
    
    -- Cost Information
    shipping_cost NUMERIC DEFAULT 0,
    insurance_cost NUMERIC DEFAULT 0,
    customs_duty NUMERIC DEFAULT 0,
    other_charges NUMERIC DEFAULT 0,
    total_shipping_cost NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    
    -- Port/Airport Information
    port_of_loading TEXT, -- Departure port/airport
    port_of_discharge TEXT, -- Arrival port/airport
    
    -- Container Details (for sea freight)
    container_type TEXT, -- '20ft', '40ft', '40ft HC', etc.
    container_count INTEGER DEFAULT 1,
    
    -- Status
    shipping_status TEXT DEFAULT 'pending', -- pending, in_transit, customs, delivered
    
    -- Notes
    shipping_notes TEXT,
    customs_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT check_shipping_status CHECK (shipping_status IN ('pending', 'preparing', 'in_transit', 'customs', 'delivered', 'cancelled'))
);

-- ============================================
-- SHIPPING SETTINGS TABLE
-- Store default shipping settings and preferences
-- ============================================
CREATE TABLE IF NOT EXISTS lats_shipping_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Default Shipping Address
    default_shipping_address_street TEXT,
    default_shipping_address_city TEXT DEFAULT 'Dar es Salaam',
    default_shipping_address_region TEXT DEFAULT 'Dar es Salaam',
    default_shipping_address_country TEXT DEFAULT 'Tanzania',
    default_shipping_address_postal_code TEXT,
    
    -- Default Billing Address
    default_billing_address_street TEXT,
    default_billing_address_city TEXT,
    default_billing_address_region TEXT,
    default_billing_address_country TEXT,
    default_billing_address_postal_code TEXT,
    
    -- Default Shipping Method
    default_shipping_method_id UUID REFERENCES lats_shipping_methods(id),
    
    -- Default Agent (optional)
    default_agent_id UUID REFERENCES lats_shipping_agents(id),
    
    -- Notification Settings
    notify_on_shipment BOOLEAN DEFAULT true,
    notify_on_arrival BOOLEAN DEFAULT true,
    notification_email TEXT,
    notification_phone TEXT,
    
    -- Cost Settings
    auto_calculate_shipping BOOLEAN DEFAULT false,
    include_insurance BOOLEAN DEFAULT true,
    insurance_percentage NUMERIC DEFAULT 2.0, -- 2% of goods value
    
    -- Metadata
    user_id UUID, -- For user-specific settings
    branch_id UUID REFERENCES lats_branches(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Shipping Agents
CREATE INDEX IF NOT EXISTS idx_shipping_agents_active ON lats_shipping_agents(is_active);
CREATE INDEX IF NOT EXISTS idx_shipping_agents_preferred ON lats_shipping_agents(is_preferred) WHERE is_preferred = true;
CREATE INDEX IF NOT EXISTS idx_shipping_agents_methods ON lats_shipping_agents USING GIN(shipping_methods);

-- Shipping Methods
CREATE INDEX IF NOT EXISTS idx_shipping_methods_active ON lats_shipping_methods(is_active);
CREATE INDEX IF NOT EXISTS idx_shipping_methods_code ON lats_shipping_methods(code);

-- PO Shipping
CREATE INDEX IF NOT EXISTS idx_po_shipping_order_id ON lats_purchase_order_shipping(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_shipping_agent ON lats_purchase_order_shipping(shipping_agent_id);
CREATE INDEX IF NOT EXISTS idx_po_shipping_method ON lats_purchase_order_shipping(shipping_method_id);
CREATE INDEX IF NOT EXISTS idx_po_shipping_status ON lats_purchase_order_shipping(shipping_status);
CREATE INDEX IF NOT EXISTS idx_po_shipping_tracking ON lats_purchase_order_shipping(tracking_number) WHERE tracking_number IS NOT NULL;

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

-- Shipping Agents
CREATE OR REPLACE FUNCTION update_shipping_agents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_shipping_agents_updated_at ON lats_shipping_agents;
CREATE TRIGGER trigger_shipping_agents_updated_at
    BEFORE UPDATE ON lats_shipping_agents
    FOR EACH ROW
    EXECUTE FUNCTION update_shipping_agents_updated_at();

-- Shipping Methods
CREATE OR REPLACE FUNCTION update_shipping_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_shipping_methods_updated_at ON lats_shipping_methods;
CREATE TRIGGER trigger_shipping_methods_updated_at
    BEFORE UPDATE ON lats_shipping_methods
    FOR EACH ROW
    EXECUTE FUNCTION update_shipping_methods_updated_at();

-- PO Shipping
CREATE OR REPLACE FUNCTION update_po_shipping_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_po_shipping_updated_at ON lats_purchase_order_shipping;
CREATE TRIGGER trigger_po_shipping_updated_at
    BEFORE UPDATE ON lats_purchase_order_shipping
    FOR EACH ROW
    EXECUTE FUNCTION update_po_shipping_updated_at();

-- Shipping Settings
CREATE OR REPLACE FUNCTION update_shipping_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_shipping_settings_updated_at ON lats_shipping_settings;
CREATE TRIGGER trigger_shipping_settings_updated_at
    BEFORE UPDATE ON lats_shipping_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_shipping_settings_updated_at();

-- ============================================
-- INSERT DEFAULT SHIPPING METHODS
-- ============================================

INSERT INTO lats_shipping_methods (name, code, description, estimated_days_min, estimated_days_max, cost_multiplier, display_order) VALUES
    ('Sea Freight', 'sea', 'Cost-effective ocean shipping for large volumes', 30, 60, 1.0, 1),
    ('Air Freight', 'air', 'Fast air transportation for urgent shipments', 5, 10, 3.0, 2),
    ('Express Air', 'express_air', 'Fastest air shipping option', 2, 5, 5.0, 3),
    ('Road Transport', 'road', 'Ground transportation for regional deliveries', 3, 7, 0.8, 4),
    ('Rail Freight', 'rail', 'Rail transportation for bulk shipments', 10, 20, 0.9, 5)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- INSERT DEFAULT SHIPPING SETTINGS
-- ============================================

INSERT INTO lats_shipping_settings (
    default_shipping_address_city,
    default_shipping_address_region,
    default_shipping_address_country,
    default_shipping_method_id
)
SELECT 
    'Dar es Salaam',
    'Dar es Salaam',
    'Tanzania',
    id
FROM lats_shipping_methods
WHERE code = 'sea'
LIMIT 1
ON CONFLICT DO NOTHING;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE lats_shipping_agents IS 'Stores information about shipping agents and freight forwarders';
COMMENT ON TABLE lats_shipping_methods IS 'Defines available shipping methods (air, sea, etc.)';
COMMENT ON TABLE lats_purchase_order_shipping IS 'Detailed shipping information for each purchase order';
COMMENT ON TABLE lats_shipping_settings IS 'Default shipping settings and preferences';

COMMENT ON COLUMN lats_shipping_agents.shipping_methods IS 'Array of shipping methods this agent handles';
COMMENT ON COLUMN lats_shipping_agents.rating IS 'Agent rating from 0 to 5';
COMMENT ON COLUMN lats_purchase_order_shipping.use_same_address IS 'Whether billing address is same as shipping address';
COMMENT ON COLUMN lats_purchase_order_shipping.shipping_status IS 'Current status of the shipment';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Shipping management tables created successfully!';
  RAISE NOTICE '📦 Created tables: shipping_agents, shipping_methods, purchase_order_shipping, shipping_settings';
  RAISE NOTICE '🚢 Default shipping methods added (Sea, Air, Express Air, Road, Rail)';
END $$;

