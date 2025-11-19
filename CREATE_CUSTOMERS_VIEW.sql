-- ================================================
-- FIX: Create 'customers' view pointing to 'lats_customers'
-- ================================================
-- This allows your app to query 'customers' table
-- while actually using the 'lats_customers' data
-- ================================================

BEGIN;

-- Step 1: Rename the old customers table (preserve chat data)
ALTER TABLE IF EXISTS customers RENAME TO whatsapp_customers;

-- Step 2: Create a view called 'customers' that points to lats_customers
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

-- Step 3: Create rules to make the view updatable (allow INSERT/UPDATE/DELETE)
CREATE OR REPLACE RULE customers_insert AS
    ON INSERT TO customers
    DO INSTEAD
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
        NEW.customer_tag, NEW.national_id, NEW.joined_date, NEW.created_at, NEW.updated_at,
        NEW.branch_id, NEW.is_shared, NEW.created_by_branch_id, NEW.created_by_branch_name,
        NEW.profile_image, NEW.whatsapp_opt_out, NEW.referred_by, NEW.created_by,
        NEW.last_purchase_date, NEW.total_purchases, NEW.total_returns, NEW.total_calls,
        NEW.total_call_duration_minutes, NEW.incoming_calls, NEW.outgoing_calls,
        NEW.missed_calls, NEW.avg_call_duration_minutes, NEW.first_call_date,
        NEW.last_call_date, NEW.call_loyalty_level, NEW.last_activity_date, NEW.referrals,
        NEW.preferred_branch_id, NEW.visible_to_branches, NEW.sharing_mode
    )
    RETURNING id, name, email, phone, whatsapp, gender, city, country, location_description,
        color_tag, loyalty_level, points, total_spent, last_visit, is_active,
        referral_source, birth_month, birth_day, birthday, initial_notes, notes,
        customer_tag, national_id, joined_date, created_at, updated_at,
        branch_id, is_shared, created_by_branch_id, created_by_branch_name, profile_image,
        whatsapp_opt_out, referred_by, created_by, last_purchase_date, total_purchases,
        total_returns, total_calls, total_call_duration_minutes, incoming_calls,
        outgoing_calls, missed_calls, avg_call_duration_minutes, first_call_date,
        last_call_date, call_loyalty_level, last_activity_date, referrals,
        preferred_branch_id, visible_to_branches, sharing_mode;

CREATE OR REPLACE RULE customers_update AS
    ON UPDATE TO customers
    DO INSTEAD
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
        updated_at = NEW.updated_at,
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
    WHERE id = OLD.id;

CREATE OR REPLACE RULE customers_delete AS
    ON DELETE TO customers
    DO INSTEAD
    DELETE FROM lats_customers
    WHERE id = OLD.id;

-- Summary
DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE '✅ CUSTOMERS VIEW CREATED SUCCESSFULLY!';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Old customers table renamed to: whatsapp_customers';
    RAISE NOTICE 'New customers view created pointing to: lats_customers';
    RAISE NOTICE '✓ View supports SELECT, INSERT, UPDATE, DELETE';
    RAISE NOTICE '✓ Your app can now query "customers" table';
    RAISE NOTICE '✓ All data comes from lats_customers';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Restart your application';
    RAISE NOTICE '  2. Clear browser cache';
    RAISE NOTICE '  3. Test customer operations';
    RAISE NOTICE '  4. All "column does not exist" errors should be fixed!';
    RAISE NOTICE '================================================';
END $$;

COMMIT;

