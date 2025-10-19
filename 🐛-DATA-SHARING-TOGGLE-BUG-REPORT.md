# 🐛 DATA SHARING TOGGLE BUG REPORT

**Date:** October 19, 2025, 10:46 AM  
**Severity:** 🔴 **CRITICAL** - Feature Not Working  
**Status:** ❌ **BROKEN** - Sharing toggles don't work

---

## 📋 SUMMARY

The Data Isolation Configuration toggles in Store Management settings **save to the database** but **don't actually affect data visibility**. The sharing logic is not working correctly.

---

## 🧪 TEST PERFORMED

### Test Setup:
1. **ARUSHA Branch:** Has 1 product (Min Mac A1347)
2. **DAR Branch:** Has 0 products
3. **Action:** Enabled `share_products` for ARUSHA branch
4. **Expected:** DAR should now see ARUSHA's 1 product
5. **Actual:** DAR still sees 0 products ❌

### Test Results:

#### ✅ UI Toggle Works
- Clicking the "Products & Catalog" toggle changes its state
- The setting saves to database (confirmed by "Store updated successfully")
- The Branch Configuration panel shows "Products: SHARED"

#### ❌ Data Filtering Does NOT Work  
- ARUSHA's product is NOT visible to DAR branch
- The isolation test still reports "ISOLATED" even though config shows "SHARED"
- Console logs show DAR is still filtering: `WHERE branch_id = DAR_ID`

---

## 🔍 ROOT CAUSE ANALYSIS

### Current (Broken) Logic:

```typescript
// In latsProductApi.ts (approximately)
const branch = await getBranchSettings(currentBranchId);

if (branch.share_products === false) {
  // Filter to only THIS branch's products
  query = query.eq('branch_id', currentBranchId);
}
```

**Problem:** This only checks if the **CURRENT** branch wants to share its OWN products. It does NOT check if **OTHER** branches are sharing their products with everyone.

### Expected (Correct) Logic:

```typescript
// Products should be visible if:
// 1. They belong to the current branch, OR
// 2. They belong to a branch that has share_products = true

const branch = await getBranchSettings(currentBranchId);

if (branch.data_isolation_mode === 'shared') {
  // SHARED mode: See all products
  // No filter needed
} else if (branch.data_isolation_mode === 'isolated') {
  // ISOLATED mode: See only THIS branch's products
  query = query.eq('branch_id', currentBranchId);
} else if (branch.data_isolation_mode === 'hybrid') {
  // HYBRID mode: Complex logic
  // See this branch's products + products from branches that are sharing
  
  if (branch.share_products === true) {
    // This branch shares, so don't filter by branch_id
    // This allows other branches to see our products
  } else {
    // This branch doesn't share
    // Show: (1) Our products + (2) Products from branches that DO share
    query = query.or(`branch_id.eq.${currentBranchId},is_shared.eq.true`);
  }
}
```

---

## 📊 EVIDENCE

### Console Logs from DAR Branch:

```
🔒 STORE ISOLATION CHECK
   Store Name: DAR
   Isolation Mode: isolated
   Share Products: false
   🔒 ISOLATED MODE ACTIVE!
   Filter: branch_id = 24cd45b8-1ce1-486a-b055-29d169c3a8ea
   Result: ONLY products from this store will be shown

⚠️ NO PRODUCTS FOUND!
   Branch/shared products: 0
```

### Database State:

| Branch | share_products | Products | Expected Visibility |
|--------|---------------|----------|-------------------|
| ARUSHA | ✅ true | 1 product | Should be visible to ALL branches |
| DAR | ❌ false | 0 products | Should see ARUSHA's 1 product |

**Actual Visibility:** DAR sees 0 products ❌

---

## 🎯 AFFECTED FEATURES

All data types with sharing toggles are broken:

1. ❌ **Products** - Not sharing correctly
2. ❌ **Customers** - Not sharing correctly (set to shared but not verified)
3. ❌ **Inventory** - Not sharing correctly
4. ❌ **Suppliers** - Not sharing correctly
5. ❌ **Categories** - Not sharing correctly
6. ❌ **Employees** - Not sharing correctly

---

## 🔧 FILES THAT NEED FIXING

