# Product Pages Testing Guide 🧪

## Pre-Testing Setup

### 1. Apply Database Migration
```bash
# In Supabase SQL Editor, run:
# Copy contents of FIX-PRODUCT-PAGES-COMPLETE.sql and execute
```

### 2. Restart Development Server
```bash
npm run dev
```

### 3. Clear Browser Cache
- Press `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)

## Test Cases

### ✅ Test 1: Add Product - Basic Information

**Steps:**
1. Navigate to `/lats/add-product`
2. Enter product name: "iPhone 15 Pro Max"
3. Click "Auto" button to generate SKU (should generate automatically)
4. Select category: "Electronics" or "Smartphones"
5. Select condition: "New"
6. Enter description: "Latest iPhone with A17 Pro chip"

**Expected Result:**
- ✅ Form fields accept input
- ✅ SKU generates automatically
- ✅ No errors in console
- ✅ Name check works (no duplicate warning if new)

**Status:** [ ] Pass [ ] Fail

---

### ✅ Test 2: Image Upload - Click to Upload

**Steps:**
1. On Add Product page
2. Click the upload area
3. Select 1-3 images from your computer
4. Wait for upload to complete

**Expected Result:**
- ✅ File picker opens
- ✅ Images upload successfully
- ✅ Thumbnails appear with file info
- ✅ "Uploaded [filename]" toast appears
- ✅ First image marked as "Primary"

**Status:** [ ] Pass [ ] Fail

---

### ✅ Test 3: Image Upload - Drag & Drop

**Steps:**
1. On Add Product page
2. Drag image files from your file explorer
3. Drop them onto the upload area

**Expected Result:**
- ✅ Upload area highlights on drag over
- ✅ Images upload on drop
- ✅ Thumbnails appear
- ✅ Success toasts show

**Status:** [ ] Pass [ ] Fail

---

### ✅ Test 4: Image Upload - Clipboard Paste

**Steps:**
1. Copy an image to clipboard (Right-click image in browser > Copy)
2. Click on upload area to focus it
3. Press `Ctrl+V` (or `Cmd+V` on Mac)

**Expected Result:**
- ✅ "Paste" button appears when clipboard has image
- ✅ Image uploads from clipboard
- ✅ Success message appears

**Status:** [ ] Pass [ ] Fail

---

### ✅ Test 5: Image Management

**Steps:**
1. Upload 3 images
2. Hover over second image
3. Click star icon to set as primary
4. Hover over first image
5. Click X icon to delete

**Expected Result:**
- ✅ Second image becomes primary (star badge shows)
- ✅ First image gets deleted
- ✅ Image count updates
- ✅ Success toasts appear

**Status:** [ ] Pass [ ] Fail

---

### ✅ Test 6: Format Information Panel

**Steps:**
1. Click "Formats" button
2. Review the information

**Expected Result:**
- ✅ Panel expands with beautiful gradient
- ✅ Shows WebP, PNG, JPEG info
- ✅ Best practices section visible
- ✅ Format cards have hover effects

**Status:** [ ] Pass [ ] Fail

---

### ✅ Test 7: Pricing and Stock

**Steps:**
1. Scroll to Pricing section
2. Enter Cost Price: 800
3. Enter Selling Price: 1200
4. Enter Stock Quantity: 50
5. Enter Min Stock Level: 5

**Expected Result:**
- ✅ All fields accept numbers
- ✅ No validation errors
- ✅ Values update properly

**Status:** [ ] Pass [ ] Fail

---

### ✅ Test 8: Product Specifications

**Steps:**
1. Click "Product Specifications" button
2. Click on "Laptop" or "Smartphone" tab
3. Fill in some specifications (RAM, Storage, etc.)
4. Click "Save"

**Expected Result:**
- ✅ Modal opens with beautiful UI
- ✅ Specifications can be added
- ✅ Current count shows
- ✅ Modal closes on save
- ✅ Specs button shows count badge

**Status:** [ ] Pass [ ] Fail

---

### ✅ Test 9: Product Variants

**Steps:**
1. Toggle "Use Variants" switch ON
2. Click "Add Variant"
3. Enter variant details (name, sku, price, stock)
4. Click save

**Expected Result:**
- ✅ Variants section appears
- ✅ Can add multiple variants
- ✅ Pricing section hides (variants control pricing)
- ✅ Variant data saves properly

**Status:** [ ] Pass [ ] Fail

---

### ✅ Test 10: Storage Location (if enabled)

**Steps:**
1. Scroll to Storage Location section
2. Select a storage room
3. Select a shelf

**Expected Result:**
- ✅ Dropdowns work
- ✅ Selections save
- ✅ No errors

**Status:** [ ] Pass [ ] Fail

---

### ✅ Test 11: Complete Product Creation

**Steps:**
1. Fill all required fields
2. Upload at least one image
3. Add specifications
4. Click "Create Product"

**Expected Result:**
- ✅ Product creates successfully
- ✅ Success modal appears
- ✅ Product appears in inventory list
- ✅ Images are saved
- ✅ All data persists

**Status:** [ ] Pass [ ] Fail

---

### ✅ Test 12: Edit Existing Product

**Steps:**
1. Navigate to inventory list
2. Click on a product
3. Click "Edit" button
4. Modify some fields
5. Click "Update Product"

**Expected Result:**
- ✅ Edit page loads with existing data
- ✅ Images load correctly
- ✅ Can modify all fields
- ✅ Updates save successfully
- ✅ Changes reflect in product list

**Status:** [ ] Pass [ ] Fail

---

### ✅ Test 13: Edit Product - Add More Images

**Steps:**
1. On edit page
2. Add 2 more images to existing product
3. Save

**Expected Result:**
- ✅ New images add to existing ones
- ✅ All images save properly
- ✅ Primary image stays primary

**Status:** [ ] Pass [ ] Fail

---

### ✅ Test 14: Edit Product - Delete Images

**Steps:**
1. On edit page with images
2. Delete one image
3. Save

**Expected Result:**
- ✅ Image deletes from UI
- ✅ Deletion persists after save
- ✅ Product still has remaining images

**Status:** [ ] Pass [ ] Fail

---

### ✅ Test 15: Mobile Responsiveness

**Steps:**
1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select "iPhone 12 Pro" or similar
4. Test add product flow

**Expected Result:**
- ✅ Page layout adapts to mobile
- ✅ All buttons are touch-friendly
- ✅ Forms are usable
- ✅ Images upload works
- ✅ No horizontal scroll

**Status:** [ ] Pass [ ] Fail

---

### ✅ Test 16: Form Validation

**Steps:**
1. Try to submit form without required fields
2. Enter invalid data (negative prices, etc.)
3. Submit

**Expected Result:**
- ✅ Validation errors show
- ✅ Error messages are clear
- ✅ Fields highlight in red
- ✅ Form doesn't submit until fixed

**Status:** [ ] Pass [ ] Fail

---

### ✅ Test 17: Draft Save (if enabled)

**Steps:**
1. Fill in some product fields
2. Wait 2-3 seconds
3. Refresh the page

**Expected Result:**
- ✅ "Saved" indicator appears
- ✅ Data restores on refresh
- ✅ Can clear draft

**Status:** [ ] Pass [ ] Fail

---

### ✅ Test 18: Image Format Support

**Steps:**
1. Try uploading:
   - WebP image
   - PNG image
   - JPEG image

**Expected Result:**
- ✅ All formats upload successfully
- ✅ Thumbnails generate properly
- ✅ File sizes show correctly

**Status:** [ ] Pass [ ] Fail

---

### ✅ Test 19: Maximum Images Limit

**Steps:**
1. Try to upload more than 10 images

**Expected Result:**
- ✅ Error message: "Maximum 10 images allowed"
- ✅ Upload stops at 10
- ✅ Warning message shows

**Status:** [ ] Pass [ ] Fail

---

### ✅ Test 20: Console Errors Check

**Steps:**
1. Open browser console (F12)
2. Perform all above tests
3. Check for errors

**Expected Result:**
- ✅ No 400 errors
- ✅ No 500 errors
- ✅ No JavaScript errors
- ✅ Only info/debug messages

**Status:** [ ] Pass [ ] Fail

---

## Database Verification

### Check Products Table
```sql
-- Run in Supabase SQL Editor
SELECT 
  id,
  name,
  sku,
  condition,
  selling_price,
  cost_price,
  stock_quantity,
  images,
  specification,
  created_at
