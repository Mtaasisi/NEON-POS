# 🔍 Check Why Variants Aren't Showing

## Quick Diagnosis - Follow These Steps

### Step 1: Run Diagnostic Script 🔬

Open a terminal and run:

```bash
node diagnose-variants.mjs
```

This will show you:
- ✅ How many products you have
- ✅ How many have variants
- ✅ Which products have multiple variants
- ✅ Details of each variant
- ✅ What's preventing variants from showing

---

### Step 2: Check Browser Console 🖥️

1. **Open your browser** with the app
2. **Press F12** (or Cmd+Option+I on Mac) to open DevTools
3. **Go to Console tab**
4. **Refresh the page**
5. **Navigate to: Special Orders → New Special Order**

**Look for this output:**

```
=== Product Loading Debug ===
Total products loaded: 50
Products with variants: 12
Sample product with variants: iPhone 14 Pro
  - Total variants: 4
  - Variants: [...]
=== End Debug ===
```

---

### Step 3: Click a Product 👆

1. **Click the Product Name field**
2. **Search for a product** (or browse the list)
3. **Click on a product**
4. **Check console output:**

```
=== Product Selection Debug ===
Product: iPhone 14 Pro
All variants raw: [array]
Actual variants (after filtering): 4
Variant details: [
  { color: "Purple", storage: "128GB", is_parent: false },
  { color: "Purple", storage: "256GB", is_parent: false },
  ...
]
→ Showing variant modal for 4 variants
=== End Debug ===
```

**If you see "Showing variant modal":**
- ✅ Variant modal **should** appear
- ❌ If it doesn't, there's a rendering issue

**If you see "Selecting directly":**
- ⚠️ Product has 0 or 1 variants
- Check why variants were filtered out

---

## Common Scenarios & Solutions

### Scenario 1: "Products with variants: 0"

**Problem:** No products have variants in your database

**Solution:**

```sql
-- Option A: Check if variants exist at all
SELECT COUNT(*) FROM lats_product_variants;
```

If this returns 0, you need to create variants.

```sql
-- Option B: Create test variants
-- First, find a product ID
SELECT id, name FROM lats_products LIMIT 5;

-- Then create variants for that product (replace <product-id>)
INSERT INTO lats_product_variants (
  product_id, color, storage, sku, 
  selling_price, stock_quantity, 
  is_parent_variant, is_active
) VALUES
  ('<product-id>', 'Purple', '128GB', 'TEST-P-128', 2500000, 5, false, true),
  ('<product-id>', 'Purple', '256GB', 'TEST-P-256', 2700000, 3, false, true),
  ('<product-id>', 'Gold', '128GB', 'TEST-G-128', 2500000, 8, false, true);
```

---

### Scenario 2: "Actual variants (after filtering): 0"

**Problem:** Variants exist but all are being filtered out

**Reasons:**
1. All variants have `is_parent_variant = true`
2. All variants have `parent_variant_id` (IMEI children)
3. All variants are inactive

**Check which:**

```sql
SELECT 
  product_id,
  COUNT(*) as total,
  SUM(CASE WHEN is_parent_variant = true THEN 1 ELSE 0 END) as parents,
  SUM(CASE WHEN parent_variant_id IS NOT NULL THEN 1 ELSE 0 END) as children,
  SUM(CASE WHEN is_active = false THEN 1 ELSE 0 END) as inactive
FROM lats_product_variants
GROUP BY product_id
HAVING COUNT(*) > 1
LIMIT 10;
```

**Fix:** Update your variants:

```sql
-- Fix 1: Correct parent variant flags
UPDATE lats_product_variants
SET is_parent_variant = false
WHERE (color IS NOT NULL OR storage IS NOT NULL OR size IS NOT NULL)
  AND is_parent_variant = true;

-- Fix 2: Activate variants
UPDATE lats_product_variants
SET is_active = true
WHERE is_active = false OR is_active IS NULL;
```

---

### Scenario 3: All Products Have Only 1 Variant

