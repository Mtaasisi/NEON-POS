# Product Update Fix - October 15, 2025

## Issue
When trying to update a product with variants, the system was returning "Failed to update product" error.

## Root Cause
There was a **schema mismatch** between the code and the database:

### Database Column Names (actual schema):
- `variant_attributes` (JSONB column)
- `variant_name` (TEXT column)
- `unit_price` (NUMERIC column)
- `cost_price` (NUMERIC column)

### What the Code Was Using:
- ❌ `attributes` (incorrect - should be `variant_attributes`)
- ✅ `variant_name` (correct)
- ✅ `unit_price` (correct)
- ✅ `cost_price` (correct)

## Changes Made

### 1. Fixed Variant Data Mapping in `latsProductApi.ts`
Updated the `variantData` object to use the correct column name:

```typescript
const variantData = {
  product_id: productId,
  sku: variant.sku,
  variant_name: variant.name || 'Default',
  variant_attributes: variant.attributes || {}, // ✅ Changed from 'attributes'
  cost_price: variant.costPrice || 0,
  unit_price: variant.sellingPrice || variant.price || 0,
  quantity: variant.quantity ?? variant.stockQuantity ?? 0,
  min_quantity: variant.minQuantity ?? variant.minStockLevel ?? 0
};
```

### 2. Updated SELECT Queries
Added `variant_attributes` to all SELECT queries to read the correct column:

```typescript
.select('id, product_id, variant_name, sku, variant_attributes, cost_price, unit_price, quantity, min_quantity, created_at, updated_at, branch_id, is_shared')
```

### 3. Fixed Data Mapping When Reading Variants
Updated the mapping to read from `variant_attributes`:

```typescript
attributes: variant.variant_attributes || variant.attributes || {},
```

This ensures backward compatibility if some code still uses `attributes`.

### 4. Added Enhanced Error Logging
Added detailed error logging to help diagnose future issues:

```typescript
if (updateError) {
  console.error('❌ Update by ID failed:', updateError);
  console.error('❌ Update error details:', JSON.stringify(updateError, null, 2));
  console.error('❌ Variant data that failed:', JSON.stringify(variantData, null, 2));
  throw updateError;
}
```

## Testing Instructions

1. **Login** to the system with credentials:
   - Email: care@care.com
   - Password: 123456

2. **Navigate** to the Products page

3. **Edit a product** that has variants:
   - Click on a product with variants (e.g., the one with SKU: SKU-1760105351191-OHH)
   - Modify some fields (name, price, stock quantity, etc.)
   - Click "Save Changes"

4. **Expected Result**: 
   - ✅ Product should update successfully
   - ✅ Success message should appear
   - ✅ Changes should be reflected in the product list
   - ✅ Console should show detailed logs of the update process

5. **Check Console Logs**:
   - Look for "📋 Variant data:" to see what's being sent
   - Look for "✅ Updated variant" to confirm success
   - If there are errors, you'll see detailed error information

## Files Modified
- `/src/lib/latsProductApi.ts` - Fixed variant data mapping and SELECT queries

## Impact
- ✅ Product updates with variants will now work correctly
- ✅ Better error messages for debugging
- ✅ Backward compatible with existing code that might use `attributes`

## Additional Notes
The issue occurred because different SQL migration scripts used different column names:
- Some used `variant_attributes`
- Others used `attributes`

The fix ensures consistency by using the correct database column name (`variant_attributes`) throughout the codebase.

