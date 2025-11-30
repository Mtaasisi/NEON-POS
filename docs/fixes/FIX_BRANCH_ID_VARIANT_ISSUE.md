# Fix for branch_id NOT NULL Constraint Violation in Product Variants

## Problem Summary

When creating a product, the database trigger `auto_create_default_variant()` automatically creates a default variant, but it was missing the `branch_id` field. Since `branch_id` has a NOT NULL constraint on the `lats_product_variants` table, this caused the error:

```
null value in column "branch_id" of relation "lats_product_variants" violates not-null constraint
```

## Root Causes

1. **Database Trigger**: The `auto_create_default_variant()` function was creating variants without including `branch_id`
2. **Frontend Code**: The `AddProductPage.tsx` was creating manual variants without including `branch_id`
3. **PO Receive Function**: The `complete_purchase_order_receive()` function was creating variants without `branch_id`
4. **Helper Functions**: The `create_product_variant()` function didn't support `branch_id`

## Fixes Applied

### ✅ 1. Frontend Fix (AddProductPage.tsx)
**Status**: ✅ COMPLETED

Added `branch_id` to variant creation in the frontend:

```typescript
variantsToCreate = variants.map((variant, index) => ({
  product_id: createdProduct.id,
  branch_id: currentBranch?.id || null,  // ✅ FIXED
  sku: variant.sku || `${formData.sku}-V${index + 1}`,
  variant_name: variant.name || `Variant ${index + 1}`,
  // ... rest of fields
}));
```

### ⚠️ 2. Database Trigger Fix (auto_create_default_variant)
**Status**: ⚠️ NEEDS TO BE APPLIED TO DATABASE

Created migration file: `migrations/fix_auto_variant_branch_id.sql`

This migration updates the trigger function to include `branch_id` when creating default variants.

### ⚠️ 3. PO Receive Function Fix
**Status**: ⚠️ NEEDS TO BE APPLIED TO DATABASE

Updated: `migrations/add_auto_variant_creation_to_po_receive.sql`

This migration ensures variants created during purchase order receiving include the `branch_id` from the purchase order.

### ⚠️ 4. Helper Function Fix (create_product_variant)
**Status**: ⚠️ NEEDS TO BE APPLIED TO DATABASE

Updated: `clean_schema.sql`

The function now accepts an optional `p_branch_id` parameter and automatically fetches it from the product if not provided.

### ⚠️ 5. Clean Schema Update
**Status**: ⚠️ NEEDS TO BE APPLIED TO DATABASE

Updated: `clean_schema.sql`

Updated the `auto_create_default_variant()` function in the schema file to include `branch_id`.

## How to Apply the Fixes

### Step 1: Apply the Main Migration

Run the migration file on your Neon database:

```bash
# Option 1: Using psql with connection string
psql "YOUR_NEON_DATABASE_CONNECTION_STRING" -f migrations/fix_auto_variant_branch_id.sql

# Option 2: Copy and paste the SQL from the migration file into Neon SQL Editor
```

### Step 2: Verify the Fix

After applying the migration, you can verify it worked by checking the function:

```sql
-- Check the function definition
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'auto_create_default_variant';

-- Test by creating a new product
INSERT INTO lats_products (name, sku, branch_id, selling_price)
VALUES ('Test Product', 'TEST-SKU', 'YOUR_BRANCH_ID_HERE', 100);

-- Check if variant was created with branch_id
SELECT * FROM lats_product_variants 
WHERE product_id = (SELECT id FROM lats_products WHERE sku = 'TEST-SKU');
```

### Step 3: Test in Your Application

1. Reload your application (hard refresh: Cmd+Shift+R or Ctrl+Shift+F5)
2. Try creating a new product
3. Verify the product is created successfully without errors

## Files Modified

### Frontend Files
- ✅ `src/features/lats/pages/AddProductPage.tsx` - Added branch_id to variant creation

### Database Migration Files
- ⚠️ `migrations/fix_auto_variant_branch_id.sql` - NEW FILE (needs to be applied)
- ⚠️ `migrations/add_auto_variant_creation_to_po_receive.sql` - Updated (needs to be re-applied if already run)

### Schema Files
- ⚠️ `clean_schema.sql` - Updated (reference for future schema updates)

## Quick Fix Command

To quickly apply the main fix to your Neon database:

1. Go to your Neon Dashboard: https://console.neon.tech
2. Select your project and database
3. Open the SQL Editor
4. Copy and paste the contents of `migrations/fix_auto_variant_branch_id.sql`
5. Click "Run" to execute

## Prevention

To prevent similar issues in the future:

1. **Always include branch_id** when creating product variants
2. **Use the product's branch_id** as the default value
3. **Test thoroughly** after schema changes to NOT NULL columns
4. **Update all migration files** that create variants

## Technical Details

### Why was branch_id NULL?

The `lats_product_variants` table has a NOT NULL constraint on `branch_id`:

```sql
ALTER TABLE lats_product_variants
ALTER COLUMN branch_id SET NOT NULL;
```

This was added in `migrations/fix-all-orphaned-products.sql` to enforce branch isolation, but the trigger functions weren't updated to include this field.

### Branch Hierarchy

Products → Variants

Both should have the same `branch_id` to maintain data consistency and branch isolation.

## Support

If you encounter any issues after applying these fixes:

1. Check the Neon database logs for detailed error messages
2. Verify the migration was applied successfully
3. Clear your browser cache and reload the application
4. Check the browser console for any client-side errors

## Status: PARTIALLY FIXED

- ✅ Frontend code updated (no action needed)
- ⚠️ Database migration needs to be applied
- ⚠️ Application reload required after database migration

**Next Action**: Apply `migrations/fix_auto_variant_branch_id.sql` to your Neon database.