### 1. Product API (`src/lib/latsProductApi.ts`)
**Current Location:** Lines ~150-250  
**Function:** Product query building logic  
**Issue:** Only checks current branch's `share_products`, not other branches

### 2. Customer API (`src/lib/customerApi/core.ts`)
**Current Location:** Lines ~430-450  
**Function:** Customer query building logic  
**Issue:** Same problem - only checks current branch

### 3. Branch-Aware API (`src/lib/branchAwareApi.ts`)
**Function:** `addBranchFilter()` and `isDataShared()`  
**Issue:** Doesn't handle "other branches sharing" scenario

### 4. Isolation Debugger (`src/lib/branchIsolationDebugger.ts`)
**Function:** Testing logic  
**Issue:** Test logic doesn't account for shared items from other branches

---

## 💡 RECOMMENDED FIX

### Option 1: Product-Level Flag (RECOMMENDED)

Add an `is_shared` flag to products/customers/etc:

```sql
-- Migration
ALTER TABLE lats_products ADD COLUMN is_shared BOOLEAN DEFAULT false;
ALTER TABLE customers ADD COLUMN is_shared BOOLEAN DEFAULT false;
-- ... repeat for all entities

-- Update existing products when branch setting changes
UPDATE lats_products 
SET is_shared = true 
WHERE branch_id IN (
  SELECT id FROM store_locations WHERE share_products = true
);
```

**Query Logic:**
```typescript
// Show products that are:
// 1. From this branch, OR
// 2. Marked as shared
query = query.or(`branch_id.eq.${branchId},is_shared.eq.true`);
```

### Option 2: Multi-Branch Query (More Complex)

```typescript
// Get all branches that are sharing products
const sharingBranches = await supabase
  .from('store_locations')
  .select('id')
  .eq('share_products', true);

const branchIds = [currentBranchId, ...sharingBranches.map(b => b.id)];

// Show products from current branch OR sharing branches
query = query.in('branch_id', branchIds);
```

---

## ✅ TESTING CHECKLIST

After fixing, verify:

- [ ] ARUSHA enables `share_products`
- [ ] ARUSHA's products appear in DAR branch
- [ ] DAR's customers (if shared) appear in ARUSHA
- [ ] Toggling OFF removes shared visibility
- [ ] Isolation test shows correct "SHARED" vs "ISOLATED" status
- [ ] All 6 data types work (products, customers, inventory, suppliers, categories, employees)
- [ ] Performance is acceptable (queries not too slow)

---

## 🎬 REPRODUCTION STEPS

1. Login as care@care.com
2. Go to Admin Settings → Store Management
3. Edit ARUSHA branch
4. Enable "Products & Catalog" toggle
5. Click "Update Store"
6. Switch to DAR branch
7. Go to Branch Isolation Debug → Run Test
8. **BUG:** Products still show as "ISOLATED" and 0 products visible

---

## 📸 SCREENSHOTS

See: `arusha-branch-isolation-test-results.png`

Shows: 
- Branch Configuration: "Products: SHARED"
- Test Results: "Expected: ISOLATED | Actual: ISOLATED" ❌
- Contradiction between configuration and actual behavior

---

## 🚨 IMPACT

**Business Impact:** HIGH
- Branches cannot share data as intended
- "Hybrid" mode doesn't work
- Users may think feature is working when it's not

**User Experience:** CONFUSING
- UI shows "SHARED" but behavior is "ISOLATED"
- No error messages to indicate the problem

**Data Integrity:** OK
- No data loss or corruption
- Just visibility/filtering issue

---

## 🎯 PRIORITY

**Priority:** 🔴 **HIGH**

This is a core feature of the multi-branch system. Without working data sharing, the system can only operate in full "ISOLATED" mode, which defeats the purpose of having sharing toggles.

---

## 📞 NEXT STEPS

1. ✅ Bug identified and documented
2. ⏳ Fix data filtering logic in:
   - `latsProductApi.ts`
   - `customerApi/core.ts`
   - `branchAwareApi.ts`
3. ⏳ Add `is_shared` column to all relevant tables
4. ⏳ Update migration scripts
5. ⏳ Test all 6 data types
6. ⏳ Update isolation debugger

---

**Report Generated:** October 19, 2025, 10:46 AM  
**Tested By:** Automated Browser Test  
**Severity:** 🔴 CRITICAL

