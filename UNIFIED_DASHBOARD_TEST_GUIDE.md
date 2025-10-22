# Unified Dashboard Testing Guide

## Quick Test Instructions

### Prerequisites
1. Ensure you have users with different roles in your database:
   - Admin user
   - Technician user
   - Customer-care user

2. Clear browser cache and local storage before testing

### Test 1: Admin Dashboard Access

**Login Credentials**: (Your admin user)

**Expected Results:**
- ✅ Dashboard title shows: **"Admin Dashboard"**
- ✅ Description shows: **"Welcome back, [Name] - Full system access"**
- ✅ All widgets visible:
  - Revenue Trend Chart
  - Device Status Chart
  - Appointments Trend Chart
  - Stock Level Chart
  - Performance Metrics Chart
  - Customer Activity Chart
  - Sales Funnel Chart
  - Purchase Order Chart
  - Appointment Widget
  - Employee Widget
  - Notification Widget
  - Financial Widget
  - Analytics Widget
  - Service Widget
  - Reminder Widget
  - Customer Insights Widget
  - System Health Widget
  - Inventory Widget
  - Activity Feed Widget
  - Purchase Order Widget
  - Chat Widget
  - Sales Widget
  - Top Products Widget
  - Expenses Widget
  - Staff Performance Widget
  - Sales Chart
  - Payment Methods Chart
  - Sales by Category Chart
  - Profit Margin Chart

**Test Steps:**
1. Navigate to `/dashboard` or click Dashboard in sidebar
2. Verify all widgets are displayed
3. Check Branch Filter is available (admin only)
4. Verify all quick actions are accessible

---

### Test 2: Technician Dashboard Access

**Login Credentials**: (Your technician user - e.g., tech@tech.com)

**Expected Results:**
- ✅ Dashboard title shows: **"Technician Dashboard"**
- ✅ Description shows: **"Welcome back, [Name] - Manage repairs and diagnostics"**
- ✅ **VISIBLE** widgets:
  - Device Status Chart ✓
  - Appointments Trend Chart ✓
  - Stock Level Chart ✓
  - Performance Metrics Chart ✓
  - Appointment Widget ✓
  - Notification Widget ✓
  - Analytics Widget ✓
  - Service Widget ✓
  - Reminder Widget ✓
  - System Health Widget ✓
  - Inventory Widget ✓
  - Activity Feed Widget ✓
  - Chat Widget ✓

- ❌ **HIDDEN** widgets (technician should NOT see these):
  - Revenue Trend Chart
  - Customer Activity Chart
  - Sales Funnel Chart
  - Purchase Order Chart
  - Employee Widget
  - Financial Widget
  - Customer Insights Widget
  - Purchase Order Widget
  - Sales Widget
  - Top Products Widget
  - Expenses Widget
  - Staff Performance Widget
  - Sales Chart
  - Payment Methods Chart
  - Sales by Category Chart
  - Profit Margin Chart

**Test Steps:**
1. Navigate to `/dashboard`
2. Count visible widgets - should see ~13 widgets
3. Verify no financial or sales-related widgets appear
4. Check quick actions - should NOT see:
   - Purchase Orders
   - Payments
   - User Management
   - Settings (system settings)

---

### Test 3: Customer Care Dashboard Access

**Login Credentials**: (Your customer-care user - e.g., care@care.com)

**Expected Results:**
- ✅ Dashboard title shows: **"Customer Care Dashboard"**
- ✅ Description shows: **"Welcome back, [Name] - Manage customers and support"**
- ✅ **VISIBLE** widgets:
  - Device Status Chart ✓
  - Appointments Trend Chart ✓
  - Performance Metrics Chart ✓
  - Customer Activity Chart ✓
  - Sales Chart ✓
  - Payment Methods Chart ✓
  - Appointment Widget ✓
  - Notification Widget ✓
  - Analytics Widget ✓
  - Service Widget ✓
  - Reminder Widget ✓
  - Customer Insights Widget ✓
  - Activity Feed Widget ✓
  - Chat Widget ✓
  - Sales Widget ✓
  - Top Products Widget ✓

- ❌ **HIDDEN** widgets (customer-care should NOT see these):
  - Revenue Trend Chart
  - Stock Level Chart
  - Sales Funnel Chart
  - Purchase Order Chart
  - Employee Widget
  - Financial Widget
  - System Health Widget
  - Inventory Widget
  - Purchase Order Widget
  - Expenses Widget
  - Staff Performance Widget
  - Sales by Category Chart
  - Profit Margin Chart

**Test Steps:**
1. Navigate to `/dashboard`
2. Count visible widgets - should see ~16 widgets
3. Verify customer-focused widgets appear (Customer Insights, Sales)
4. Verify no inventory or system health widgets appear
5. Check quick actions - should NOT see:
   - Inventory (full access)
   - Purchase Orders
   - User Management
   - Settings (system settings)

---

## Advanced Testing

### Test 4: Widget Customization (Admin Only)

**Steps:**
1. Login as Admin
2. Navigate to Settings → Dashboard Customization
3. Disable some widgets (e.g., Chat Widget, Sales Chart)
4. Save settings
5. Return to Dashboard
6. Verify disabled widgets are hidden
7. Re-enable the widgets
8. Verify they reappear

**Expected**: User preferences should override defaults (within role permissions)

---

### Test 5: Permission Boundary Testing

**Steps:**
1. Login as Technician
2. Open browser DevTools Console
3. Try to manually enable a restricted widget via localStorage:
   ```javascript
   // This should NOT work - role restrictions apply
   const settings = JSON.parse(localStorage.getItem('dashboard_settings'));
   settings.widgets.financialWidget = true;
   localStorage.setItem('dashboard_settings', JSON.stringify(settings));
   location.reload();
   ```
