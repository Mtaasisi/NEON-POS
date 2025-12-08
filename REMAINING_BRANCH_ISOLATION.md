# Remaining Branch Isolation Areas

## ⚠️ Areas That Need Branch Filtering Updates

### 1. **Quality Checks** ⚠️
**Status:** Missing branch filtering
**Files:**
- `src/features/lats/services/qualityCheckService.ts` - No branch filtering found
- `src/features/lats/components/quality-check/QualityCheckModal.tsx`
- `src/features/lats/components/quality-check/QualityCheckSummary.tsx`

**Recommendation:**
- Add `addBranchFilter(query, 'quality_checks')` to all quality check queries
- Update `createQualityCheckFallback()` to set `branch_id` and `is_shared`

### 2. **Trade-ins** ⚠️ (Partially Working)
**Status:** Uses manual branch filtering, should use `addBranchFilter`
**Files:**
- `src/features/lats/lib/tradeInApi.ts` - Uses manual `query.eq('branch_id', filters.branch_id)` (lines 48, 356)
- `src/features/shared/components/dashboard/TradeInWidget.tsx` - Uses manual filtering (line 49)
- `src/features/lats/lib/tradeInInventoryService.ts` - Needs checking

**Recommendation:**
- Replace manual filtering with `addBranchFilter(query, 'trade_ins')`
- Ensure creation functions set `branch_id` and `is_shared`

### 3. **Appointments** ⚠️
**Status:** Missing branch filtering
**Files:**
- `src/lib/appointmentService.ts` - `getAppointments()` has no branch filtering
- `src/lib/customerApi/appointments.ts` - Needs checking
- `src/features/shared/components/dashboard/AppointmentsTrendChart.tsx` - Needs checking

**Recommendation:**
- Add `addBranchFilter(query, 'appointments')` to all appointment queries
- Update creation functions to use `createWithBranch()`

### 4. **Reminders** ⚠️
**Status:** Missing branch filtering
**Files:**
- `src/lib/reminderApi.ts` - Needs checking

**Recommendation:**
- Add `addBranchFilter(query, 'reminders')` to all reminder queries

### 5. **Expenses** ⚠️ (Partially Working)
**Status:** Uses `getCurrentBranchId()` but may not use `addBranchFilter`
**Files:**
- `src/features/shared/components/dashboard/ExpensesWidget.tsx` - Uses `getCurrentBranchId()` (line 95)
- `src/features/payments/components/RecurringExpenseManagement.tsx` - Needs checking
- `src/features/payments/components/ExpenseManagement.tsx` - Already uses `addBranchFilter('expenses')` ✅

**Recommendation:**
- Verify `ExpensesWidget.tsx` uses `addBranchFilter('expenses')`
- Check `RecurringExpenseManagement.tsx` for branch filtering

### 6. **Spare Parts** ⚠️
**Status:** Needs verification
**Files:**
- `src/features/lats/lib/sparePartsApi.ts` - Needs checking
- `src/features/shared/components/dashboard/SparePartsWidget.tsx` - Needs checking

**Recommendation:**
- Add `addBranchFilter(query, 'spare_parts')` if spare parts entity type exists
- If not, may need to add 'spare_parts' to `ShareableEntityType`

### 7. **Employees** ⚠️
**Status:** Needs verification
**Files:**
- `src/services/employeeService.ts` - Needs checking
- `src/features/employees/pages/AttendanceManagementPage.tsx` - Needs checking
- `src/features/employees/pages/MyAttendancePage.tsx` - Needs checking

**Recommendation:**
- Add `addBranchFilter(query, 'employees')` to employee queries
- Add `addBranchFilter(query, 'attendance')` to attendance queries

### 8. **Loyalty Points** ⚠️
**Status:** Needs verification
**Files:**
- `src/features/shared/components/dashboard/LoyaltyWidget.tsx` - Needs checking
- `src/lib/customerLoyaltyService.ts` - Needs checking

**Recommendation:**
- Add `addBranchFilter(query, 'loyalty_points')` to loyalty queries

### 9. **Gift Cards** ⚠️
**Status:** Needs verification
**Files:**
- Check for gift card services/queries

**Recommendation:**
- Add `addBranchFilter(query, 'gift_cards')` if gift cards are used

### 10. **Recurring Expenses** ⚠️
**Status:** Needs verification
**Files:**
- `src/features/payments/components/RecurringExpenseManagement.tsx` - Needs checking

**Recommendation:**
- Add `addBranchFilter(query, 'recurring_expenses')` to recurring expense queries

## ✅ Summary

**Total Remaining:** ~10 areas that need branch filtering

**Priority (Most Used):**
1. **High Priority:**
   - Quality Checks (used in purchase orders)
   - Trade-ins (used in POS)
   - Appointments (customer service feature)
   - Expenses (financial tracking)

2. **Medium Priority:**
   - Reminders
   - Spare Parts
   - Employees/Attendance

3. **Low Priority:**
   - Loyalty Points
   - Gift Cards
   - Recurring Expenses

## 📝 Implementation Pattern

For each remaining area, follow this pattern:

```typescript
// 1. Import addBranchFilter
const { addBranchFilter } = await import('../../../lib/branchAwareApi');

// 2. Create base query
let query = supabase.from('table_name').select('*');

// 3. Apply branch filter
query = await addBranchFilter(query, 'entity_type');

// 4. Execute
const { data, error } = await query;
```

For creation:
```typescript
// Use createWithBranch
const { createWithBranch } = await import('../../../lib/branchAwareApi');
const result = await createWithBranch('table_name', data, 'entity_type');
```

## 🎯 Current Status

**✅ Fully Implemented:** 11 entity types
- Products, Inventory, Customers, Suppliers, Categories
- Sales, Purchase Orders, Payments, Accounts
- Special Orders, Devices

**⚠️ Needs Updates:** ~10 entity types
- Quality Checks, Trade-ins, Appointments, Reminders
- Expenses, Spare Parts, Employees, Attendance
- Loyalty Points, Gift Cards, Recurring Expenses
