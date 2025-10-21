# 🔧 Fix Inventory Sync Issue - Quick Guide

## Problem
After receiving purchase orders and setting prices, the inventory quantities are not being updated.

## Root Cause
The inventory sync trigger might not be installed or working properly. This trigger automatically updates `lats_product_variants.quantity` when `inventory_items` are created.

---

## ✅ Solution (Choose ONE method)

### **Method 1: Run SQL Migration (RECOMMENDED)**

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. Open the file: `apply-inventory-sync-trigger.sql`
4. Copy all the SQL code from that file
5. Paste it into the SQL Editor
6. Click **"Run"**

This will:
- ✅ Install the sync trigger
- ✅ Automatically fix all existing inventory mismatches
- ✅ Ensure future receives update inventory correctly

---

### **Method 2: Run Node.js Fix Script**

If you prefer using the command line:

```bash
# 1. First, diagnose the issue
node diagnose-inventory-sync.js

# 2. Then fix it
node fix-inventory-sync.js

# 3. Verify the fix
node diagnose-inventory-sync.js
```

This will manually sync all variant quantities with their actual inventory counts.

---

## 🔍 How to Verify It's Fixed

1. **Check the console output** - You should see:
   ```
   ✅ Synced variant [ID] quantity to [COUNT]
   ```

2. **Receive a new purchase order**:
   - Create a test PO
   - Set prices
   - Receive it
   - Check if inventory quantity increases

3. **Check the inventory page**:
   - Go to Inventory page
   - Verify that products show correct stock levels
   - The "In Stock" count should match received quantities

---

## 📊 What the Fix Does

### Before Fix:
```
Purchase Order Received → Creates inventory_items → ❌ Variant quantity NOT updated
```

### After Fix:
```
Purchase Order Received → Creates inventory_items → ✅ Trigger fires → ✅ Variant quantity updated automatically
```

---

## 🔄 How It Works

The system uses two tables:
1. **`inventory_items`** - Individual items (like serial numbers, each item tracked separately)
2. **`lats_product_variants`** - Product variants with a `quantity` field

When you receive a PO:
1. System creates `inventory_items` records (status: 'available')
2. Trigger counts available items for that variant
3. Updates `lats_product_variants.quantity` automatically

---

## 🐛 Still Not Working?

If inventory still doesn't update after applying the fix:

1. **Check database permissions**:
   ```sql
   -- Run in Supabase SQL Editor
   SELECT * FROM inventory_items 
   WHERE purchase_order_id IS NOT NULL 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```
   - Should show recently created items

2. **Check variant IDs**:
   ```sql
   -- Verify items have variant_id set
   SELECT COUNT(*) as items_without_variant
   FROM inventory_items 
   WHERE variant_id IS NULL;
   ```
   - Should return 0 (all items should have variant_id)

3. **Check the trigger**:
   ```sql
   -- Verify trigger exists
   SELECT trigger_name, event_manipulation, action_statement
   FROM information_schema.triggers
   WHERE trigger_name LIKE '%sync_variant%';
   ```
   - Should show 2 triggers

4. **Manual test**:
   ```sql
   -- Manually trigger the sync for a specific variant
   UPDATE lats_product_variants 
   SET quantity = (
     SELECT COUNT(*) 
     FROM inventory_items 
     WHERE variant_id = lats_product_variants.id 
       AND status = 'available'
   );
   ```

---

## 💡 Prevention

Once the trigger is installed:
- ✅ New receives will automatically update inventory
- ✅ Sales will automatically decrease inventory
- ✅ Stock adjustments will automatically sync
- ✅ No manual intervention needed

---

## 📝 Additional Notes

- The trigger only counts items with `status = 'available'`
- Sold items (`status = 'sold'`) are NOT counted
- Damaged/returned items are NOT counted in available quantity
- This is working as designed for accurate inventory tracking

---

## Need Help?

If you're still experiencing issues:
1. Run: `node diagnose-inventory-sync.js` and share the output
2. Check the browser console for any errors when receiving
3. Check Supabase logs for database errors

