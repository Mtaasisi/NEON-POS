# Unified Dashboard Implementation Guide

## Overview

The dashboard system has been redesigned to provide a **unified, role-based dashboard** for all user roles (admin, technician, customer-care, manager, sales, etc.). Instead of having separate dashboard pages for each role, all users now access the same `DashboardPage`, which automatically adjusts its content based on the user's role and permissions.

## What Changed

### Before
- **Separate Dashboards**: Each role had its own dashboard component
  - Admin → `DashboardPage`
  - Technician → `TechnicianDashboardPage`
  - Customer Care → `CustomerCareDashboardPage`
- **Inconsistent UI/UX**: Different layouts and features across roles
- **Maintenance Challenge**: Updates needed in multiple places

### After
- **Unified Dashboard**: All roles use the same `DashboardPage`
- **Role-Based Filtering**: Widgets and quick actions are filtered based on user role
- **Consistent UI/UX**: Same layout and design for all users
- **Easy Maintenance**: Single source of truth for dashboard updates

## Key Components

### 1. Role-Based Widget Configuration (`src/config/roleBasedWidgets.ts`)

This new configuration file defines which widgets and quick actions are available for each role.

#### Widget Permissions by Role

**Admin** - Full Access
- ✅ All charts (revenue, device status, appointments, stock, performance, customer activity, sales funnel, purchase orders, sales, payment methods, sales by category, profit margin)
- ✅ All widgets (appointments, employees, notifications, financial, analytics, service, reminders, customer insights, system health, inventory, activity feed, purchase orders, chat, sales, top products, expenses, staff performance)

**Technician** - Device & Service Focused
- ✅ Charts: Device Status, Appointments Trend, Stock Level, Performance Metrics
- ✅ Widgets: Appointments, Notifications, Analytics, Service, Reminders, System Health, Inventory, Activity Feed, Chat
- ❌ Financial widgets and charts (revenue, profit, expenses)
- ❌ Employee and staff management widgets

**Customer Care** - Customer & Communication Focused
- ✅ Charts: Device Status, Appointments Trend, Performance Metrics, Customer Activity, Sales, Payment Methods
- ✅ Widgets: Appointments, Notifications, Analytics, Service, Reminders, Customer Insights, Activity Feed, Chat, Sales, Top Products
- ❌ Financial widgets (expenses, profit margin)
- ❌ System health and inventory management
- ❌ Employee and staff management widgets

#### Quick Action Permissions by Role

**Admin** - All Actions Available
- Full access to all system features

**Technician** - Repair & Diagnostics
- ✅ Devices, Customers (view), Inventory (spare parts), Appointments
- ✅ SMS, Diagnostics, Reports (own), WhatsApp
- ✅ Reminders, Mobile, My Attendance
- ❌ Purchase Orders, Payments, User Management, Settings

**Customer Care** - Customer Service
- ✅ Devices, Customers, Appointments, Payments, POS
- ✅ SMS, Bulk SMS, Diagnostics, WhatsApp
- ✅ Loyalty, Reports, Customer Import
- ❌ Inventory Management, Purchase Orders, User Management, Settings

### 2. Enhanced Dashboard Settings Hook (`src/hooks/useDashboardSettings.ts`)

The `useDashboardSettings` hook now integrates role-based permissions:

```typescript
// Widget permission check now includes role validation
const isWidgetEnabled = (widget: string): boolean => {
  // 1. Check if user's role allows this widget
  const roleAllowed = isWidgetAllowedForRole(widget, currentUser.role);
  if (!roleAllowed) return false;
  
  // 2. Check user's custom settings
  return dashboardSettings.widgets[widget];
};
```

**Key Features:**
- Loads role-based default settings
- Merges with user's custom preferences
- User can only disable widgets allowed by their role
- Respects role hierarchy (admin > manager > others)

### 3. Updated Dashboard Page (`src/features/shared/pages/DashboardPage.tsx`)

The dashboard now displays role-appropriate titles:

- **Admin** → "Admin Dashboard" - Full system access
- **Technician** → "Technician Dashboard" - Manage repairs and diagnostics
- **Customer Care** → "Customer Care Dashboard" - Manage customers and support
- **Manager** → "Manager Dashboard" - Oversee operations
- **Sales** → "Sales Dashboard" - Track sales and customers

### 4. Simplified Conditional Dashboard (`src/features/shared/components/ConditionalDashboard.tsx`)

Previously routed users to different dashboards. Now all users go to the unified `DashboardPage`:

```typescript
// Before: Multiple dashboard components
if (role === 'technician') return <TechnicianDashboardPage />
if (role === 'customer-care') return <CustomerCareDashboardPage />
return <DashboardPage />

// After: Single unified dashboard
return <DashboardPage />
```

## How It Works

### Permission Hierarchy

1. **Role Permissions** (Highest Priority)
   - Defined in `roleBasedWidgets.ts`
   - Cannot be overridden by users
   - Ensures security and access control

2. **User Preferences** (Secondary)
   - Stored in user settings
   - Can only disable widgets allowed by role
   - Persists across sessions

3. **Default Settings** (Fallback)
   - Applied when no custom settings exist
   - Based on role permissions

