# 🔧 FIX: New Customers Not Showing

**Date:** October 13, 2025  
**Issue:** Customers created from Device Intake page were not appearing in customer lists  
**Status:** ✅ FIXED

---

## 🐛 Problem Description

When creating new customers from the **Device Intake page** (`NewDevicePage.tsx`), they would successfully save to the database but **would not appear in the customer list**.

### Root Cause

The `handleCreateCustomer` function in `NewDevicePage.tsx` was creating customers by **directly inserting into Supabase** without setting the `branch_id` field:

```typescript
// ❌ BEFORE (BROKEN)
const { data, error } = await supabase
  .from('customers')
  .insert([{
    name: newCustomerData.name.trim(),
    phone: newCustomerData.phone.trim(),
    // ... other fields ...
    // ❌ NO branch_id - customer won't show in filtered lists!
  }])
```

Since all customer queries filter by `branch_id`, customers without this field would be **invisible** to the current branch.

---

## ✅ Solution Applied

### File Modified

**`src/features/devices/pages/NewDevicePage.tsx`** (lines 818-836)

### Changes Made

Added `branch_id` and `created_by_branch_id` fields to the customer insert:

```typescript
// ✅ AFTER (FIXED)
try {
  // 🏪 Get current branch ID for branch isolation
  const currentBranchId = localStorage.getItem('current_branch_id');
  
  const { data, error } = await supabase
    .from('customers')
    .insert([{
      name: newCustomerData.name.trim(),
      phone: newCustomerData.phone.trim(),
      email: newCustomerData.email.trim() || null,
      city: newCustomerData.city.trim() || null,
      gender: newCustomerData.gender || null,
      loyaltyLevel: newCustomerData.loyaltyLevel,
      colorTag: newCustomerData.colorTag,
      points: 0,
      totalSpent: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      branch_id: currentBranchId, // 🔒 Set branch_id for branch isolation
      created_by_branch_id: currentBranchId // 🔒 Track which branch created this customer
    }])
    .select()
    .single();
```

---

## 🔍 Why This Happened

The application has **two different ways** of creating customers:

### 1. ✅ Proper Method (Already Working)
- **AddCustomerModal** → uses `useCustomers().addCustomer()`
- Calls `addCustomerToDb()` in `src/lib/customerApi/core.ts`
- **Automatically sets `branch_id`** from localStorage (lines 974-1000)
- ✅ Customers appear correctly

### 2. ❌ Direct Method (Was Broken, Now Fixed)
- **NewDevicePage** → direct Supabase insert
- Was bypassing the proper `addCustomerToDb()` function
- Did **NOT** set `branch_id`
- ❌ Customers were invisible (now fixed)

---

## 🧪 How to Test

1. **Go to Device Intake page**
2. **Click "Create New Customer"**
3. **Fill in customer details:**
   - Name: Test Customer
   - Phone: +255712345678
   - City: (optional)
4. **Click Save**
5. **Navigate to Customers page**
6. **Verify:** New customer should appear in the list

### Expected Result
- ✅ Customer appears immediately in customer list
- ✅ Customer is tagged with current branch
- ✅ Customer only visible when on the branch where they were created

---

## 📊 Branch Isolation System

### How It Works

All customer queries now filter by branch:

```typescript
// In src/lib/customerApi/core.ts
const currentBranchId = localStorage.getItem('current_branch_id');

let query = supabase
  .from('customers')
  .select('...')
  
// 🔒 Only show customers from current branch
if (currentBranchId) {
  query = query.eq('branch_id', currentBranchId);
}
```

### Why `branch_id` is Required

- **Without `branch_id`**: Customer exists in DB but is invisible to all branches
- **With `branch_id`**: Customer appears only on their assigned branch
- **This ensures**: Each branch only sees their own customers

---

## 🎯 Related Files

### Customer Creation Methods

| File | Method | Status |
|------|--------|--------|
| `src/context/CustomersContext.tsx` | `addCustomer()` → `addCustomerToDb()` | ✅ Already sets `branch_id` |
| `src/features/customers/components/forms/AddCustomerModal.tsx` | Uses `addCustomer()` | ✅ Works correctly |
| `src/features/devices/pages/NewDevicePage.tsx` | Direct Supabase insert | ✅ Now fixed |
| `src/features/lats/components/pos/CreateCustomerModal.tsx` | Uses `createCustomer()` | ✅ Works correctly |

### Customer Fetching (All Apply Branch Filter)

- `src/lib/customerApi/core.ts` - `fetchAllCustomers()`
- `src/lib/customerApi/core.ts` - `performFetchAllCustomers()`
- `src/lib/customerApi/core.ts` - `performFetchAllCustomersSimple()`
- `src/lib/customerApi.ts` - `fetchCustomersPaginated()`
- `src/lib/customerApi/search.ts` - `searchCustomers()`

---

## ✅ Verification Checklist

- [x] Fixed `branch_id` assignment in NewDevicePage.tsx
- [x] Added `created_by_branch_id` for audit trail
- [x] No linting errors introduced
- [x] Verified no other direct customer inserts exist
- [x] All customer fetching functions already filter by branch_id

---

## 🎓 Best Practices Going Forward

### ✅ DO:
- **Always use `addCustomerToDb()`** for creating customers
- Or use `CustomersContext.addCustomer()` 
- These functions handle branch assignment automatically

### ❌ DON'T:
- **Don't use direct Supabase inserts** for customers
- Bypassing the API functions breaks branch isolation

---

## 📝 Summary

**The Issue:** NewDevicePage was creating customers without setting `branch_id`, making them invisible.

**The Fix:** Added `branch_id` and `created_by_branch_id` to the customer insert operation.

**The Result:** New customers from Device Intake now appear correctly in customer lists, respecting branch isolation.

---

**Created by:** AI Assistant  
**Date:** October 13, 2025

