# 🔍 Product Display Diagnostic & Fix Tools

## Problem
Created products are not showing in the UI even though they exist in the database.

## Root Cause
This is typically caused by **branch isolation filtering**. The POS system filters products based on:
- `branch_id` (which store the product belongs to)
- `is_shared` (whether the product is visible across all stores)
- `data_isolation_mode` (store settings: isolated, shared, or hybrid)

When products are created without proper branch assignment or sharing configuration, they get filtered out and don't appear in the UI.

## Quick Fix (⚡ Recommended)

### Option 1: Automatic Fix Script
1. Open your browser to http://localhost:5173
2. Login as **care@care.com** (password: **123456**)
3. Press **F12** to open Developer Console
4. Open the file `QUICK-FIX-PRODUCTS.js` in a text editor
5. Copy the entire contents
6. Paste into the browser console
7. Press **Enter**
8. Wait 3 seconds for the page to refresh

This will:
- ✅ Mark all products as shared (visible across all stores)
- ✅ Mark all variants as shared
- ✅ Switch your current store to "shared mode"
- ✅ Automatically refresh the page

### Option 2: Manual Database Fix
If the script doesn't work, run these SQL commands in your Supabase SQL Editor:

```sql
-- Make all products shared
UPDATE lats_products 
SET is_shared = true, sharing_mode = 'shared' 
WHERE is_shared = false OR is_shared IS NULL;

-- Make all variants shared
UPDATE lats_product_variants 
SET is_shared = true, sharing_mode = 'shared' 
WHERE is_shared = false OR is_shared IS NULL;

-- Set all stores to shared mode
UPDATE store_locations 
SET data_isolation_mode = 'shared', share_products = true;
```

## Detailed Diagnostic Tool

If you want to understand **exactly** what's happening:

1. Open your browser to http://localhost:5173
2. Login as **care@care.com** (password: **123456**)
3. Press **F12** to open Developer Console
4. Open the file `PRODUCT-DISPLAY-DIAGNOSTIC.js` in a text editor
5. Copy the entire contents
6. Paste into the browser console
7. Press **Enter**

This will:
- ✅ Check authentication status
- ✅ Check current branch settings
- ✅ Show all products in the database (raw)
- ✅ Test the `getProducts()` API function
- ✅ Show exactly why products are being filtered
- ✅ Provide specific fix functions you can run

### Available Fix Functions (from Diagnostic Tool)

After running the diagnostic tool, you can manually run these fix functions:

```javascript
// Fix 1: Assign all products to current branch
fixProductDisplay()

// Fix 2: Mark all products as shared
makeProductsShared()

// Fix 3: Switch store to shared mode
switchToSharedMode()
```

## Understanding Store Isolation Modes

### Isolated Mode 🔒
- Each store only sees its own products
- Products must have `branch_id` matching current store
- OR products must be marked as `is_shared = true`
- **Strictest mode** - best for completely separate stores

### Shared Mode 🌐
- All stores see all products
- No filtering by branch
- **Most permissive mode** - best for single business with multiple locations

### Hybrid Mode ⚖️
- Store sees its own products + shared products from other stores
- Similar to isolated mode but more flexible
- **Balanced mode** - best for franchises

## Preventing This Issue

When creating products, ensure you:

1. **Set the branch_id**:
   ```typescript
   const productData = {
     name: "My Product",
     branch_id: localStorage.getItem('current_branch_id'),
     // ... other fields
   };
   ```

2. **OR mark as shared** (if you want it visible everywhere):
   ```typescript
   const productData = {
     name: "My Product",
     is_shared: true,
     sharing_mode: 'shared',
     // ... other fields
   };
   ```

3. **OR use shared mode** for your stores (in store_locations table):
   ```sql
   UPDATE store_locations 
   SET data_isolation_mode = 'shared';
   ```

## Files Included

| File | Purpose |
|------|---------|
| `QUICK-FIX-PRODUCTS.js` | ⚡ Fast automatic fix |
| `PRODUCT-DISPLAY-DIAGNOSTIC.js` | 🔍 Detailed analysis tool |
| `PRODUCT-DISPLAY-FIX-README.md` | 📖 This file |

## Troubleshooting

### "Products still not showing after fix"

1. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
2. Check browser console for errors
3. Run the diagnostic tool to see what's happening
4. Check if products are marked as `is_active = false`

### "No products in database"

The scripts will tell you if the database is actually empty. If so:
1. Create some test products first
2. Then run the fix scripts

### "Branch not found error"

This means your `localStorage` has an invalid branch ID. Fix it:
```javascript
// In browser console
localStorage.removeItem('current_branch_id');
location.reload();
```

## Need More Help?

If these tools don't solve your issue:
1. Run `PRODUCT-DISPLAY-DIAGNOSTIC.js` 
2. Copy the full console output
3. Share it with your developer/support team
4. The output will show exactly what's wrong

## Technical Details

The product filtering logic is in:
- File: `src/lib/latsProductApi.ts`
- Function: `getProducts()`
- Lines: 308-740

Key fields that affect visibility:
- `lats_products.branch_id` - Which store owns the product
- `lats_products.is_shared` - Whether visible to all stores
- `lats_products.sharing_mode` - How sharing works (isolated/shared/hybrid)
- `store_locations.data_isolation_mode` - Store's isolation mode
- `store_locations.share_products` - Whether store shares its products

## Success Criteria

After applying the fix, you should see:
- ✅ All products displayed in the products list
- ✅ Products show correct variants and prices
- ✅ No console errors related to products
- ✅ Products can be added to POS cart

