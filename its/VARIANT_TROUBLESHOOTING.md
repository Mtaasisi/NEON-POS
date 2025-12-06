# 🔍 Variant Selection Troubleshooting Guide

## Issue: "I don't see variants"

### Step-by-Step Diagnosis

---

## Step 1: Check Browser Console 🖥️

1. **Open browser console** (F12 or Cmd+Option+I)
2. **Refresh the page**
3. **Open Special Orders** → **New Special Order**
4. **Look for this output:**

```
=== Product Loading Debug ===
Total products loaded: 50
Products with variants: 12
Sample product with variants: iPhone 14 Pro
  - Total variants: 4
  - Variants: [
      { id: "...", color: "Purple", storage: "128GB", is_parent: false },
      { id: "...", color: "Purple", storage: "256GB", is_parent: false },
      { id: "...", color: "Gold", storage: "128GB", is_parent: false },
      { id: "...", color: "Gold", storage: "256GB", is_parent: false }
    ]
=== End Debug ===
```

---

## Step 2: Interpret Console Output 📊

### Scenario A: ✅ Variants Are Loading
```
Products with variants: 12
Sample product with variants: iPhone 14 Pro
  - Total variants: 4
```

**This means:**
- ✅ Data is loading correctly
- ✅ Products have variants in database
- ✅ Variants are being fetched

**Next Step:** Click on a product with variants and check:
```
=== Product Selection Debug ===
Product: iPhone 14 Pro
All variants: [array of 4 variants]
Actual variants (after filtering): 4
→ Showing variant modal
```

**If you see "Showing variant modal"** but no modal appears:
- Clear browser cache
- Hard refresh (Cmd+Shift+R)
- Check z-index issues

---

### Scenario B: ⚠️ No Products with Variants
```
Products with variants: 0
⚠️ No products with multiple variants found
```

**This means:**
- ❌ Products in database don't have variants
- ❌ Or variants aren't linked properly
- ❌ Or all variants are marked as parent variants

**Solution:** Check your database

---

### Scenario C: 🔴 Variants Filtered Out
```
Product: iPhone 14 Pro
All variants: [array of 4 variants]
Actual variants (after filtering): 0  ← Problem here!
→ Selecting directly (single or no variant)
```

**This means:**
- ❌ All variants have `is_parent_variant = true`
- ❌ Filtering is removing all variants

**Solution:** Check `is_parent_variant` field in database

---

## Step 3: Database Check 🗄️

### Query 1: Check Product Variants
Run this in your Supabase SQL editor:

```sql
-- Check products with variants
SELECT 
  p.id,
  p.name,
  COUNT(pv.id) as variant_count,
  SUM(CASE WHEN pv.is_parent_variant THEN 1 ELSE 0 END) as parent_variants,
  SUM(CASE WHEN NOT pv.is_parent_variant THEN 1 ELSE 0 END) as actual_variants
FROM lats_products p
LEFT JOIN lats_product_variants pv ON p.id = pv.product_id
WHERE p.is_active = true
GROUP BY p.id, p.name
HAVING COUNT(pv.id) > 0
ORDER BY variant_count DESC
LIMIT 20;
```

**Expected Output:**
```
| name              | variant_count | parent_variants | actual_variants |
|-------------------|---------------|-----------------|-----------------|
| iPhone 14 Pro     | 5             | 1               | 4               |
| Samsung S23       | 4             | 1               | 3               |
| MacBook Pro       | 3             | 1               | 2               |
```

**What to look for:**
- ✅ `actual_variants` > 1 → Variant modal should appear
- ❌ `actual_variants` = 0 → All variants are parents
- ❌ `variant_count` = 1 → Only parent variant exists

---

### Query 2: Check Specific Product
Pick a product that should have variants:

```sql
SELECT 
  p.name as product_name,
  pv.id as variant_id,
  pv.color,
  pv.storage,
  pv.size,
  pv.is_parent_variant,
  pv.sku,
  pv.selling_price,
  pv.stock_quantity
FROM lats_products p
JOIN lats_product_variants pv ON p.id = pv.product_id
WHERE p.name ILIKE '%iphone%'  -- Replace with your product name
ORDER BY pv.is_parent_variant, pv.color, pv.storage;
```

**Expected Output:**
```
| product_name   | color  | storage | is_parent_variant | sku       |
|----------------|--------|---------|-------------------|-----------|
| iPhone 14 Pro  | NULL   | NULL    | true              | IPH14-P   | ← Parent
| iPhone 14 Pro  | Purple | 128GB   | false             | IPH14-P128|
| iPhone 14 Pro  | Purple | 256GB   | false             | IPH14-P256|
| iPhone 14 Pro  | Gold   | 128GB   | false             | IPH14-G128|
```

