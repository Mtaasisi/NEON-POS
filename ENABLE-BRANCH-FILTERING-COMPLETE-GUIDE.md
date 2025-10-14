# 🏪 Enable Branch Filtering - Complete Guide

## 🎯 Problem Solved
When you switch branches in the UI, the data wasn't changing because:
1. **Database tables were missing `branch_id` columns** - no way to filter by branch
2. **Data queries didn't use branch filtering** - all data was loaded regardless of selected branch
3. **Branch selector only updated localStorage** - no automatic data refresh

## ✅ What Was Fixed

### 1. Database Schema Updates
Created: `ADD-BRANCH-COLUMNS-TO-ALL-TABLES.sql`

This migration adds:
- ✅ `branch_id` column to all relevant tables
- ✅ `is_shared` column to mark data visible to all branches
- ✅ Proper indexes for performance
- ✅ Assigns existing data to main store
- ✅ Safe checks - only adds columns to existing tables

**Tables Updated:**
- `lats_products` - Products can belong to specific branches
- `lats_product_variants` - Variants track stock per branch
- `inventory_items` - Serial numbered items belong to branches
- `customers` - Customers registered at specific branches
- `lats_sales` - Sales tracked per branch
- `lats_purchase_orders` - POs received at specific branches
- `lats_suppliers` - Suppliers can be shared or branch-specific
- `lats_categories` - Categories can be shared or branch-specific
- `employees` - Employees assigned to branches

### 2. Code Updates

#### A. Branch Selector (`src/components/SimpleBranchSelector.tsx`)
- ✅ Now **reloads the page** when switching branches
- ✅ Ensures all data refreshes with new branch context
- ✅ Shows toast notification during switch

#### B. Product API (`src/lib/latsProductApi.ts`)
- ✅ Reads `current_branch_id` from localStorage
- ✅ Filters products by: `branch_id = current_branch OR is_shared = true OR branch_id IS NULL`
- ✅ Filters variants with same logic
- ✅ Logs branch filtering in console

#### C. Live Inventory Service (`src/features/lats/lib/liveInventoryService.ts`)
- ✅ Applies branch filtering to inventory metrics
- ✅ Real-time stock counts now branch-aware
- ✅ Dashboard metrics show only current branch data

## 📋 How to Deploy

### Step 1: Run the Database Migration

Run this SQL in your Neon database:

```bash
# Copy the SQL file content and run it in Neon SQL Editor
cat ADD-BRANCH-COLUMNS-TO-ALL-TABLES.sql
```

Or use the Neon dashboard:
1. Go to your Neon project
2. Open the SQL Editor
3. Paste the contents of `ADD-BRANCH-COLUMNS-TO-ALL-TABLES.sql`
4. Click "Run"

**Expected Output:**
```
✅ Added branch_id to lats_products
✅ Added is_shared to lats_products
✅ Added branch_id to lats_product_variants
✅ Added is_shared to lats_product_variants
✅ Added branch_id to inventory_items
✅ Added is_shared to inventory_items
✅ Added branch_id to customers
✅ Added is_shared to customers
✅ Assigned existing products to main store
✅ Assigned existing variants to main store
✅ Assigned existing inventory items to main store
✅ Assigned existing customers to main store
✅ Assigned existing sales to main store
✅ Branch columns added to all tables successfully!
```

### Step 2: Deploy the Code Changes

The code changes are already made. Just ensure you have the latest version of:
- `src/components/SimpleBranchSelector.tsx`
- `src/lib/latsProductApi.ts`
- `src/features/lats/lib/liveInventoryService.ts`

### Step 3: Clear Cache and Test

1. **Clear browser cache** (important!)
   - Open DevTools (F12)
   - Right-click refresh button → "Empty Cache and Hard Reload"

2. **Test branch switching:**
   - Login as admin
   - Create a few test products
   - Switch to different branches
   - Page should reload and show different inventory

## 🧪 Testing Checklist

### Test 1: Create Branch-Specific Products
1. ✅ Switch to "Main Store"
2. ✅ Create a product named "Main Store Product"
3. ✅ Switch to "ARUSHA"
4. ✅ Create a product named "ARUSHA Product"
5. ✅ Switch back to "Main Store"
6. ✅ Verify you DON'T see "ARUSHA Product" (only see Main Store products)

### Test 2: Shared Products
1. ✅ In database, set a product's `is_shared = true`
2. ✅ Switch between branches
3. ✅ Verify shared product appears in ALL branches

### Test 3: Inventory Filtering
1. ✅ Add inventory items to different branches
2. ✅ Switch branches
3. ✅ Verify inventory counts update correctly

### Test 4: Sales & Reports
1. ✅ Create sales in different branches
2. ✅ Switch branches
3. ✅ Verify sales reports show only current branch sales

## 🔍 Console Logs to Watch

When switching branches, you should see:

