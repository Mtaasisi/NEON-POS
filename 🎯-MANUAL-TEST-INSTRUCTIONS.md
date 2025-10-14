# 🎯 MANUAL TEST INSTRUCTIONS FOR BRANCH SYSTEM

## ✅ **SYSTEM VERIFICATION RESULTS**

Your database shows:
- ✅ **3 Branches configured** (Main Store, ARUSHA, Airport Branch)
- ✅ **69 Products** (all shared across branches)
- ✅ **9 Customers** (all shared)
- ✅ **20 Sales** (need branch assignment)
- ✅ **All tables exist** (transfers, assignments, activity log)
- ✅ **Helper functions ready**
- ✅ **Views created**

**Status:** 🟢 **SYSTEM IS READY FOR TESTING**

---

## 🧪 **MANUAL TEST PROCEDURE**

### **STEP 1: LOGIN**
```
1. Open app: http://localhost:3000
2. Login with:
   Email: care@care.com
   Password: 123456
3. Verify: Role shows "Admin" in user menu
```

---

### **STEP 2: FIND BRANCH SELECTOR**

**Location:** Top-right corner of navigation bar

**What to look for:**
```
┌──────────────────┐
│ 🏢 Main Store   ▼│  ← Should have BLUE BORDER
│ 📍 Arusha        │
└──────────────────┘
```

**If you see it:** ✅ PASS - Continue to Step 3  
**If you don't see it:** ❌ FAIL - Check troubleshooting below

---

### **STEP 3: CLICK BRANCH SELECTOR**

**Action:** Click on the branch selector box

**Expected:** Dropdown opens showing:
```
┌─────────────────────────────────┐
│ Switch Branch (3)                │
├─────────────────────────────────┤
│ ✓ Main Store                    │
│   🌐 Shared • Arusha             │
├─────────────────────────────────┤
│ ○ ARUSHA                        │
│   🔒 Isolated • Dar es Salaam   │
├─────────────────────────────────┤
│ ○ Airport Branch                │
│   ⚖️ Hybrid • Arusha             │
├─────────────────────────────────┤
│ 🏢 Manage Stores                │
└─────────────────────────────────┘
```

**If dropdown opens:** ✅ PASS - Continue to Step 4  
**If dropdown doesn't open:** ❌ FAIL - Check browser console for errors

---

### **STEP 4: SWITCH TO AIRPORT BRANCH**

**Action:** Click on "Airport Branch" in the dropdown

**Expected Results:**
1. Toast notification appears: ✅ "Switched to Airport Branch"
2. Dropdown closes automatically
3. Branch selector updates to show:
   ```
   🏢 Airport Branch ▼
   📍 Arusha
   ```

**Check browser console:**
```javascript
// Should see:
🖱️ Branch selector clicked!
🔄 Switched to: Airport Branch
```

**If switch works:** ✅ PASS - Continue to Step 5  
**If switch fails:** ❌ FAIL - Check network tab for errors

---

### **STEP 5: TEST BRANCH PERSISTENCE**

**Action:** Refresh the browser (F5 or Ctrl+R)

**Expected:** Branch selector still shows "Airport Branch" (not reset to Main Store)

**Check localStorage:**
```javascript
// Open console (F12) and run:
localStorage.getItem('current_branch_id')
// Should return a UUID
```

**If persists:** ✅ PASS - Continue to Step 6  
**If resets:** ❌ FAIL - localStorage not saving

---

### **STEP 6: TEST SALES WITH BRANCH**

**Action:** Make a test sale in Airport Branch

**Steps:**
1. Ensure you're on Airport Branch (check selector)
2. Go to: POS System (`/pos`)
3. Add any product to cart
4. Enter customer name
5. Select payment method
6. Click "Complete Sale"

**Verify in Database:**
```sql
-- Check the most recent sale
SELECT 
  ls.id,
  ls.total_amount,
  sl.name as branch_name,
  ls.created_at
FROM lats_sales ls
LEFT JOIN store_locations sl ON ls.branch_id = sl.id
ORDER BY ls.created_at DESC
LIMIT 1;
```

**Expected:** 
- branch_name should be "Airport Branch"
- branch_id should be populated

**If sale has branch:** ✅ PASS - Continue to Step 7  
**If sale has no branch:** ⚠️ PARTIAL - Need to integrate branch API

---

### **STEP 7: TEST DATA ISOLATION**

**Test Isolated Branch (ARUSHA):**

1. Switch to: ARUSHA Branch (🔒 Isolated)
2. Go to: Inventory
3. Note: Product count
4. Switch to: Main Store
5. Go to: Inventory
6. Compare: Should see same products (because existing products are all shared)

**To Really Test Isolation:**
1. Switch to: ARUSHA Branch
2. Add Product: "ARUSHA Exclusive Item"
3. Save product
4. Switch to: Main Store
5. Search for: "ARUSHA Exclusive"
6. Product should NOT appear ❌

**If isolation works:** ✅ PASS - Continue to Step 8  
**If shows everywhere:** ⚠️ Need product API integration

---

### **STEP 8: TEST MANAGE STORES LINK**

**Action:** 
1. Click branch selector
2. Click "🏢 Manage Stores" at bottom