**What you need:**
- ✅ At least 2 variants with `is_parent_variant = false`
- ✅ Variants should have color, storage, or size filled
- ✅ Each variant has a price

---

## Step 4: Common Issues & Solutions 🔧

### Issue 1: No Variants in Database
**Problem:** Products don't have variants created

**Solution:**
```sql
-- Create variants for a product
INSERT INTO lats_product_variants (
  product_id,
  color,
  storage,
  sku,
  selling_price,
  stock_quantity,
  is_parent_variant
) VALUES
  ('product-id-here', 'Purple', '128GB', 'IPH-P-128', 2500000, 5, false),
  ('product-id-here', 'Purple', '256GB', 'IPH-P-256', 2700000, 3, false),
  ('product-id-here', 'Gold', '128GB', 'IPH-G-128', 2500000, 2, false);
```

---

### Issue 2: All Variants Are Parents
**Problem:** All variants have `is_parent_variant = true`

**Solution:**
```sql
-- Fix parent variant flags
UPDATE lats_product_variants
SET is_parent_variant = false
WHERE color IS NOT NULL 
   OR storage IS NOT NULL 
   OR size IS NOT NULL;

-- Ensure only one parent per product
UPDATE lats_product_variants pv1
SET is_parent_variant = true
WHERE pv1.color IS NULL 
  AND pv1.storage IS NULL 
  AND pv1.size IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM lats_product_variants pv2
    WHERE pv2.product_id = pv1.product_id
      AND pv2.is_parent_variant = true
      AND pv2.id < pv1.id
  );
```

---

### Issue 3: Variants Not Linked to Product
**Problem:** Foreign key relationship broken

**Solution:**
```sql
-- Check relationships
SELECT 
  p.name,
  p.id as product_id,
  pv.id as variant_id,
  pv.product_id as variant_product_id
FROM lats_products p
LEFT JOIN lats_product_variants pv ON p.id = pv.product_id
WHERE p.name ILIKE '%your-product%'
LIMIT 10;
```

Verify `product_id` matches `variant_product_id`.

---

### Issue 4: Query Not Loading Variants
**Problem:** Supabase query not fetching related data

**Test the query directly:**
```typescript
// In browser console, run:
const { data, error } = await supabase
  .from('lats_products')
  .select('*, lats_product_variants(*)')
  .eq('name', 'iPhone 14 Pro')  // Use actual product name
  .single();

console.log('Product data:', data);
console.log('Variants:', data?.lats_product_variants);
```

**Expected:**
```javascript
{
  id: "...",
  name: "iPhone 14 Pro",
  lats_product_variants: [
    { id: "...", color: "Purple", storage: "128GB", is_parent_variant: false },
    { id: "...", color: "Purple", storage: "256GB", is_parent_variant: false },
    // ... more variants
  ]
}
```

---

## Step 5: Quick Test with Sample Data 🧪

### Create a Test Product with Variants

```sql
-- 1. Create test product
INSERT INTO lats_products (id, name, description, is_active)
VALUES (
  gen_random_uuid(),
  'Test iPhone Variants',
  'Test product for variant selection',
  true
)
RETURNING id;

-- 2. Use the returned ID to create variants
INSERT INTO lats_product_variants (
  product_id,
  color,
  storage,
  sku,
  selling_price,
  unit_price,
  stock_quantity,
  is_parent_variant
) VALUES
  -- Parent variant
  ('<product-id>', NULL, NULL, 'TEST-IPHONE-PARENT', 2500000, 2000000, 0, true),
  -- Actual variants
  ('<product-id>', 'Deep Purple', '128GB', 'TEST-IPH-P-128', 2500000, 2000000, 5, false),
  ('<product-id>', 'Deep Purple', '256GB', 'TEST-IPH-P-256', 2700000, 2200000, 3, false),
  ('<product-id>', 'Gold', '128GB', 'TEST-IPH-G-128', 2500000, 2000000, 8, false),
  ('<product-id>', 'Gold', '256GB', 'TEST-IPH-G-256', 2700000, 2200000, 2, false);
```

### Test the Feature
1. Refresh the page
2. Open Special Orders → New Special Order
3. Search for "Test iPhone Variants"
4. Click it
5. **Variant modal should appear with 4 variants!**

---

## Step 6: Alternative Approach - Load All Variants 🔄

If the current approach isn't working, try loading variants separately:

<function_calls>
<invoke name="read_file">
<parameter name="target_file">/Users/mtaasisi/Downloads/NEON-POS-main/src/features/special-orders/pages/SpecialOrdersPage.tsx
