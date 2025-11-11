# Dashboard Widget Size Customization Feature

## Overview
Your dashboard now fully supports customizable widget and chart sizes! Users can choose between **Small**, **Medium**, and **Large** sizes for each widget and chart in the settings.

## What Was Fixed

### 1. **Dashboard Settings Components** ✅
Located in: 
- `src/features/shared/components/DashboardCustomizationSettings.tsx` (User Settings)
- `src/features/admin/components/DashboardCustomizationSettings.tsx` (Admin Settings)

**Already Implemented:**
- Size selector buttons (Small, Medium, Large) for each enabled widget
- Visual icons using Lucide React:
  - `Minimize2` for Small (1 column)
  - `Square` for Medium (2 columns)  
  - `Maximize2` for Large (3 columns)
- Size settings are saved to the database per user
- Available in both user settings (`/settings`) and admin settings (`/admin-settings`)

### 2. **Dashboard Page** ✅ (UPDATED)
Located in: `src/features/shared/pages/DashboardPage.tsx`

**Changes Made:**
- ✅ Added `getWidgetSize` function to retrieve user's chosen size
- ✅ Updated chart rendering to respect widget size settings
- ✅ Updated widget rendering to respect widget size settings
- ✅ Widget sizes now correctly apply Tailwind CSS classes:
  - **Small**: `md:col-span-1` (takes 1 column)
  - **Medium**: `md:col-span-2 lg:col-span-2` (takes 2 columns)
  - **Large**: `md:col-span-2 lg:col-span-3` (takes 3 columns - full width)

### 3. **Dashboard Settings Hook** ✅
Located in: `src/hooks/useDashboardSettings.ts`

**Already Implemented:**
- `getWidgetSize()` function to retrieve widget size
- `getWidgetColumnSpan()` function to convert size to column span
- Widget sizes stored in user settings database

## How to Use

### For Users:

**Option 1: User Settings (All Users)**
1. **Navigate to Settings**
   - Click on "Settings" from your dashboard or sidebar
   - The "Dashboard" tab should be selected by default

**Option 2: Admin Settings (Admins Only)**
1. **Navigate to Admin Settings**
   - Go to `/admin-settings` or click "Settings" → "Admin Settings"
   - Click on the "Dashboard" tab in the left sidebar

2. **Enable Widgets/Charts**
   - Click on any card to enable/disable it
   - Enabled widgets show a green "Enabled" badge

3. **Choose Widget Size**
   - For each enabled widget, you'll see size buttons at the bottom:
     - 📉 **Small button** (Minimize2 icon) - 1 column width
     - ⬜ **Medium button** (Square icon) - 2 columns width (default)
     - 📈 **Large button** (Maximize2 icon) - 3 columns width (full row)
   - Click the size button that fits your preference

4. **Save Changes**
   - Click the "Save Changes" button at the top
   - A success message will appear
   - Refresh your dashboard to see the new sizes applied

5. **Reorder Widgets** (Optional)
   - Use the "Widget Order Settings" section to drag and drop widgets
   - This changes the order they appear on your dashboard

### Size Reference:

| Size | Columns | Best For |
|------|---------|----------|
| **Small** | 1 column | Quick stats, notifications, small widgets |
| **Medium** | 2 columns | Most charts and widgets (default) |
| **Large** | 3 columns | Large charts, detailed data, full-width content |

## Technical Details

### Widget Size Types
```typescript
export type WidgetSize = 'small' | 'medium' | 'large';
```

### Size to Column Span Mapping
```typescript
const getWidgetColumnSpan = (widget: string): number => {
  const size = getWidgetSize(widget);
  switch (size) {
    case 'small': return 1;
    case 'medium': return 2;
    case 'large': return 3;
    default: return 2;
  }
}
```

### Responsive Classes Applied
- Small: `md:col-span-1` - Single column on medium+ screens
- Medium: `md:col-span-2 lg:col-span-2` - Two columns on medium+ screens
- Large: `md:col-span-2 lg:col-span-3` - Full width on large screens

### Database Storage
Widget sizes are stored in the `user_settings` table under the `dashboard.widgetSizes` object:
```json
{
  "dashboard": {
    "widgetSizes": {
      "revenueTrendChart": "large",
      "deviceStatusChart": "medium",
      "appointmentWidget": "small",
      // ... other widgets
    }
  }
}
```

## Available Widgets and Charts

### Charts:
- Revenue Trend Chart
- Sales Chart
- Device Status Chart
- Appointments Trend Chart
- Purchase Order Chart
- Payment Methods Chart
- Analytics Widget
- Sales by Category Chart
- Profit Margin Chart
- Stock Level Chart
- Performance Metrics Chart
- Customer Activity Chart

### Widgets:
- Appointment Widget
- Employee Widget
- Notification Widget
- Financial Widget
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

## Notes

1. **Default Size**: If no size is set, widgets default to "medium" (2 columns)
2. **Auto Arrange**: Works in conjunction with size settings - can expand last widget if enabled
3. **Role-Based Access**: Only widgets allowed for your role are shown in settings
4. **Responsive Design**: The grid automatically adjusts for mobile/tablet screens

## Testing

To test the feature:
1. Go to Dashboard Settings
2. Enable a few widgets
3. Set different sizes for each widget
4. Save changes
5. Return to dashboard
6. Verify widgets display in chosen sizes
7. Test on different screen sizes (mobile, tablet, desktop)

## Support

If you encounter any issues:
- Make sure you've saved the settings and refreshed the dashboard
- Check that your user role has permission for the widgets you're trying to customize
- Clear browser cache if changes don't appear

---

**Feature Status**: ✅ Complete and Working
**Last Updated**: November 10, 2025

