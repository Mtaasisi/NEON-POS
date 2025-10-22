# Dashboard Branch Filter - User Guide

## Overview
The Dashboard Branch Filter allows administrators to view analytics and metrics from different branches without switching their working branch.

## 🎯 Key Features

### For Admin Users
✅ **Current Branch** (Default) - View data from your currently selected branch
✅ **All Branches** - View combined data from all store locations  
✅ **Specific Branch** - Select and view data from any individual branch

### Visual Location
The branch filter appears in the dashboard header, positioned between the page title and date range selector:

```
┌─────────────────────────────────────────────────────────────┐
│  Dashboard                         [Branch Filter ▼]         │
│  Welcome back, Admin              [Date Range ▼] [+ Add]    │
└─────────────────────────────────────────────────────────────┘
```

## 📖 How to Use

### Step 1: Access the Dashboard
1. Log in as an admin user
2. Navigate to Dashboard (`/dashboard` or `/dashboard/admin`)
3. Look for the branch filter dropdown in the top-right area

### Step 2: Change Branch View

#### To View All Branches Combined:
1. Click on the branch filter dropdown
2. Select **"All Branches"** at the top of the list
3. The dashboard will refresh showing combined data from all locations

#### To View a Specific Branch:
1. Click on the branch filter dropdown
2. Select the desired branch from the list
3. The dashboard will refresh showing only that branch's data

#### To Return to Current Branch:
1. Click on the branch filter dropdown
2. Select your current branch
3. Or simply refresh the page (it defaults to current branch)

## 🎨 Visual Guide

### Branch Filter Dropdown

When you click the branch filter, you'll see:

```
┌──────────────────────────────────────┐
│ 🏢 All Branches                    ✓ │
│ View combined data from all locations│
├──────────────────────────────────────┤
│ 🏢 Main Store [Main]                 │
│    MS • Nairobi                      │
├──────────────────────────────────────┤
│ 🏢 Westlands Branch                  │
│    WL • Nairobi                      │
├──────────────────────────────────────┤
│ 🏢 Mombasa Branch                    │
│    MB • Mombasa                      │
└──────────────────────────────────────┘
```

**Visual Indicators**:
- ✓ Checkmark = Currently selected
- [Main] Badge = Main branch
- Blue/Indigo highlight = Selected option
- Branch Code • City = Additional info

## 📊 What Data Is Filtered?

When you change the branch filter, ALL dashboard data updates to reflect the selected branch:

### Charts & Visualizations
- Revenue Trend Chart
- Sales Chart  
- Device Status Chart
- Appointments Trend Chart
- Purchase Order Chart
- Payment Methods Chart
- Sales by Category Chart
- Profit Margin Chart
- Stock Level Chart
- Performance Metrics Chart
- Customer Activity Chart

### Widgets
- Financial Widget (revenue, expenses, profit)
- Sales Widget (sales count, total revenue)
- Analytics Widget (conversion rates, trends)
- Inventory Widget (stock levels, alerts)
- Customer Insights Widget
- Top Products Widget
- Expenses Widget
- Purchase Order Widget
- Employee Widget
- Service Widget
- System Health Widget

### Statistics
- Total revenue
- Sales count
- Customer count
- Inventory levels
- Appointment counts
- Employee performance
- Device repair status
- All other metrics

## 💡 Use Cases

### 1. Branch Performance Comparison
**Scenario**: Compare how different branches are performing

**Steps**:
1. View Main Store metrics (default)
2. Switch to Westlands Branch
3. Compare revenue, sales, customer activity
4. Switch to Mombasa Branch
5. Compare again

### 2. Regional Analysis
**Scenario**: Get overall picture of all locations

**Steps**:
1. Select "All Branches"
2. View combined metrics
3. Identify trends across all locations
4. Make data-driven decisions

### 3. Branch-Specific Issues
**Scenario**: Investigate why a specific branch has low sales

**Steps**:
1. Select the underperforming branch
2. Review inventory levels
3. Check customer activity
4. Analyze top products
5. Identify root causes

### 4. End of Day Review
**Scenario**: Check each branch's performance before closing

**Steps**:
1. Select Branch A - review sales, inventory
2. Select Branch B - review sales, inventory  
3. Select Branch C - review sales, inventory
4. Select "All Branches" - get overall picture

## 🔒 Permissions

### Who Can Use It?
- ✅ **Admin Users** - Full access to branch filter
- ❌ **Other Roles** - Filter not visible (see only their branch)

### Why Admin-Only?
- Admins need cross-branch visibility for management decisions
- Other roles typically work within their assigned branch
- Prevents confusion for staff members
- Maintains data security and access control

## ⚡ Important Notes

### Your Working Branch Stays the Same
🚨 **IMPORTANT**: Changing the dashboard branch filter does NOT change your working branch!

**Example**:
- You're working in "Main Store"
- You view dashboard data from "Westlands Branch"
- When you go to POS, Sales, Inventory, etc. → You're still in "Main Store"

**Why?**: The dashboard filter is view-only. It lets you see data from other branches without affecting your work context.

### To Actually Switch Branches
Use the **main branch selector** in the app header (top-left or navigation bar):
- That changes your working branch system-wide
- Affects all pages, not just the dashboard
- Persists across sessions

### Auto-Refresh Behavior
- Dashboard auto-refreshes every 5 minutes
- Always uses the currently selected branch filter
- No need to manually refresh after changing branches

### Date Range Interaction
The branch filter works together with the date range filter:
- Both filters apply simultaneously
- Example: "Westlands Branch" + "Last 7 Days" = Westlands data from last 7 days
- Both filters refresh the dashboard independently

## 🐛 Troubleshooting

### Branch Filter Not Visible
**Problem**: Can't see the branch filter dropdown

**Solutions**:
1. Verify you're logged in as admin (`role = 'admin'`)
2. Check you're on the dashboard page
3. Clear browser cache and reload
4. Check browser console for errors

### No Data After Selecting Branch
**Problem**: Dashboard shows no data after selecting a branch

**Possible Causes**:
1. Selected branch has no data for the date range
2. Branch is newly created with no transactions yet
3. Database connection issue

**Solutions**:
1. Try selecting "All Branches" to confirm data exists
2. Adjust date range to wider period
3. Check that branch has actual data in the database

### Wrong Branch Data Showing
**Problem**: Selected Branch A but seeing Branch B's data

**Solutions**:
1. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear localStorage and re-login
3. Check console for branch filter debug logs (look for "📊 Dashboard branch")

### Filter Resets on Page Load
**Behavior**: This is expected - filter always defaults to current branch

**Reason**: For consistency and safety, the dashboard always starts with your current branch

**Workaround**: Simply reselect your desired filter after page load

## 🔍 For Developers

### Debug Mode
Check browser console for debug messages:
```
📊 Dashboard branch changed to: <branch-id> or All Branches
📊 Dashboard branch filter changed: <branch-id>
```

### Context Access
```typescript
// In any dashboard component
import { useDashboardBranch } from '../../../context/DashboardBranchContext';

const { dashboardBranchId, isViewingAllBranches } = useDashboardBranch();
```

### Testing the Filter
```typescript
// Check current selection
console.log('Current dashboard branch:', dashboardBranchId);
console.log('Viewing all branches?', isViewingAllBranches);

// Should match the selected branch in the filter
```

## 📞 Support

Need help?
1. Check console logs for error messages
2. Verify admin permissions
3. Confirm branches exist in `store_locations` table
4. Test with "All Branches" first to isolate issues

---

**Last Updated**: October 22, 2025  
**Version**: 1.0  
**Feature**: Admin Dashboard Branch Filter

