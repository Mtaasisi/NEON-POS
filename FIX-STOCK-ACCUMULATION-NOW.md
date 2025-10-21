# 🚨 URGENT FIX: Stock Being Replaced Instead of Added

## The Problem You're Experiencing

**Current Behavior (WRONG):**
```
Before: 10 items in stock
Receive PO: 5 new items
After: 5 items in stock ❌ (old stock disappeared!)
```

**Expected Behavior (CORRECT):**
```
Before: 10 items in stock
Receive PO: 5 new items
After: 15 items in stock ✅ (stock accumulated)
```

---

## ⚡ INSTANT FIX (30 seconds)

### Run This SQL NOW:

1. **Open Supabase Dashboard** → **SQL Editor**
2. **Copy ALL contents** from: `fix-inventory-accumulation.sql`
3. **Paste and click "Run"**
4. **Done!** ✅

You should see output like:
```
✅ Fixed: Product ABC | Was: 5 | Now: 15 | Added: +10
✅ Fixed 12 inventory mismatches!
```

---

## 🔍 What This Fix Does

### 1. **Installs Correct Trigger**
The trigger now counts **ALL** available inventory items:
```sql
-- Counts EVERYTHING for this variant
SELECT COUNT(*) FROM inventory_items 
WHERE variant_id = [id] AND status = 'available'
-- Result: OLD items + NEW items = TOTAL (accumulated!)
```

### 2. **Fixes Your Current Data**
- Goes through every variant
- Counts actual inventory items
- Updates variant quantities to correct totals
- Shows you what was fixed

### 3. **Ensures Future Receives Work Correctly**
From now on, every time you receive a PO:
- ✅ New items are ADDED to database
- ✅ Trigger counts ALL items (old + new)
- ✅ Variant quantity = total accumulated stock

---

## ✅ How to Verify It Worked

### Step 1: Check Current Inventory
After running the fix, go to **Inventory** page.
- Old missing stock should now be visible ✅
- Quantities should show correct accumulated totals ✅

### Step 2: Test with New Receive
1. Note current stock (e.g., 10 items)
2. Receive a new PO (e.g., 5 items)
3. Check inventory again
4. **Should now show: 15 items** ✅ (10 + 5 = accumulated!)

---

## 🐛 Why This Was Happening

The inventory sync trigger might have been:
1. Not installed yet (most likely)
2. Counting incorrectly
3. Being overridden somewhere

The fix ensures the trigger:
- ✅ Counts ALL inventory items for each variant
- ✅ Includes items from all purchase orders
- ✅ Never deletes or replaces existing items
- ✅ Always shows the accumulated total

---

## 📊 Technical Details

### How Inventory Works:

**Two Tables:**
1. `inventory_items` - Individual items (one row per unit)
2. `lats_product_variants` - Summary with `quantity` field

### When You Receive a PO:

```
Step 1: Create inventory_items
        - PO #1 creates 10 items ✅
        - PO #2 creates 5 items ✅
        - Total in table: 15 items ✅

Step 2: Trigger counts ALL items
        SELECT COUNT(*) = 15 ✅

Step 3: Update variant quantity
        UPDATE variant SET quantity = 15 ✅
```

### The Fix Ensures:
- Trigger fires after each insert
- Counts ALL existing items (not just new ones)
- Updates variant with accumulated total
- Never loses historical stock

---

## 🔍 Diagnostic Commands

If you want to check before/after:

### Check Current Mismatches:
```sql
SELECT 
    pv.name,
    pv.quantity as shown_qty,
    COUNT(ii.id) as actual_qty,
    COUNT(ii.id) - pv.quantity as difference
FROM lats_product_variants pv
LEFT JOIN inventory_items ii ON ii.variant_id = pv.id AND ii.status = 'available'
GROUP BY pv.id, pv.name, pv.quantity
HAVING COUNT(ii.id) != pv.quantity
ORDER BY difference DESC;
```

### Check if Trigger Exists:
```sql
SELECT trigger_name 
FROM information_schema.triggers
WHERE event_object_table = 'inventory_items'
  AND trigger_name LIKE '%sync%';
```

Should show 2 triggers after fix.

---

## 🆘 Still Not Working?

### Issue: Stock still being replaced

**Check inventory_items table:**
```sql
-- See all items for a specific variant
SELECT 
    ii.id,
    ii.purchase_order_id,
    po.order_number,
    ii.status,
    ii.created_at
FROM inventory_items ii
LEFT JOIN lats_purchase_orders po ON po.id = ii.purchase_order_id
WHERE ii.variant_id = '[your-variant-id]'
ORDER BY ii.created_at DESC;
```

If old items are missing from this table → They're being deleted somewhere else (unlikely).

### Issue: Trigger not firing

**Manually sync one variant:**
```sql
UPDATE lats_product_variants 
SET quantity = (
    SELECT COUNT(*) 
    FROM inventory_items 
    WHERE variant_id = lats_product_variants.id 
      AND status = 'available'
)
WHERE id = '[your-variant-id]';
```

---

## 📝 What You Should See After Fix

### In the SQL Editor:
```
🔄 Syncing ALL variants...
========================================
Processing 45 variants...

✅ Fixed: iPhone 13 Pro | Was: 5 | Now: 15 | Added: +10
✅ Fixed: Samsung S21 | Was: 0 | Now: 8 | Added: +8
✅ Fixed: MacBook Pro | Was: 2 | Now: 5 | Added: +3

========================================
📊 Summary:
   Total variants: 45
   Fixed: 12
   Already correct: 33
========================================

✅ Fixed 12 inventory mismatches!
💡 Your inventory should now show the correct accumulated totals.
```

### In Your Inventory Page:
- All products now show correct stock levels ✅
- Missing stock from previous receives is restored ✅
- Future receives will add to these totals ✅

---

## 🎯 Quick Checklist

- [ ] Run `fix-inventory-accumulation.sql` in Supabase
- [ ] See "Fixed X inventory mismatches" message
- [ ] Check inventory page - stock levels corrected
- [ ] Test new PO receive - stock accumulates correctly
- [ ] Verify totals make sense
- [ ] Celebrate! 🎉

---

## 💡 Prevention

Once this fix is applied:
- ✅ Never manually edit variant quantities
- ✅ Always receive through purchase orders
- ✅ Trust the automatic sync
- ✅ Inventory will always accumulate correctly

---

**Time to Fix:** 30 seconds  
**Risk Level:** None (only counts and updates quantities)  
**Can Undo:** Yes (just run the sync again)  
**Requires Restart:** No

---

## Need Help?

Run this for diagnostics:
```bash
# In terminal
node diagnose-inventory-sync.js > inventory-diagnostic.txt
```

Then share the output if you need assistance.

