# 📊 Customer Fields Analysis - Database vs Modal Display

## Executive Summary

Your `customers` table is **missing critical columns** that the CustomerDetailModal.tsx expects to display. This is causing data to not show up in the customer detail view.

---

## 1️⃣ BASE SCHEMA (from complete-database-schema.sql)

### ✅ Columns That Exist in Database:
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  gender TEXT,
  city TEXT,
  address TEXT,
  joined_date DATE,
  loyalty_level TEXT DEFAULT 'bronze',
  color_tag TEXT,
  total_spent NUMERIC DEFAULT 0,
  points INTEGER DEFAULT 0,
  last_visit TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  referral_source TEXT,
  birth_month TEXT,
  birth_day TEXT,
  customer_tag TEXT,
  notes TEXT,                      -- ⚠️ This is just TEXT, not structured
  total_returns INTEGER DEFAULT 0,
  initial_notes TEXT,
  location_description TEXT,
  national_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Total Base Columns: 24**

---

## 2️⃣ MISSING COLUMNS (Should Exist But Don't)

### ❌ Critical Missing Columns:

#### **Customer Contact & Identity**
1. `whatsapp` TEXT - WhatsApp number (separate from phone)
2. `whatsapp_opt_out` BOOLEAN - WhatsApp preferences
3. `profile_image` TEXT - Customer photo URL

#### **Purchase History**
4. `last_purchase_date` TIMESTAMP - Last time they bought something
5. `total_purchases` INTEGER - Count of all purchases
6. `birthday` DATE - Full birthday (different from birth_month/birth_day)

#### **Referral System**
7. `referred_by` UUID - Customer ID who referred them
8. `referrals` JSONB - Array of customers they referred
9. `created_by` UUID - Staff member who registered them

#### **Call Analytics** (Currently NOT Being Displayed)
10. `total_calls` INTEGER DEFAULT 0
11. `total_call_duration_minutes` NUMERIC DEFAULT 0
12. `incoming_calls` INTEGER DEFAULT 0
13. `outgoing_calls` INTEGER DEFAULT 0
14. `missed_calls` INTEGER DEFAULT 0
15. `avg_call_duration_minutes` NUMERIC DEFAULT 0
16. `first_call_date` TIMESTAMP
17. `last_call_date` TIMESTAMP
18. `call_loyalty_level` TEXT - VIP/Gold/Silver/Bronze/Basic

#### **Branch Tracking**
19. `branch_id` UUID - Current branch assignment
20. `is_shared` BOOLEAN - Whether shared across branches
21. `created_by_branch_id` UUID - Branch that created customer
22. `created_by_branch_name` TEXT - Branch name for display

**Total Missing Columns: 22**

---

## 3️⃣ WHAT'S DISPLAYED IN CustomerDetailModal.tsx

### Overview Tab (Lines 562-930)

#### **Financial Overview Cards** (Lines 565-596)
- ✅ Total Spent - `customerAnalytics.totalSpent` (calculated)
- ✅ Orders - `posSales.length` (from lats_sales)
- ✅ Devices - `devices.length` (from devices table)
- ✅ Points - `customer.points` ✅ EXISTS
- ✅ Calls - `customer.totalCalls` ❌ **MISSING COLUMN**

#### **Call Analytics Card** (Line 599)
- Component: `CallAnalyticsCard`
- Uses: `customer.totalCalls`, `customer.incomingCalls`, `customer.outgoingCalls`, etc.
- **Status: ❌ ALL CALL COLUMNS MISSING**

#### **Customer Avatar & Info** (Lines 606-660)
- `customer.profileImage` ❌ **MISSING COLUMN**
- `customer.name` ✅ EXISTS
- `customer.colorTag` ✅ EXISTS (as color_tag)
- `customer.loyaltyLevel` ✅ EXISTS (as loyalty_level)
- `customer.points` ✅ EXISTS
- `customer.callLoyaltyLevel` ❌ **MISSING COLUMN**
- `customer.gender` ✅ EXISTS

#### **Contact Information** (Lines 663-696)
- `customer.phone` ✅ EXISTS
- `customer.whatsapp` ❌ **MISSING COLUMN**
- `customer.email` ✅ EXISTS
- `customer.city` ✅ EXISTS

#### **Personal Information** (Lines 699-801)
- `customer.birthMonth` ✅ EXISTS (as birth_month)
- `customer.birthDay` ✅ EXISTS (as birth_day)
- `customer.isActive` ✅ EXISTS (as is_active)
- `customerStatus.statusReason` - Calculated
- `customerStatus.memberSince` - Uses created_at
- `customer.createdAt` ✅ EXISTS (as created_at)
- `customer.joinedDate` ✅ EXISTS (as joined_date)
- `customerStatus.lastVisit` ✅ EXISTS (as last_visit)
- `customer.gender` ✅ EXISTS
- `customer.country` ❌ **NOT IN DB**
- `customer.address` ✅ EXISTS
- `customer.notes` ⚠️ **EXISTS but is TEXT, not array**
- `customer.birthday` ❌ **MISSING COLUMN**
- `customer.profileImage` ❌ **MISSING COLUMN**

#### **Purchase History Summary** (Lines 805-834)
- `customer.totalSpent` ✅ EXISTS (as total_spent)
- `customer.totalPurchases` ❌ **MISSING COLUMN**
- `customer.lastPurchaseDate` ❌ **MISSING COLUMN**

### Activity Tab (Lines 934-1178)

