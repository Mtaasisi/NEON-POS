-- ================================================
-- FIX: Create 'customers' VIEW pointing to 'lats_customers'
-- ================================================
-- This allows your app to query 'customers' table
-- while actually using the 'lats_customers' data
-- ================================================
-- 
-- IMPORTANT: Run this in Supabase SQL Editor
-- URL: https://app.supabase.com/project/jxhzveborezjhsmzsgbc/sql/new
-- ================================================

BEGIN;

-- Drop existing view if it exists (will recreate)
DROP VIEW IF EXISTS public.customers CASCADE;

-- Create customers view pointing to lats_customers
CREATE VIEW public.customers AS 
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
FROM public.lats_customers;

COMMIT;

-- ================================================
-- ✅ DONE! 
-- ================================================
-- The customers view has been created.
-- Your app can now query "customers" and it will
-- automatically use data from "lats_customers"
-- ================================================
