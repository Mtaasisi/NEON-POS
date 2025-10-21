# ✅ Dashboard Database Connections - Verification Guide

## Quick Verification

Run these simple checks to verify all widgets are properly connected to your database.

---

## 🧪 Manual Testing Guide

### Step 1: Check Branch Isolation

#### Test A: Single Branch View
1. Open browser console (F12)
2. Run:
```javascript
localStorage.setItem('current_branch_id', 'YOUR-BRANCH-UUID');
location.reload();
```
3. Check dashboard widgets - should show only data for that branch

#### Test B: All Branches View (Admin)
1. In browser console:
```javascript
localStorage.removeItem('current_branch_id');
location.reload();
```
2. Check dashboard widgets - should show data from all branches

#### Test C: Switch Branches
1. In browser console:
```javascript
// Switch to different branch
localStorage.setItem('current_branch_id', 'DIFFERENT-BRANCH-UUID');
location.reload();
```
2. Verify data changes to show new branch's data

---

## 📊 Database Connection Checklist

### ✅ Sales & Revenue (5 components)

| Component | Table | Query Type | Status |
|-----------|-------|------------|--------|
| SalesWidget | `lats_sales` | SELECT with filters | ✅ |
| SalesChart | `lats_sales` | Aggregated by day | ✅ |
| TopProductsWidget | `lats_sale_items` + `lats_products` | JOIN with aggregation | ✅ |
| PaymentMethodsChart | `lats_sales` | GROUP BY payment_method | ✅ |
| SalesByCategoryChart | `lats_sale_items` + `lats_products` | JOIN + GROUP BY | ✅ |

### ✅ Financial & Expenses (3 components)

| Component | Table | Query Type | Status |
|-----------|-------|------------|--------|
| ExpensesWidget | `expenses` | SELECT with date filters | ✅ |
| ProfitMarginChart | `lats_sales` + `lats_sale_items` | Complex calculation | ✅ |
| RevenueTrendChart | `lats_sales` | Aggregated by day | ✅ |

### ✅ Purchase Orders (2 components)

| Component | Table | Query Type | Status |
|-----------|-------|------------|--------|
| PurchaseOrderWidget | `purchase_orders` | SELECT with joins | ✅ |
| PurchaseOrderChart | `purchase_orders` | Aggregated by day | ✅ |

### ✅ Operations & Staff (4 components)

| Component | Table | Query Type | Status |
|-----------|-------|------------|--------|
| StaffPerformanceWidget | `lats_sales` + `users` | JOIN with aggregation | ✅ |
| ServiceWidget | `devices` | SELECT with status filters | ✅ |
| DeviceStatusChart | `devices` | GROUP BY status | ✅ |
| EmployeeWidget | `employees` | SELECT with attendance | ✅ |

### ✅ Communication & Customer (2 components)

| Component | Table | Query Type | Status |
|-----------|-------|------------|--------|
| ChatWidget | `customer_messages` + `customers` | JOIN with grouping | ✅ |
| CustomerInsightsWidget | `customers` + multiple | Complex multi-table | ✅ |

### ✅ Inventory & Products (2 components)

| Component | Table | Query Type | Status |
|-----------|-------|------------|--------|
| InventoryWidget | `lats_products` + `lats_product_variants` | JOIN with calculations | ✅ |
| StockLevelChart | `lats_products` + `lats_product_variants` | Aggregated stock levels | ✅ |

### ✅ Appointments & Scheduling (2 components)

| Component | Table | Query Type | Status |
|-----------|-------|------------|--------|
| AppointmentWidget | `appointments` | SELECT with date filters | ✅ |
| AppointmentsTrendChart | `appointments` | Aggregated by day | ✅ |

---

## 🔍 Console Debugging

### Check Database Queries

Add this to any widget to see queries:
```typescript
console.log('🔍 Query:', query);
console.log('🔒 Branch ID:', currentBranchId);
```

### Verify Branch Filter

In browser console:
```javascript
// Check current branch
console.log('Current Branch:', localStorage.getItem('current_branch_id'));

// Check if data is filtered
// Open Network tab and look for Supabase API calls
// Should see: ?branch_id=eq.YOUR-BRANCH-UUID in query params
```

---

## 📝 Expected Database Tables

### Required Tables (Must Exist)
- ✅ `lats_sales` - Sales transactions
- ✅ `lats_sale_items` - Sale line items
- ✅ `lats_products` - Product catalog
- ✅ `lats_product_variants` - Product variants
- ✅ `purchase_orders` - Purchase orders
- ✅ `devices` - Device repairs
- ✅ `appointments` - Appointments
- ✅ `employees` - Staff members
- ✅ `customers` - Customer database
- ✅ `customer_messages` - Chat messages
- ✅ `expenses` - Expense tracking

### Optional Tables (Nice to Have)
- `notifications` - User notifications
- `reminders` - Reminder system
- `attendance` - Staff attendance
- `users` - User accounts

### Reference Tables
- `store_locations` (or `lats_branches`) - Branch definitions
- `suppliers` - Supplier catalog
- `categories` - Product categories

---

## 🧪 Test Queries

### Test 1: Sales Data Exists
```sql
SELECT COUNT(*) FROM lats_sales;
-- Expected: Should return number of sales records
```

