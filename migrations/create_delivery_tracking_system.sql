-- ================================================
-- DELIVERY TRACKING SYSTEM
-- ================================================
-- Creates comprehensive delivery tracking with customer notifications
-- and status management for Tablet POS
-- ================================================

-- ================================================
-- DELIVERY ORDERS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS lats_delivery_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES lats_sales(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES lats_customers(id),

    -- Delivery Method & Details
    delivery_method TEXT NOT NULL CHECK (delivery_method IN ('boda', 'bus', 'air')),
    delivery_address TEXT,
    delivery_phone TEXT,
    delivery_time TEXT,
    delivery_notes TEXT,

    -- Method-Specific Fields
    boda_destination TEXT,
    boda_price NUMERIC DEFAULT 0,
    bus_name TEXT,
    bus_contacts TEXT,
    arrival_date DATE,
    bus_office_location TEXT,
    bus_destination TEXT,
    flight_name TEXT,
    flight_arrival_time TIMESTAMPTZ,
    air_office_location TEXT,
    air_destination TEXT,

    -- Financial Information
    delivery_fee NUMERIC NOT NULL DEFAULT 0,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    tax_amount NUMERIC DEFAULT 0,
    discount_amount NUMERIC DEFAULT 0,
    total_amount NUMERIC NOT NULL DEFAULT 0,

    -- Status Tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',      -- Order placed, not yet processed
        'confirmed',    -- Delivery confirmed by business
        'assigned',     -- Assigned to driver/delivery person
        'picked_up',    -- Driver picked up the items
        'in_transit',   -- Items are on the way
        'out_for_delivery', -- Final delivery attempt
        'delivered',    -- Successfully delivered
        'failed',       -- Delivery failed
        'returned',     -- Returned to business
        'cancelled'     -- Delivery cancelled
    )),

    -- Driver/Assignment Information
    assigned_driver_id UUID,
    assigned_driver_name TEXT,
    assigned_at TIMESTAMPTZ,
    driver_phone TEXT,
    driver_vehicle TEXT,

    -- Tracking & Timeline
    estimated_delivery_time TIMESTAMPTZ,
    actual_delivery_time TIMESTAMPTZ,
    tracking_number TEXT UNIQUE,
    tracking_url TEXT,

    -- Customer Communication
    customer_notified BOOLEAN DEFAULT false,
    customer_notification_method TEXT CHECK (customer_notification_method IN ('sms', 'email', 'whatsapp', 'none')),
    customer_notification_sent_at TIMESTAMPTZ,
    customer_feedback_rating INTEGER CHECK (customer_feedback_rating >= 1 AND customer_feedback_rating <= 5),
    customer_feedback_text TEXT,

    -- Business Information
    branch_id UUID REFERENCES lats_branches(id) DEFAULT '00000000-0000-0000-0000-000000000001',
    created_by UUID REFERENCES users(id),
    created_by_name TEXT,

    -- Metadata
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    requires_signature BOOLEAN DEFAULT false,
    special_instructions TEXT,
    internal_notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    status_updated_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================
-- DELIVERY STATUS HISTORY
-- ================================================

