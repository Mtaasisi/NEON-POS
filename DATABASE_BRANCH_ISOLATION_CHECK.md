# Database Branch Isolation - Complete Verification Guide

## 📋 Overview

This guide helps you verify that all branch isolation features are properly set up in your database.

## 🔍 Verification Scripts

### 1. **VERIFY_BRANCH_ISOLATION_DATABASE.sql**
**Purpose:** Comprehensive verification of all branch isolation components
**What it checks:**
- ✅ `store_locations` table has all isolation flags (25 flags)
- ✅ All entity tables have `branch_id` columns
- ✅ All entity tables have `is_shared` columns (where needed)
- ✅ All database functions exist
- ✅ Branch settings data is configured
- ✅ Indexes on `branch_id` columns exist

**How to use:**
1. Open Supabase SQL Editor
2. Copy and paste the entire `VERIFY_BRANCH_ISOLATION_DATABASE.sql` file
3. Run it
4. Review the output for any warnings or errors

### 2. **FIX_MISSING_BRANCH_COLUMNS.sql**
**Purpose:** Adds missing `branch_id` and `is_shared` columns to tables
**What it fixes:**
- ✅ Adds `branch_id` to: quality_checks, trade_ins, appointments, reminders, special_orders, spare_parts, employees, attendance, loyalty_points
- ✅ Adds `is_shared` to: quality_checks, trade_ins, appointments, reminders, special_orders, spare_parts
- ✅ Creates indexes on `branch_id` columns

**How to use:**
1. Run `VERIFY_BRANCH_ISOLATION_DATABASE.sql` first to see what's missing
2. If columns are missing, run `FIX_MISSING_BRANCH_COLUMNS.sql`
3. Re-run verification script to confirm fixes

### 3. **migrations/complete_branch_isolation_schema.sql**
**Purpose:** Ensures `store_locations` table has all 25 isolation flags
**What it adds:**
- ✅ `data_isolation_mode` (shared/isolated/hybrid)
- ✅ All 24 `share_*` flags for entity types

**How to use:**
1. Run this script to ensure all isolation flags exist
2. This is safe to run multiple times (uses `IF NOT EXISTS`)

### 4. **create-missing-database-functions.sql**
**Purpose:** Creates all required database functions with branch support
**What it creates:**
- ✅ `log_purchase_order_audit()` - with `branch_id` support
- ✅ `process_purchase_order_payment()` - with row-level locking
- ✅ `add_imei_to_parent_variant()` - with proper isolation
- ✅ `complete_purchase_order_receive()` - with row-level locking
- ✅ `get_purchase_order_receive_summary()` - summary function

**How to use:**
1. Run this script to create/update all functions
2. Functions include proper branch isolation and transaction safety

## 📊 Required Database Schema

### store_locations Table
Must have these columns:
```sql
data_isolation_mode TEXT DEFAULT 'shared'  -- 'shared' | 'isolated' | 'hybrid'
share_products BOOLEAN DEFAULT true
share_inventory BOOLEAN DEFAULT false
share_customers BOOLEAN DEFAULT true
share_suppliers BOOLEAN DEFAULT true
share_categories BOOLEAN DEFAULT true
share_employees BOOLEAN DEFAULT false
share_accounts BOOLEAN DEFAULT true
share_sales BOOLEAN DEFAULT false
share_purchase_orders BOOLEAN DEFAULT false
share_devices BOOLEAN DEFAULT false
share_payments BOOLEAN DEFAULT false
share_appointments BOOLEAN DEFAULT false
share_reminders BOOLEAN DEFAULT false
share_expenses BOOLEAN DEFAULT false
share_trade_ins BOOLEAN DEFAULT false
share_special_orders BOOLEAN DEFAULT false
share_attendance BOOLEAN DEFAULT false
share_loyalty_points BOOLEAN DEFAULT false
share_gift_cards BOOLEAN DEFAULT true
share_quality_checks BOOLEAN DEFAULT false
share_recurring_expenses BOOLEAN DEFAULT false
share_communications BOOLEAN DEFAULT false
share_reports BOOLEAN DEFAULT false
share_finance_transfers BOOLEAN DEFAULT false
```

### Entity Tables
Each entity table should have:
```sql
branch_id UUID  -- NULL for shared entities, UUID for isolated entities
is_shared BOOLEAN DEFAULT false  -- true if entity is shared across branches
```

