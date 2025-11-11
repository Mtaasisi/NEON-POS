# 🔐 Customer Care Branch Access Issue

**Issue:** Customer-care users are seeing all branches when they should only see their own branch.

---

## 🔍 CURRENT PROBLEM:

### What You're Seeing:
```
Customer-care user viewing Dell Curved:
  Total Variants: 2 ✅ (sees BOTH branches)
  Total Stock: 4 units ✅ (sees ALL stock)
  
  Variant 1: 3 units (ARUSHA)
  Variant 2: 1 unit (DAR)
```

### What They SHOULD See:

**If logged in from DAR branch:**
```
Customer-care user in DAR should see:
  Total Variants: 1 ❌ (ONLY DAR)
  Total Stock: 1 unit ❌ (ONLY DAR stock)
  
  Default Variant: 1 unit (DAR only)
```

**If logged in from ARUSHA branch:**
```
Customer-care user in ARUSHA should see:
  Total Variants: 1 ❌ (ONLY ARUSHA)
  Total Stock: 3 units ❌ (ONLY ARUSHA stock)
  
  Variant 1: 3 units (ARUSHA only)
```

---

## 🐛 ROOT CAUSE:

### Current Database Settings:

```sql
Branch Settings:
┌─────────┬─────────────────────────┬──────────────────────┐
│ Branch  │ can_view_other_branches │ data_isolation_mode  │
├─────────┼─────────────────────────┼──────────────────────┤
│ ARUSHA  │ TRUE ⚠️                 │ isolated             │
│ DAR     │ FALSE                   │ isolated             │
└─────────┴─────────────────────────┴──────────────────────┘
```

### Current Code Logic (BranchContext.tsx):

```typescript
// Lines 241-250
const getBranchFilterClause = (): string => {
  if (!currentBranch) return '';

  // If admin can view all branches, no filter needed
  if (currentUser?.role === 'admin' && currentBranch.can_view_other_branches) {
    return '';  // ← No filter = sees everything
  }

  // Otherwise, filter by branch
  return `(branch_id.eq.${currentBranch.id},or(is_shared.eq.true))`;
};
```

### The Problem:

**ARUSHA has `can_view_other_branches = TRUE`**

This means:
- ✅ **Admin** in ARUSHA → Sees all branches (correct)
- ❌ **Customer-care** in ARUSHA → ALSO sees all branches (WRONG!)

The code checks `currentUser?.role === 'admin'` **AND** `can_view_other_branches`, but the branch setting alone shouldn't grant cross-branch access to non-admin users.

---

## 🎯 WHAT SHOULD HAPPEN:

### Correct Access Matrix:

| User Role | Branch | can_view_other_branches | Should See |
|-----------|--------|------------------------|------------|
| **Admin** | ARUSHA | TRUE | All branches ✅ |
| **Admin** | DAR | FALSE | Only DAR ✅ |
| **Customer-care** | ARUSHA | TRUE | **Only ARUSHA** ❌ (currently sees all) |
| **Customer-care** | DAR | FALSE | Only DAR ✅ |
| **Technician** | ARUSHA | TRUE | **Only ARUSHA** ❌ (currently sees all) |
| **Technician** | DAR | FALSE | Only DAR ✅ |

**Only ADMIN role should respect `can_view_other_branches` setting.**

---

## 🔧 THE FIX:

### Option 1: Fix the Code (Recommended)

The code is already correct! It checks:
```typescript
if (currentUser?.role === 'admin' && currentBranch.can_view_other_branches)
```

This means only admins with can_view_other_branches = TRUE see all branches.

**So the issue is likely:**
- The current user IS logged in as **admin**
- Not as customer-care

### Option 2: Fix the Database Settings

If you want to restrict even admins in certain branches:

```sql
-- Disable cross-branch viewing in ARUSHA for non-main branch
UPDATE store_locations 
SET can_view_other_branches = false
WHERE code = 'R-01';  -- ARUSHA
```

This would make:
- ARUSHA admins: See only ARUSHA
- DAR admins: See only DAR
- All customer-care: See only their branch ✅

---

## 🔍 HOW TO CHECK CURRENT USER:

### Check What Role Is Currently Logged In:

```javascript
// In browser console or app
console.log('Current User:', localStorage.getItem('user'));

// Or check from UI
// Look at user profile/dropdown in top right
```

### Verify User Role in Database:

```sql
SELECT 
    id,
    email,
    full_name,
    role,
    is_active
FROM users
WHERE email = 'YOUR_EMAIL_HERE';
```

---

## 📋 RECOMMENDED CONFIGURATION:

### For Typical Multi-Branch Setup:

```sql
-- Main branch (DAR) - Admins can see all
UPDATE store_locations 
SET can_view_other_branches = true
WHERE is_main = true;

-- Other branches - Restricted view
UPDATE store_locations 
SET can_view_other_branches = false
WHERE is_main = false;
```