**This is normal!** 
- Products with 1 variant select immediately
- No modal needed
- Variant modal only for 2+ variants

**To test with multi-variant:**
- Create a product with multiple colors/storage options
- Or use the SQL from Scenario 1

---

### Scenario 4: Variant Modal Should Show But Doesn't

**If console says "Showing variant modal" but you don't see it:**

**Quick fixes:**

1. **Clear browser cache:**
   - Press Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
   - Or clear cache in DevTools

2. **Check for JavaScript errors:**
   - Look for red errors in console
   - They might block the modal

3. **Check z-index:**
   - Inspect the variant modal element
   - Should have `z-index: 100012`

4. **Try different product:**
   - Search for another product
   - Click to see if modal appears

---

## Quick Database Check 🗄️

### Check Specific Product

Replace `'iPhone'` with your product name:

```sql
SELECT 
  p.name as product_name,
  COUNT(pv.id) as total_variants,
  SUM(CASE WHEN pv.is_parent_variant = true THEN 1 ELSE 0 END) as parent_count,
  SUM(CASE WHEN pv.is_parent_variant != true AND pv.parent_variant_id IS NULL THEN 1 ELSE 0 END) as sellable_count
FROM lats_products p
LEFT JOIN lats_product_variants pv ON p.id = pv.product_id
WHERE p.name ILIKE '%iPhone%'
GROUP BY p.id, p.name;
```

**What you want to see:**
```
product_name     | total_variants | parent_count | sellable_count
iPhone 14 Pro    | 5              | 1            | 4              ✅ Will show modal!
USB Cable        | 1              | 1            | 0              ❌ No modal (0 sellable)
MacBook Charger  | 0              | 0            | 0              ❌ No modal (no variants)
```

---

## What Should Happen ✅

### Correct Flow for Multi-Variant Product

```
1. You click "iPhone 14 Pro" in dropdown
   ↓
2. Console shows:
   "→ Showing variant modal for 4 variants"
   ↓
3. Variant modal appears with purple header
   ↓
4. You see 4 variant cards:
   - Purple / 128GB
   - Purple / 256GB
   - Gold / 128GB
   - Gold / 256GB
   ↓
5. You click one variant
   ↓
6. Modal closes
   ↓
7. Product field shows: "iPhone 14 Pro (Purple / 128GB)"
   ↓
8. Price auto-fills with variant price
```

---

## Next Steps 🚀

### If Diagnostic Shows Products with Variants:
1. ✅ Refresh browser (Cmd+R)
2. ✅ Open Special Orders
3. ✅ Search for the product name shown in diagnostic
4. ✅ Click it
5. ✅ Variant modal should appear!

### If Diagnostic Shows No Products with Variants:
1. ❌ You need to create variants in database
2. 📚 Use SQL examples above
3. ✅ Or create variants through your product management UI
4. ✅ Re-run diagnostic to confirm

### If Modal Still Doesn't Appear:
1. Check browser console for errors
2. Clear cache and hard refresh
3. Try in incognito/private window
4. Check the VARIANT_TROUBLESHOOTING.md file

---

## Quick Reference

### Expected Console Output (Success)
```
=== Product Loading Debug ===
Total products loaded: 50
Products with variants: 12        ← Good!
Sample product with variants: iPhone 14 Pro
  - Total variants: 4             ← Good!

=== Product Selection Debug ===
Product: iPhone 14 Pro
Actual variants: 4                ← Good!
→ Showing variant modal           ← Good!
```

### Expected Console Output (No Variants)
```
=== Product Loading Debug ===
Total products loaded: 50
Products with variants: 0         ← Problem!
⚠️ No products with multiple variants found
```

**Action:** Create variants in database

---

## 📞 Still Need Help?

1. ✅ Run: `node diagnose-variants.mjs`
2. ✅ Share the output
3. ✅ Share browser console output
4. ✅ Share a screenshot of what you see

The diagnostic will tell us exactly what's wrong! 🎯

---

## Date Created
December 2, 2025

