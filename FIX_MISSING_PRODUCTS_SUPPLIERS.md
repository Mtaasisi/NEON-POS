# Fix Missing Products and Suppliers

## Problem

Your application is not showing products and suppliers even though they exist in the database. This is happening because:

1. **Your branch is in `hybrid` mode** with:
   - `share_products = false` (products are NOT shared)
   - `share_suppliers = false` (suppliers are NOT shared)

2. **The filter being applied is**: `branch_id = 35796426-1c60-4923-8cbe-6341c0752244`

3. **Existing products/suppliers likely have**:
   - `branch_id = NULL` (created before branch isolation was implemented)
   - OR `branch_id` pointing to a different branch

4. **Result**: The filter excludes all existing data because they don't match the current branch ID.

## Solution Options

You have **3 options** to fix this:

### Option 1: Assign Existing Data to Current Branch (Recommended)

This assigns all existing products and suppliers to your current branch so they show up.

**Steps:**
1. Run `DIAGNOSE_MISSING_DATA.sql` first to see what data exists
2. Review the output to confirm the issue
3. Run `FIX_ASSIGN_EXISTING_DATA_TO_BRANCH.sql` to assign existing data to your branch
4. Refresh your application

**When to use this:**
- You want existing products/suppliers to belong to this specific branch
- You want to maintain branch isolation (each branch has its own data)

### Option 2: Make Products/Suppliers Shared

This changes your branch settings to make products and suppliers shared across all branches.

**Steps:**
1. Run `CHECK_AND_FIX_BRANCH_SETTINGS.sql`
2. Uncomment the section for making products/suppliers shared
3. Execute the script
4. Refresh your application

**When to use this:**
- You want all branches to see the same products/suppliers
- You're okay with products/suppliers being shared

### Option 3: Switch to Shared Mode

This switches your entire branch to `shared` mode, where all data is shared.

**Steps:**
1. Run `CHECK_AND_FIX_BRANCH_SETTINGS.sql`
2. Uncomment the section for switching to shared mode
3. Execute the script
4. Refresh your application

**When to use this:**
- You want all data types to be shared across branches
- You don't need branch isolation

## Quick Fix (Recommended)

If you want the fastest solution:

1. **Run the diagnostic**:
   ```sql
   -- Copy and paste DIAGNOSE_MISSING_DATA.sql into Supabase SQL Editor
   ```

2. **Assign existing data to your branch**:
   ```sql
   -- Copy and paste FIX_ASSIGN_EXISTING_DATA_TO_BRANCH.sql into Supabase SQL Editor
   -- Make sure the branch_id matches: 35796426-1c60-4923-8cbe-6341c0752244
   ```

3. **Refresh your application** - products and suppliers should now appear!

## Understanding the Filter Logic

In **hybrid mode** with `share_products = false`:
- **Filter applied**: `branch_id = currentBranchId`
- **Shows**: Only products where `branch_id` matches your current branch
- **Hides**: Products with `branch_id = NULL` or different branch_id

In **hybrid mode** with `share_products = true`:
- **Filter applied**: `branch_id = currentBranchId OR is_shared = true OR branch_id IS NULL`
- **Shows**: Products from your branch + shared products + unassigned products
- **Hides**: Products assigned to other branches (unless they're shared)

## Verification

After applying a fix, verify it worked:

1. **Check the database**:
   ```sql
   SELECT COUNT(*) FROM lats_products 
   WHERE branch_id = '35796426-1c60-4923-8cbe-6341c0752244' 
   AND is_active = true;
   
   SELECT COUNT(*) FROM lats_suppliers 
   WHERE branch_id = '35796426-1c60-4923-8cbe-6341c0752244' 
   AND is_active = true;
   ```

2. **Check your application**:
   - Products should appear in the inventory page
   - Suppliers should appear in the suppliers list

## Files Created

- `DIAGNOSE_MISSING_DATA.sql` - Diagnoses the issue
- `FIX_ASSIGN_EXISTING_DATA_TO_BRANCH.sql` - Assigns existing data to branch
- `CHECK_AND_FIX_BRANCH_SETTINGS.sql` - Checks and fixes branch settings
- `FIX_MISSING_PRODUCTS_SUPPLIERS.md` - This guide

## Need Help?

If you're still having issues after running these scripts:
1. Check the console logs for any errors
2. Verify your branch ID is correct
3. Make sure the `store_locations` table has the correct settings
4. Run `VERIFY_BRANCH_ISOLATION_DATABASE.sql` to check the overall setup
