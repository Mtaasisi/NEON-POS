# Dashboard Branch Filter Implementation

## Overview
Implemented a branch filter feature for the admin dashboard that allows administrators to view data for:
- **Current Branch** (default) - Shows data only from the currently selected branch
- **All Branches** - Shows combined data from all store locations
- **Specific Branch** - View data from any individual branch

## Changes Made

### 1. Created DashboardBranchFilter Component
**File**: `src/components/DashboardBranchFilter.tsx`

A new dropdown component that:
- Displays all active branches from the `store_locations` table
- Shows "All Branches" option for combined data view
- Defaults to the current branch on load
- Provides visual feedback with icons and badges (main branch indicator)
- Supports both light and dark themes
- Shows branch details (name, code, city)

**Features**:
- ✅ Dropdown with all active branches
- ✅ "All Branches" option for viewing combined data
- ✅ Visual indicator for selected branch
- ✅ Main branch badge
- ✅ Responsive design
- ✅ Theme support (light/dark)

### 2. Created DashboardBranchContext
**File**: `src/context/DashboardBranchContext.tsx`

A React Context that manages the dashboard branch filter state:
- `dashboardBranchId`: Currently selected branch ID (null = all branches)
- `setDashboardBranchId`: Function to change the selected branch
- `isViewingAllBranches`: Boolean flag indicating if viewing all branches

**Why a separate context?**
- Isolates dashboard filtering from the global branch context
- Allows viewing dashboard data from any branch without affecting the user's current working branch
- Enables easy sharing of filter state across all dashboard widgets

### 3. Updated DashboardPage
**File**: `src/features/shared/pages/DashboardPage.tsx`

**Key Changes**:

#### a. Component Structure
Split into two components:
- `DashboardPageContent`: The main dashboard component that uses the context
- `DashboardPage`: Wrapper that provides the DashboardBranchContext

#### b. Branch Filter Integration
- Added `DashboardBranchFilter` component to the header (visible for admins only)
- Positioned next to the date range selector for easy access
- Integrated with the dashboard data loading logic

#### c. Data Loading with Branch Filter
The dashboard now:
1. Temporarily sets `localStorage` branch to the selected dashboard branch
2. Loads dashboard stats using the dashboard service
3. Restores the original branch to localStorage
4. This ensures all widgets and charts respect the selected branch filter

**Applied to**:
- Initial data load (`useEffect` on mount)
- Auto-refresh (every 5 minutes)
- Manual refresh button

#### d. Admin-Only Feature
The branch filter is only shown when:
```typescript
{currentUser?.role === 'admin' && (
  <DashboardBranchFilter
    onBranchChange={handleBranchChange}
    defaultToCurrent={true}
  />
)}
```

## How It Works

### Data Flow

1. **User selects a branch** in the DashboardBranchFilter dropdown
   
2. **Context updates** the `dashboardBranchId` state

3. **Dashboard re-loads data** with the new branch filter:
   ```typescript
   // Temporarily set branch for filtering
   if (dashboardBranchId !== null) {
     localStorage.setItem('current_branch_id', dashboardBranchId);
   } else {
     localStorage.removeItem('current_branch_id'); // All branches
   }
   
   // Load dashboard stats (will use the branch filter)
   const stats = await dashboardService.getDashboardStats(...);
   
   // Restore original branch
   localStorage.setItem('current_branch_id', originalBranchId);
   ```

4. **All widgets and charts** automatically use the filtered data because:
   - The dashboard service uses `getCurrentBranchId()` from `branchAwareApi`
   - This function reads from localStorage
   - All queries are filtered by the branch in localStorage

### Default Behavior

**On Dashboard Load**:
- ✅ Defaults to showing the current branch data
- ✅ Admin can switch to "All Branches" to see combined data
- ✅ Admin can select any specific branch to view its data

**Non-Admin Users**:
- Don't see the branch filter
- Always see data from their current branch (as before)

## Usage

### For Admins

1. **Open Dashboard** (`/dashboard` or `/dashboard/admin`)
   - Branch filter appears in the top-right, next to date range selector
   - Default shows current branch data

2. **View All Branches**:
   - Click the branch filter dropdown
   - Select "All Branches"
   - Dashboard refreshes to show combined data

3. **View Specific Branch**:
   - Click the branch filter dropdown
   - Select any branch from the list
   - Dashboard refreshes to show that branch's data