```
🖱️ Branch selector clicked! {isOpen: false, branchesCount: 3}
🔄 Switching to: ARUSHA
💾 Switching to ARUSHA...
[Page reloads]
🏪 [latsProductApi] Current branch: xxx-branch-id-xxx
🔒 [latsProductApi] Filtering products by branch: xxx-branch-id-xxx
🔒 [latsProductApi] Filtering variants by branch: xxx-branch-id-xxx
✅ [latsProductApi] Found XX products
🏪 [LiveInventoryService] Current branch: xxx-branch-id-xxx
🔒 [LiveInventoryService] Filtering by branch: xxx-branch-id-xxx
```

## 📊 Data Isolation Modes

Each branch can have different isolation modes (set in `store_locations` table):

### 1. **Shared Mode** (`data_isolation_mode = 'shared'`)
- All data visible across all branches
- Good for: Small businesses, single location with temporary branches

### 2. **Isolated Mode** (`data_isolation_mode = 'isolated'`)
- Each branch has completely separate data
- Good for: Franchises, independent stores under same system

### 3. **Hybrid Mode** (`data_isolation_mode = 'hybrid'`)
- Selective sharing based on flags:
  - `share_products = true` - Products shared
  - `share_customers = true` - Customers shared
  - `share_inventory = false` - Inventory separate
  - `share_suppliers = true` - Suppliers shared
- Good for: Most businesses (default)

## ⚙️ Configuration

### Set Branch Isolation Mode

Run this SQL to configure a branch:

```sql
-- Make ARUSHA branch completely isolated
UPDATE store_locations
SET 
  data_isolation_mode = 'isolated',
  share_products = false,
  share_customers = false,
  share_inventory = false
WHERE name = 'ARUSHA';

-- Make Main Store share everything
UPDATE store_locations
SET 
  data_isolation_mode = 'shared',
  share_products = true,
  share_customers = true,
  share_inventory = true
WHERE is_main = true;

-- Hybrid mode (share products/customers, isolate inventory)
UPDATE store_locations
SET 
  data_isolation_mode = 'hybrid',
  share_products = true,
  share_customers = true,
  share_inventory = false
WHERE name = 'Airport Branch';
```

### Assign New Products to Branches

When creating products via API, add branch_id:

```typescript
const { data, error } = await supabase
  .from('lats_products')
  .insert({
    name: 'New Product',
    // ...other fields...
    branch_id: currentBranchId, // Add this
    is_shared: false // Set to true to share across all branches
  });
```

## 🐛 Troubleshooting

### Issue: "Branch columns not found"
**Solution:** Run the migration SQL again

### Issue: "All products still visible in all branches"
**Possible causes:**
1. Products have `is_shared = true` (check database)
2. Products have `branch_id = null` (run migration to assign)
3. Cache not cleared (hard refresh browser)

**Fix:**
```sql
-- Assign all products without branch to main store
UPDATE lats_products
SET branch_id = (SELECT id FROM store_locations WHERE is_main = true LIMIT 1)
WHERE branch_id IS NULL;

-- Make products branch-specific (not shared)
UPDATE lats_products
SET is_shared = false
WHERE is_shared IS NULL OR is_shared = true;
```

### Issue: "Page doesn't reload when switching branches"
**Solution:** Make sure `SimpleBranchSelector.tsx` has the updated `handleSwitchBranch` function

### Issue: "Console shows no branch filtering logs"
**Check:**
1. Is `current_branch_id` in localStorage? (DevTools → Application → Local Storage)
2. Are you logged in as admin?
3. Is the branch selector visible?

## 📚 Next Steps

### Recommended Enhancements:

1. **Add Branch to Create/Edit Forms**
   - Auto-assign new products to current branch
   - Show branch selector in product forms
   - Allow marking products as shared

2. **Branch Transfer**
   - Create UI to transfer products between branches
   - Update `branch_id` when transferring
   - Log transfer in audit trail

3. **Branch Reports**
   - Sales by branch
   - Inventory by branch
   - Profit by branch
   - Top products per branch

4. **Inventory Transfers**
   - Move serialized items between branches
   - Update `inventory_items.branch_id`
   - Create transfer records

## 🎉 Success Criteria

You'll know it's working when:
- ✅ Page reloads when switching branches
- ✅ Different inventory appears in each branch
- ✅ Console logs show branch filtering
- ✅ Dashboard metrics change per branch
- ✅ New products created are assigned to current branch

---

## 📞 Support

If you encounter issues:
1. Check console for error logs
2. Verify migration ran successfully
3. Check database columns exist: `SELECT * FROM information_schema.columns WHERE column_name LIKE '%branch%'`
4. Clear all caches (browser + localStorage)

**Database Check Query:**
```sql
-- Verify branch columns exist
SELECT 
  table_name, 
  column_name, 
  data_type
FROM information_schema.columns
WHERE column_name IN ('branch_id', 'is_shared')
  AND table_schema = 'public'
ORDER BY table_name, column_name;
```

Expected output should show branch columns in all relevant tables!