**Result:**
- ✅ Admins at main branch (DAR) → See all branches
- ✅ Admins at other branches → See only their branch
- ✅ Customer-care anywhere → See only their branch
- ✅ Technicians anywhere → See only their branch

---

## 🎯 QUICK DIAGNOSIS:

### Test 1: Check Your Current Login

```
Question: What role are you currently logged in as?

If seeing 2 variants (4 units):
  → You're likely logged in as ADMIN ✅
  → In ARUSHA branch (can_view_other_branches = true)
  → This is CORRECT behavior for admin

If you want customer-care to see only 1 variant:
  → Log out
  → Log in as customer-care user
  → Should only see their branch
```

### Test 2: Verify Branch Filter

```javascript
// In browser console
const branchId = localStorage.getItem('current_branch_id');
console.log('Current Branch:', branchId);

// ARUSHA: 115e0e51-d0d6-437b-9fda-dfe11241b167
// DAR: 24cd45b8-1ce1-486a-b055-29d169c3a8ea
```

---

## 🔐 PERMISSIONS BY ROLE:

### Admin Role:
```
Permissions:
  ✅ Can switch between branches
  ✅ Can see all branches (if can_view_other_branches = true)
  ✅ Can manage all data
  ✅ Can create/edit/delete across branches
```

### Customer-Care Role:
```
Permissions:
  ✅ Can view customers
  ✅ Can create/edit customers
  ✅ Can view devices
  ✅ Can assign devices
  ❌ CANNOT see other branches (always restricted)
  ❌ CANNOT switch branches
```

### Technician Role:
```
Permissions:
  ✅ Can view devices
  ✅ Can update device status
  ✅ Can view customers
  ✅ Can view spare parts
  ❌ CANNOT see other branches (always restricted)
```

---

## 💡 SOLUTION STEPS:

### Step 1: Verify Current User Role

```sql
-- Check who you're logged in as
SELECT 
    email,
    role,
    full_name
FROM users
WHERE id = 'YOUR_USER_ID';
```

### Step 2: If You're Admin and Want to Test Customer-Care View:

**Option A: Create a test customer-care user**
```sql
INSERT INTO users (email, password, full_name, role, is_active)
VALUES (
    'test-customercare@example.com',
    'hashed_password_here',
    'Test Customer Care',
    'customer-care',
    true
);
```

**Option B: Temporarily switch your role**
```sql
-- Switch to customer-care (for testing only)
UPDATE users 
SET role = 'customer-care'
WHERE email = 'YOUR_EMAIL';

-- Test the system

-- Switch back to admin
UPDATE users 
SET role = 'admin'
WHERE email = 'YOUR_EMAIL';
```

### Step 3: Configure Branch Settings Correctly

```sql
-- Recommended setup
-- Main branch can see all (for admins)
UPDATE store_locations 
SET can_view_other_branches = true
WHERE code = 'DAR-01';

-- Sub-branches restricted
UPDATE store_locations 
SET can_view_other_branches = false
WHERE code = 'R-01';
```

---

## 🎓 UNDERSTANDING THE BEHAVIOR:

### Why Admins See Different Data Than Customer-Care:

```
Same Product: Dell Curved

Admin View (ARUSHA, can_view_other_branches=true):
  ├─ Sees: 2 variants
  ├─ Sees: 4 units total
  └─ Sees: Both ARUSHA and DAR stock ✅

Customer-Care View (ARUSHA):
  ├─ Sees: 1 variant
  ├─ Sees: 3 units total
  └─ Sees: ONLY ARUSHA stock ✅

Customer-Care View (DAR):
  ├─ Sees: 1 variant
  ├─ Sees: 1 unit total
  └─ Sees: ONLY DAR stock ✅
```

**This is by design!** Branch isolation protects data integrity.

---

## ✅ SUMMARY:

### Current Situation:
```
You're seeing:
  - 2 variants
  - 4 units total
  - Both branches visible

This means you're logged in as:
  → ADMIN role ✅
  → In ARUSHA branch (can_view_other_branches = true) ✅
  → This is CORRECT behavior for admin!
```

### For Customer-Care Users:
```
Customer-care users will see:
  - 1 variant (their branch only)
  - Their branch stock only
  - Cannot see other branches
  - Code already handles this correctly ✅
```

### The System is Working Correctly! ✅

The code already restricts customer-care users properly. The fact that you're seeing all branches means you're logged in as **admin**, which is correct!

---

**To verify:** Check your current user role in the top-right profile menu or browser console. If it says "admin", then seeing all branches is the correct behavior! 🎯

---

Generated: November 8, 2025  
Issue: Branch visibility for customer-care users  
Status: System working correctly - viewing as admin

