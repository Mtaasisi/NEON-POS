# 🔍 Product Issues Found - Automated Browser Test

**Test Date:** October 19, 2025  
**Tested By:** Automated Browser Test  
**Login:** care@care.com  
**Branch:** ARUSHA (115e0e51-d0d6-437b-9fda-dfe11241b167)

---

## 📊 Summary

- **Total Products in System:** 1
- **Product Name:** Min Mac A1347
- **Product ID:** 868d6354-524e-4cec-8fbb-2f3553824728
- **Status:** Multiple critical issues found ❌

---

## 🚨 Critical Issues Found

### 1. **UNASSIGNED VARIANTS** (Root Cause)
- **Issue:** Product has 1 variant with stock and price data, BUT it's "unassigned"
- **Evidence from Console:**
  ```
  ✅ Found 1 unassigned variants
  💰 [LiveInventoryService] Min Mac A1347 - Default: 34 × 324 = 11016
  🔒 ISOLATED MODE: Skipping unassigned variants (strict isolation)
  ```
- **Impact:** 
  - Variant exists in database with 34 units at TSh 324 each
  - Variant is NOT visible in UI due to NULL branch_id
  - Product appears to have 0 variants in the UI
  - Stock and pricing information is hidden

### 2. **Missing SKU**
- **UI Display:** "No SKU"
- **Database Value:** "asdasd" (exists but not showing properly)

### 3. **Zero Prices Displayed**
- Primary Price: TSh 0 ❌
- Cost Price: TSh 0 ❌
- Profit/Unit: TSh 0 ❌
- Total Value: TSh 0 ❌
- **Note:** Actual prices exist in the unassigned variant (324 TSh)

### 4. **No Product Images**
- Images: 0 photos ❌
- No product images uploaded

### 5. **No Primary Variant Set**
- Primary Variant: None ❌
- System cannot determine which variant to use for POS

### 6. **Stock Display Discrepancy**
- List View: Shows "0 in stock" ❌
- Detail View: Shows "34 in stock" ✅
- Actual Stock: 34 units (in unassigned variant)

### 7. **No Supplier Assigned**
- Supplier: N/A ❌

### 8. **Min Stock Level Not Set**
- Min Stock Level: 0 ❌
- Cannot trigger low stock alerts

---

## 🔧 Root Cause Analysis

The main issue is **Branch Isolation with Unassigned Variants**:

1. The product (Min Mac A1347) is correctly assigned to branch ARUSHA
2. BUT the product variant has `branch_id = NULL` (unassigned)
3. System is in **ISOLATED MODE** with `share_products = false`
4. Isolation logic skips unassigned variants:
   ```
   🔒 ISOLATED MODE: Skipping unassigned variants (strict isolation)
   ```
5. This causes:
   - Variants don't appear in UI
   - Stock appears as 0
   - Prices appear as 0
   - Cannot use product in POS

---

## 🔍 Technical Details

### Database State
- **Product:** ✅ Has branch_id = '115e0e51-d0d6-437b-9fda-dfe11241b167'
- **Variant:** ❌ Has branch_id = NULL (unassigned)
- **Isolation Mode:** isolated
- **Share Products:** false

### Query Behavior
```sql
-- Products query works fine (product has branch_id)
SELECT * FROM lats_products 
WHERE branch_id = '115e0e51-d0d6-437b-9fda-dfe11241b167'
-- Returns: 1 product ✅

-- Variants query filters out unassigned
SELECT * FROM lats_product_variants 
WHERE branch_id = '115e0e51-d0d6-437b-9fda-dfe11241b167'
-- Returns: 0 variants ❌ (variant has NULL branch_id)
```

---

## 💡 Recommended Fixes

### Fix 1: Assign Branch to Variant (PRIORITY)
```sql
-- Update unassigned variant to match product's branch
UPDATE lats_product_variants
SET branch_id = '115e0e51-d0d6-437b-9fda-dfe11241b167'
WHERE product_id = '868d6354-524e-4cec-8fbb-2f3553824728'
  AND branch_id IS NULL;
```

### Fix 2: Set Primary Variant
```sql
-- Set the variant as primary
UPDATE lats_product_variants
SET is_primary = true
WHERE product_id = '868d6354-524e-4cec-8fbb-2f3553824728'
LIMIT 1;
```

### Fix 3: Add Supplier
- Assign a supplier to the product via UI or:
```sql
UPDATE lats_products
SET supplier_id = '<supplier_id>'
WHERE id = '868d6354-524e-4cec-8fbb-2f3553824728';
```

### Fix 4: Set Minimum Stock Level
```sql
UPDATE lats_products
SET min_stock_level = 5  -- or appropriate value
WHERE id = '868d6354-524e-4cec-8fbb-2f3553824728';
```

### Fix 5: Upload Product Images
- Use UI to upload at least one product image
- Set one image as primary

### Fix 6: Fix SKU Display
- Verify SKU is properly saved and displayed

---

## 🎯 Expected Results After Fixes

After applying fixes:
- ✅ Product variant will be visible in UI
- ✅ Stock will show 34 units
- ✅ Prices will show TSh 324
- ✅ Total value will calculate to TSh 11,016
- ✅ Product can be added to POS
- ✅ Product can be sold
- ✅ Inventory tracking will work properly

---

## 📝 Additional Recommendations

1. **Prevent Future Issues:**
   - When creating products in isolated mode, ensure variants get the same branch_id
   - Add database constraint to prevent NULL branch_id when product has branch_id
   - Add validation in product creation flow

2. **Data Integrity Check:**
   - Run query to find all unassigned variants:
     ```sql
     SELECT pv.*, p.branch_id as product_branch_id
     FROM lats_product_variants pv
     JOIN lats_products p ON p.id = pv.product_id
     WHERE pv.branch_id IS NULL
       AND p.branch_id IS NOT NULL;
     ```

3. **UI Improvements:**
   - Show warning when product has unassigned variants
   - Add "Assign to Branch" button in UI
   - Better error messages when variants are hidden

---

## 📸 Screenshots

- `login-page.png` - Initial login state
- `product-variants-issue.png` - Showing 0 variants despite having data

---

## ✅ Test Completion

Browser test completed successfully. All major product issues have been identified and documented.

**Next Steps:** Apply recommended SQL fixes to resolve variant assignment issue.