4. **Return to Current Branch**:
   - Simply select your current branch from the dropdown
   - Or reload the page (defaults to current branch)

## Technical Details

### Branch Filter State Management

```typescript
// Context initialization (defaults to current branch)
const [dashboardBranchId, setDashboardBranchIdState] = useState<string | null>(() => {
  return getCurrentBranchId(); // Current branch from localStorage
});
```

### Temporary Branch Switching

The implementation uses a "temporary switch" pattern:
```typescript
// 1. Save original branch
const originalBranchId = localStorage.getItem('current_branch_id');

// 2. Set dashboard branch for filtering
if (dashboardBranchId !== null) {
  localStorage.setItem('current_branch_id', dashboardBranchId);
} else {
  localStorage.removeItem('current_branch_id'); // All branches
}

// 3. Load data (uses the dashboard branch)
const stats = await dashboardService.getDashboardStats(...);

// 4. Restore original branch (user's working branch unchanged)
if (originalBranchId) {
  localStorage.setItem('current_branch_id', originalBranchId);
}
```

This ensures:
- Dashboard views data from the selected branch
- User's working branch remains unchanged
- Other parts of the app aren't affected

### Auto-Refresh Behavior

The dashboard auto-refreshes every 5 minutes using the selected branch filter:
- Respects the current branch filter setting
- No need for manual refresh after branch change
- Maintains the selected filter across refreshes

## Affected Components

### Direct Changes
1. ✅ `src/components/DashboardBranchFilter.tsx` (NEW)
2. ✅ `src/context/DashboardBranchContext.tsx` (NEW)
3. ✅ `src/features/shared/pages/DashboardPage.tsx` (UPDATED)

### Indirect Benefits
All dashboard widgets automatically respect the branch filter:
- FinancialWidget
- SalesWidget
- InventoryWidget
- AnalyticsWidget
- CustomerInsightsWidget
- TopProductsWidget
- ExpensesWidget
- PurchaseOrderWidget
- DeviceStatusChart
- RevenueTrendChart
- SalesChart
- PaymentMethodsChart
- And all other dashboard components

## Testing Checklist

### Admin User Testing
- [ ] Default shows current branch data on dashboard load
- [ ] Branch filter dropdown appears in header
- [ ] Can select "All Branches" to view combined data
- [ ] Can select specific branch to view its data
- [ ] Dashboard data refreshes when branch changes
- [ ] Date range filter works with branch filter
- [ ] Manual refresh respects branch filter
- [ ] Auto-refresh (5 min) respects branch filter
- [ ] Branch filter persists during dashboard session
- [ ] User's working branch remains unchanged after viewing different branch data

### Non-Admin User Testing
- [ ] Branch filter does NOT appear for non-admin users
- [ ] Dashboard shows only their current branch data
- [ ] Behavior unchanged from before (backward compatible)

### Widget Testing
- [ ] All charts show correct branch-filtered data
- [ ] All widgets show correct branch-filtered data
- [ ] Financial summaries calculate correctly for selected branch
- [ ] Sales data matches selected branch
- [ ] Inventory data matches selected branch

## Future Enhancements

### Possible Improvements
1. **Branch Comparison View**
   - Side-by-side comparison of multiple branches
   - Visual charts comparing branch performance

2. **Filter Persistence**
   - Remember last selected filter in localStorage
   - Apply same filter on next dashboard visit

3. **Branch Performance Metrics**
   - Ranking of branches by revenue
   - Comparative analytics between branches

4. **Export with Branch Filter**
   - Export dashboard data for specific branch
   - Generate branch-specific reports

5. **Multi-Branch Selection**
   - Allow selecting multiple branches
   - View combined data from selected branches only

## Notes

- **Admin-Only Feature**: Only users with `role === 'admin'` can see and use the branch filter
- **Default Behavior**: Always defaults to current branch (not all branches)
- **Non-Breaking**: Non-admin users see no changes in behavior
- **Backward Compatible**: Existing dashboard functionality remains unchanged
- **Performance**: Branch switching triggers data reload (expected behavior)

## Support

For questions or issues:
1. Check console logs for branch filter changes (look for `📊 Dashboard branch`)
2. Verify user role is 'admin' to see the filter
3. Confirm branches are active in `store_locations` table
4. Check that dashboard service is fetching with correct branch filter

---

**Implementation Date**: October 22, 2025
**Status**: ✅ Complete and Ready for Testing

