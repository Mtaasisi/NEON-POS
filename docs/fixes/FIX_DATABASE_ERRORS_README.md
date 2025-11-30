# Fix Database Errors - Instructions

## Overview
This document explains the fixes applied to resolve database errors in the application.

## Issues Fixed

### 1. Missing Tables
The following tables were missing and causing SQL errors:
- `loyalty_points` - For tracking customer loyalty points
- `lats_storage_rooms` - For storage room management (created as view/alias to `lats_store_rooms` if it exists)
- `lats_stock_transfers` - For tracking stock transfers between branches
- `special_orders` - View/alias for `customer_special_orders`
- `installment_plans` - View/alias for `customer_installment_plans`
- `backup_logs` - For tracking backup operations

### 2. Missing Columns
The following columns were missing:
- `unit_price` in `lats_spare_parts` table
- `storage_room_id` in `lats_inventory_items` table
- `branch_id` in `lats_inventory_items` table (if missing)
- `quantity` in `lats_inventory_items` table (if missing)

### 3. LoyaltyWidget Runtime Error
Fixed the `Cannot read properties of undefined (reading 'toLocaleString')` error by:
- Adding null checks before calling `toLocaleString()`
- Fixing error handling to set correct metric properties
- Ensuring metrics are always initialized with safe defaults

## How to Apply the Fix

### Step 1: Run the SQL Migration
1. Open your Supabase/Neon SQL Editor
2. Copy the contents of `fix_missing_tables_and_columns.sql`
3. Paste and run the SQL script
4. Verify the success message appears

### Step 2: Verify the Fix
After running the migration, the following should work:
- ✅ No more "relation does not exist" errors for the tables listed above
- ✅ No more "column does not exist" errors for the columns listed above
- ✅ LoyaltyWidget should load without crashing
- ✅ All dashboard widgets should display (even if empty)

### Step 3: Test the Application
1. Refresh your application
2. Navigate to the dashboard
3. Check that all widgets load without errors
4. Verify that:
   - Loyalty widget displays (may show zeros if no data)
   - Spare parts widget works
   - Storage rooms widget works
   - Stock transfers widget works
   - Special orders widget works
   - Installments widget works

## Files Modified

1. **fix_missing_tables_and_columns.sql** - SQL migration script
2. **src/features/shared/components/dashboard/LoyaltyWidget.tsx** - Fixed runtime error

## Notes

- The migration uses `IF NOT EXISTS` checks to avoid errors if tables/columns already exist
- Views are created as aliases for existing tables where appropriate
- All new tables have RLS (Row Level Security) enabled with permissive policies
- The migration is idempotent - you can run it multiple times safely

## Troubleshooting

### If you still see errors:
1. Check that the SQL migration ran successfully
2. Verify tables exist: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('loyalty_points', 'lats_stock_transfers', 'backup_logs');`
3. Verify columns exist: `SELECT column_name FROM information_schema.columns WHERE table_name = 'lats_spare_parts' AND column_name = 'unit_price';`
4. Check browser console for any remaining errors

### If views don't work:
- The views (`special_orders`, `installment_plans`) are created only if the base tables exist
- If you see errors about these views, ensure `customer_special_orders` and `customer_installment_plans` tables exist first

## Next Steps

After applying the fix:
1. Test all dashboard widgets
2. Verify data can be inserted into the new tables
3. Consider adding sample data for testing
4. Review and adjust RLS policies if needed for your security requirements

