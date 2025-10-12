# 🔍 Frontend Debugging Guide

## Step 1: Check Browser Console

1. Open your application in the browser
2. Press **F12** (or Right-click → Inspect)
3. Click on the **Console** tab
4. Look for any red error messages
5. Copy them and share with me

## Step 2: Check Network Requests

1. In DevTools (F12), go to **Network** tab
2. Refresh the page (Cmd+R / Ctrl+R)
3. Look for requests with:
   - Status **4xx** or **5xx** (errors) in red
   - Empty responses
4. Click on any failed requests
5. Share the error details

## Step 3: Check What's Logged

Look for these messages in Console:
- ✅ `"✅ Neon client initializing"`
- ✅ `"✅ [Provider] Products fetched: X"`
- ❌ `"❌ Error fetching products"`
- ❌ `"column "variant_name" does not exist"` (should be fixed now)

## Step 4: Test Specific Pages

### Products/Inventory Page
- URL: Usually `/products` or `/inventory`
- Should show: List of products
- If empty: Check console for errors

### POS Page
- URL: Usually `/pos`
- Should show: Product search and cart
- If products don't show: Check console

## Step 5: Common Issues & Fixes

### Issue 1: Cache Not Cleared
**Symptoms:** Old errors still showing
**Fix:** Hard refresh (`Cmd+Shift+R` or `Ctrl+Shift+R`)

### Issue 2: Application Not Rebuilt
**Symptoms:** Changes not reflected
**Fix:** Restart dev server:
```bash
npm run dev
# or
yarn dev
```

### Issue 3: Filter Hiding Products
**Symptoms:** Products exist but don't show
**Fix:** Check if filters are applied (category, stock status, search)

### Issue 4: Missing Variants
**Symptoms:** Products created during errors have no variants
**Fix:** Products without variants might not display. Check database:
```sql
SELECT p.name, COUNT(v.id) as variant_count
FROM lats_products p
LEFT JOIN lats_product_variants v ON p.id = v.product_id
GROUP BY p.id, p.name
HAVING COUNT(v.id) = 0;
```

## What to Share

Please share:
1. **Screenshot** of the page
2. **Console errors** (red text in Console tab)
3. **Page URL** you're on
4. **What you expected** vs **what you see**

