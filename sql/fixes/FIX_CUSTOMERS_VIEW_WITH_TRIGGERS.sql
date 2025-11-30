-- ================================================
-- FIX: Replace RULES with TRIGGERS for customers view
-- ================================================
-- This fixes the "cannot perform UPDATE RETURNING" error
-- by using INSTEAD OF triggers instead of rules
-- ================================================

BEGIN;

-- Step 1: Drop existing rules if they exist
DROP RULE IF EXISTS customers_insert ON customers;
DROP RULE IF EXISTS customers_update ON customers;
DROP RULE IF EXISTS customers_delete ON customers;

-- Step 2: Drop the old view (we'll recreate it)
DROP VIEW IF EXISTS customers CASCADE;

-- Step 3: Recreate the view
CREATE OR REPLACE VIEW customers AS
SELECT 
    id,
    name,
    email,
    phone,
    whatsapp,
    gender,
    city,
    country,
    location_description,
    color_tag,
    loyalty_level,
    points,
    total_spent,
    last_visit,
    is_active,
    referral_source,
    birth_month,
    birth_day,
    birthday,
    initial_notes,
    notes,
    customer_tag,
    national_id,
    joined_date,
    created_at,
    updated_at,
    branch_id,
    is_shared,
    created_by_branch_id,
    created_by_branch_name,
    profile_image,
    whatsapp_opt_out,
    referred_by,
    created_by,
    last_purchase_date,
    total_purchases,
    total_returns,
    total_calls,
    total_call_duration_minutes,
    incoming_calls,
    outgoing_calls,
    missed_calls,
    avg_call_duration_minutes,
    first_call_date,
    last_call_date,
    call_loyalty_level,
    last_activity_date,
    referrals,
    preferred_branch_id,
    visible_to_branches,
    sharing_mode
FROM lats_customers;

-- Step 4: Create INSTEAD OF INSERT trigger
CREATE OR REPLACE FUNCTION customers_insert_trigger()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO lats_customers (
        name, email, phone, whatsapp, gender, city, country, location_description,
        color_tag, loyalty_level, points, total_spent, last_visit, is_active,
        referral_source, birth_month, birth_day, birthday, initial_notes, notes,
        customer_tag, national_id, joined_date, created_at, updated_at, branch_id,
        is_shared, created_by_branch_id, created_by_branch_name, profile_image,
        whatsapp_opt_out, referred_by, created_by, last_purchase_date, total_purchases,
        total_returns, total_calls, total_call_duration_minutes, incoming_calls,
        outgoing_calls, missed_calls, avg_call_duration_minutes, first_call_date,
        last_call_date, call_loyalty_level, last_activity_date, referrals,
        preferred_branch_id, visible_to_branches, sharing_mode
    )
    VALUES (
        NEW.name, NEW.email, NEW.phone, NEW.whatsapp, NEW.gender, NEW.city, NEW.country,
        NEW.location_description, NEW.color_tag, NEW.loyalty_level, NEW.points,
        NEW.total_spent, NEW.last_visit, NEW.is_active, NEW.referral_source,
        NEW.birth_month, NEW.birth_day, NEW.birthday, NEW.initial_notes, NEW.notes,
        NEW.customer_tag, NEW.national_id, NEW.joined_date, 
        COALESCE(NEW.created_at, NOW()), COALESCE(NEW.updated_at, NOW()),
        NEW.branch_id, NEW.is_shared, NEW.created_by_branch_id, NEW.created_by_branch_name,
        NEW.profile_image, NEW.whatsapp_opt_out, NEW.referred_by, NEW.created_by,
        NEW.last_purchase_date, NEW.total_purchases, NEW.total_returns, NEW.total_calls,
        NEW.total_call_duration_minutes, NEW.incoming_calls, NEW.outgoing_calls,
        NEW.missed_calls, NEW.avg_call_duration_minutes, NEW.first_call_date,
        NEW.last_call_date, NEW.call_loyalty_level, NEW.last_activity_date, NEW.referrals,
        NEW.preferred_branch_id, NEW.visible_to_branches, NEW.sharing_mode
    )
    RETURNING * INTO NEW;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_instead_of_insert
INSTEAD OF INSERT ON customers
FOR EACH ROW
EXECUTE FUNCTION customers_insert_trigger();

-- Step 5: Create INSTEAD OF UPDATE trigger
CREATE OR REPLACE FUNCTION customers_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    updated_row lats_customers%ROWTYPE;
BEGIN
    UPDATE lats_customers
    SET
        name = NEW.name,
        email = NEW.email,
        phone = NEW.phone,
        whatsapp = NEW.whatsapp,
        gender = NEW.gender,
        city = NEW.city,
        country = NEW.country,
        location_description = NEW.location_description,
        color_tag = NEW.color_tag,
        loyalty_level = NEW.loyalty_level,
        points = NEW.points,
        total_spent = NEW.total_spent,
        last_visit = NEW.last_visit,
        is_active = NEW.is_active,
        referral_source = NEW.referral_source,
        birth_month = NEW.birth_month,
        birth_day = NEW.birth_day,
        birthday = NEW.birthday,
        initial_notes = NEW.initial_notes,
        notes = NEW.notes,
        customer_tag = NEW.customer_tag,
        national_id = NEW.national_id,
        joined_date = NEW.joined_date,
        updated_at = COALESCE(NEW.updated_at, NOW()),
        branch_id = NEW.branch_id,
        is_shared = NEW.is_shared,
        created_by_branch_id = NEW.created_by_branch_id,
        created_by_branch_name = NEW.created_by_branch_name,
        profile_image = NEW.profile_image,
        whatsapp_opt_out = NEW.whatsapp_opt_out,
        referred_by = NEW.referred_by,
        created_by = NEW.created_by,
        last_purchase_date = NEW.last_purchase_date,
        total_purchases = NEW.total_purchases,
        total_returns = NEW.total_returns,
        total_calls = NEW.total_calls,
        total_call_duration_minutes = NEW.total_call_duration_minutes,
        incoming_calls = NEW.incoming_calls,
        outgoing_calls = NEW.outgoing_calls,
        missed_calls = NEW.missed_calls,
        avg_call_duration_minutes = NEW.avg_call_duration_minutes,
        first_call_date = NEW.first_call_date,
        last_call_date = NEW.last_call_date,
        call_loyalty_level = NEW.call_loyalty_level,
        last_activity_date = NEW.last_activity_date,
        referrals = NEW.referrals,
        preferred_branch_id = NEW.preferred_branch_id,
        visible_to_branches = NEW.visible_to_branches,
        sharing_mode = NEW.sharing_mode
    WHERE id = OLD.id
    RETURNING * INTO updated_row;
    
    -- Populate NEW with the updated values for RETURNING clause
    NEW.id := updated_row.id;
    NEW.name := updated_row.name;
    NEW.email := updated_row.email;
    NEW.phone := updated_row.phone;
    NEW.whatsapp := updated_row.whatsapp;
    NEW.gender := updated_row.gender;
    NEW.city := updated_row.city;
    NEW.country := updated_row.country;
    NEW.location_description := updated_row.location_description;
    NEW.color_tag := updated_row.color_tag;
    NEW.loyalty_level := updated_row.loyalty_level;
    NEW.points := updated_row.points;
    NEW.total_spent := updated_row.total_spent;
    NEW.last_visit := updated_row.last_visit;
    NEW.is_active := updated_row.is_active;
    NEW.referral_source := updated_row.referral_source;
    NEW.birth_month := updated_row.birth_month;
    NEW.birth_day := updated_row.birth_day;
    NEW.birthday := updated_row.birthday;
    NEW.initial_notes := updated_row.initial_notes;
    NEW.notes := updated_row.notes;
    NEW.customer_tag := updated_row.customer_tag;
    NEW.national_id := updated_row.national_id;
    NEW.joined_date := updated_row.joined_date;
    NEW.created_at := updated_row.created_at;
    NEW.updated_at := updated_row.updated_at;
    NEW.branch_id := updated_row.branch_id;
    NEW.is_shared := updated_row.is_shared;
    NEW.created_by_branch_id := updated_row.created_by_branch_id;
    NEW.created_by_branch_name := updated_row.created_by_branch_name;
    NEW.profile_image := updated_row.profile_image;
    NEW.whatsapp_opt_out := updated_row.whatsapp_opt_out;
    NEW.referred_by := updated_row.referred_by;
    NEW.created_by := updated_row.created_by;
    NEW.last_purchase_date := updated_row.last_purchase_date;
    NEW.total_purchases := updated_row.total_purchases;
    NEW.total_returns := updated_row.total_returns;
    NEW.total_calls := updated_row.total_calls;
    NEW.total_call_duration_minutes := updated_row.total_call_duration_minutes;
    NEW.incoming_calls := updated_row.incoming_calls;
    NEW.outgoing_calls := updated_row.outgoing_calls;
    NEW.missed_calls := updated_row.missed_calls;
    NEW.avg_call_duration_minutes := updated_row.avg_call_duration_minutes;
    NEW.first_call_date := updated_row.first_call_date;
    NEW.last_call_date := updated_row.last_call_date;
    NEW.call_loyalty_level := updated_row.call_loyalty_level;
    NEW.last_activity_date := updated_row.last_activity_date;
    NEW.referrals := updated_row.referrals;
    NEW.preferred_branch_id := updated_row.preferred_branch_id;
    NEW.visible_to_branches := updated_row.visible_to_branches;
    NEW.sharing_mode := updated_row.sharing_mode;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_instead_of_update
INSTEAD OF UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION customers_update_trigger();

-- Step 6: Create INSTEAD OF DELETE trigger
CREATE OR REPLACE FUNCTION customers_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM lats_customers
    WHERE id = OLD.id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_instead_of_delete
INSTEAD OF DELETE ON customers
FOR EACH ROW
EXECUTE FUNCTION customers_delete_trigger();

-- Summary
DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE '✅ CUSTOMERS VIEW FIXED WITH TRIGGERS!';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Old RULES replaced with INSTEAD OF TRIGGERS';
    RAISE NOTICE '✓ View now supports UPDATE ... RETURNING *';
    RAISE NOTICE '✓ View supports SELECT, INSERT, UPDATE, DELETE';
    RAISE NOTICE '✓ Supabase client will work correctly now';
    RAISE NOTICE '✓ No more "cannot perform UPDATE RETURNING" errors';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Restart your application';
    RAISE NOTICE '  2. Test customer update operations';
    RAISE NOTICE '  3. Verify the error is gone!';
    RAISE NOTICE '================================================';
END $$;

COMMIT;