FROM lats_products
ORDER BY created_at DESC
LIMIT 5;
```

**Expected Result:**
- ✅ Products appear in table
- ✅ All columns populated correctly
- ✅ Images stored as JSONB array
- ✅ Timestamps correct

---

### Check Product Images Table
```sql
-- Run in Supabase SQL Editor
SELECT 
  pi.id,
  pi.product_id,
  pi.image_url,
  pi.file_name,
  pi.is_primary,
  p.name as product_name
FROM product_images pi
JOIN lats_products p ON pi.product_id = p.id
ORDER BY pi.created_at DESC
LIMIT 10;
```

**Expected Result:**
- ✅ Images appear in separate table
- ✅ Linked correctly to products
- ✅ Primary flag set correctly
- ✅ Image URLs valid

---

### Check Product Variants
```sql
-- Run in Supabase SQL Editor
SELECT 
  pv.id,
  pv.name,
  pv.sku,
  pv.selling_price,
  pv.quantity,
  p.name as product_name
FROM lats_product_variants pv
JOIN lats_products p ON pv.product_id = p.id
ORDER BY pv.created_at DESC
LIMIT 10;
```

**Expected Result:**
- ✅ Variants appear if created
- ✅ Linked to correct products
- ✅ Prices and quantities correct

---

## Performance Tests

### Image Upload Speed
- ✅ Single image uploads in < 3 seconds
- ✅ Multiple images upload sequentially
- ✅ Progress indicators show

### Page Load Speed
- ✅ Add product page loads in < 2 seconds
- ✅ Edit product page loads in < 3 seconds
- ✅ Images load progressively

### Form Responsiveness
- ✅ Form inputs respond immediately
- ✅ Validation happens in real-time
- ✅ No lag when typing

---

## Browser Compatibility

Test on:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari
- [ ] Mobile Chrome (Android)
- [ ] Mobile Safari (iOS)

---

## Bug Tracking

### Found Issues
| # | Issue | Severity | Status | Fixed In |
|---|-------|----------|--------|----------|
| 1 |       |          |        |          |
| 2 |       |          |        |          |
| 3 |       |          |        |          |

---

## Test Summary

**Total Tests:** 20
**Passed:** ___
**Failed:** ___
**Skipped:** ___

**Overall Status:** [ ] ✅ Ready for Production [ ] ⚠️ Needs Fixes [ ] ❌ Major Issues

**Tested By:** _______________
**Date:** _______________
**Time Spent:** _______________

---

## Notes

Add any additional observations, issues, or suggestions here:

```
[Your notes here]
```

---

## Sign Off

- [ ] All critical tests passed
- [ ] Database migration applied successfully
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Images uploading and displaying correctly
- [ ] Product creation and editing working
- [ ] Ready for production deployment

**Tester Signature:** _______________
**Date:** _______________

---

## Quick Command Reference

### Clear All Test Data (Development Only!)
```sql
-- ⚠️ WARNING: This deletes all products! Use only in development!
DELETE FROM lats_products WHERE created_at > NOW() - INTERVAL '1 day';
```

### Reset Database (If Needed)
```sql
-- Run the migration again
\i FIX-PRODUCT-PAGES-COMPLETE.sql
```

### Check Supabase Storage
```sql
-- Check if images are in storage
SELECT * FROM storage.objects 
WHERE bucket_id = 'product-images' 
ORDER BY created_at DESC 
LIMIT 10;
```

