# 🔧 Inventory Sync Issue - FIXED

## 🚨 Problem Identified

Products received via purchase orders were not showing in inventory, even though totals showed them as received.

### Root Cause

The system has two places where inventory is tracked:

1. **`inventory_items` table** - Individual items with serial numbers (created when receiving PO)
2. **`lats_product_variants.quantity` field** - Quantity shown in inventory UI

**The Issue:** When purchase orders are received:
- ✅ `inventory_items` records are created correctly
- ❌ `lats_product_variants.quantity` is NOT updated
- ❌ UI shows 0 stock (reads from `variants.quantity`)
- ✅ Totals are correct (counts `inventory_items`)

### Evidence

```sql
-- inventory_items table has records:
SELECT COUNT(*) FROM inventory_items 
WHERE variant_id = 'xxx' AND status = 'available';
-- Result: 50 items

-- But variant shows 0:
SELECT quantity FROM lats_product_variants WHERE id = 'xxx';
-- Result: 0
```

---

## ✅ Solution

### Option 1: Quick Fix (Immediate)

Run the diagnostic and fix script:

```bash
node diagnose-and-fix-inventory-sync.js
```

This script will:
1. 🔍 Analyze all inventory items vs variant quantities
2. 📊 Show detailed discrepancies
3. 🔧 Update variant quantities to match actual inventory
4. ✅ Fix the display issue immediately

### Option 2: Permanent Fix (Recommended)

Apply the database migration to add automatic syncing:

```bash
# Run the migration
psql $DATABASE_URL -f migrations/create_inventory_sync_trigger.sql

# Or via Supabase dashboard:
# 1. Go to SQL Editor
# 2. Copy contents of create_inventory_sync_trigger.sql
# 3. Execute
```

This creates triggers that automatically:
- ✅ Update variant quantity when inventory items are added
- ✅ Update variant quantity when item status changes
- ✅ Update variant quantity when items are deleted
- ✅ Run an initial sync to fix existing data

---

## 🧪 Testing the Fix

### Before Fix
```bash
# In browser console on inventory page:
console.log('Variant quantity:', variant.quantity);  // Shows: 0
console.log('Actual items:', inventoryItems.length); // Shows: 50
```

### After Fix
```bash
console.log('Variant quantity:', variant.quantity);  // Shows: 50
console.log('Actual items:', inventoryItems.length); // Shows: 50
# ✅ Both match!
```

---

## 📋 What the Fix Does

### Database Trigger (`sync_variant_quantity_from_inventory`)

**Triggers on:**
- ➕ New inventory item created
- 🔄 Inventory item status changed (available → sold, damaged, etc.)
- 🔄 Inventory item variant changed
- ❌ Inventory item deleted

**Actions:**
1. Count all inventory items with `status = 'available'` for the variant
2. Update `lats_product_variants.quantity` with the count
3. Update `updated_at` timestamp

### Initial Sync (One-time)

The migration also includes a one-time sync that:
1. Loops through ALL variants
2. Counts their available inventory items
3. Updates quantities that don't match
4. Logs all changes

---

## 🔍 Verification

After running the fix, verify in Supabase dashboard:

```sql
-- Check a specific product
SELECT 
  pv.name as variant_name,
  pv.quantity as shown_quantity,
  COUNT(ii.id) as actual_items
FROM lats_product_variants pv
LEFT JOIN inventory_items ii ON ii.variant_id = pv.id AND ii.status = 'available'
WHERE pv.id = 'YOUR_VARIANT_ID'
GROUP BY pv.id, pv.name, pv.quantity;

-- Should show:
-- variant_name | shown_quantity | actual_items
-- iPhone 13    | 50             | 50
-- ✅ They match!
```

---

## 🚀 Next Steps

1. **Run the quick fix script** to immediately resolve current issues:
   ```bash
   node diagnose-and-fix-inventory-sync.js
   ```

2. **Apply the database migration** for automatic future syncing:
   ```bash
   psql $DATABASE_URL -f migrations/create_inventory_sync_trigger.sql
   ```

3. **Refresh your inventory page** to see the corrected quantities

4. **Test by receiving a new purchase order** to verify automatic syncing works

---

## 📊 Impact

### Before Fix
- ❌ Products show as out of stock
- ❌ Cannot sell items that were received
- ❌ Inventory reports are inaccurate
- ❌ Low stock alerts don't work
- ✅ Only totals are correct

### After Fix
- ✅ Products show correct quantities
- ✅ Can sell received items
- ✅ Inventory reports are accurate
- ✅ Low stock alerts work correctly
- ✅ Everything synced automatically

---

## 🛠️ Troubleshooting

### If quantities still show 0 after fix:

1. **Clear browser cache:**
   ```
   Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   ```

2. **Check if trigger is installed:**
   ```sql
   SELECT tgname, tgenabled 
   FROM pg_trigger 
   WHERE tgname LIKE '%sync_variant%';
   ```

3. **Manually run sync for one variant:**
   ```sql
   UPDATE lats_product_variants
   SET quantity = (
     SELECT COUNT(*) 
     FROM inventory_items 
     WHERE variant_id = lats_product_variants.id 
       AND status = 'available'
   )
   WHERE id = 'YOUR_VARIANT_ID';
   ```

4. **Check inventory items exist:**
   ```sql
   SELECT * FROM inventory_items 
   WHERE variant_id = 'YOUR_VARIANT_ID'
   ORDER BY created_at DESC;
   ```

---

## 📞 Support

If you continue to experience issues:

1. Run the diagnostic script and share the output
2. Check the Supabase logs for any errors
3. Verify the purchase order was marked as "received"
4. Ensure inventory items have `status = 'available'`

---

**Last Updated:** 2025-10-20
**Status:** ✅ FIXED

