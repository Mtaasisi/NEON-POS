# 🚨 Issue: Inventory Not Updating After Receiving Purchase Orders

## The Problem
You set prices and receive purchase orders, but the inventory stock quantities don't increase. This happens because the automatic sync trigger between `inventory_items` and `lats_product_variants.quantity` is missing or not working.

---

## 🎯 Quick Fix (2 Options)

### **Option 1: SQL Fix (FASTEST - 30 seconds)**

1. Open **Supabase Dashboard** → **SQL Editor**
2. Paste the contents of `apply-inventory-sync-trigger.sql`
3. Click **Run**
4. Done! ✅

**File location:** `apply-inventory-sync-trigger.sql`

---

### **Option 2: Command Line Fix (EASIEST)**

Run this single command:
```bash
./run-inventory-sync-fix.sh
```

Then select option 3 (diagnose → fix → verify)

---

## 🔍 What This Fixes

### Your Current System:
```
┌─────────────────────┐
│ Receive PO          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Creates             │
│ inventory_items     │
│ (status: available) │
└──────────┬──────────┘
           │
           ▼
        ❌ STOPS HERE
        
Variant quantity = 0 (not updated!)
```

### After Fix:
```
┌─────────────────────┐
│ Receive PO          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Creates             │
│ inventory_items     │
│ (status: available) │
└──────────┬──────────┘
           │
           ▼
     ✅ TRIGGER FIRES
           │
           ▼
┌─────────────────────┐
│ Counts available    │
│ inventory_items     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Updates             │
│ variant.quantity    │
│ automatically       │
└─────────────────────┘

Variant quantity = actual stock count ✅
```

---

## 📋 Step-by-Step Instructions

### **Method 1: Automatic Fix (Recommended)**

1. **Open Terminal** in your project directory

2. **Run the fix utility:**
   ```bash
   ./run-inventory-sync-fix.sh
   ```

3. **Select option 3** (full diagnostic + fix + verify)

4. **Review the output:**
   - See which variants were out of sync
   - See how many were fixed
   - Verify all is now working

5. **Test it:**
   - Create a new purchase order
   - Set prices
   - Receive it
   - Check inventory page → stock should update! ✅

---

### **Method 2: Manual Fix (For Advanced Users)**

1. **Diagnose first:**
   ```bash
   node diagnose-inventory-sync.js
   ```
   This shows you which variants are out of sync.

2. **Apply the fix:**
   ```bash
   node fix-inventory-sync.js
   ```
   This syncs all variants and installs the trigger.

3. **Verify it worked:**
   ```bash
   node diagnose-inventory-sync.js
   ```
   Should show "All variants are in sync!"

---

### **Method 3: SQL Fix (Fastest)**

**Copy and paste this into Supabase SQL Editor:**

```sql
-- This is in the file: apply-inventory-sync-trigger.sql
-- Just open that file and copy ALL the SQL
```

Then click **Run**. Done!

---

## ✅ How to Verify It's Working

After applying the fix:

### Test 1: Check Console
You should see logs like:
```
NOTICE: Synced variant [ID] quantity to [COUNT]
✅ Initial sync complete. Updated X variants.
```

### Test 2: Receive a Test PO
1. Create a small test purchase order (1-2 items)
2. Set prices in the modal
3. Receive the items
4. Go to Inventory page
5. **Check:** Stock count should increase by the received quantity ✅

### Test 3: Check Database Directly
Run this in Supabase SQL Editor:
```sql
-- Check if trigger exists
SELECT trigger_name 
FROM information_schema.triggers
WHERE trigger_name LIKE '%sync_variant%';
```

Should return 2 triggers:
- `trigger_sync_variant_quantity_insert_update`
- `trigger_sync_variant_quantity_delete`

---

## 🔧 Technical Details

### What Gets Installed:

1. **Function:** `sync_variant_quantity_from_inventory()`
   - Counts available inventory items
   - Updates variant quantity

2. **Triggers:**
   - Fires on INSERT of inventory_items
   - Fires on UPDATE of status or variant_id
   - Fires on DELETE of inventory_items

3. **Initial Sync:**
   - Fixes all existing mismatches
   - Ensures current inventory is accurate

### What Gets Updated:

```sql
lats_product_variants.quantity = COUNT(
  SELECT * FROM inventory_items 
  WHERE variant_id = [variant_id] 
    AND status = 'available'
)
```

Only `status = 'available'` items count as inventory.

---

## 🐛 Troubleshooting

### Problem: "No mismatches found but inventory still shows 0"

**Solution:** Check if inventory_items are being created:
```sql
SELECT * FROM inventory_items 
WHERE purchase_order_id IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 10;
```

If no results → The receive function isn't creating items properly.

---

### Problem: "Items created but variant_id is NULL"

**Solution:** Check your purchase order items:
```sql
SELECT poi.*, pv.id as variant_id
FROM lats_purchase_order_items poi
LEFT JOIN lats_product_variants pv ON pv.product_id = poi.product_id
WHERE poi.purchase_order_id = '[your-po-id]';
```

If variant_id is NULL → Products don't have variants configured.

---

### Problem: "Trigger installed but still not working"

**Solution:** Manually test the trigger:
```sql
-- Force an update to trigger the sync
UPDATE inventory_items 
SET updated_at = NOW() 
WHERE variant_id IS NOT NULL 
LIMIT 1;
```

Check the variant quantity after this. If it updates → trigger works!

---

## 📊 Expected Results

### Before Fix:
- ❌ Receive 10 items → inventory shows 0
- ❌ Database has inventory_items but variant.quantity = 0
- ❌ Can't sell items because "Out of stock"

### After Fix:
- ✅ Receive 10 items → inventory shows 10
- ✅ Database inventory_items count = variant.quantity
- ✅ Can sell items immediately after receiving
- ✅ Automatic sync for all future receives

---

## 🎉 Success Checklist

- [ ] Ran the fix (SQL or command line)
- [ ] Saw "Updated X variants" message
- [ ] No errors in console
- [ ] Created test purchase order
- [ ] Received test PO with pricing
- [ ] Checked inventory page
- [ ] Stock quantity increased ✅
- [ ] Can now sell the items ✅

---

## 📞 Still Need Help?

If you're still experiencing issues after following this guide:

1. **Capture diagnostics:**
   ```bash
   node diagnose-inventory-sync.js > diagnostic-output.txt
   ```

2. **Check the logs:**
   - Browser console when receiving
   - Supabase logs for errors
   - Look for any red error messages

3. **Share the output:**
   - diagnostic-output.txt
   - Console errors
   - Steps you've tried

---

## 🔒 Safety Notes

- ✅ This fix is **safe** to run
- ✅ It **only reads and updates** quantities
- ✅ It **does not delete** any data
- ✅ It **can be run multiple times** without issues
- ✅ It **backs up nothing** because it only counts and updates numbers

The worst that can happen: Nothing changes (if already correct).

---

## 📚 Related Files

- `apply-inventory-sync-trigger.sql` - SQL migration to apply
- `diagnose-inventory-sync.js` - Diagnostic tool
- `fix-inventory-sync.js` - Automated fix script
- `run-inventory-sync-fix.sh` - Easy menu-driven fix
- `FIX-INVENTORY-SYNC-GUIDE.md` - Detailed guide
- `migrations/create_inventory_sync_trigger.sql` - Original migration

---

**Last Updated:** October 20, 2025
**Status:** ✅ Ready to use
**Tested:** ✅ Working