4. Refresh the page
5. Financial Widget should STILL be hidden

**Expected**: Role permissions cannot be bypassed through local storage manipulation

---

### Test 6: Quick Action Filtering

**Admin Quick Actions** (should see all):
- Devices ✓
- Add Device ✓
- Customers ✓
- Inventory ✓
- Appointments ✓
- Purchase Orders ✓
- Payments ✓
- Ad Generator ✓
- POS System ✓
- Sales Reports ✓
- Employees ✓
- WhatsApp ✓
- Settings ✓
- Search ✓
- Loyalty ✓
- Backup ✓
- SMS ✓
- Bulk SMS ✓
- Diagnostics ✓
- User Management ✓
- (and more...)

**Technician Quick Actions** (limited):
- Devices ✓
- Add Device ✓
- Customers (view only) ✓
- Inventory (spare parts) ✓
- Appointments ✓
- SMS ✓
- Diagnostics ✓
- WhatsApp ✓
- Search ✓
- Reports (own) ✓
- Reminders ✓
- My Attendance ✓
- Purchase Orders ❌
- Payments ❌
- User Management ❌
- Settings ❌

**Customer Care Quick Actions**:
- Devices ✓
- Add Device ✓
- Customers ✓
- Appointments ✓
- Payments ✓
- POS System ✓
- SMS ✓
- Bulk SMS ✓
- Diagnostics ✓
- WhatsApp ✓
- Search ✓
- Loyalty ✓
- Reports ✓
- Customer Import ✓
- Inventory ❌
- Purchase Orders ❌
- User Management ❌
- Settings ❌

---

## Visual Verification Checklist

### Dashboard Header
- [ ] Title displays correct role name
- [ ] Description shows role-appropriate text
- [ ] User name is displayed correctly

### Layout Consistency
- [ ] All roles use the same layout structure
- [ ] Widgets are organized in consistent rows
- [ ] Spacing and padding are uniform

### Responsive Design
- [ ] Dashboard works on desktop (1920x1080)
- [ ] Dashboard works on tablet (768x1024)
- [ ] Dashboard works on mobile (375x667)

### Performance
- [ ] Dashboard loads in < 3 seconds
- [ ] No console errors
- [ ] Smooth scrolling
- [ ] Widgets load without flickering

---

## Debugging Tips

### Issue: Wrong widgets showing for a role

**Solution:**
1. Open DevTools Console
2. Check current user role:
   ```javascript
   console.log('Current Role:', localStorage.getItem('current_user_role'));
   ```
3. Check loaded permissions:
   ```javascript
   import { getRoleWidgetPermissions } from './src/config/roleBasedWidgets';
   console.log(getRoleWidgetPermissions('technician'));
   ```

### Issue: Widgets not loading

**Solution:**
1. Clear browser cache: `Ctrl+Shift+Delete`
2. Clear localStorage: 
   ```javascript
   localStorage.clear();
   ```
3. Logout and login again
4. Check Network tab for API errors

### Issue: Dashboard shows old layout

**Solution:**
1. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Check if service worker is caching old files
3. Verify build is up to date

---

## Expected Console Output

When dashboard loads successfully, you should see:

```
📊 Dashboard branch changed to: All Branches
✅ Dashboard settings loaded for role: technician
✅ 13 widgets enabled for this role
✅ Dashboard stats loaded successfully
```

No errors should appear in the console.

---

## Automated Testing (Optional)

Create test cases for automated testing:

```typescript
describe('Unified Dashboard', () => {
  it('should show admin dashboard for admin role', () => {
    // Test implementation
  });
  
  it('should show technician dashboard for technician role', () => {
    // Test implementation
  });
  
  it('should show customer care dashboard for customer-care role', () => {
    // Test implementation
  });
  
  it('should filter widgets based on role permissions', () => {
    // Test implementation
  });
  
  it('should respect user custom settings within role permissions', () => {
    // Test implementation
  });
});
```

---

## Sign-Off Checklist

After completing all tests, verify:

- [ ] Admin can see ALL widgets and quick actions
- [ ] Technician sees only device/service-related widgets
- [ ] Customer care sees only customer/communication widgets
- [ ] Role titles and descriptions are correct
- [ ] Widget customization works for all roles
- [ ] No console errors
- [ ] Dashboard loads quickly (< 3 seconds)
- [ ] Responsive design works on all screen sizes
- [ ] Role permissions cannot be bypassed
- [ ] Old dashboard pages are no longer accessible

---

## Test Results Template

Copy and fill this out after testing:

```
# Unified Dashboard Test Results

**Date**: [Date]
**Tester**: [Your Name]
**Environment**: [Development/Staging/Production]

## Admin Dashboard
- [ ] Pass / [ ] Fail - All widgets visible
- [ ] Pass / [ ] Fail - Correct title and description
- [ ] Pass / [ ] Fail - Branch filter available
- Notes: ___________

## Technician Dashboard
- [ ] Pass / [ ] Fail - Only device/service widgets visible
- [ ] Pass / [ ] Fail - Financial widgets hidden
- [ ] Pass / [ ] Fail - Correct title and description
- Notes: ___________

## Customer Care Dashboard
- [ ] Pass / [ ] Fail - Customer-focused widgets visible
- [ ] Pass / [ ] Fail - Inventory widgets hidden
- [ ] Pass / [ ] Fail - Correct title and description
- Notes: ___________

## Overall Assessment
- [ ] Ready for Production
- [ ] Needs Minor Fixes
- [ ] Needs Major Changes

**Comments**: ___________
```

---

**Good luck with testing!** 🚀

If you encounter any issues, refer to `UNIFIED_DASHBOARD_IMPLEMENTATION.md` for detailed technical information.