### Widget Rendering Flow

```
User Logs In
    ↓
Load Role Permissions (roleBasedWidgets.ts)
    ↓
Load User Settings (if exist)
    ↓
Merge: Role Permissions ∩ User Settings
    ↓
Render Dashboard with Filtered Widgets
```

### Example Scenarios

#### Scenario 1: Admin User
- **Role Permissions**: All widgets enabled
- **User Settings**: Admin disables "Chat Widget"
- **Result**: All widgets shown EXCEPT Chat Widget

#### Scenario 2: Technician User
- **Role Permissions**: Financial widgets disabled
- **User Settings**: (none)
- **Result**: Only device, service, and operational widgets shown

#### Scenario 3: Customer Care User
- **Role Permissions**: Inventory widgets disabled
- **User Settings**: Customer care enables "Inventory Widget" (attempt)
- **Result**: Inventory widget still NOT shown (role restriction applies)

## Benefits

### For Users
- **Consistent Experience**: Same interface across all roles
- **Role-Appropriate Content**: Only see relevant widgets and actions
- **Personalization**: Can customize visible widgets (within role permissions)

### For Administrators
- **Centralized Control**: Manage all role permissions in one place
- **Security**: Role restrictions cannot be bypassed
- **Flexibility**: Easy to adjust permissions per role

### For Developers
- **Single Codebase**: One dashboard to maintain
- **Easy Updates**: Changes apply to all roles automatically
- **Type Safety**: Full TypeScript support for permissions

## Customizing Role Permissions

To modify what widgets/actions a role can access, edit `src/config/roleBasedWidgets.ts`:

```typescript
// Example: Allow technicians to see financial widgets
const technicianWidgetPermissions: RoleWidgetPermissions = {
  // ... other settings
  financialWidget: true,  // Change from false to true
  revenueTrendChart: true, // Change from false to true
  // ... other settings
};
```

## Adding New Widgets

When adding a new widget to the system:

1. **Add to `DashboardSettings` interface** (`useDashboardSettings.ts`)
2. **Add to `RoleWidgetPermissions` interface** (`roleBasedWidgets.ts`)
3. **Define permissions for each role** (`roleBasedWidgets.ts`)
4. **Add widget to dashboard layout** (`DashboardPage.tsx`)

## Testing Recommendations

### Test Each Role
1. Login as **Admin** - Verify all widgets are visible
2. Login as **Technician** - Verify only device/service widgets show
3. Login as **Customer Care** - Verify only customer/communication widgets show

### Test Customization
1. Go to Dashboard Settings (Admin panel)
2. Disable some widgets
3. Refresh dashboard - Verify widgets are hidden
4. Re-enable widgets - Verify they reappear

### Test Permission Boundaries
1. Login as non-admin user
2. Attempt to manually enable restricted widgets via settings
3. Verify restricted widgets remain hidden

## Migration Notes

### Old Dashboard Files (Not Deleted)
The following files still exist but are no longer used:
- `src/features/shared/pages/TechnicianDashboardPage.tsx`
- `src/features/shared/pages/CustomerCareDashboardPage.tsx`
- `src/features/shared/components/dashboards/TechnicianDashboard.tsx`
- `src/features/shared/components/dashboards/CustomerCareDashboard.tsx`

**Recommendation**: Keep these files for reference, but they can be safely deleted after thorough testing confirms the unified dashboard works correctly.

### Database Considerations
- User dashboard settings remain compatible
- No database migration required
- Existing user preferences will be merged with role permissions

## Troubleshooting

### Widget Not Showing for a Role

1. **Check role permissions** in `roleBasedWidgets.ts`
   ```typescript
   const rolePermissions = ROLE_WIDGET_PERMISSIONS[userRole];
   console.log(rolePermissions.widgetName); // Should be true
   ```

2. **Check user settings**
   - User may have disabled the widget
   - Check Dashboard Customization Settings

3. **Check console logs**
   - Dashboard logs which widgets are enabled/disabled
   - Look for permission-related messages

### Quick Action Not Available

1. **Verify `isQuickActionAllowedForRole`** returns true
2. **Check navigation permissions** in sidebar/menu
3. **Verify route protection** allows the role to access the page

### Dashboard Loads Slowly

1. **Too many widgets enabled** - Disable unused widgets
2. **Network latency** - Check API response times
3. **Data volume** - Implement pagination or lazy loading

## Future Enhancements

### Planned Features
- [ ] Role-based color themes
- [ ] Custom widget layouts per role
- [ ] Widget drag-and-drop positioning
- [ ] Real-time permission updates
- [ ] Widget analytics and usage tracking

### Considerations
- **Performance**: Monitor dashboard load times with many widgets
- **Accessibility**: Ensure role-based UI changes are screen-reader friendly
- **Mobile**: Optimize widget display for mobile devices

## Support

For questions or issues with the unified dashboard:
1. Check this documentation
2. Review `roleBasedWidgets.ts` configuration
3. Check browser console for errors
4. Test with different user roles

---

**Implementation Date**: October 22, 2025  
**Version**: 1.0  
**Status**: ✅ Complete and Ready for Testing

