# Dashboard Customization Guide

## Overview

The Dashboard Customization feature allows users to personalize their dashboard experience by choosing which quick actions and widgets to display. This improves performance and provides a cleaner, more focused interface tailored to each user's needs.

## Features

### 1. Customizable Quick Actions
Users can enable/disable the following quick actions:
- **Devices** - Navigate to device management
- **Add Device** - Quick access to add new device
- **Customers** - View customer data
- **Inventory** - Access stock & parts
- **Appointments** - Manage scheduling
- **Purchase Orders** - Handle purchase orders
- **Payments** - Payment management
- **Ad Generator** - Create product advertisements

### 2. Customizable Dashboard Widgets

#### Charts
- Revenue Trend Chart
- Device Status Chart
- Appointments Trend Chart
- Stock Level Chart
- Performance Metrics Chart
- Customer Activity Chart
- Sales Funnel Chart

#### Widgets
- Appointment Widget
- Employee Widget
- Notification Widget
- Financial Widget
- Analytics Widget
- Service Widget
- Customer Insights Widget
- System Health Widget
- Inventory Widget
- Activity Feed Widget

## How to Access Dashboard Customization

1. Navigate to **Settings** (Admin Settings)
2. Click on **Dashboard Customization** in the sidebar
3. Configure your preferred quick actions and widgets
4. Click **Save Changes**

## User Interface

### Settings Page Structure

The Dashboard Customization settings page is divided into three main sections:

#### Quick Actions Section
- Toggle individual quick actions on/off
- Bulk enable/disable all quick actions
- Visual indicators showing enabled/disabled state

#### Charts Section
- Control which analytical charts appear on your dashboard
- Bulk enable/disable all charts
- Organized display with icon indicators

#### Widgets Section
- Select which information widgets to display
- Bulk enable/disable all widgets
- Clear visual feedback for selection state

### Control Buttons

- **Save Changes** - Saves your current configuration
- **Reset to Default** - Restores all items to enabled state
- **Enable All** - Enables all items in a section
- **Disable All** - Disables all items in a section

## Technical Implementation

### Files Created/Modified

#### New Files:
1. `src/features/admin/components/DashboardCustomizationSettings.tsx`
   - Main settings component with UI for customization
   
2. `src/hooks/useDashboardSettings.ts`
   - Custom hook for managing dashboard settings
   - Provides helper functions to check enabled states

#### Modified Files:
1. `src/lib/userSettingsApi.ts`
   - Added `dashboard` interface to UserSettings
   - Updated default settings with dashboard configuration

2. `src/features/admin/pages/AdminSettingsPage.tsx`
   - Added Dashboard Customization tab
   - Imported and rendered DashboardCustomizationSettings component

3. `src/features/shared/pages/DashboardPage.tsx`
   - Integrated useDashboardSettings hook
   - Conditionally renders quick actions and widgets based on settings

### Data Structure

```typescript
interface DashboardSettings {
  quickActions: {
    devices: boolean;
    addDevice: boolean;
    customers: boolean;
    inventory: boolean;
    appointments: boolean;
    purchaseOrders: boolean;
    payments: boolean;
    adGenerator: boolean;
  };
  widgets: {
    revenueTrendChart: boolean;
    deviceStatusChart: boolean;
    appointmentsTrendChart: boolean;
    stockLevelChart: boolean;
    performanceMetricsChart: boolean;
    customerActivityChart: boolean;
    salesFunnelChart: boolean;
    appointmentWidget: boolean;
    employeeWidget: boolean;
    notificationWidget: boolean;
    financialWidget: boolean;
    analyticsWidget: boolean;
    serviceWidget: boolean;
    customerInsightsWidget: boolean;
    systemHealthWidget: boolean;
    inventoryWidget: boolean;
    activityFeedWidget: boolean;
  };
}
```

## Default Configuration

By default, all quick actions and widgets are **enabled**. This ensures that new users see the full functionality available before customizing.

## Performance Benefits

Disabling unused widgets and quick actions provides several benefits:

1. **Faster Page Load** - Fewer components to render
2. **Reduced Data Fetching** - Only enabled widgets fetch data
3. **Cleaner Interface** - Focus on what matters to you
4. **Better Mobile Experience** - Less scrolling on smaller screens

## Best Practices

### For Regular Users
- Start with all items enabled to understand what's available
- Gradually disable items you don't use frequently
- Keep at least 2-3 quick actions for easy navigation
- Maintain a balance of charts and widgets for comprehensive overview

### For Administrators
- Encourage team members to customize based on their roles
- Sales team might focus on financial and customer widgets
- Inventory managers might enable stock and purchase order features
- Service technicians might prioritize device and appointment widgets

## Use Cases

### Example 1: Sales Manager Dashboard
**Enabled Quick Actions:**
- Customers
- Payments
- Ad Generator

**Enabled Widgets:**
- Revenue Trend Chart
- Sales Funnel Chart
- Customer Activity Chart
- Financial Widget
- Customer Insights Widget

### Example 2: Inventory Manager Dashboard
**Enabled Quick Actions:**
- Inventory
- Purchase Orders
- Add Device

**Enabled Widgets:**
- Stock Level Chart
- Inventory Widget
- Device Status Chart
- Purchase Orders tracking

### Example 3: Service Technician Dashboard
**Enabled Quick Actions:**
- Devices
- Add Device
- Appointments

**Enabled Widgets:**
- Appointment Widget
- Device Status Chart
- Service Widget
- Activity Feed Widget

## Troubleshooting

### Settings Not Saving
1. Check browser console for errors
2. Ensure you're logged in with proper permissions
3. Verify internet connection
4. Try refreshing the page and attempting again

### Dashboard Not Updating
1. Click the refresh button on the dashboard
2. Clear browser cache
3. Log out and log back in
4. Check that settings were successfully saved

### All Items Disabled
1. Go to Dashboard Customization settings
2. Click "Reset to Default" to restore all items
3. Or use "Enable All" buttons in each section

## API Reference

### useDashboardSettings Hook

```typescript
const {
  dashboardSettings,        // Current settings object
  loading,                  // Loading state
  isQuickActionEnabled,     // Check if quick action is enabled
  isWidgetEnabled,          // Check if widget is enabled
  getEnabledQuickActions,   // Get array of enabled quick actions
  getEnabledWidgets,        // Get array of enabled widgets
  refreshSettings          // Manually refresh settings
} = useDashboardSettings();
```

### Helper Functions

```typescript
// Check if a quick action is enabled
const enabled = isQuickActionEnabled('devices');

// Check if a widget is enabled
const enabled = isWidgetEnabled('revenueTrendChart');

// Get all enabled quick actions
const actions = getEnabledQuickActions();

// Get all enabled widgets
const widgets = getEnabledWidgets();
```

## Future Enhancements

Potential future improvements:
1. Drag-and-drop widget repositioning
2. Custom widget sizing
3. Multiple dashboard layouts/profiles
4. Export/import dashboard configurations
5. Role-based default configurations
6. Dashboard templates for different job roles

## Support

For issues or questions:
1. Check this documentation
2. Review the in-app tooltips and help text
3. Contact system administrator
4. Submit feedback through the app

## Version History

### Version 1.0 (Current)
- Initial release of dashboard customization
- Support for all quick actions and widgets
- Bulk enable/disable functionality
- Reset to default option
- Persistent user preferences

---

**Last Updated:** October 2025
**Feature Status:** ✅ Active and Working 100%