**Expected:**
- Redirects to: `/admin-settings?section=stores`
- Opens Store Management page

**If redirects:** ✅ PASS - Continue to Step 9  
**If doesn't redirect:** ❌ FAIL - Check link href

---

### **STEP 9: ADD NEW BRANCH**

**Action:** Add a branch through UI

**Steps:**
1. In Store Management page
2. Click "+ Add Store"
3. Fill in:
   - Name: "Test Branch"
   - Code: "TEST-001"
   - Address: "Test Street"
   - City: "Mwanza"
4. Choose: ⚖️ Hybrid Model
5. Configure:
   - ✓ Share Products
   - ✗ Share Inventory
6. Click "Create Store"

**Expected:**
- Form doesn't clear while typing ✓
- Shows "Auto-saved" indicator ✓
- Successfully creates store ✓
- New branch appears in selector ✓

**If creates successfully:** ✅ PASS - Continue to Step 10  
**If form clears:** ❌ Already fixed - hard refresh browser

---

### **STEP 10: SWITCH TO NEW BRANCH**

**Action:**
1. Click branch selector
2. Should now show 4 branches
3. Click "Test Branch"
4. Verify switch works

**If all works:** ✅ **ALL TESTS PASS!** 🎉

---

## 🐛 **TROUBLESHOOTING**

### **Branch Selector Not Visible**

**Check 1: User Role**
```javascript
// Console
const user = JSON.parse(localStorage.getItem('user') || '{}');
console.log(user.role); // Should be "admin"
```

**Fix:** Logout and login as admin

**Check 2: Component Imported**
```javascript
// Console
// Look for: SimpleBranchSelector in sources
```

**Fix:** Restart dev server

---

### **Dropdown Not Opening**

**Check Console for:**
```
🖱️ Branch selector clicked!
```

**If missing:** JavaScript error - check console for red errors

**Common Fix:**
- Hard refresh: Ctrl+Shift+R
- Clear cache
- Restart server

---

### **Can't Switch Branches**

**Check Network Tab:**
- Look for failed requests
- Check if branch_activity_log fails (it's OK if it does - non-critical)

**Check Console:**
```
🔄 Switched to: [Branch Name]
```

---

### **Sales Not Tagged to Branch**

**This is expected!** Current implementation needs:
1. Integration of `branchAwareApi.ts`
2. Update POS components to use it

**Quick Fix SQL** (assign existing sales to Main Store):
```sql
UPDATE lats_sales 
SET branch_id = (SELECT id FROM store_locations WHERE is_main = true LIMIT 1)
WHERE branch_id IS NULL;
```

---

## 📊 **TEST RESULTS CHECKLIST**

```
FUNCTIONALITY TESTS:
[ ] Branch selector visible (top-right)
[ ] Branch selector clickable
[ ] Dropdown opens (shows 3 branches)
[ ] Can switch to Airport Branch
[ ] Toast shows "Switched to..."
[ ] Selector updates to show new branch
[ ] Branch persists after refresh
[ ] Can switch to ARUSHA Branch
[ ] Can switch back to Main Store
[ ] All 3 branches switchable

UI/UX TESTS:
[ ] Selector has blue border
[ ] Hover shows shadow effect
[ ] Dropdown shows all branch info
[ ] Shows isolation mode icons
[ ] Shows city names
[ ] "Manage Stores" link works

STORE MANAGEMENT TESTS:
[ ] Can open Store Management
[ ] Can view existing stores
[ ] Can click "Add Store"
[ ] Form doesn't clear while typing
[ ] Shows "Auto-saved" indicator
[ ] Can choose data isolation mode
[ ] Can configure sharing (Hybrid)
[ ] Can save new store
[ ] New store appears in selector

OVERALL STATUS:
[ ] ALL TESTS PASS ✅
[ ] SOME TESTS FAIL ⚠️ (list which ones)
[ ] MAJOR ISSUES ❌ (describe)
```

---

## 🎯 **CRITICAL ISSUES FOUND**

From verification:
1. ⚠️ **Existing 20 sales have no branch assignment**
   - Fix: Run update query above
   - Or: They'll be filtered out until assigned

2. ⚠️ **Products/Sales not auto-filtering by branch yet**
   - Fix: Need to integrate `branchAwareApi.ts`
   - Or: Manual integration in product/sales queries

---

## 🚀 **AFTER TESTING**

### **If All UI Tests Pass:**
✅ Branch selector is working perfectly!

### **Next Integration Steps:**
1. Integrate `branchAwareApi.ts` in product queries
2. Update POS to tag sales with branch
3. Update reports to filter by branch
4. Add transfer UI

### **If Tests Fail:**
Send me:
1. Which tests failed
2. Browser console errors
3. Network tab errors
4. Screenshots if possible

---

## 🎊 **EXPECTED FINAL STATE**

After all tests:
- ✅ Can see branch selector
- ✅ Can switch between 3+ branches
- ✅ Selector updates correctly
- ✅ Persistence works
- ✅ Can manage stores
- ✅ Can add new branches

---

**START TESTING NOW!** Open your app and follow the steps above! 🧪✨

**Report back with your test results checklist!**

