# Product Update Debugging Guide

## How to Debug the "Failed to update product" Error

### Step 1: Check Your Browser Console

1. Open your browser's Developer Tools (F12 or Right-click → Inspect)
2. Go to the **Console** tab
3. Try updating the product again
4. Look for these log messages:

```
📋 Variant data: { ... }           ← Shows what data is being sent
❌ Update by ID failed: { ... }    ← Shows the actual database error
❌ Update error details: { ... }   ← Full error with error code
```

### Step 2: Check the Error Code

Common PostgreSQL error codes:

| Error Code | Meaning | Solution |
|------------|---------|----------|
| **23505** | Duplicate key (SKU already exists) | Change the SKU to be unique |
| **23503** | Foreign key violation | Check category/supplier exists |
| **42703** | Column doesn't exist | Database schema mismatch |
| **42P01** | Table doesn't exist | Run database migrations |

### Step 3: Check for Duplicate SKUs

Run this SQL query in your database:

```sql
-- Check for duplicate SKUs in variants
SELECT 
    sku,
    COUNT(*) as count,
    array_agg(id) as variant_ids
FROM lats_product_variants
WHERE sku IS NOT NULL
GROUP BY sku
HAVING COUNT(*) > 1;
```

If you see duplicates, run this to fix them:

```sql
-- Fix duplicate SKUs by adding sequence numbers
WITH duplicate_skus AS (
    SELECT 
        id,
        sku,
        ROW_NUMBER() OVER (PARTITION BY sku ORDER BY created_at) as rn
    FROM lats_product_variants
    WHERE sku IN (
        SELECT sku 
        FROM lats_product_variants 
        WHERE sku IS NOT NULL 
        GROUP BY sku 
        HAVING COUNT(*) > 1
    )
)
UPDATE lats_product_variants v
SET 
    sku = d.sku || '-V' || d.rn,
    updated_at = NOW()
FROM duplicate_skus d
WHERE v.id = d.id
  AND d.rn > 1;
```

### Step 4: Check Database Schema

Run this to verify the column names:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'lats_product_variants'
ORDER BY ordinal_position;
```

Expected columns:
- `id` (uuid)
- `product_id` (uuid)
- `variant_name` (text) ← **NOT** `name`
- `variant_attributes` (jsonb) ← **NOT** `attributes`
- `sku` (text)
- `cost_price` (numeric)
- `unit_price` (numeric)
- `quantity` (integer)
- `min_quantity` (integer)

### Step 5: Check the Specific Failing Product

Run this SQL to see the current state of your product:

```sql
-- Replace with your actual product SKU
SELECT 
    v.id,
    v.product_id,
    v.sku,
    v.variant_name,
    v.quantity,
    v.cost_price,
    v.unit_price,
    p.name as product_name,
    p.sku as product_sku
FROM lats_product_variants v
JOIN lats_products p ON v.product_id = p.id
WHERE p.sku = 'SKU-1760105351191-OHH'
ORDER BY v.created_at;
```

### Step 6: Common Issues and Fixes

#### Issue 1: Variant has same SKU as product

**Problem:** Variant SKU = Product SKU (causes confusion)

**Solution:** Update the variant SKU to be unique:
```sql
UPDATE lats_product_variants
SET sku = sku || '-V1'
WHERE sku IN (SELECT sku FROM lats_products);
```

#### Issue 2: Multiple variants with identical SKUs

**Problem:** Two variants in the same product have the same SKU

**Solution:** In the Edit Product modal, each variant must have a unique SKU. Use the pattern:
- Variant 1: `{PRODUCT-SKU}-V1`
- Variant 2: `{PRODUCT-SKU}-V2`
- Variant 3: `{PRODUCT-SKU}-V3`

#### Issue 3: Column name mismatch

**Problem:** Code expects `attributes` but database has `variant_attributes`

**Solution:** This has been fixed in the latest code. Make sure you:
1. Stop the dev server
2. Clear your browser cache (Ctrl+Shift+Delete)
3. Hard refresh the page (Ctrl+Shift+R)
4. Restart the dev server

### Step 7: Still Not Working?

If none of the above helps, please provide:

1. **The exact error from console:**
   ```
   Copy the full error message from browser console
   ```

2. **The variant data being sent:**
   ```json
   Look for "📤 Final product data being sent:" in console
   ```

3. **Your database check results:**
   ```sql
   Run the queries from Step 3 and Step 5
   ```

## Quick Fix: Reset Problem Variants

If you just want to fix this specific product quickly:

```sql
-- Delete the problematic variants
DELETE FROM lats_product_variants
WHERE product_id = (
    SELECT id FROM lats_products 
    WHERE sku = 'SKU-1760105351191-OHH'
);

-- Create fresh variants with unique SKUs
INSERT INTO lats_product_variants (
    product_id,
    variant_name,
    sku,
    cost_price,
    unit_price,
    quantity,
    min_quantity,
    variant_attributes
)
SELECT 
    id,
    'Default',
    sku || '-V1',
    0,
    0,
    0,
    5,
    '{}'::jsonb
FROM lats_products
WHERE sku = 'SKU-1760105351191-OHH';
```

After running this, try updating the product again in the UI.

