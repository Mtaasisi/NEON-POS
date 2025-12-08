# Fix Missing Tables in Supabase Database

## Problem

Your application is getting errors because these tables/views are missing:
- ❌ `customers` (should be a VIEW pointing to `lats_customers`)
- ❌ `products` (should be a VIEW pointing to `lats_products`)
- ❌ `lats_storage_rooms` (table)
- ❌ `special_orders` (table)

## Current Status

✅ **Existing tables:**
- `lats_customers` - EXISTS
- `lats_products` - EXISTS  
- `lats_sales` - EXISTS

❌ **Missing:**
- `customers` view
- `products` view
- `lats_storage_rooms` table
- `special_orders` table

---

## Quick Fix: Create Customers View

The most critical fix is creating the `customers` view. Here's how:

### Step 1: Open Supabase SQL Editor

1. Go to: **https://app.supabase.com/project/jxhzveborezjhsmzsgbc/sql/new**
2. Click **"New Query"** if needed

### Step 2: Run This SQL

Copy and paste this SQL into the editor:

```sql
-- Drop existing view if it exists
DROP VIEW IF EXISTS public.customers CASCADE;

-- Create customers view pointing to lats_customers
CREATE VIEW public.customers AS 
SELECT 
    id, name, email, phone, whatsapp, gender, city, country,
    location_description, color_tag, loyalty_level, points,
    total_spent, last_visit, is_active, referral_source,
    birth_month, birth_day, birthday, initial_notes, notes,
    customer_tag, national_id, joined_date, created_at,
    updated_at, branch_id, is_shared, created_by_branch_id,
    created_by_branch_name, profile_image, whatsapp_opt_out,
    referred_by, created_by, last_purchase_date, total_purchases,
    total_returns, total_calls, total_call_duration_minutes,
    incoming_calls, outgoing_calls, missed_calls,
    avg_call_duration_minutes, first_call_date, last_call_date,
    call_loyalty_level, last_activity_date, referrals,
    preferred_branch_id, visible_to_branches, sharing_mode
FROM public.lats_customers;
```

### Step 3: Click "RUN"

After running, the `customers` view will be created and your app errors should be fixed!

---

## Alternative: Use the SQL File

I've created a file with the complete SQL:

**File:** `FIX_CUSTOMERS_VIEW_SUPABASE.sql`

1. Open the file
2. Copy the SQL
3. Paste into Supabase SQL Editor
4. Run it

---

## After Fixing

Once you create the `customers` view:

1. ✅ Refresh your application
2. ✅ The "relation customers does not exist" errors should disappear
3. ✅ Customer queries will work correctly

---

## Additional Missing Tables

The other missing tables (`products` view, `lats_storage_rooms`, `special_orders`) can be created later if needed. The `customers` view is the most critical fix right now.

---

## Verification

After running the SQL, you can verify it worked:

1. Go to Supabase Dashboard → Table Editor
2. Look for "customers" - it should show as a VIEW (not a table)
3. You should be able to query it and see data from `lats_customers`

---

## Need Help?

If you encounter any issues:

1. Check the SQL Editor for error messages
2. Make sure you're connected to the correct Supabase project
3. Verify that `lats_customers` table exists (it should)
