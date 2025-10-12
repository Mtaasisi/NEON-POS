# 🧪 Business Logo & Info - Testing Guide

## Quick Test (5 minutes)

Follow these steps to test the new feature:

---

## ✅ Test 1: Check Default State

**What to check:** App shows defaults when no logo uploaded

### Steps:
1. Open your app
2. Look at the **sidebar** (left side)
3. You should see:
   - Default smartphone icon 📱 OR your logo if already uploaded
   - Business name (default: "My Store")
   - Business address (if set)

### Expected Result:
```
✅ Sidebar visible
✅ Icon/logo displayed
✅ Business name shown
✅ No errors in console
```

---

## ✅ Test 2: Upload Business Logo

**What to check:** Logo upload and display works

### Steps:
1. Click **Settings** in sidebar
2. Click **General Settings** tab
3. Find the **"Business Logo"** section
4. Click **"Upload Logo"** button
5. Choose an image file (PNG, JPG, max 2MB)
6. Wait for upload confirmation
7. Click **"Save Settings"** button
8. Check the **sidebar** - your logo should appear!

### Expected Result:
```
✅ Upload button works
✅ Preview shows before saving
✅ "Save Settings" completes successfully
✅ Sidebar updates with YOUR logo
✅ Logo is clear and visible
```

### If it doesn't work:
- Check browser console for errors
- Verify image is under 2MB
- Try PNG format instead of JPG
- Clear browser cache and refresh

---

## ✅ Test 3: Update Business Information

**What to check:** Business info saves and displays

### Steps:
1. In **General Settings**, fill in:
   - Business Name: "Your Store Name"
   - Business Address: "123 Main St, Your City"
   - Business Phone: "+255 123 456 789"
   - Business Email: "info@yourstore.com"
   - Business Website: "www.yourstore.com"

2. Click **"Save Settings"**
3. Check the **sidebar**
4. Business name should update
5. Business address should show below name

### Expected Result:
```
✅ All fields save successfully
✅ Sidebar shows YOUR business name
✅ Sidebar shows YOUR address
✅ No default text remains
```

---

## ✅ Test 4: Verify on Receipt

**What to check:** Logo and info appear on receipts

### Steps:
1. Go to **Settings → Receipt Settings**
2. Scroll to **Receipt Preview**
3. Check that your logo appears at the top
4. Check that your business name appears
5. Check that your contact info appears
6. Make a test sale (if possible)
7. Print/preview the receipt
8. Verify logo and info are there

### Expected Result:
```
✅ Logo on receipt preview
✅ Business name on receipt
✅ Contact info on receipt
✅ Receipt looks professional
```

---

## ✅ Test 5: Cache & Auto-Update

**What to check:** Changes propagate automatically

### Steps:
1. In Settings, change business name to "New Name"
2. Click "Save Settings"
3. WITHOUT refreshing, check sidebar
4. Name should update automatically
5. Now refresh the page (F5)
6. Name should persist (not reset)

### Expected Result:
```
✅ Auto-update works (no refresh needed)
✅ Changes persist after refresh
✅ Cache works correctly
```

---

## ✅ Test 6: Mobile Responsiveness

**What to check:** Works on mobile/small screens

### Steps:
1. Resize browser to mobile size (< 768px)
2. OR open on mobile device
3. Check sidebar (tap menu icon ☰)
4. Logo should be visible (smaller size)
5. Business name should be visible

### Expected Result:
```
✅ Logo scales to mobile size
✅ Text readable on mobile
✅ Sidebar collapsible works
✅ No layout issues
```

---

## ✅ Test 7: Remove Logo

**What to check:** Can remove logo and revert to default

### Steps:
1. Go to **Settings → General Settings**
2. Find your uploaded logo
3. Click the **X** (remove) button
4. Click **"Save Settings"**
5. Check sidebar - should show default icon
6. Upload logo again
7. Should work as before

### Expected Result:
```
✅ Remove button works
✅ Reverts to default icon
✅ Can re-upload after removal
✅ No errors
```

---

## 🔍 Database Verification

Run these SQL queries in your Neon console:

### Check if logo is uploaded:
```sql
SELECT 
  business_name,
  CASE 
    WHEN business_logo IS NOT NULL AND business_logo != '' 
    THEN '✅ Logo uploaded' 
    ELSE '❌ No logo' 
  END as logo_status
FROM lats_pos_general_settings
LIMIT 1;
```

### See full business info:
```sql
SELECT 
  business_name,
  business_address,
  business_phone,
  business_email,
  business_website,
  LEFT(business_logo, 50) as logo_preview
FROM lats_pos_general_settings
ORDER BY updated_at DESC
LIMIT 1;
```

