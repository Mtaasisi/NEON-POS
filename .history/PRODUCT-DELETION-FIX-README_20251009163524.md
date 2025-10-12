# Product Deletion Issue - Fix Guide

## 🔴 Problem

Products cannot be deleted from the database due to foreign key constraints without proper CASCADE or SET NULL rules.

## 🔍 Root Cause

Three tables reference `lats_products` with **NO ACTION** delete rule, preventing product deletion:

1. **`lats_stock_movements`** - Tracks inventory movements
2. **`lats_purchase_order_items`** - Purchase order history
3. **`lats_sale_items`** - Sales transaction history

When you try to delete a product that has records in any of these tables, PostgreSQL blocks the deletion to maintain referential integrity.

## 📋 What Happens When You Try to Delete

```
Error: update or delete on table "lats_products" violates foreign key constraint
Detail: Key (id)=(xxx) is still referenced from table "lats_sale_items"
```

## ✅ Solution

### Step 1: Diagnose the Issue (Optional)

Run `diagnose-product-deletion.sql` to see:
- Which constraints are blocking deletion
- How many products have dependencies
- Which products can be safely deleted

```sql
-- In Neon SQL Editor, run:
\i diagnose-product-deletion.sql
```

### Step 2: Fix the Constraints

Run `fix-product-deletion.sql` to update foreign key constraints:

```sql
-- In Neon SQL Editor, run:
\i fix-product-deletion.sql
```

This script will:
1. ✅ Update `lats_stock_movements` → ON DELETE SET NULL
2. ✅ Update `lats_purchase_order_items` → ON DELETE SET NULL  
3. ✅ Update `lats_sale_items` → ON DELETE SET NULL

### Step 3: Verify the Fix

After running the fix, try deleting a product again from your application.

## 🤔 Why SET NULL Instead of CASCADE?

We use `ON DELETE SET NULL` instead of `ON DELETE CASCADE` for historical tables because:

### ✅ Preserves History
- Sales records remain intact
- Purchase order history is kept
- Stock movement logs are preserved

### ✅ Maintains Reporting
- `lats_sale_items` stores `product_name`, so reports still work
- Historical data shows "[Deleted Product]" or NULL reference
- Audit trail is complete

### ✅ Prevents Data Loss
- Accidentally deleting a product won't cascade delete all sales
- Financial records remain accurate
- Compliance and tax reporting unaffected

## 📊 What Gets Deleted with CASCADE

Tables that **DO** use `ON DELETE CASCADE` (appropriate for these):

| Table | Reason |
|-------|--------|
| `lats_product_variants` | Variants belong to products |
| `product_images` | Images belong to products |

## 🚀 Quick Start

### Option 1: Copy and Paste (Neon Web UI)

1. Open your Neon Database SQL Editor
2. Copy the entire contents of `fix-product-deletion.sql`
3. Paste into the editor
4. Click "Run"
5. Check the output for success messages

### Option 2: Command Line (if using psql)

```bash
psql "YOUR_NEON_CONNECTION_STRING" -f fix-product-deletion.sql
```

## 📝 Expected Output

After running the fix, you should see:

```
✅ Dropped old lats_stock_movements_product_id_fkey constraint
✅ Added lats_stock_movements_product_id_fkey with ON DELETE SET NULL
✅ Dropped old lats_purchase_order_items_product_id_fkey constraint
✅ Added lats_purchase_order_items_product_id_fkey with ON DELETE SET NULL
✅ Dropped old lats_sale_items_product_id_fkey constraint
✅ Added lats_sale_items_product_id_fkey with ON DELETE SET NULL

✅ ============================================
✅ Product deletion constraints fixed!
✅ ============================================
```

## 🧪 Testing the Fix

### Test 1: Delete a Product with No History

1. Create a new test product
2. Try to delete it immediately
3. ✅ Should delete successfully

### Test 2: Delete a Product with History

1. Find a product that has been sold or purchased
2. Try to delete it
3. ✅ Should delete successfully now
4. Check `lats_sale_items` - `product_id` should be NULL but `product_name` is preserved

## ⚠️ Important Notes

### Before Running the Fix

1. **Backup your database** (Neon provides automatic backups, but verify)
2. **Test in development first** if possible
3. **Notify users** if running in production (minimal downtime)

### After Running the Fix

1. ✅ Products can be deleted
2. ✅ Historical records are preserved
3. ✅ Reports continue to work
4. ⚠️ Deleted products show as NULL reference in history

### Application Changes Needed

You may want to update your application to:

```typescript
// Example: Display product name even if product is deleted
const productName = saleItem.product_id 
  ? product.name 
  : saleItem.product_name || '[Deleted Product]';
```

## 🔧 Troubleshooting

### Issue: "Constraint does not exist"

**Cause:** The constraint might have a different name  
**Solution:** Run `diagnose-product-deletion.sql` to see actual constraint names

### Issue: Still can't delete products

**Cause:** Other tables might reference products  
**Solution:** Run the diagnostic script to identify all constraints

### Issue: Permission denied

**Cause:** Insufficient database permissions  
**Solution:** Ensure you're connected as database owner or have ALTER TABLE privileges

## 📞 Support

If you encounter issues:

1. Run `diagnose-product-deletion.sql` and check the output
2. Look for error messages in the Neon SQL Editor
3. Check foreign key constraint names match your database
4. Verify tables exist: `lats_products`, `lats_sale_items`, etc.

## 📚 Additional Resources

- [PostgreSQL Foreign Keys Documentation](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK)
- [Neon Database Documentation](https://neon.tech/docs)
- [Understanding ON DELETE CASCADE vs SET NULL](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK)

## ✨ Summary

| Before Fix | After Fix |
|------------|-----------|
| ❌ Cannot delete products with history | ✅ Can delete any product |
| ❌ Products "stuck" in database | ✅ Clean product management |
| ❌ Error messages in UI | ✅ Smooth deletion workflow |
| ✅ History preserved | ✅ History still preserved |
| ✅ Reports work | ✅ Reports still work |

---

**Last Updated:** October 9, 2025  
**Version:** 1.0  
**Tested on:** Neon PostgreSQL

