-- ================================================
-- DELIVERY TRACKING FUNCTIONS
-- ================================================
-- These functions should be run after the main migration
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
    changed_by UUID DEFAULT NULL,
    notes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    old_status TEXT;
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

    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_delivery_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate tracking numbers
CREATE TRIGGER trigger_set_tracking_number
    BEFORE INSERT ON lats_delivery_orders
    FOR EACH ROW
    EXECUTE FUNCTION set_tracking_number();

-- Trigger to update timestamps
CREATE TRIGGER trigger_update_delivery_updated_at
    BEFORE UPDATE ON lats_delivery_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_delivery_updated_at();

-- Test the functions
SELECT generate_tracking_number() as test_tracking_number;

-- Insert sample data for testing
INSERT INTO lats_delivery_drivers (name, phone, vehicle_type, vehicle_registration)
VALUES
    ('John Boda Rider', '+255 712 345 678', 'motorcycle', 'T 123 ABC'),
    ('Mary Delivery Driver', '+255 713 456 789', 'car', 'T 456 DEF'),
    ('Peter Van Service', '+255 714 567 890', 'van', 'T 789 GHI')
ON CONFLICT DO NOTHING;

INSERT INTO lats_delivery_zones (name, description, delivery_fee, estimated_time_minutes)
VALUES
    ('Downtown Dar es Salaam', 'Central business district', 2000, 30),
    ('Msasani Area', 'Residential and commercial area', 3000, 45),
    ('Airport Area', 'Near Julius Nyerere International Airport', 5000, 60)
ON CONFLICT DO NOTHING;