**Tables that need branch_id:**
- ✅ `lats_products` - Has `branch_id` and `is_shared`
- ✅ `lats_product_variants` - Has `branch_id` and `is_shared`
- ✅ `customers` / `lats_customers` - Has `branch_id` and `is_shared`
- ✅ `lats_suppliers` - Has `branch_id`
- ✅ `lats_categories` - Has `branch_id`
- ✅ `lats_sales` - Has `branch_id` (always isolated)
- ✅ `lats_purchase_orders` - Has `branch_id`
- ✅ `devices` - Has `branch_id`
- ✅ `finance_accounts` - Has `branch_id`
- ✅ `customer_special_orders` - Needs `branch_id` and `is_shared` ✅ (Fixed in FIX_MISSING_BRANCH_COLUMNS.sql)
- ✅ `purchase_order_quality_checks` - Needs `branch_id` and `is_shared` ✅ (Fixed in FIX_MISSING_BRANCH_COLUMNS.sql)
- ✅ `lats_trade_in_transactions` - Needs `branch_id` and `is_shared` ✅ (Fixed in FIX_MISSING_BRANCH_COLUMNS.sql)
- ✅ `appointments` - Needs `branch_id` and `is_shared` ✅ (Fixed in FIX_MISSING_BRANCH_COLUMNS.sql)
- ✅ `reminders` - Needs `branch_id` and `is_shared` ✅ (Fixed in FIX_MISSING_BRANCH_COLUMNS.sql)
- ✅ `lats_spare_parts` - Needs `branch_id` and `is_shared` ✅ (Fixed in FIX_MISSING_BRANCH_COLUMNS.sql)
- ✅ `employees` - Needs `branch_id` ✅ (Fixed in FIX_MISSING_BRANCH_COLUMNS.sql)
- ✅ `attendance_records` - Needs `branch_id` ✅ (Fixed in FIX_MISSING_BRANCH_COLUMNS.sql)
- ✅ `loyalty_points` - Needs `branch_id` ✅ (Fixed in FIX_MISSING_BRANCH_COLUMNS.sql)

## 🔧 Step-by-Step Verification Process

### Step 1: Run Verification Script
```sql
-- Run VERIFY_BRANCH_ISOLATION_DATABASE.sql
-- This will show you what's missing
```

### Step 2: Fix Missing Columns
```sql
-- If columns are missing, run FIX_MISSING_BRANCH_COLUMNS.sql
-- This adds branch_id and is_shared to all required tables
```

### Step 3: Ensure store_locations Has All Flags
```sql
-- Run migrations/complete_branch_isolation_schema.sql
-- This ensures all 25 isolation flags exist
```

### Step 4: Create/Update Database Functions
```sql
-- Run create-missing-database-functions.sql
-- This creates all required functions with branch support
```

### Step 5: Verify Branch Settings
```sql
-- Check your branch settings
SELECT 
  id, 
  name, 
  data_isolation_mode,
  share_products,
  share_customers,
  share_suppliers,
  share_accounts
FROM store_locations 
WHERE is_active = true;
```

## ✅ Expected Results

After running all scripts, you should see:
- ✅ All tables have `branch_id` columns
- ✅ All tables have `is_shared` columns (where applicable)
- ✅ `store_locations` has all 25 isolation flags
- ✅ All database functions exist and have proper signatures
- ✅ Indexes exist on `branch_id` columns for performance

## 🚨 Common Issues and Fixes

### Issue 1: Missing branch_id Column
**Error:** `column "branch_id" does not exist`
**Fix:** Run `FIX_MISSING_BRANCH_COLUMNS.sql`

### Issue 2: Missing is_shared Column
**Error:** `column "is_shared" does not exist`
**Fix:** Run `FIX_MISSING_BRANCH_COLUMNS.sql`

### Issue 3: Missing Isolation Flags in store_locations
**Error:** `column "share_quality_checks" does not exist`
**Fix:** Run `migrations/complete_branch_isolation_schema.sql`

### Issue 4: Missing Database Functions
**Error:** `function log_purchase_order_audit does not exist`
**Fix:** Run `create-missing-database-functions.sql`

## 📝 Quick Verification Query

Run this to quickly check if everything is set up:

```sql
-- Quick check: Count tables with branch_id
SELECT 
  table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = t.table_name 
    AND column_name = 'branch_id'
  ) THEN '✅' ELSE '❌' END as has_branch_id,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = t.table_name 
    AND column_name = 'is_shared'
  ) THEN '✅' ELSE '❌' END as has_is_shared
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN (
    'lats_products', 'lats_product_variants', 'customers', 'lats_suppliers',
    'customer_special_orders', 'purchase_order_quality_checks',
    'lats_trade_in_transactions', 'appointments', 'reminders',
    'lats_spare_parts', 'employees', 'attendance_records', 'loyalty_points'
  )
ORDER BY table_name;
```

## 🎯 Summary

**All database verification and fix scripts are ready:**
1. ✅ `VERIFY_BRANCH_ISOLATION_DATABASE.sql` - Comprehensive verification
2. ✅ `FIX_MISSING_BRANCH_COLUMNS.sql` - Adds missing columns
3. ✅ `migrations/complete_branch_isolation_schema.sql` - Ensures store_locations has all flags
4. ✅ `create-missing-database-functions.sql` - Creates all required functions

**Run these scripts in order to ensure your database is fully configured for branch isolation!**
