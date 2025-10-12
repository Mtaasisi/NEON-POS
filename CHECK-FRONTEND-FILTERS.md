# 🔍 Frontend Debugging Guide: Products Not Showing in Inventory

If your products exist in the database but still aren't showing in the inventory page, the issue might be in the frontend filtering or data loading logic.

## Step 1: Open Browser Developer Console

1. Open your inventory page
2. Press `F12` or `Cmd+Option+I` (Mac) to open DevTools
3. Go to the **Console** tab
4. Look for errors (red text)

## Step 2: Check for Common Errors

### Error: "Failed to fetch products"
**Solution:** Database connection issue. Check:
- Supabase credentials in `.env`
- Network connection
- Database URL is correct

### Error: "Cannot read property of undefined"
**Solution:** Data structure mismatch. The API is returning data in a different format than expected.

### Error: "products.map is not a function"
**Solution:** Products isn't an array. Check the data structure being returned.

## Step 3: Check Console Logs

Look for these log messages:

```
🔍 [latsProductApi] Starting to fetch products...
✅ [latsProductApi] Found X products
🔍 [Provider] Products fetched: X
✅ [Provider] Products fetched: X
```

If you see **"Found 0 products"** but you know products exist:
- The database query might be filtering them out
- Check the `is_active` field in the database
- Check for missing categories/suppliers

## Step 4: Check Network Requests

1. Go to the **Network** tab in DevTools
2. Filter by `XHR` or `Fetch`
3. Look for requests to `/products` or similar
4. Click on the request and check:
   - **Response** tab: See what data is returned
   - **Preview** tab: See formatted data
   - **Headers** tab: Check for errors (status code 200 is good)

## Step 5: Check Filters

Your inventory page might have active filters that hide products:

### Check these filter states in Console:
```javascript
// Run in browser console
console.log('Search Query:', searchQuery);
console.log('Selected Category:', selectedCategory);
console.log('Selected Status:', selectedStatus);
console.log('Show Low Stock Only:', showLowStockOnly);
```

### Common Filter Issues:

1. **Category Filter:** If set to a specific category, only products in that category show
   - **Fix:** Click "All Categories" or reset filters

2. **Stock Filter:** If "Low Stock Only" is checked, only products with low stock show
   - **Fix:** Uncheck "Low Stock Only"

3. **Active Status:** If filtered to "Inactive", no products show
   - **Fix:** Set filter to "All" or "Active"

4. **Search Query:** If there's text in the search box, only matching products show
   - **Fix:** Clear the search box

## Step 6: Verify Products Array

Run this in the browser console:
```javascript
// Check if products are loaded
console.log('Products:', products);
console.log('Products count:', products?.length);
console.log('First product:', products?.[0]);
```

### Expected Output:
```javascript
Products: Array(6) [{...}, {...}, ...]
Products count: 6
First product: {id: '...', name: 'MacBook Air M2', ...}
```

### If You See:
- `Products: []` → Products loaded but filtered out
- `Products: undefined` → Products haven't loaded yet
- `Products: null` → Data loading failed

## Step 7: Check getFilteredProducts Function

The `getFilteredProducts()` function applies all filters. Run this in console:

```javascript
// Get all products without filters
console.log('All products:', products);

// Get filtered products
console.log('Filtered products:', getFilteredProducts());
```

If `products` has items but `getFilteredProducts()` returns empty:
→ **The filters are too restrictive**

## Step 8: Temporarily Disable Filters

To test if filters are the issue, you can temporarily modify the `getFilteredProducts` function:

1. Open DevTools → Sources tab
2. Find `useInventoryStore.ts`
3. Find the `getFilteredProducts` function (around line 1597)
4. Add a breakpoint
5. Check what's being filtered out

## Step 9: Check for Data Processing Issues

Look for these logs in the console:

```
🔍 [InventoryStore] DEBUG - Missing information in store:
  totalProducts: X
  missingInfoCount: {...}
```

This shows if products are missing required data like:
- Supplier
- Category
- Variants
- Price
- Stock

## Step 10: Force Refresh Products

Run this in the browser console:
```javascript
// Force refresh products from database
forceRefreshProducts();
```

Wait 5 seconds and check if products appear.

## Common Solutions

### Solution 1: Reset All Filters
```javascript
// Run in console
setSearchTerm('');
setSelectedCategory(null);
setStockFilter('all');
```

### Solution 2: Clear Cache
```javascript
// Run in console
localStorage.clear();
location.reload();
```

### Solution 3: Check Database Connection
```javascript
// Run in console
supabase.from('lats_products').select('count').then(console.log);
```

Expected output: `{count: X}` where X is your product count

### Solution 4: Check Product Active Status
```javascript
// Run in console
supabase.from('lats_products').select('id, name, is_active').then(console.log);
```

All products should have `is_active: true`

## Still Not Working?

If products still don't show after all these checks:

1. **Run the SQL fix script** (`FIX-INVENTORY-NOT-SHOWING.sql`)
2. **Hard refresh** browser (Ctrl+Shift+R or Cmd+Shift+R)
3. **Clear browser cache** completely
4. **Check for JavaScript errors** in console
5. **Verify Supabase connection** in `.env` file

## Quick Test Checklist

- [ ] Products exist in database (run SQL query)
- [ ] Products are active (`is_active = true`)
- [ ] Products have categories
- [ ] Products have at least one variant
- [ ] No JavaScript errors in console
- [ ] Network requests succeed (status 200)
- [ ] Products array is populated
- [ ] No active filters hiding products
- [ ] Browser cache cleared
- [ ] Page hard refreshed

---

**Need more help?** Check the browser console logs and network tab for specific error messages.


