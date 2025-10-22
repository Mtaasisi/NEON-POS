# Supplier Column Fix for Inventory

## Problem

The supplier column in the inventory view was showing empty (N/A) for all products.

## Root Cause

When purchase orders were being received and inventory items created, the products table wasn't being updated with the supplier information. The system was:

1. ✅ Storing supplier_id on purchase orders
2. ✅ Creating inventory items when receiving POs
3. ❌ **NOT updating the products table with supplier_id**

The inventory display expects `product.supplier?.name` but products had `supplier_id = NULL`.

## Solution

We've created two fixes:

### Quick Fix (Run immediately)

Run this SQL in your Neon database console to backfill existing products:

```sql
-- Update products with supplier info from their purchase orders
UPDATE lats_products p
SET 
  supplier_id = po.supplier_id,
  updated_at = NOW()
FROM (
  SELECT DISTINCT 
    poi.product_id,
    po.supplier_id
  FROM lats_purchase_order_items poi
  JOIN lats_purchase_orders po ON po.id = poi.purchase_order_id
  WHERE po.supplier_id IS NOT NULL
    AND po.status IN ('received', 'partial_received', 'shipped', 'sent', 'confirmed')
) po
WHERE p.id = po.product_id
  AND p.supplier_id IS NULL
  AND po.supplier_id IS NOT NULL;
```

**Location:** `migrations/QUICK_FIX_supplier_backfill.sql`

### Long-term Fix

Update the purchase order receive function to automatically set supplier_id on products when receiving:

**Location:** `migrations/FIX_add_supplier_to_products_on_receive.sql`

This migration:
1. Updates the `complete_purchase_order_receive()` function to set supplier_id when receiving items
2. Backfills supplier_id for existing products

## How to Apply the Fix

### Option 1: Quick Fix (Recommended for immediate results)

1. Open your Neon database console
2. Navigate to the SQL editor
3. Copy and paste the contents of `migrations/QUICK_FIX_supplier_backfill.sql`
4. Execute the query
5. Refresh your inventory page - supplier column should now show data!

### Option 2: Full Migration (Complete fix)

1. Open your Neon database console
2. Run the contents of `migrations/FIX_add_supplier_to_products_on_receive.sql`
3. This will:
   - Update existing products with supplier info
   - Modify the receive function to set supplier_id automatically in the future

## Verification

After running the fix, verify it worked:

```sql
-- Check how many products now have suppliers
SELECT 
  COUNT(*) FILTER (WHERE supplier_id IS NOT NULL) as with_supplier,
  COUNT(*) FILTER (WHERE supplier_id IS NULL) as without_supplier,
  COUNT(*) as total
FROM lats_products
WHERE is_active = true;
```

You should see products with supplier info now!

## Important Notes

1. **Only received products will have supplier info** - Products that haven't been received from any purchase order won't have a supplier assigned automatically.

2. **Manual products** - If you create products manually (not through purchase orders), you need to assign a supplier when creating/editing them.

3. **Future receives** - After applying the full migration, all future purchase order receives will automatically set the supplier_id on products.

## Files Created

- `migrations/QUICK_FIX_supplier_backfill.sql` - Quick backfill query
- `migrations/FIX_add_supplier_to_products_on_receive.sql` - Complete migration
- `fix-supplier-in-inventory.mjs` - Automated script (requires env setup)
- `SUPPLIER_COLUMN_FIX.md` - This documentation

## Testing

After applying the fix:

1. Go to Inventory page
2. Check the "Supplier" column
3. You should now see supplier names instead of "N/A"
4. Create a new purchase order and receive it
5. The products from that PO should automatically have the supplier set

## Support

If the supplier column is still empty after running the fix:

1. Check if your products were actually received from purchase orders
2. Verify the purchase orders have supplier_id set
3. Run the verification query above to check the status
4. Check browser console for any errors

---

**Status:** ✅ Ready to apply

**Impact:** 
- Fixes empty supplier column in inventory
- Automatically sets supplier for future receives
- Backfills existing products with supplier info

**Risk:** Low - Only updates NULL supplier_id values, doesn't overwrite existing data

