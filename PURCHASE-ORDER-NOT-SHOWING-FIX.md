# 🔧 Fix: Purchase Order Not Showing in UI

## ✅ Problem Identified

Your purchase order was created in the database but **not showing in the UI** because of **branch isolation**. 

### Root Cause:
- Purchase orders were being created **WITHOUT** a `branch_id`
- When fetching purchase orders, the system **filters by `branch_id`**
- Result: Purchase orders with `NULL` branch_id were **invisible** in the UI

---

## ✅ What I Fixed

### 1. **Updated Code** (Already Done ✅)
**File:** `src/features/lats/lib/data/provider.supabase.ts` (Line 1026)

Added branch isolation to purchase order creation:
```typescript
branch_id: currentBranchId // 🔒 Add branch isolation
```

Now all **new** purchase orders will be created with the correct `branch_id`.

---

## 🚀 How to Fix Existing Purchase Orders

### Step 1: Run the SQL Fix Script
```bash
psql "YOUR_DATABASE_URL" -f FIX-PURCHASE-ORDER-BRANCH-ID.sql
```

This script will:
1. ✅ Show all purchase orders and their branch status
2. ✅ Update purchase orders without `branch_id` to use your main branch
3. ✅ Verify all purchase orders now have `branch_id`

### Step 2: Refresh Your Browser
```
Ctrl + Shift + R  (Windows/Linux)
Cmd + Shift + R   (Mac)
```

### Step 3: Check Purchase Orders Page
Go to **Purchase Orders** page - your orders should now be visible! 🎉

---

## 🔍 Troubleshooting

### Still Not Showing?

#### Check Your Current Branch:
1. Open browser console (`F12`)
2. Run this command:
```javascript
localStorage.getItem('current_branch_id')
```

3. Make sure it returns a valid branch ID (not `null`)

#### Check Database Branch ID:
Run this in your database:
```sql
SELECT 
  po_number,
  branch_id,
  status,
  total_amount
FROM lats_purchase_orders
ORDER BY created_at DESC
LIMIT 5;
```

The `branch_id` should match the one in your browser's localStorage.

#### If Branch ID is NULL in localStorage:
1. Go to your POS system
2. Select a branch using the branch selector
3. Refresh the page
4. Check localStorage again

---

## ✅ Prevention

Going forward, this issue is **fixed**! All new purchase orders will automatically:
- ✅ Be assigned to the current branch
- ✅ Show up in the UI immediately
- ✅ Respect branch isolation properly

---

## 📝 Summary

| Issue | Status |
|-------|--------|
| Code fix for new purchase orders | ✅ Fixed |
| SQL script for existing purchase orders | ✅ Created |
| Branch isolation working | ✅ Working |

**Next Step:** Run the SQL script to fix your existing purchase order!