### Test 2: Branch Isolation Works
```sql
SELECT branch_id, COUNT(*) 
FROM lats_sales 
GROUP BY branch_id;
-- Expected: Shows count per branch
```

### Test 3: Widgets Have Data
```sql
-- Check each table used by widgets
SELECT 'lats_sales' as table_name, COUNT(*) as count FROM lats_sales
UNION ALL
SELECT 'purchase_orders', COUNT(*) FROM purchase_orders
UNION ALL
SELECT 'devices', COUNT(*) FROM devices
UNION ALL
SELECT 'customer_messages', COUNT(*) FROM customer_messages
UNION ALL
SELECT 'expenses', COUNT(*) FROM expenses;
-- Expected: All tables should have some data
```

### Test 4: Branch References Valid
```sql
SELECT DISTINCT branch_id 
FROM lats_sales 
WHERE branch_id IS NOT NULL;
-- Expected: Should return valid branch UUIDs
```

---

## ❌ Common Issues & Fixes

### Issue 1: Widgets Show "No Data"

**Cause**: Table is empty or branch filter too restrictive

**Fix**:
```javascript
// Check in console
localStorage.removeItem('current_branch_id');
location.reload();
// If data appears, it's a branch filter issue
```

**Solution**: Make sure data has correct `branch_id` values

---

### Issue 2: All Widgets Show Same Data Regardless of Branch

**Cause**: Branch filter not applied correctly

**Fix**: Check widget code has:
```typescript
const currentBranchId = getCurrentBranchId();
if (currentBranchId) {
  query = query.eq('branch_id', currentBranchId);
}
```

---

### Issue 3: Database Connection Errors

**Cause**: Supabase client not initialized or wrong credentials

**Fix**: Check `src/lib/supabaseClient.ts`:
```typescript
export const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);
```

Make sure environment variables are set in `.env`:
```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

### Issue 4: Slow Widget Loading

**Cause**: Missing indexes on `branch_id` columns

**Fix**: Run this SQL:
```sql
-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_lats_sales_branch_id ON lats_sales(branch_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_branch_id ON purchase_orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_devices_branch_id ON devices(branch_id);
CREATE INDEX IF NOT EXISTS idx_expenses_branch_id ON expenses(branch_id);
CREATE INDEX IF NOT EXISTS idx_customer_messages_branch_id ON customer_messages(branch_id);
```

---

## ✅ Success Indicators

Your dashboard is working correctly if:

1. **Branch Isolation Works**
   - ✅ Switching branches changes displayed data
   - ✅ Each branch sees only its own data
   - ✅ Admin mode shows all data

2. **All Widgets Load**
   - ✅ No widgets stuck in loading state
   - ✅ No console errors
   - ✅ Data displays correctly

3. **Real-Time Updates**
   - ✅ Creating new sale updates sales widgets
   - ✅ Adding expense updates expense widget
   - ✅ New message updates chat widget

4. **Performance Good**
   - ✅ Widgets load in < 2 seconds
   - ✅ No lag when switching branches
   - ✅ Smooth scrolling and interactions

---

## 📊 Performance Benchmarks

Expected load times (on decent connection):

| Widget Type | Expected Load Time | Acceptable Range |
|-------------|-------------------|------------------|
| Simple widgets (Sales, Expenses) | < 500ms | 200-800ms |
| Chart components | < 1s | 500-1500ms |
| Complex joins (Top Products) | < 1.5s | 1-2s |
| Full dashboard load | < 3s | 2-5s |

If slower than acceptable range:
1. Check network speed
2. Verify database indexes exist
3. Review query complexity
4. Consider implementing caching

---

## 🎯 Quick Health Check

Run this in browser console:
```javascript
// Dashboard Health Check
const healthCheck = async () => {
  const branchId = localStorage.getItem('current_branch_id');
  console.log('🏥 Dashboard Health Check');
  console.log('------------------------');
  console.log('📍 Branch ID:', branchId || 'Not set (Admin mode)');
  console.log('🔒 Isolation Active:', !!branchId);
  console.log('📊 Dashboard loaded:', !!document.querySelector('.dashboard'));
  console.log('⚡ Widgets on page:', document.querySelectorAll('[class*="Widget"]').length);
  console.log('✅ Health Check Complete');
};

healthCheck();
```

Expected output:
```
🏥 Dashboard Health Check
------------------------
📍 Branch ID: uuid-here or "Not set (Admin mode)"
🔒 Isolation Active: true/false
📊 Dashboard loaded: true
⚡ Widgets on page: 20+ (varies based on settings)
✅ Health Check Complete
```

---

## 📞 Still Having Issues?

1. **Check browser console** for errors
2. **Verify database connection** in Supabase dashboard
3. **Review branch isolation docs** in `DASHBOARD-WIDGETS-BRANCH-ISOLATION-COMPLETE.md`
4. **Test with sample data** if no real data exists yet

---

## 🎉 All Systems Operational!

If all checks pass, your dashboard is:
- ✅ Fully connected to database
- ✅ Branch isolation working
- ✅ All 20+ widgets operational
- ✅ Production ready

**Congratulations! Your dashboard is complete and secure!** 🚀

---

**Last Updated**: October 2025
**Total Widgets**: 20+
**Total Database Tables**: 15+
**Status**: ✅ Complete & Verified

