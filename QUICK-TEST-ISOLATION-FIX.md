# 🚀 Quick Test Guide - Store Isolation Fix

## ✅ What Was Fixed

**Problem:** Isolated stores were still seeing products from other stores.

**Solution:** Updated the product query filter to respect the store's `data_isolation_mode` setting.

---

## 🎯 Quick Test (2 minutes)

### Step 1: Refresh Your Browser
The fix has been applied. Just refresh your browser:
- **Windows/Linux:** `Ctrl + R` or `F5`
- **Mac:** `Cmd + R`

### Step 2: Login
- **URL:** http://localhost:5173
- **Email:** care@care.com
- **Password:** 123456

### Step 3: Check Console Logs
Open DevTools (F12) and look for these messages:

#### ✅ GOOD - Isolated Store
```
🔒 ISOLATED MODE ACTIVE!
Filter: branch_id = [some-id]
Result: ONLY products created in this store will be shown
```

#### ✅ GOOD - Shared Store
```
🌐 SHARED MODE ACTIVE!
Filter: None
Result: ALL products from ALL stores will be shown
```

### Step 4: Test by Switching Stores
1. Go to **Products** page
2. Note the number of products
3. **Switch to a different store** (use branch selector)
4. Check if product count changes appropriately

---

## 🧪 Detailed Testing

### Option 1: Use Interactive Test Page
```bash
# Open the test page in your browser
open TEST-ISOLATION-FIX.html
```

Click "Run All Tests" and it will:
- ✅ Check all store isolation settings
- ✅ Test product filtering
- ✅ Identify any issues

### Option 2: Run Automated Test
```bash
# Run the automated browser test
node test-store-isolation.mjs
```

This will:
- Login automatically
- Check store settings
- Test product queries
- Generate a detailed report

---

## 🔧 Fix Database Settings (If Needed)

If you have stores with incorrect isolation settings, run:

```bash
# Apply the database fix
psql "$DATABASE_URL" -f FIX-STORE-ISOLATION-SETTINGS.sql
```

This will:
- Find stores with conflicting settings
- Fix isolated stores (set all share_* to false)
- Fix shared stores (set all share_* to true)
- Generate a detailed report

---

## 🎨 What You Should See

### Isolated Store Behavior
- **Before Fix:** 🔴 Shows products from all stores
- **After Fix:** 🟢 Shows only products from current store

### Shared Store Behavior
- **Before Fix:** 🟢 Shows products from all stores
- **After Fix:** 🟢 Shows products from all stores (unchanged)

### Hybrid Store Behavior
- **Products Shared:** Shows all products
- **Products Isolated:** Shows only own products

---

## 📊 Expected Results

### Test 1: Isolated Store
```
Store: ARUSHA Branch
Mode: isolated
Products: 12 (only from ARUSHA)
✅ PASS: Filtering working correctly
```

### Test 2: Shared Store
```
Store: Main Store
Mode: shared
Products: 87 (from all stores)
✅ PASS: No filter applied (correct)
```

### Test 3: Switch Between Stores
```
ARUSHA (isolated) → 12 products
Main Store (shared) → 87 products
ARUSHA (isolated) → 12 products
✅ PASS: Filtering works when switching
```

---

## ❓ Troubleshooting

### Issue: "Still seeing products from other stores"

**Solution 1:** Clear browser cache
```javascript
// In browser console (F12)
localStorage.clear();
location.reload();
```

**Solution 2:** Run database fix
```bash
psql "$DATABASE_URL" -f FIX-STORE-ISOLATION-SETTINGS.sql
```

**Solution 3:** Check console logs
- Look for "🔒 STORE ISOLATION CHECK"
- Verify the correct mode is shown
- Check which filter is being applied

### Issue: "No products showing at all"

**Cause:** Store is in isolated mode but has no products yet.

**Solution:** Either:
1. Create products in this store, OR
2. Temporarily switch store to "shared" mode to see all products

### Issue: "Console shows errors"

**Check:**
1. Is the dev server running?
2. Is `VITE_DATABASE_URL` set in `.env`?
3. Are you logged in?
4. Is a branch/store selected?

---

## 📝 Quick Commands

```bash
# Start dev server (if not running)
npm run dev

# Run automated test
node test-store-isolation.mjs

# Open interactive test page
open TEST-ISOLATION-FIX.html

# Apply database fix
psql "$DATABASE_URL" -f FIX-STORE-ISOLATION-SETTINGS.sql

# Check linter
npm run lint
```

---

## ✨ What Changed

### Files Modified
1. **src/lib/latsProductApi.ts** - Fixed product query filter
2. **src/lib/branchAwareApi.improved.ts** - New isolation API (optional)

### What the Fix Does
```javascript
// Before: Always showed shared products
query.or('sharing_mode.eq.shared,branch_id.eq.X')

// After: Respects store isolation mode
if (store.data_isolation_mode === 'isolated') {
  query.eq('branch_id', currentBranchId)  // Only this store
} else {
  // No filter - show all
}
```

---

## 🎯 Success Criteria

### ✅ Fix is Working If:
- [ ] Isolated stores only show their own products
- [ ] Shared stores show all products
- [ ] Hybrid stores respect individual flags
- [ ] Console logs show correct isolation mode
- [ ] Switching stores updates product list correctly

### ❌ Fix is NOT Working If:
- [ ] Isolated stores still show all products
- [ ] Console shows no isolation messages
- [ ] Switching stores doesn't change product list
- [ ] Database settings are incorrect

---

## 📞 Need Help?

### Check These Files:
1. **STORE-ISOLATION-FIX-COMPLETE.md** - Full documentation
2. **Console logs** (F12) - Detailed debug output
3. **TEST-ISOLATION-FIX.html** - Interactive testing

### Debug Steps:
1. Open DevTools Console (F12)
2. Filter logs by "isolation" or "branch"
3. Check which mode is detected
4. Verify filter clause being used

---

## 🎉 Summary

✅ **Dev server is running** (localhost:5173)
✅ **Code fix is applied** (hot-reloaded automatically)
✅ **Test tools are ready** (test scripts + HTML page)
✅ **Database fix script available** (if needed)

**Just refresh your browser and test!** 🚀

---

*Test Date: October 13, 2025*
*Status: Ready for Testing*

