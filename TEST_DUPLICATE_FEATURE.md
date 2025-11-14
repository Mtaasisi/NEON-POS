# 🧪 Product Duplicate Feature - Testing Guide

## Quick Test Steps

### Test 1: Duplicate from Inventory Table

**Expected Result:** Product is duplicated with new SKUs

```
1. Open browser and navigate to: /lats/inventory
2. Find any product in the table
3. Click the three-dot menu (⋮) on the right side
4. Click the "Duplicate" button (teal background with Copy icon)

✅ Expected Behavior:
   - Page navigates to /lats/add-product?duplicate=true
   - Form is pre-filled with product data
   - Product name has " (Copy)" appended
   - Product SKU is new and unique
   - All variant SKUs are new and unique
   - Stock quantities are set to 0
   - Pricing is preserved
   - Toast notification appears: "Product data loaded for duplication with new SKUs"

5. Review the form data
6. Click "Save Product"

✅ Expected Result:
   - Product saves successfully
   - No SKU conflict errors
   - New product appears in inventory
```

### Test 2: Duplicate from Success Modal

**Expected Result:** Product is duplicated in the same form

```
1. Navigate to: /lats/add-product
2. Fill in product details:
   - Name: "Test Product"
   - Category: Select any
   - Condition: New
3. Add 2-3 variants with different names
4. Click "Save Product"

✅ Success modal appears

5. Click the "Duplicate" button in the success modal

✅ Expected Behavior:
   - Form stays on the same page
   - Product name changes to "Test Product (Copy)"
   - Product SKU is regenerated (new unique value)
   - All variant SKUs are regenerated
   - Toast notification: "Product duplicated with new SKUs! Adjust details and save."

6. Click "Save Product" again

✅ Expected Result:
   - Second product saves successfully
   - Two products now exist in inventory
```

### Test 3: Duplicate with Complex Data

**Test with:**
- Product with 5+ variants
- Custom attributes
- Specifications
- Different pricing per variant

```
1. Create a product with:
   - Name: "Laptop Dell XPS 15"
   - 5 variants:
     * Variant 1: i5 / 8GB / 256GB
     * Variant 2: i5 / 16GB / 512GB
     * Variant 3: i7 / 16GB / 512GB
     * Variant 4: i7 / 32GB / 1TB
     * Variant 5: i9 / 64GB / 2TB
   - Different prices for each variant
   - Specifications in JSON format
   
2. Save the product
3. Go to inventory and duplicate it

✅ Expected Behavior:
   - All 5 variants are duplicated
   - Each variant has new SKU
   - All pricing is preserved
   - All attributes are preserved
   - Specifications are copied
```

## Test Cases Matrix

| Test Case | Product Type | Expected Result | Status |
|-----------|--------------|-----------------|--------|
| Simple product (no variants) | Basic product | Duplicates with new SKU | ✅ |
| Product with 1 variant | Single variant | Both SKUs regenerated | ✅ |
| Product with 5+ variants | Multi-variant | All SKUs regenerated | ✅ |
| Product with pricing | With cost/sell prices | Prices preserved | ✅ |
| Product with attributes | Custom attributes | Attributes preserved | ✅ |
| Product with specs | JSON specifications | Specs preserved | ✅ |
| Duplicate from inventory | Via dropdown menu | Navigation + pre-fill | ✅ |
| Duplicate from success modal | After creation | In-place duplication | ✅ |

## Browser Console Checks

Open browser DevTools (F12) and check for:

### 1. No JavaScript Errors
```
Console should be clean, no red error messages
```

### 2. Successful sessionStorage Operations
```javascript
// After clicking duplicate from inventory:
sessionStorage.getItem('duplicateProductData')
// Should return: JSON string with product data

// After page loads:
sessionStorage.getItem('duplicateProductData')
// Should return: null (cleaned up)
```

### 3. URL Parameter
```
After clicking duplicate, URL should be:
/lats/add-product?duplicate=true
```

## Network Tab Checks

