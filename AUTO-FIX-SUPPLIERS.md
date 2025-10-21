# Auto-Fix: Assign Suppliers to Products

## Problem Found
✅ Suppliers exist in database (4 suppliers loaded)  
✅ Supplier column is visible in inventory  
❌ **Products don't have `supplier_id` assigned**

That's why you see "N/A" in the supplier column!

## Quick Fix - Option 1: Browser Console (EASIEST)

1. **Open your inventory page**: http://localhost:5173/lats/unified-inventory
2. **Press F12** (or Cmd+Option+I on Mac) to open browser console
3. **Copy and paste** the entire content of `ASSIGN-SUPPLIERS-TO-PRODUCTS.js`
4. **Press Enter**
5. **Wait for success message**
6. **Refresh the page** (F5 or Cmd+R)

Done! Suppliers should now show in the inventory table! 🎉

## Quick Fix - Option 2: Automated Browser Test

Run this command:

```bash
node final-supplier-fix.mjs
```

This will:
- Login automatically
- Assign suppliers to all products
- Clear cache
- Refresh page
- Take screenshots showing the fix

## Quick Fix - Option 3: SQL Query (Database Direct)

If you have direct database access:

```sql
-- Get a supplier ID
SELECT id, name FROM lats_suppliers WHERE is_active = true LIMIT 1;

-- Assign to all products without supplier
UPDATE lats_products 
SET supplier_id = '<paste-supplier-id-here>'
WHERE supplier_id IS NULL;
```

## What the Fix Does

1. **Fetches all suppliers** from database
2. **Finds products without** `supplier_id`
3. **Assigns default supplier** to those products
4. **Clears cache** so fresh data loads
5. **Done!**

## After the Fix

Your inventory table will show:

| Product | Category | **Supplier** | Price | Stock |
|---------|----------|--------------|-------|-------|
| Product 1 | Phones | **Supplier Name** ✅ | 1000 | 10 |
| Product 2 | Tablets | **Supplier Name** ✅ | 2000 | 5 |

Instead of "N/A" everywhere!

## Why This Happened

Products were created without assigning a supplier. The supplier field is optional when creating products, but you want it populated for tracking.

## Prevention

When adding new products, always:
1. Go to "Add Product" form
2. **Select a supplier** from the dropdown
3. Save the product

Or ensure your product import/creation scripts include `supplier_id`.

---

**Status**: Ready to fix! Choose your preferred method above. 🚀

