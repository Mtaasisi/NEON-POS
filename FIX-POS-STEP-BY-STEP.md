# 🔧 Step-by-Step POS Fix Guide

Run these queries ONE AT A TIME in Neon SQL Editor.
After each step, check for errors before proceeding.

---

## Step 1: Reset Any Errors
```sql
ROLLBACK;
```
**Expected:** Should complete without error

---

## Step 2: Add Missing Columns
```sql
ALTER TABLE lats_products ADD COLUMN IF NOT EXISTS unit_price NUMERIC DEFAULT 0;
ALTER TABLE lats_products ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0;
ALTER TABLE lats_product_variants ADD COLUMN IF NOT EXISTS unit_price NUMERIC DEFAULT 0;
ALTER TABLE lats_product_variants ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0;
```
**Expected:** Columns added or already exist message

---

## Step 3: Copy Old Price Data (if selling_price exists)
```sql
UPDATE lats_product_variants 
SET unit_price = selling_price 
WHERE unit_price = 0 
  AND selling_price IS NOT NULL 
  AND selling_price > 0;
```
**Expected:** X rows updated (or 0 if no selling_price column)

---

## Step 4: Fix NULL Prices
```sql
UPDATE lats_products SET unit_price = 0 WHERE unit_price IS NULL;
UPDATE lats_products SET cost_price = 0 WHERE cost_price IS NULL;
UPDATE lats_product_variants SET unit_price = 0 WHERE unit_price IS NULL;
UPDATE lats_product_variants SET cost_price = 0 WHERE cost_price IS NULL;
```
**Expected:** Rows updated message

---

## Step 5: Create Default Variants
```sql
INSERT INTO lats_product_variants (
  product_id, 
  variant_name, 
  sku, 
  unit_price, 
  cost_price, 
  quantity, 
  min_quantity
)
SELECT 
  p.id,
  'Default' as variant_name,
  COALESCE(p.sku, p.id::text) || '-DEFAULT' as sku,
  COALESCE(p.unit_price, 0) as unit_price,
  COALESCE(p.cost_price, 0) as cost_price,
  COALESCE(p.stock_quantity, 0) as quantity,
  5 as min_quantity
FROM lats_products p
WHERE NOT EXISTS (
  SELECT 1 FROM lats_product_variants v WHERE v.product_id = p.id
)
AND p.is_active = true
ON CONFLICT (sku) DO NOTHING;
```
**Expected:** X rows inserted (number of products that didn't have variants)

---

## Step 6: Create Indexes
```sql
CREATE INDEX IF NOT EXISTS idx_products_category ON lats_products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON lats_products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_sku ON lats_products(sku);
CREATE INDEX IF NOT EXISTS idx_variants_product ON lats_product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON lats_product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_variants_active ON lats_product_variants(is_active);
```
**Expected:** Indexes created or already exist

---

## Step 7: Grant Permissions
```sql
GRANT ALL ON lats_products TO PUBLIC;
GRANT ALL ON lats_product_variants TO PUBLIC;
GRANT ALL ON lats_sales TO PUBLIC;
GRANT ALL ON lats_sale_items TO PUBLIC;
```
**Expected:** Permission granted

---

## Step 8: Disable RLS (if enabled)
```sql
ALTER TABLE lats_products DISABLE ROW LEVEL SECURITY;
ALTER TABLE lats_product_variants DISABLE ROW LEVEL SECURITY;
ALTER TABLE lats_sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE lats_sale_items DISABLE ROW LEVEL SECURITY;
```
**Expected:** RLS disabled (or error if not supported - that's OK)

---

## Step 9: Verify Results
```sql
-- Check products
SELECT 
  'Products' as table_name,
  COUNT(*) as total,
  COUNT(CASE WHEN unit_price > 0 THEN 1 END) as with_price
FROM lats_products
WHERE is_active = true;

-- Check variants
SELECT 
  'Variants' as table_name,
  COUNT(*) as total,
  COUNT(CASE WHEN unit_price > 0 THEN 1 END) as with_price
FROM lats_product_variants
WHERE is_active = true;

-- Sample data
SELECT 
  p.name,
  p.unit_price,
  COUNT(v.id) as variants
FROM lats_products p
LEFT JOIN lats_product_variants v ON v.product_id = p.id
WHERE p.is_active = true
GROUP BY p.id, p.name, p.unit_price
LIMIT 5;
```
**Expected:** See counts and sample products

---

## ✅ Success Checklist

After all steps:
- [ ] All queries ran without errors (or only ignorable errors)
- [ ] Products table has unit_price column
- [ ] Variants table has unit_price column
- [ ] At least some products have unit_price > 0
- [ ] At least some variants have unit_price > 0
- [ ] Each active product has at least one variant

---

## 🎉 Next: Test POS

1. Go to: http://localhost:3000/pos
2. Refresh page (Ctrl+Shift+R)
3. Check products show prices
4. Try adding to cart
5. Create test sale

---

## 🆘 If Any Step Fails

**Share the exact error message and which step number!**

Example:
- "Step 3 failed with: [error message]"
- I'll provide a fix for that specific step