### Verify logo format:
```sql
SELECT 
  business_name,
  CASE 
    WHEN business_logo LIKE 'data:image/%' 
    THEN '✅ Valid base64'
    ELSE '⚠️ Invalid format'
  END as format_check,
  LENGTH(business_logo) as logo_size_chars
FROM lats_pos_general_settings
WHERE business_logo IS NOT NULL;
```

---

## 🐛 Common Issues & Fixes

### Issue 1: Logo doesn't appear after upload
**Fix:**
```
1. Check browser console for errors
2. Verify file size < 2MB
3. Try PNG format
4. Clear browser cache (Ctrl+Shift+R)
5. Log out and log back in
```

### Issue 2: Logo is blurry or pixelated
**Fix:**
```
1. Use higher resolution image (512x512px)
2. Use PNG instead of JPG
3. Ensure image is square
4. Reduce file size by optimizing image
```

### Issue 3: Business name doesn't update
**Fix:**
```
1. Ensure you clicked "Save Settings"
2. Check for error messages
3. Verify database updated (run SQL above)
4. Clear browser cache
5. Check browser console for errors
```

### Issue 4: Changes don't persist
**Fix:**
```
1. Verify you're logged in
2. Check database permissions
3. Run verification SQL
4. Check for RLS policy issues
```

### Issue 5: Logo shows on settings but not sidebar
**Fix:**
```
1. Hard refresh (Ctrl+Shift+R)
2. Clear cache
3. Check if businessInfo is loading
4. Open browser console, check for errors
5. Verify useBusinessInfo hook is working
```

---

## 🎯 Test Checklist

Mark off as you complete:

### Basic Functionality
- [ ] Default state shows correctly
- [ ] Can upload logo
- [ ] Logo appears in sidebar
- [ ] Can update business name
- [ ] Business name appears in sidebar
- [ ] Can add business address
- [ ] Address appears in sidebar
- [ ] "Save Settings" works
- [ ] Changes persist after refresh

### Advanced Features
- [ ] Logo shows on receipts
- [ ] Auto-update works (no refresh needed)
- [ ] Can remove logo
- [ ] Can re-upload logo
- [ ] Mobile responsive
- [ ] Database stores data correctly
- [ ] Cache works properly
- [ ] No errors in console

### Edge Cases
- [ ] Very large images (close to 2MB)
- [ ] Very long business names
- [ ] Special characters in name
- [ ] Empty fields (optional fields)
- [ ] Multiple users (if applicable)
- [ ] Logout/login persists data

---

## 📊 Performance Tests

### Load Time:
- Sidebar should load in < 1 second
- Logo should appear immediately
- No flickering or layout shifts

### Cache Efficiency:
- First load: Fetches from database
- Subsequent loads: Uses cached data
- Cache expires after 5 minutes
- Auto-refresh on settings update

---

## ✅ Success Criteria

**All tests pass when:**

1. ✅ Logo uploads successfully
2. ✅ Logo appears in sidebar
3. ✅ Business name displays correctly
4. ✅ Business address displays correctly
5. ✅ Logo appears on receipts
6. ✅ Changes persist after refresh
7. ✅ Auto-update works
8. ✅ Mobile responsive
9. ✅ No console errors
10. ✅ Database stores correctly

---

## 📝 Bug Report Template

If you find issues, use this template:

```
🐛 Bug Report

**Issue:** [Describe the problem]

**Steps to Reproduce:**
1. Go to...
2. Click on...
3. See error...

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Screenshots:**
[If applicable]

**Console Errors:**
[Copy from browser console]

**Browser:**
[Chrome, Firefox, Safari, etc.]

**Database Check:**
[Result of VERIFY-BUSINESS-INFO.sql]
```

---

## 🎓 For Developers

### Check Hook Integration:
```typescript
// In any component
import { useBusinessInfo } from '@/hooks/useBusinessInfo';

function TestComponent() {
  const { businessInfo, loading, error } = useBusinessInfo();
  
  console.log('Business Info:', businessInfo);
  console.log('Loading:', loading);
  console.log('Error:', error);
  
  return <div>{JSON.stringify(businessInfo, null, 2)}</div>;
}
```

### Verify Service:
```typescript
// In browser console
import { businessInfoService } from './lib/businessInfoService';

const info = await businessInfoService.getBusinessInfo();
console.log(info);
```

### Force Cache Clear:
```typescript
// In browser console
businessInfoService.clearCache();
window.location.reload();
```

---

## 📚 Documentation

**Full guides:**
- Setup Guide: `🎨-BUSINESS-LOGO-SETUP-GUIDE.md`
- Visual Comparison: `🎨-BEFORE-AFTER-VISUAL.md`
- Changes Summary: `✅-CHANGES-SUMMARY.md`
- SQL Verification: `VERIFY-BUSINESS-INFO.sql`

---

**Happy Testing! 🧪✨**

If all tests pass, your business branding is working perfectly!