#### **Devices Section** (Lines 937-1008)
- ✅ Fetched from `devices` table separately
- All device data working

#### **Payments Section** (Lines 1011-1064)
- ✅ Fetched from `customer_payments` table
- All payment data working

#### **Appointments Section** (Lines 1067-1125)
- ✅ Fetched from separate table
- Working via `fetchCustomerAppointments()`

#### **Communications Section** (Lines 1128-1176)
- ✅ Fetched from `customer_communications` or `sms_logs`
- Working via separate queries

### Journey Tab (Lines 1181-1192)
- ✅ Uses `CustomerJourneyTimeline` component
- Fetches own data

---

## 4️⃣ FIELDS NOT BEING DISPLAYED (But Expected)

### From Customer Interface (src/types.ts Lines 193-257):

1. ❌ `whatsapp` - Should show in contact info but column missing
2. ❌ `referredBy` - Referral system data missing
3. ⚠️ `referrals` - Array, but stored as JSONB (needs special handling)
4. ❌ `profileImage` - Avatar display broken
5. ❌ `totalPurchases` - Purchase count not shown
6. ❌ `lastPurchaseDate` - Last purchase info missing
7. ❌ `birthday` - Full birthday field
8. ❌ `whatsappOptOut` - Preferences not tracked
9. ❌ **All Call Analytics Fields** (10+ fields) - Entire call analytics broken
10. ❌ `branchId`, `branchName` - Branch info not shown
11. ❌ `createdByBranchId`, `createdByBranchName` - Branch history missing
12. ❌ `country` - Not in database schema

---

## 5️⃣ SOLUTION: Run This SQL Script

You need to run the **FIX-CUSTOMERS-MISSING-COLUMNS.sql** script:

```bash
# This script will add all 22 missing columns
```

### What it will add:
- ✅ whatsapp, whatsapp_opt_out
- ✅ profile_image
- ✅ last_purchase_date, total_purchases, birthday
- ✅ referred_by, referrals (JSONB), created_by
- ✅ All 10 call analytics columns
- ✅ call_loyalty_level

---

## 6️⃣ ADDITIONAL FIXES NEEDED

### 1. Add Country Column
```sql
ALTER TABLE customers ADD COLUMN IF NOT EXISTS country TEXT;
```

### 2. Fix Notes Structure
Currently `notes` is TEXT, but code expects an array of `CustomerNote` objects.
Consider creating separate `customer_notes` table (already exists!) and update code to use it.

### 3. Add Branch Columns
```sql
ALTER TABLE customers ADD COLUMN IF NOT EXISTS branch_id UUID;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_by_branch_id UUID;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_by_branch_name TEXT;
```

---

## 7️⃣ PRIORITY FIXES

### 🔥 Critical (Breaking Display)
1. **profile_image** - Customer avatars broken
2. **whatsapp** - WhatsApp integration broken
3. **Call analytics columns** - Entire call analytics card broken
4. **total_purchases** - Purchase stats incomplete
5. **last_purchase_date** - Purchase history incomplete

### ⚠️ Important (Missing Features)
6. **referrals** / **referred_by** - Referral system incomplete
7. **birthday** - Birthday tracking incomplete (you have birth_month/birth_day but not full date)
8. **created_by** - Staff tracking missing
9. **whatsapp_opt_out** - Preferences missing

### 📝 Nice to Have
10. **country** - Additional location data
11. **Branch columns** - Multi-branch support
12. **call_loyalty_level** - Advanced loyalty features

---

## 8️⃣ IMMEDIATE ACTION ITEMS

### Step 1: Run the missing columns script
```bash
# Copy and paste FIX-CUSTOMERS-MISSING-COLUMNS.sql into your Neon SQL Editor
```

### Step 2: Add additional columns
```sql
-- Add country column
ALTER TABLE customers ADD COLUMN IF NOT EXISTS country TEXT;

-- Add branch columns (if using multi-branch)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS branch_id UUID;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_by_branch_id UUID;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_by_branch_name TEXT;
```

### Step 3: Update fetch queries
The code in `src/lib/customerApi/core.ts` (line 263) needs to include these columns:
```javascript
.select(`
  id,name,phone,email,gender,city,color_tag,loyalty_level,points,total_spent,
  last_visit,is_active,referral_source,birth_month,birth_day,initial_notes,
  notes,customer_tag,location_description,national_id,joined_date,
  created_at,updated_at,branch_id,is_shared,created_by_branch_id,
  created_by_branch_name,
  // ADD THESE:
  whatsapp,profile_image,birthday,referred_by,created_by,
  last_purchase_date,total_purchases,whatsapp_opt_out,
  total_calls,total_call_duration_minutes,incoming_calls,outgoing_calls,
  missed_calls,avg_call_duration_minutes,first_call_date,last_call_date,
  call_loyalty_level,country
`)
```

---

## 9️⃣ SUMMARY

### Currently Displayed Fields: ~15-20 fields
### Total Missing from Database: **22+ columns**
### Fields in Modal But Not Fetching: **18+ fields**

**Main Issue:** The `customers` table is missing approximately **40% of the fields** that CustomerDetailModal.tsx expects to display, particularly:
- ❌ Call analytics (entire section broken)
- ❌ Profile images (avatars broken)
- ❌ WhatsApp integration
- ❌ Complete purchase history
- ❌ Referral system

**Fix:** Run `FIX-CUSTOMERS-MISSING-COLUMNS.sql` + add country and branch columns