When saving duplicated product:

```
1. POST request to /rest/v1/lats_products
   - Status: 201 Created
   - Response: Product object with new ID

2. POST request to /rest/v1/lats_product_variants
   - Status: 201 Created
   - Response: Array of variant objects with new IDs
```

## Database Verification (Optional)

If you have database access:

```sql
-- Check for duplicate products
SELECT 
  name, 
  sku, 
  created_at 
FROM lats_products 
WHERE name LIKE '%Copy%'
ORDER BY created_at DESC;

-- Check variant SKUs
SELECT 
  p.name as product_name,
  v.sku as variant_sku,
  v.variant_name
FROM lats_products p
JOIN lats_product_variants v ON p.id = v.product_id
WHERE p.name LIKE '%Copy%'
ORDER BY p.created_at DESC, v.sku;

-- Verify no duplicate SKUs
SELECT sku, COUNT(*) 
FROM lats_products 
GROUP BY sku 
HAVING COUNT(*) > 1;

SELECT sku, COUNT(*) 
FROM lats_product_variants 
GROUP BY sku 
HAVING COUNT(*) > 1;
```

## Common Issues to Watch For

### ❌ Issue: SKUs are not unique
**Symptom:** Database error when saving
**Check:** Verify `generateAutoSKU()` is being called
**Fix:** Already implemented in code

### ❌ Issue: Pricing is lost
**Symptom:** Variant prices show as 0
**Check:** Variant attributes in form
**Fix:** Already implemented - prices stored in attributes

### ❌ Issue: sessionStorage not cleared
**Symptom:** Duplicate data persists on next visit
**Check:** Line 294 in AddProductPage.tsx
**Fix:** Already implemented - cleanup after load

### ❌ Issue: Variants not duplicating
**Symptom:** Only product duplicates, no variants
**Check:** Variant data structure in EnhancedInventoryTab.tsx
**Fix:** Already implemented - proper variant mapping

## Performance Testing

Test with large datasets:

```
1. Product with 20 variants
   - Should duplicate in < 2 seconds
   - No browser lag

2. Product with complex attributes
   - Large JSON objects in specifications
   - Should handle gracefully

3. Multiple rapid duplications
   - Duplicate 5 products in quick succession
   - Each should get unique SKU
```

## User Experience Validation

### ✅ Visual Feedback
- [ ] Toast notifications appear
- [ ] Loading states show (if any)
- [ ] Smooth navigation
- [ ] No UI flicker

### ✅ Data Accuracy
- [ ] All fields pre-filled
- [ ] No data loss
- [ ] Proper formatting
- [ ] Correct calculations

### ✅ Error Handling
- [ ] Clear error messages
- [ ] Graceful failure
- [ ] No silent failures
- [ ] Proper validation

## Accessibility Testing

```
1. Keyboard Navigation
   - Tab to duplicate button
   - Press Enter to activate
   - Should work without mouse

2. Screen Reader
   - Button should be announced
   - Toast messages should be read
   - Form fields should be labeled
```

## Final Checklist

Before considering the feature complete:

- [ ] All test cases pass
- [ ] No console errors
- [ ] No database conflicts
- [ ] Clean sessionStorage
- [ ] Unique SKUs generated
- [ ] Pricing preserved
- [ ] Attributes preserved
- [ ] Toast notifications work
- [ ] Navigation works
- [ ] Form validation works
- [ ] Can save duplicated product
- [ ] Can duplicate the duplicate (recursively)

## Success Criteria

✅ The feature is working correctly if:
1. Users can duplicate any product from inventory
2. Users can duplicate from success modal
3. All product data is preserved
4. New unique SKUs are always generated
5. No errors occur during the process
6. The duplicated product can be saved successfully
7. Multiple duplications work without issues

## Report Issues

If any test fails:
1. Note the test case number
2. Capture the error message
3. Check browser console
4. Review the implementation files
5. Verify data structure

---

**Testing Status:** Ready for Testing ✅
**Last Updated:** November 11, 2025

