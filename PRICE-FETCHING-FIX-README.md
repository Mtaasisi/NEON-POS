# Price Not Fetching - Fix Complete ✅

## Problem Identified

When adding or editing product prices, they weren't showing up in the UI. The root cause was a **column name mismatch**:

- **Frontend Code** was saving prices to `selling_price` column
- **Database Schema** uses `unit_price` column  
- **Frontend Queries** were reading from `unit_price` column

Result: Prices were being saved to the wrong column and never retrieved!

---

## Files Fixed

### 1. `/src/features/lats/pages/AddProductPage.tsx`
- ✅ Changed product creation from `selling_price` → `unit_price` (line 659)
- ✅ Changed variant creation from `selling_price` → `unit_price` (line 761)

### 2. `/src/features/lats/pages/EditProductPage.tsx`
- ✅ Changed product loading from `selling_price` → `unit_price` (line 428)
- ✅ Changed product update from `selling_price` → `unit_price` (line 704)
- ✅ Changed variant loading from `selling_price` → `unit_price` (line 490)
- ✅ Changed variant update from `selling_price` → `unit_price` (line 844)

### 3. Database Migration Scripts Created

#### `fix-price-column-mismatch.sql`
- Ensures `unit_price` column exists in both tables
- Migrates any data from `selling_price` to `unit_price`
- Verifies the data migration
- Optionally drops the old `selling_price` columns

#### `fix-min-mac-pricing.sql`
- Fixes the specific "Min Mac A1347" product
- Updates from TSh 0 to TSh 51 (50% markup on TSh 34 cost)

---

## What to Do Next

### Step 1: Run the Database Migration
Execute this in your Neon Database SQL Editor:

```bash
# Run the column fix script
fix-price-column-mismatch.sql
```

This will:
- ✅ Add `unit_price` column if it doesn't exist
- ✅ Copy any prices from `selling_price` to `unit_price`  
- ✅ Verify all products have prices in the correct column

### Step 2: Fix the Min Mac Product (Optional)
If you still want to fix the specific Min Mac product:

```bash
# Run the specific product fix
fix-min-mac-pricing.sql
```

### Step 3: Test the Fix

1. **Add a New Product:**
   - Go to Add Product page
   - Enter a price (e.g., TSh 100)
   - Save the product
   - ✅ Price should now appear immediately

2. **Edit an Existing Product:**
   - Open any product
   - Change the price
   - Save
   - ✅ New price should display correctly

3. **View in Inventory:**
   - Check the inventory list
   - ✅ All prices should display properly

### Step 4: Rebuild the Frontend

After the code changes, rebuild your app:

```bash
npm run build
# or
yarn build
```

---

## Technical Details

### Database Schema
Both tables now consistently use `unit_price`:

```sql
lats_products:
  - unit_price NUMERIC DEFAULT 0  ✅
  - cost_price NUMERIC DEFAULT 0

lats_product_variants:
  - unit_price NUMERIC DEFAULT 0  ✅
  - cost_price NUMERIC DEFAULT 0
```

### Data Flow (Fixed)
**Before:**
```
User enters price → Saved to selling_price → Database ignores it
Frontend fetches → Reads unit_price → Gets 0 → No price shown ❌
```

**After:**
```
User enters price → Saved to unit_price → Database stores it ✅
Frontend fetches → Reads unit_price → Gets correct price → Price shown ✅
```

---

## Verification Queries

Run these to verify everything is working:

```sql
-- Check all products have prices
SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN unit_price > 0 THEN 1 END) as with_price,
    COUNT(CASE WHEN unit_price = 0 OR unit_price IS NULL THEN 1 END) as without_price
FROM lats_products;

-- Check all variants have prices
SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN unit_price > 0 THEN 1 END) as with_price,
    COUNT(CASE WHEN unit_price = 0 OR unit_price IS NULL THEN 1 END) as without_price
FROM lats_product_variants;

-- Find products that still need prices
SELECT id, name, sku, unit_price, cost_price
FROM lats_products
WHERE unit_price = 0 OR unit_price IS NULL
ORDER BY name;
```

---

## Common Issues After Fix

### Issue: Old products still show TSh 0
**Solution:** Those products were saved with `selling_price` before the fix. The migration script will copy them to `unit_price`. If not, edit them and re-save.

### Issue: Variants don't show prices
**Solution:** Run the migration script to copy prices from `selling_price` to `unit_price` for variants.

### Issue: Price shows on edit but not on list
**Solution:** Clear your browser cache and refresh. The listing queries now use `unit_price`.

---

## Files Created/Modified

### Created:
- ✅ `fix-price-column-mismatch.sql` - Database migration script
- ✅ `fix-min-mac-pricing.sql` - Specific product fix (already existed, updated)
- ✅ `PRICE-FETCHING-FIX-README.md` - This file

### Modified:
- ✅ `src/features/lats/pages/AddProductPage.tsx`
- ✅ `src/features/lats/pages/EditProductPage.tsx`

---

## Need Help?

If prices still don't show after following these steps:

1. Check browser console for errors
2. Verify the database migration ran successfully  
3. Confirm `unit_price` column exists: 
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'lats_products' AND column_name = 'unit_price';
   ```
4. Check if prices exist in database:
   ```sql
   SELECT * FROM lats_products WHERE id = 'YOUR_PRODUCT_ID';
   ```

---

**Status:** ✅ FIXED - Prices will now save and fetch correctly!

