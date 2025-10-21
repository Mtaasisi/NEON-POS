# 🚨 FIX: Stock Replaces Instead of Adding Up

## The Problem
When you receive a purchase order:
- ❌ Current stock: 10 items
- ❌ Receive: 5 more items  
- ❌ Result: **Stock shows 5** (should be 15!)

## The Solution
Run this command to fix it:

```bash
./apply-fix-to-database.sh
```

**Then select option 1** to apply the fix.

---

## Alternative: Manual Command

If the script doesn't work, run this directly:

```bash
psql 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require' -f fix-inventory-accumulation.sql
```

---

## What This Does

1. ✅ **Fixes current inventory** - Sets all products to correct total counts
2. ✅ **Installs trigger** - Ensures future receives ADD to stock (not replace)
3. ✅ **Shows you what changed** - Lists all fixed products

---

## Expected Output

You should see something like:

```sql
NOTICE: 🔄 Syncing ALL variants...
NOTICE: Processing 25 variants...

NOTICE: ✅ Fixed: iPhone Case | Was: 0 | Now: 15 | Added/Fixed: 15
NOTICE: ✅ Fixed: Samsung Charger | Was: 10 | Now: 25 | Added/Fixed: 15
NOTICE: ✅ Fixed: USB Cable | Was: 5 | Now: 30 | Added/Fixed: 25

NOTICE: 📊 Summary:
NOTICE:    Total variants: 25
NOTICE:    Fixed: 12
NOTICE:    Already correct: 13

NOTICE: ✅ INVENTORY ACCUMULATION FIX COMPLETE!
```

---

## How to Test It Works

### Test 1: Check Current Inventory
1. Go to your **Inventory** page
2. Note the stock count for a product (e.g., 10 items)

### Test 2: Receive a Purchase Order
1. Create a test PO for 5 units of that product
2. Set pricing
3. Receive it
4. **Check inventory** → Should now show **15 items** (10 + 5) ✅

### Test 3: Receive Another PO
1. Receive 3 more units
2. **Check inventory** → Should now show **18 items** (15 + 3) ✅

---

## What Changed Technically

### Before Fix:
```
variant.quantity = COUNT(inventory_items WHERE purchase_order_id = CURRENT_PO)
```
❌ Only counts items from current PO!

### After Fix:
```
variant.quantity = COUNT(inventory_items WHERE variant_id = VARIANT AND status = 'available')
```
✅ Counts ALL available items!

---

## Troubleshooting

### "psql: command not found"
Install PostgreSQL client:
- **macOS:** `brew install postgresql`
- **Ubuntu:** `sudo apt-get install postgresql-client`
- **Windows:** Download from postgresql.org

### "Connection refused" or "timeout"
- Check your internet connection
- Make sure the connection string is correct
- Try copying the connection string from Supabase dashboard

### Fix applied but still shows wrong counts
Run the diagnostic:
```bash
psql 'postgresql://...' -f check-inventory-trigger.sql
```

This will show if the trigger is installed and working.

---

## Need to Revert?

The fix is safe and doesn't delete any data. But if needed, you can:

1. Check current state:
   ```sql
   SELECT name, quantity FROM lats_product_variants;
   ```

2. Manually adjust a specific variant:
   ```sql
   UPDATE lats_product_variants 
   SET quantity = 10 
   WHERE name = 'Product Name';
   ```

---

## Summary

**Run this command:**
```bash
./apply-fix-to-database.sh
```

**Select option 1**

**Done!** Your inventory will now accumulate correctly! 🎉

---

**Estimated time:** 1-2 minutes  
**Risk level:** Safe (only updates counts)  
**Reversible:** Yes (can manually adjust counts)

