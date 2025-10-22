# Installments Branch ID Fix - Complete Solution

## Problem Identified
Installment plans you created were not showing up because:
1. **Missing `branch_id` on creation** - When installments were created, the `branch_id` was not being saved
2. **Branch filtering on fetch** - When fetching installments, the system filters by `branch_id`
3. **Result:** Created installments had NULL `branch_id`, so they didn't match the branch filter

## Solution Implemented

### 1. Updated Service Layer
**File:** `src/lib/installmentService.ts`

✅ **Added `branchId` parameter** to `createInstallmentPlan()` method:
```typescript
async createInstallmentPlan(
  input: CreateInstallmentPlanInput,
  userId: string,
  branchId?: string  // ← NEW PARAMETER
)
```

✅ **Include `branch_id` in plan data**:
```typescript
const planData = {
  // ... other fields
  branch_id: branchId  // ← NOW SAVED
};
```

### 2. Updated InstallmentsPage
**File:** `src/features/installments/pages/InstallmentsPage.tsx`

✅ **Pass `currentBranch.id`** when creating plans:
```typescript
const result = await installmentService.createInstallmentPlan(
  formData as CreateInstallmentPlanInput,
  currentUser?.id,
  currentBranch?.id  // ← BRANCH ID PASSED
);
```

### 3. Updated POS Installment Modal
**File:** `src/features/lats/components/pos/POSInstallmentModal.tsx`

✅ **Import and use BranchContext**:
```typescript
import { useBranch } from '../../../../context/BranchContext';

const { currentBranch } = useBranch();
```

✅ **Pass `currentBranch.id`** when creating plans from POS:
```typescript
const installmentResult = await installmentService.createInstallmentPlan(
  installmentData,
  currentUser.id,
  currentBranch?.id  // ← BRANCH ID PASSED
);
```

## Database Migration

### For Existing Installments
Run the migration script to fix existing installments that have NULL `branch_id`:

```bash
# Using the migration file
psql -h your-host -U your-user -d your-database -f migrations/fix_installments_branch_id.sql
```

Or run directly in Supabase SQL Editor:
```sql
-- Update all installments with NULL branch_id to use the first branch
UPDATE customer_installment_plans
SET branch_id = (
  SELECT id FROM branches ORDER BY created_at ASC LIMIT 1
)
WHERE branch_id IS NULL;
```

## Testing Steps

### 1. Verify the Fix
1. **Login:** `care@care.com` / `123456`
2. **Navigate to:** Installments page (should now be visible in sidebar)
3. **Check:** Can you see existing installments?

### 2. Create New Installment
1. **Go to:** Installments page
2. **Click:** "Create Installment Plan"
3. **Fill form** and submit
4. **Verify:** New installment appears immediately in the list

### 3. Create from POS
1. **Go to:** POS page
2. **Add items** to cart and select customer
3. **Click:** "Installment Plan" payment option
4. **Fill form** and complete sale
5. **Go to:** Installments page
6. **Verify:** New installment appears in the list

## Verification Query
Run this in Supabase SQL Editor to check:

```sql
-- Check installments by branch
SELECT 
  branch_id,
  COUNT(*) as total_plans,
  SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_plans,
  SUM(total_amount) as total_value
FROM customer_installment_plans
GROUP BY branch_id;

-- List all installments with customer names
SELECT 
  cip.plan_number,
  c.name as customer_name,
  cip.total_amount,
  cip.status,
  cip.branch_id,
  cip.created_at
FROM customer_installment_plans cip
LEFT JOIN customers c ON c.id = cip.customer_id
ORDER BY cip.created_at DESC
LIMIT 20;
```

## Files Modified

1. ✅ `src/lib/installmentService.ts` - Added branch_id parameter and field
2. ✅ `src/features/installments/pages/InstallmentsPage.tsx` - Pass branch_id
3. ✅ `src/features/lats/components/pos/POSInstallmentModal.tsx` - Added BranchContext, pass branch_id
4. ✅ `src/App.tsx` - Added customer-care role to routes (previous fix)
5. ✅ `src/layout/AppLayout.tsx` - Added customer-care role to navigation (previous fix)

## Expected Behavior After Fix

### Before:
- ❌ Installments created but not visible
- ❌ Empty list even with data in database
- ❌ branch_id = NULL for created plans

### After:
- ✅ Installments visible immediately after creation
- ✅ All installments filtered by current branch
- ✅ branch_id properly set on new plans
- ✅ Existing plans updated via migration

## Status
- ✅ **Code Fixed** - All files updated
- ✅ **No Linter Errors**
- ⏳ **Database Migration** - Run SQL script
- ⏳ **Manual Testing** - Verify in browser

---

**Date:** October 22, 2025
**Fixed By:** AI Assistant
**Issue Type:** Data Persistence & Filtering

