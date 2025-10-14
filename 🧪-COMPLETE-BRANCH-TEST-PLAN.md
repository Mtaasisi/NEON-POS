# 🧪 COMPLETE BRANCH SYSTEM TEST PLAN

## 🎯 **TEST AS: care@care.com (Admin)**

**Login Credentials:**
- Email: `care@care.com`
- Password: `123456`
- Role: Admin

---

## ✅ **PRE-TEST CHECKLIST**

Before starting tests:

- [ ] Dev server is running (`npm run dev`)
- [ ] Database migrations completed
- [ ] Browser cache cleared (Ctrl+Shift+R)
- [ ] Logged in as `care@care.com`
- [ ] Verified role is "admin" (check top-right user menu)

---

## 🧪 **TEST 1: BRANCH SELECTOR VISIBILITY**

### **Expected:** Branch selector appears in top-right

#### **Steps:**
1. Login as `care@care.com` / `123456`
2. Look at top navigation bar (top-right area)
3. Look for component with 🏢 icon

#### **What to Look For:**
```
┌──────────────────┐
│ 🏢 Main Store   ▼│  ← Should be visible
│ 📍 Arusha        │
└──────────────────┘
```

#### **Success Criteria:**
- ✅ Component is visible
- ✅ Has blue border
- ✅ Shows building icon (🏢)
- ✅ Shows current branch name
- ✅ Shows dropdown arrow (▼)

#### **If Not Visible:**
```javascript
// Open browser console (F12)
// Check for errors:
console.log('User role:', localStorage.getItem('user'));

// Should show role: "admin"
// If not admin, branch selector won't show
```

---

## 🧪 **TEST 2: BRANCH SELECTOR CLICKABLE**

### **Expected:** Clicking opens dropdown with 3 branches

#### **Steps:**
1. Click the branch selector (🏢 Main Store ▼)
2. Dropdown should open

#### **What to Look For:**
```
Dropdown Opens:
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

#### **Success Criteria:**
- ✅ Dropdown opens on click
- ✅ Shows 3 branches
- ✅ Current branch has checkmark (✓)
- ✅ Each branch shows icon (🌐/🔒/⚖️)
- ✅ Shows city name
- ✅ "Manage Stores" link at bottom

#### **If Doesn't Open:**
```javascript
// Check browser console
// Should see: "🖱️ Branch selector clicked!"
// If not, there's a JavaScript error
```

---

## 🧪 **TEST 3: SWITCH TO DIFFERENT BRANCH**

### **Expected:** Can switch branches and see confirmation

#### **Steps:**
1. Click branch selector
2. Click "Airport Branch"
3. Wait for response

#### **What to Look For:**
```
✅ Toast appears: "Switched to Airport Branch"
🔄 Selector updates to show "Airport Branch"
📍 City updates to show correct city
```

#### **Success Criteria:**
- ✅ Toast notification appears
- ✅ Selector text changes to "Airport Branch"
- ✅ Dropdown closes automatically
- ✅ Console shows: "🔄 Switched to: Airport Branch"

#### **localStorage Check:**
```javascript
// In browser console:
localStorage.getItem('current_branch_id')
// Should return branch UUID
```

---

## 🧪 **TEST 4: BRANCH-SPECIFIC SALES**

### **Expected:** Sales record to current branch

#### **Steps:**
1. Switch to: "Airport Branch"
2. Go to: POS System (`/pos`)
3. Add product to cart
4. Complete a sale
5. Check database

#### **Verification Query:**
```sql
psql 'your-connection' -c "
SELECT 
  sl.name as branch_name,
  COUNT(ls.id) as sales_count