CREATE TABLE IF NOT EXISTS lats_delivery_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_order_id UUID REFERENCES lats_delivery_orders(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID REFERENCES users(id),
    changed_by_name TEXT,
    notes TEXT,
    customer_notified BOOLEAN DEFAULT false,
    notification_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================
-- CUSTOMER NOTIFICATIONS
-- ================================================

CREATE TABLE IF NOT EXISTS lats_customer_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_order_id UUID REFERENCES lats_delivery_orders(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES lats_customers(id),
    notification_type TEXT NOT NULL CHECK (notification_type IN (
        'delivery_confirmed',
        'driver_assigned',
        'out_for_delivery',
        'delivered',
        'delivery_delayed',
        'delivery_failed',
        'status_update'
    )),
    channel TEXT NOT NULL CHECK (channel IN ('sms', 'email', 'whatsapp', 'push')),
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    failure_reason TEXT,
    provider_response JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================
-- DRIVER MANAGEMENT
-- ================================================

CREATE TABLE IF NOT EXISTS lats_delivery_drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    vehicle_type TEXT CHECK (vehicle_type IN ('motorcycle', 'car', 'van', 'truck', 'bicycle')),
    vehicle_registration TEXT,
    license_number TEXT,
    is_active BOOLEAN DEFAULT true,
    branch_id UUID REFERENCES lats_branches(id) DEFAULT '00000000-0000-0000-0000-000000000001',

    -- Performance Tracking
    total_deliveries INTEGER DEFAULT 0,
    successful_deliveries INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_rating_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================
-- DELIVERY ZONES/AREAS
-- ================================================

CREATE TABLE IF NOT EXISTS lats_delivery_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    branch_id UUID REFERENCES lats_branches(id) DEFAULT '00000000-0000-0000-0000-000000000001',
    delivery_fee NUMERIC DEFAULT 0,
    estimated_time_minutes INTEGER DEFAULT 60,
    is_active BOOLEAN DEFAULT true,
    polygon_coordinates JSONB, -- For map integration
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================
-- DELIVERY ANALYTICS
-- ================================================

CREATE TABLE IF NOT EXISTS lats_delivery_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES lats_branches(id) DEFAULT '00000000-0000-0000-0000-000000000001',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_orders INTEGER DEFAULT 0,
    delivered_orders INTEGER DEFAULT 0,
    failed_deliveries INTEGER DEFAULT 0,
    average_delivery_time_minutes INTEGER DEFAULT 0,
    total_delivery_fees NUMERIC DEFAULT 0,
    customer_satisfaction_rating DECIMAL(3,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(branch_id, date)
);

-- ================================================
-- INDEXES FOR PERFORMANCE
-- ================================================

CREATE INDEX IF NOT EXISTS idx_delivery_orders_sale_id ON lats_delivery_orders(sale_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_customer_id ON lats_delivery_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_status ON lats_delivery_orders(status);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_branch_id ON lats_delivery_orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_tracking_number ON lats_delivery_orders(tracking_number);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_created_at ON lats_delivery_orders(created_at);

CREATE INDEX IF NOT EXISTS idx_delivery_status_history_delivery_order_id ON lats_delivery_status_history(delivery_order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_status_history_created_at ON lats_delivery_status_history(created_at);

CREATE INDEX IF NOT EXISTS idx_customer_notifications_delivery_order_id ON lats_customer_notifications(delivery_order_id);
CREATE INDEX IF NOT EXISTS idx_customer_notifications_customer_id ON lats_customer_notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_notifications_status ON lats_customer_notifications(status);

CREATE INDEX IF NOT EXISTS idx_delivery_drivers_branch_id ON lats_delivery_drivers(branch_id);
CREATE INDEX IF NOT EXISTS idx_delivery_drivers_is_active ON lats_delivery_drivers(is_active);

CREATE INDEX IF NOT EXISTS idx_delivery_zones_branch_id ON lats_delivery_zones(branch_id);
CREATE INDEX IF NOT EXISTS idx_delivery_zones_is_active ON lats_delivery_zones(is_active);

CREATE INDEX IF NOT EXISTS idx_delivery_analytics_branch_id ON lats_delivery_analytics(branch_id);
CREATE INDEX IF NOT EXISTS idx_delivery_analytics_date ON lats_delivery_analytics(date);

-- ================================================
-- ROW LEVEL SECURITY POLICIES (Simplified)
-- ================================================

-- Enable RLS (but keep policies simple for now - can be enhanced later)
ALTER TABLE lats_delivery_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE lats_delivery_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE lats_customer_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE lats_delivery_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE lats_delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE lats_delivery_analytics ENABLE ROW LEVEL SECURITY;

-- Simple policies - allow all authenticated users for now
-- These can be enhanced later with proper branch-based access control
CREATE POLICY "Allow authenticated users to view delivery orders" ON lats_delivery_orders
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert delivery orders" ON lats_delivery_orders
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update delivery orders" ON lats_delivery_orders
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to view delivery status history" ON lats_delivery_status_history
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert delivery status history" ON lats_delivery_status_history
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to view customer notifications" ON lats_customer_notifications
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert customer notifications" ON lats_customer_notifications
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to view delivery drivers" ON lats_delivery_drivers
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage delivery drivers" ON lats_delivery_drivers
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to view delivery zones" ON lats_delivery_zones
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage delivery zones" ON lats_delivery_zones
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to view delivery analytics" ON lats_delivery_analytics
    FOR SELECT USING (auth.role() = 'authenticated');

-- ================================================
-- FUNCTIONS & TRIGGERS
-- ================================================

-- Function to generate tracking numbers
CREATE OR REPLACE FUNCTION generate_tracking_number()
RETURNS TEXT AS $$
DECLARE
    tracking_num TEXT;
BEGIN
    -- Generate format: DEL + YYYYMMDD + random 6-digit number
    tracking_num := 'DEL' || to_char(CURRENT_DATE, 'YYYYMMDD') || lpad(floor(random() * 1000000)::text, 6, '0');

    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM lats_delivery_orders WHERE tracking_number = tracking_num) LOOP
        tracking_num := 'DEL' || to_char(CURRENT_DATE, 'YYYYMMDD') || lpad(floor(random() * 1000000)::text, 6, '0');
    END LOOP;

    RETURN tracking_num;
END;
$$ LANGUAGE plpgsql;

-- Function to update delivery status with history tracking
CREATE OR REPLACE FUNCTION update_delivery_status(
    delivery_order_id UUID,
    new_status TEXT,
    changed_by UUID DEFAULT auth.uid(),
    notes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    old_status TEXT;
    delivery_record RECORD;
BEGIN
    -- Get current status
    SELECT status INTO old_status
    FROM lats_delivery_orders
    WHERE id = delivery_order_id;

    -- Update the delivery order
    UPDATE lats_delivery_orders
    SET
        status = new_status,
        status_updated_at = now(),
        updated_at = now(),
        actual_delivery_time = CASE WHEN new_status = 'delivered' THEN now() ELSE actual_delivery_time END
    WHERE id = delivery_order_id;

    -- Insert status history
    INSERT INTO lats_delivery_status_history (
        delivery_order_id,
        old_status,
        new_status,
        changed_by,
        notes
    ) VALUES (
        delivery_order_id,
        old_status,
        new_status,
        changed_by,
        notes
    );

    -- Get delivery details for notifications
    SELECT * INTO delivery_record
    FROM lats_delivery_orders
    WHERE id = delivery_order_id;

    -- Trigger customer notifications based on status
    IF new_status IN ('confirmed', 'assigned', 'out_for_delivery', 'delivered', 'failed') THEN
        -- Insert notification record (will be processed by notification service)
        INSERT INTO lats_customer_notifications (
            delivery_order_id,
            customer_id,
            notification_type,
            channel,
            message,
            status
        ) VALUES (
            delivery_order_id,
            delivery_record.customer_id,
            CASE
                WHEN new_status = 'confirmed' THEN 'delivery_confirmed'
                WHEN new_status = 'assigned' THEN 'driver_assigned'
                WHEN new_status = 'out_for_delivery' THEN 'out_for_delivery'
                WHEN new_status = 'delivered' THEN 'delivered'
                WHEN new_status = 'failed' THEN 'delivery_failed'
                ELSE 'status_update'
            END,
            'sms', -- Default to SMS, can be configured
            CASE
                WHEN new_status = 'confirmed' THEN 'Your delivery has been confirmed. Tracking: ' || delivery_record.tracking_number
                WHEN new_status = 'assigned' THEN 'Driver assigned: ' || COALESCE(delivery_record.assigned_driver_name, 'TBD')
                WHEN new_status = 'out_for_delivery' THEN 'Your order is out for delivery!'
                WHEN new_status = 'delivered' THEN 'Your order has been delivered successfully!'
                WHEN new_status = 'failed' THEN 'Delivery attempt failed. We will retry or contact you.'
                ELSE 'Delivery status updated to: ' || new_status
            END,
            'pending'
        );
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-generate tracking numbers
CREATE OR REPLACE FUNCTION set_tracking_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tracking_number IS NULL THEN
        NEW.tracking_number := generate_tracking_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_tracking_number
    BEFORE INSERT ON lats_delivery_orders
    FOR EACH ROW
    EXECUTE FUNCTION set_tracking_number();

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_delivery_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_delivery_updated_at
    BEFORE UPDATE ON lats_delivery_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_delivery_updated_at();

-- ================================================
-- SAMPLE DATA
-- ================================================

-- Insert sample drivers
INSERT INTO lats_delivery_drivers (name, phone, vehicle_type, vehicle_registration, branch_id)
VALUES
    ('John Boda Rider', '+255 712 345 678', 'motorcycle', 'T 123 ABC', '00000000-0000-0000-0000-000000000001'),
    ('Mary Delivery Driver', '+255 713 456 789', 'car', 'T 456 DEF', '00000000-0000-0000-0000-000000000001'),
    ('Peter Van Service', '+255 714 567 890', 'van', 'T 789 GHI', '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Insert sample delivery zones
INSERT INTO lats_delivery_zones (name, description, delivery_fee, estimated_time_minutes, branch_id)
VALUES
    ('Downtown Dar es Salaam', 'Central business district', 2000, 30, '00000000-0000-0000-0000-000000000001'),
    ('Msasani Area', 'Residential and commercial area', 3000, 45, '00000000-0000-0000-0000-000000000001'),
    ('Airport Area', 'Near Julius Nyerere International Airport', 5000, 60, '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- ================================================
-- COMMENTS FOR DOCUMENTATION
-- ================================================

COMMENT ON TABLE lats_delivery_orders IS 'Main delivery orders table with comprehensive tracking';
COMMENT ON TABLE lats_delivery_status_history IS 'Audit trail for all delivery status changes';
COMMENT ON TABLE lats_customer_notifications IS 'Customer communication records and status';
COMMENT ON TABLE lats_delivery_drivers IS 'Driver information and performance tracking';
COMMENT ON TABLE lats_delivery_zones IS 'Geographic delivery zones with pricing';
COMMENT ON TABLE lats_delivery_analytics IS 'Daily delivery performance metrics';

COMMENT ON FUNCTION generate_tracking_number() IS 'Generates unique tracking numbers for deliveries';
COMMENT ON FUNCTION update_delivery_status(UUID, TEXT, UUID, TEXT) IS 'Updates delivery status with history tracking and notifications';