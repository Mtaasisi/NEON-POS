# 🚀 QUICK FIX - Inventory Not Showing

## The Problem

You received products via purchase order, but they're not showing in inventory:
- ✅ Totals show they were received
- ❌ Inventory shows 0 stock
- ❌ Can't sell the items

## The Fix (Choose One)

### Option 1: Run the Fix Script (Easiest) ⭐

```bash
./fix-inventory-now.sh
```

Or:

```bash
node diagnose-and-fix-inventory-sync.js
```

This will:
1. Show you exactly what's wrong
2. Fix all discrepancies automatically
3. Take about 10-30 seconds

### Option 2: Apply Database Trigger (Permanent Fix)

1. Go to your Supabase dashboard
2. Open SQL Editor
3. Copy contents of `migrations/create_inventory_sync_trigger.sql`
4. Run it

This will:
- ✅ Fix current issues
- ✅ Prevent future issues
- ✅ Auto-sync inventory going forward

### Option 3: Manual Check

Run this in Supabase SQL Editor to see the problem:

```sql
-- Copy from check-inventory-discrepancies.sql
SELECT 
  p.name as product_name,
  pv.name as variant_name,
  pv.quantity as shown_quantity,
  COUNT(CASE WHEN ii.status = 'available' THEN 1 END) as actual_available,
  COUNT(CASE WHEN ii.status = 'available' THEN 1 END) - pv.quantity as missing
FROM lats_product_variants pv
LEFT JOIN lats_products p ON p.id = pv.product_id
LEFT JOIN inventory_items ii ON ii.variant_id = pv.id
GROUP BY p.name, pv.name, pv.quantity
HAVING COUNT(CASE WHEN ii.status = 'available' THEN 1 END) != pv.quantity;
```

## After Running the Fix

1. **Refresh your inventory page** (Ctrl+Shift+R or Cmd+Shift+R)
2. **Check a product** - the quantity should now show correctly
3. **Test a sale** - you should now be able to sell the items

## Why This Happened

The system tracks inventory in two places:
- `inventory_items` table (individual items) - ✅ Working
- `lats_product_variants.quantity` field (shown in UI) - ❌ Not updated

When you receive a purchase order, items are added to `inventory_items` but the variant quantity wasn't being updated.

## Preventing This in the Future

After applying the database trigger (Option 2), this will NEVER happen again. The trigger automatically syncs quantities whenever:
- Items are received
- Items are sold
- Items change status
- Items are deleted

---

**Need Help?** Run the diagnostic script first - it will show you exactly what's wrong.