FROM lats_sales ls
LEFT JOIN store_locations sl ON ls.branch_id = sl.id
GROUP BY sl.name
ORDER BY sales_count DESC;
"
```

#### **Success Criteria:**
- ✅ Sale completes successfully
- ✅ Sale appears in database
- ✅ `branch_id` column populated with Airport Branch ID
- ✅ Can query sales by branch

---

## 🧪 **TEST 5: DATA ISOLATION MODES**

### **Test 5A: Shared Mode (Main Store)**

#### **Steps:**
1. Switch to: Main Store (🌐 Shared)
2. Go to: Inventory
3. Note products count
4. Switch to: Airport Branch (⚖️ Hybrid - products shared)
5. Go to: Inventory
6. Compare products count

#### **Expected Result:**
```
Main Store: 50 products
Airport Branch: 50 products (same products)
```

#### **Success Criteria:**
- ✅ Same products visible in both branches
- ✅ Product count is identical

---

### **Test 5B: Isolated Mode (ARUSHA)**

#### **Steps:**
1. Switch to: ARUSHA Branch (🔒 Isolated)
2. Go to: Inventory → Add Product
3. Create: "ARUSHA Exclusive Item"
4. Save product
5. Switch to: Main Store
6. Go to: Inventory
7. Search for: "ARUSHA Exclusive"

#### **Expected Result:**
```
ARUSHA Branch: Product visible ✅
Main Store: Product NOT visible ❌
Airport Branch: Product NOT visible ❌
```

#### **Success Criteria:**
- ✅ Product only shows in ARUSHA branch
- ✅ Product has `branch_id` = ARUSHA branch ID
- ✅ Product has `is_shared` = false

---

### **Test 5C: Hybrid Mode (Airport Branch)**

#### **Steps:**
1. Check Airport Branch settings (Settings → Store Management)
2. Verify configuration:
   - share_products: true ✓
   - share_customers: true ✓
   - share_inventory: false ✗

3. Switch to: Airport Branch
4. Go to: Inventory
5. Check product list

#### **Expected Result:**
```
Products: All shared products visible ✅
Inventory Levels: Only Airport Branch stock ⚠️
```

---

## 🧪 **TEST 6: STOCK TRANSFERS**

### **Expected:** Can transfer stock between branches

#### **Steps:**
1. Switch to: Main Store
2. Check: iPhone 15 stock = 50 units
3. Go to: Create Transfer
4. From: Main Store
5. To: Airport Branch
6. Product: iPhone 15
7. Quantity: 10 units
8. Submit

#### **Verification:**
```sql
-- Check transfer was created
SELECT 
  from_branch.name as from_branch,
  to_branch.name as to_branch,
  entity_type,
  quantity,
  status
FROM branch_transfers bt
JOIN store_locations from_branch ON bt.from_branch_id = from_branch.id
JOIN store_locations to_branch ON bt.to_branch_id = to_branch.id
ORDER BY created_at DESC
LIMIT 5;
```

#### **Success Criteria:**
- ✅ Transfer request created
- ✅ Status = 'pending'
- ✅ Shows in transfers table
- ✅ Can approve transfer

---

## 🧪 **TEST 7: BRANCH-FILTERED REPORTS**

### **Expected:** Reports show branch-specific data

#### **Steps:**
1. Switch to: Main Store
2. Go to: Sales Reports
3. Note: Total sales amount
4. Switch to: Airport Branch
5. Go to: Sales Reports  
6. Note: Total sales amount

#### **Expected Result:**
```
Main Store Sales: $X (all Main Store sales)
Airport Branch Sales: $Y (only Airport sales)
X ≠ Y (different amounts)
```

#### **Success Criteria:**
- ✅ Different sales amounts per branch
- ✅ Each branch shows own sales only
- ✅ Reports respect branch filter

---

## 🧪 **TEST 8: MANAGE STORES LINK**

### **Expected:** Can access Store Management from dropdown

#### **Steps:**
1. Click branch selector
2. Scroll to bottom of dropdown
3. Click "🏢 Manage Stores"

#### **Expected Result:**
```
Redirects to: /admin-settings?section=stores
Page loads: Store Management settings
```

#### **Success Criteria:**
- ✅ Redirect works
- ✅ Settings page opens
- ✅ Shows Store Management section
- ✅ Can add/edit stores

---

## 🧪 **TEST 9: ADD NEW BRANCH VIA UI**

### **Expected:** Can add branch through Settings

#### **Steps:**
1. Go to: Settings → Store Management
2. Click: "+ Add Store"
3. Fill in:
   - Name: "Test Branch"
   - Code: "TEST-001"
   - City: "Mwanza"
4. Choose: ⚖️ Hybrid Model
5. Configure sharing:
   - ✓ Share Products
   - ✓ Share Customers
   - ✗ Share Inventory
6. Click: "Create Store"

#### **Success Criteria:**
- ✅ Form doesn't clear while typing
- ✅ Can select data isolation mode
- ✅ Can configure sharing (if Hybrid)
- ✅ Store saves successfully
- ✅ Appears in branch selector
- ✅ Can switch to it

---

## 🧪 **TEST 10: BRANCH PERSISTENCE**

### **Expected:** Selected branch persists across page refreshes

#### **Steps:**
1. Switch to: Airport Branch
2. Refresh browser (F5)
3. Check branch selector

#### **Expected Result:**
```
Still shows: 🏢 Airport Branch ▼
(Not reset to Main Store)
```

#### **Success Criteria:**
- ✅ Branch selection persists
- ✅ localStorage has `current_branch_id`
- ✅ Doesn't reset to Main Store

---

## 🐛 **COMMON ISSUES & FIXES**

### **Issue 1: Branch Selector Not Showing**

**Check:**
```javascript
// Browser console
const user = JSON.parse(localStorage.getItem('user') || '{}');
console.log('Role:', user.role);
```

**Fix:**
- Must be logged in as admin
- Role must be "admin" (not "customer-care")

---

### **Issue 2: Dropdown Not Opening**

**Check:**
```javascript
// Browser console - should see when clicking:
🖱️ Branch selector clicked!
```

**Fix:**
- If no log appears, there's a JavaScript error
- Check console for red errors
- Restart dev server

---

### **Issue 3: No Branches in Dropdown**

**Check Database:**
```sql
SELECT name, is_active FROM store_locations;
```

**Fix:**
- Ensure at least one store exists
- Ensure `is_active = true`
- Run: `CREATE-NEW-SETTINGS-TABLES.sql`

---

### **Issue 4: Can't Switch Branches**

**Check:**
```javascript
// Browser console
// Should see on click:
✅ Switched to [Branch Name]
```

**Fix:**
- Check network tab for errors
- Verify branch ID is valid
- Check `store_locations` table exists

---

### **Issue 5: Form Auto-Clears**

**Fix Applied:**
- Added auto-save draft feature
- Form data persists in localStorage
- Won't clear while typing

**Verify:**
```
Type in form → Check bottom:
"Form Status: Editing [Your Text]"
```

---

## 📊 **DATABASE VERIFICATION QUERIES**

### **Query 1: Check Branches**
```sql
SELECT 
  name,
  code,
  city,
  is_active,
  data_isolation_mode,
  share_products,
  share_inventory
