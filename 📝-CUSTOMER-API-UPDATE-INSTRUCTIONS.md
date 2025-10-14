# 📝 Customer API Update Instructions

## Problem Found

The customer fetch query in `src/lib/customerApi/core.ts` (line 263) is only fetching **28 columns** but the database will have **46+ columns** after running the fix script.

## Current Query (Line 263)
```javascript
.select(`
  id,name,phone,email,gender,city,color_tag,loyalty_level,points,total_spent,last_visit,is_active,referral_source,birth_month,birth_day,initial_notes,notes,customer_tag,location_description,national_id,joined_date,created_at,updated_at,branch_id,is_shared,created_by_branch_id,created_by_branch_name
`)
```

## Missing from Query (18 columns)
❌ whatsapp
❌ whatsapp_opt_out
❌ profile_image
❌ country
❌ last_purchase_date
❌ total_purchases
❌ birthday
❌ referred_by
❌ created_by
❌ total_calls
❌ total_call_duration_minutes
❌ incoming_calls
❌ outgoing_calls
❌ missed_calls
❌ avg_call_duration_minutes
❌ first_call_date
❌ last_call_date
❌ call_loyalty_level

## Updated Query (All 46 columns)

Replace line 263 in `src/lib/customerApi/core.ts` with:

```javascript
.select(`
  id,
  name,
  phone,
  email,
  whatsapp,
  gender,
  city,
  country,
  address,
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
  location_description,
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
  total_calls,
  total_call_duration_minutes,
  incoming_calls,
  outgoing_calls,
  missed_calls,
  avg_call_duration_minutes,
  first_call_date,
  last_call_date,
  call_loyalty_level,
  total_returns
`)
```

## Files to Update

### 1. `src/lib/customerApi/core.ts`
- **Line 263** - `performFetchAllCustomers()` function
- **Line 394** (if exists) - `fetchAllCustomersSimple()` function

### 2. `src/lib/customerApi/search.ts`
- Update customer search query to include all fields

### 3. `src/lib/customerApi.ts`
- Update `loadCustomerDetails()` to include all fields

## Step-by-Step Fix

### Step 1: Run Database Fix
```bash
# In Neon SQL Editor, run:
🔧-FIX-ALL-MISSING-CUSTOMER-COLUMNS.sql
```

### Step 2: Update API Queries
Update the 3 files mentioned above with the new complete column list.

### Step 3: Test
1. Open CustomerDetailModal
2. Check that all sections display data:
   - ✅ Call Analytics Card (should show call stats)
   - ✅ Profile Image (avatar should display)
   - ✅ WhatsApp number (should show in contact info)
   - ✅ Purchase History (total purchases, last purchase date)
   - ✅ Referral Information
   - ✅ Birthday (full date field)

## One-Line Select (for easy copy-paste)

```javascript
.select(`id,name,phone,email,whatsapp,gender,city,country,address,color_tag,loyalty_level,points,total_spent,last_visit,is_active,referral_source,birth_month,birth_day,birthday,initial_notes,notes,customer_tag,location_description,national_id,joined_date,created_at,updated_at,branch_id,is_shared,created_by_branch_id,created_by_branch_name,profile_image,whatsapp_opt_out,referred_by,created_by,last_purchase_date,total_purchases,total_calls,total_call_duration_minutes,incoming_calls,outgoing_calls,missed_calls,avg_call_duration_minutes,first_call_date,last_call_date,call_loyalty_level,total_returns`)
```

## Expected Result

After both fixes:
- ✅ Database has all 46+ columns
- ✅ API fetches all 46+ columns
- ✅ CustomerDetailModal displays all data
- ✅ No more missing/undefined fields
- ✅ Call analytics card works
- ✅ Profile images display
- ✅ WhatsApp integration works
- ✅ Complete purchase history shows

