-- ============================================================================
-- Fix Customers View - Make lats_customers accessible as "customers"
-- ============================================================================
-- 
-- ISSUE: Mobile app queries "customers" table but data is in "lats_customers"
-- SOLUTION: Create a view that maps customers -> lats_customers
--
-- Date: 2025-11-09
-- ============================================================================

-- Drop existing customers view if it exists
DROP VIEW IF EXISTS customers CASCADE;

-- Create customers view pointing to lats_customers
CREATE VIEW customers AS 
SELECT * FROM lats_customers;

-- Create an INSTEAD OF trigger to allow inserts through the view
CREATE OR REPLACE FUNCTION customers_insert_trigger()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO lats_customers (
        id, name, email, phone, address, city, location, branch_id,
        loyalty_points, total_spent, status, is_active, whatsapp,
        gender, country, color_tag, loyalty_level, points, last_visit,
        referral_source, birth_month, birth_day, birthday, initial_notes,
        notes, customer_tag, location_description, national_id, joined_date,
        profile_image, whatsapp_opt_out, referred_by, created_by,
        referrals, is_shared, preferred_branch_id, visible_to_branches,
        sharing_mode, created_by_branch_id, created_by_branch_name
    ) VALUES (
        COALESCE(NEW.id, gen_random_uuid()),
        NEW.name,
        NEW.email,
        NEW.phone,
        NEW.address,
        NEW.city,
        NEW.location,
        COALESCE(NEW.branch_id, '00000000-0000-0000-0000-000000000001'::uuid),
        COALESCE(NEW.loyalty_points, 0),
        COALESCE(NEW.total_spent, 0),
        COALESCE(NEW.status, 'active'),
        COALESCE(NEW.is_active, true),
        NEW.whatsapp,
        NEW.gender,
        NEW.country,
        COALESCE(NEW.color_tag, 'new'),
        COALESCE(NEW.loyalty_level, 'bronze'),
        COALESCE(NEW.points, 0),
        NEW.last_visit,
        NEW.referral_source,
        NEW.birth_month,
        NEW.birth_day,
        NEW.birthday,
        NEW.initial_notes,
        NEW.notes,
        NEW.customer_tag,
        NEW.location_description,
        NEW.national_id,
        COALESCE(NEW.joined_date, CURRENT_DATE),
        NEW.profile_image,
        COALESCE(NEW.whatsapp_opt_out, false),
        NEW.referred_by,
        NEW.created_by,
        COALESCE(NEW.referrals, '[]'::jsonb),
        COALESCE(NEW.is_shared, true),
        NEW.preferred_branch_id,
        NEW.visible_to_branches,
        COALESCE(NEW.sharing_mode, 'isolated'),
        NEW.created_by_branch_id,
        NEW.created_by_branch_name
    )
    RETURNING * INTO NEW;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS customers_insert_trigger ON customers;

-- Create the trigger
CREATE TRIGGER customers_insert_trigger
    INSTEAD OF INSERT ON customers
    FOR EACH ROW
    EXECUTE FUNCTION customers_insert_trigger();

-- Create an INSTEAD OF trigger for updates
CREATE OR REPLACE FUNCTION customers_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE lats_customers
    SET
        name = NEW.name,
        email = NEW.email,
        phone = NEW.phone,
        address = NEW.address,
        city = NEW.city,
        location = NEW.location,
        branch_id = NEW.branch_id,
        loyalty_points = NEW.loyalty_points,
        total_spent = NEW.total_spent,
        status = NEW.status,
        is_active = NEW.is_active,
        whatsapp = NEW.whatsapp,
        gender = NEW.gender,
        country = NEW.country,
        color_tag = NEW.color_tag,
        loyalty_level = NEW.loyalty_level,
        points = NEW.points,
        last_visit = NEW.last_visit,
        referral_source = NEW.referral_source,
        birth_month = NEW.birth_month,
        birth_day = NEW.birth_day,
        birthday = NEW.birthday,
        initial_notes = NEW.initial_notes,
        notes = NEW.notes,
        customer_tag = NEW.customer_tag,
        location_description = NEW.location_description,
        national_id = NEW.national_id,
        joined_date = NEW.joined_date,
        profile_image = NEW.profile_image,
        whatsapp_opt_out = NEW.whatsapp_opt_out,
        referred_by = NEW.referred_by,
        created_by = NEW.created_by,
        referrals = NEW.referrals,
        is_shared = NEW.is_shared,
        preferred_branch_id = NEW.preferred_branch_id,
        visible_to_branches = NEW.visible_to_branches,
        sharing_mode = NEW.sharing_mode,
        created_by_branch_id = NEW.created_by_branch_id,
        created_by_branch_name = NEW.created_by_branch_name,
        updated_at = now()
    WHERE id = OLD.id
    RETURNING * INTO NEW;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing update trigger if exists
DROP TRIGGER IF EXISTS customers_update_trigger ON customers;

-- Create the update trigger
CREATE TRIGGER customers_update_trigger
    INSTEAD OF UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION customers_update_trigger();

-- Create an INSTEAD OF trigger for deletes
CREATE OR REPLACE FUNCTION customers_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM lats_customers WHERE id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Drop existing delete trigger if exists
DROP TRIGGER IF EXISTS customers_delete_trigger ON customers;

-- Create the delete trigger
CREATE TRIGGER customers_delete_trigger
    INSTEAD OF DELETE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION customers_delete_trigger();

-- Grant permissions (if needed)
GRANT SELECT, INSERT, UPDATE, DELETE ON customers TO PUBLIC;

-- Verify the view works
SELECT 
    COUNT(*) as total_customers,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_customers,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as new_customers_30_days
FROM customers;

-- Show sample data
SELECT 
    id,
    name,
    phone,
    email,
    city,
    total_spent,
    loyalty_level,
    is_active,
    created_at
FROM customers
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- COMPLETED: Customers view created with insert/update/delete triggers
-- ============================================================================