FROM store_locations
ORDER BY is_main DESC;
```

### **Query 2: Check Products with Branch**
```sql
SELECT 
  p.name,
  p.branch_id,
  p.is_shared,
  sl.name as branch_name
FROM lats_products p
LEFT JOIN store_locations sl ON p.branch_id = sl.id
LIMIT 10;
```

### **Query 3: Check Sales by Branch**
```sql
SELECT 
  sl.name as branch,
  COUNT(ls.id) as sales_count,
  SUM(ls.total_amount) as total_revenue
FROM lats_sales ls
LEFT JOIN store_locations sl ON ls.branch_id = sl.id
GROUP BY sl.name;
```

---

## 🎯 **FULL TEST SEQUENCE**

Execute in order:

1. ✅ Test 1: Visibility
2. ✅ Test 2: Clickable
3. ✅ Test 3: Switch Branches
4. ✅ Test 4: Branch Sales
5. ✅ Test 5: Data Isolation
6. ✅ Test 6: Stock Transfers
7. ✅ Test 7: Reports
8. ✅ Test 8: Manage Link
9. ✅ Test 9: Add Branch
10. ✅ Test 10: Persistence

---

## 📝 **TEST RESULTS LOG**

Use this to track your results:

```
Test 1 - Visibility:         [ ] PASS [ ] FAIL
Test 2 - Clickable:          [ ] PASS [ ] FAIL
Test 3 - Switch:             [ ] PASS [ ] FAIL
Test 4 - Sales:              [ ] PASS [ ] FAIL
Test 5A - Shared:            [ ] PASS [ ] FAIL
Test 5B - Isolated:          [ ] PASS [ ] FAIL
Test 5C - Hybrid:            [ ] PASS [ ] FAIL
Test 6 - Transfers:          [ ] PASS [ ] FAIL
Test 7 - Reports:            [ ] PASS [ ] FAIL
Test 8 - Manage Link:        [ ] PASS [ ] FAIL
Test 9 - Add Branch:         [ ] PASS [ ] FAIL
Test 10 - Persistence:       [ ] PASS [ ] FAIL

Overall Status:  [ ] ALL PASS [ ] NEEDS FIXES
```

---

## 🔧 **QUICK FIXES**

### **If Branch Selector Not Showing:**
```typescript
// Temporarily in TopBar.tsx, add:
<div className="p-2 bg-red-500 text-white">
  DEBUG: Role = {currentUser?.role}
</div>
<SimpleBranchSelector />
```

### **If Products Don't Filter:**
```typescript
// Need to integrate branchAwareApi.ts
// Import and use getBranchProducts() instead of direct query
```

### **If Form Clears:**
```
Already fixed with:
- Auto-save draft
- Independent form state
- Stable state management
```

---

## 📞 **REPORT RESULTS**

After testing, provide:

1. **Which tests passed** ✅
2. **Which tests failed** ❌
3. **Error messages** (from console)
4. **Screenshots** (if possible)
5. **Database query results**

I'll fix any issues immediately!

---

## 🎊 **EXPECTED OUTCOME**

If all tests pass:
- ✅ Branch selector visible and working
- ✅ Can switch between 3 branches
- ✅ Sales record to correct branch
- ✅ Data isolation modes work correctly
- ✅ Can add/edit branches
- ✅ Branch selection persists

---

**Start testing now and let me know the results!** 🚀

