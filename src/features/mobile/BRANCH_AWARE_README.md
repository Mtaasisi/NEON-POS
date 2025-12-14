# Branch-Aware Mobile App Documentation

## Overview

The mobile app has been fully implemented with branch awareness, allowing users to view and manage data specific to their selected branch. This implementation ensures data isolation based on branch settings while providing a seamless user experience.

## Features Implemented

### 1. **Branch Context Hook** (`useMobileBranch`)
- Location: `src/features/mobile/hooks/useMobileBranch.ts`
- Provides branch context to all mobile pages
- Manages current branch selection
- Handles branch switching
- Determines data sharing based on isolation mode

### 2. **Branch Selector Component**
- Location: `src/features/mobile/components/MobileBranchSelector.tsx`
- iOS-style branch selector
- Displays current branch name and location
- Shows branch isolation mode (Shared, Isolated, Hybrid)
- Beautiful modal for switching branches
- Integrated in mobile layout header

### 3. **Branch-Aware Data Fetching**
All mobile pages have been updated to fetch data according to the selected branch:

#### **MobileInventory** (`pages/MobileInventory.tsx`)
- ✅ Fetches products filtered by branch
- ✅ Respects data isolation mode
- ✅ Reloads data when branch changes
- ✅ Shows only products belonging to current branch or shared products

#### **MobilePOS** (`pages/MobilePOS.tsx`)
- ✅ Loads branch-specific products
- ✅ Includes branch ID in sale transactions
- ✅ Reloads products when branch changes
- ✅ Associates sales with the correct branch

#### **MobileClients** (`pages/MobileClients.tsx`)
- ✅ Fetches customers filtered by branch
- ✅ Supports both `customers` and `lats_customers` tables
- ✅ Calculates statistics based on branch-specific data
- ✅ Reloads data when branch changes

#### **MobileProductDetail** (`pages/MobileProductDetail.tsx`)
- ✅ Verifies product belongs to current branch
- ✅ Redirects if product not accessible in current branch
- ✅ Reloads product data when branch changes
- ✅ Shows branch-specific inventory levels

#### **MobileDashboard** (`pages/MobileDashboard.tsx`)
- ✅ Shows branch-specific sales statistics
- ✅ Displays branch-filtered customers and products
- ✅ Recent activities filtered by branch
- ✅ Today's summary reflects current branch only
- ✅ Reloads all data when branch changes

## How It Works

### Data Isolation Modes

The system supports three data isolation modes:

1. **Shared Mode** (`shared`)
   - All data is visible across all branches
   - No filtering applied
   - Best for small businesses with single location

2. **Isolated Mode** (`isolated`)
   - Only branch-specific data is visible
   - Strict data separation
   - Best for franchises or independent locations

3. **Hybrid Mode** (`hybrid`)
   - Selective sharing based on entity type
   - Can share products but isolate customers
   - Most flexible option

### Branch Filter Logic

The `applyBranchFilter` function (in `useMobileBranch.ts`) applies appropriate filters based on:
- Current branch ID
- Data isolation mode
- Entity-specific sharing settings

```typescript
// Example: Filtering products
if (mode === 'isolated') {
  query = query.eq('branch_id', branchId);
} else if (mode === 'hybrid') {
  query = query.or(`branch_id.eq.${branchId},is_shared.eq.true,branch_id.is.null`);
}
```

### Branch Change Events

When a user switches branches:
1. `useMobileBranch.switchBranch()` updates the current branch
2. Branch ID is saved to localStorage
3. Custom event `branchChanged` is dispatched
4. All pages listening to this event reload their data
5. Toast notification confirms the switch

## Database Schema Requirements

### Tables with Branch Support

Ensure these fields exist in your tables:

```sql
-- Products
ALTER TABLE lats_products ADD COLUMN IF NOT EXISTS branch_id UUID;
ALTER TABLE lats_products ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;

-- Customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS branch_id UUID;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;
ALTER TABLE lats_customers ADD COLUMN IF NOT EXISTS branch_id UUID;
ALTER TABLE lats_customers ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;

-- Sales
ALTER TABLE lats_sales ADD COLUMN IF NOT EXISTS branch_id UUID;

-- Store Locations (Branches)
-- Should already exist with these fields:
-- id, name, code, city, is_main, is_active, data_isolation_mode,
-- share_products, share_customers, share_inventory
```

## Usage Guide

### For Users

1. **Viewing Current Branch**
   - Branch selector is displayed at the top of every mobile page
   - Shows current branch name and city
   - Displays isolation mode badge

2. **Switching Branches**
   - Tap the branch selector
   - Choose from available branches
   - Confirmation toast appears
   - All data reloads automatically

3. **Understanding Data**
   - Products, customers, and sales are filtered by your current branch
   - Shared items (if enabled) appear in all branches
   - Statistics reflect only current branch data

### For Developers

1. **Adding Branch Awareness to New Pages**

```typescript
import { useMobileBranch, applyBranchFilter } from '../hooks/useMobileBranch';

const MyPage = () => {
  const { currentBranch, loading, isDataShared } = useMobileBranch();

  useEffect(() => {
    const fetchData = async () => {
      if (loading) return;

      let query = supabase.from('my_table').select('*');

      if (currentBranch) {
        const dataShared = isDataShared('products'); // or 'customers'
        query = applyBranchFilter(
          query,
          currentBranch.id,
          currentBranch.data_isolation_mode,
          dataShared
        );
      }

      const { data } = await query;
      // Handle data
    };

    fetchData();

    // Listen for branch changes
    const handleBranchChange = () => fetchData();
    window.addEventListener('branchChanged', handleBranchChange);
    return () => window.removeEventListener('branchChanged', handleBranchChange);
  }, [currentBranch, loading]);
};
```

2. **Including Branch ID in Transactions**

```typescript
const saleData = {
  customerId: selectedCustomer?.id,
  branchId: currentBranch?.id, // Important!
  items: [...],
  total: finalAmount
};
```

## Testing Checklist

### Branch Switching
- ✅ Switch between branches using selector
- ✅ Data reloads on all pages after switch
- ✅ Correct branch name displayed
- ✅ Toast notification appears

### Data Isolation
- ✅ Isolated mode: Only branch-specific data visible
- ✅ Shared mode: All data visible
- ✅ Hybrid mode: Selective data visible
- ✅ Shared items visible across branches

### Mobile Pages
- ✅ **Dashboard**: Shows branch-specific statistics
- ✅ **Inventory**: Displays branch products
- ✅ **POS**: Loads branch products, saves with branch ID
- ✅ **Clients**: Shows branch customers
- ✅ **Product Detail**: Verifies branch access

### Edge Cases
- ✅ No branches: Handles gracefully
- ✅ Single branch: No dropdown, just displays name
- ✅ Product not in branch: Redirects appropriately
- ✅ Branch change during transaction: Data stays consistent

## Performance Considerations

1. **Query Optimization**
   - Branch filters use indexed columns
   - OR conditions are optimized for Postgres
   - Real-time subscriptions respect branch filters

2. **Caching**
   - Branch ID stored in localStorage
   - Reduces API calls on page refresh
   - Instant branch restoration

3. **Event-Driven Updates**
   - Custom events prevent unnecessary re-renders
   - Only active pages reload data
   - Efficient resource usage

## Troubleshooting

### Products Not Showing
1. Check if product has `branch_id` set correctly
2. Verify `is_shared` flag if product should be global
3. Confirm isolation mode settings

### Branch Selector Not Appearing
1. Ensure `store_locations` table has data
2. Check if branches are marked as `is_active = true`
3. Verify MobileLayout is wrapping your routes

### Data Not Updating After Branch Switch
1. Check console for `branchChanged` event
2. Verify page has event listener attached
3. Ensure cleanup function removes listener

### Sales Not Associated with Branch
1. Confirm `branchId` is passed to sale data
2. Check if `lats_sales` table has `branch_id` column
3. Verify sale processing service accepts branch ID

## Future Enhancements

1. **Branch Analytics**
   - Compare performance across branches
   - Branch-specific reports
   - Transfer statistics

2. **Stock Transfers**
   - Move products between branches
   - Track transfer history
   - Approval workflows

3. **Multi-Branch Orders**
   - Order from other branches
   - Consolidated inventory view
   - Inter-branch fulfillment

4. **Branch Permissions**
   - Role-based branch access
   - Manager-specific branches
   - Admin-only settings

## Support

For issues or questions:
1. Check console logs (prefixed with 🏪, 🔍, ✅, ❌, 🔄)
2. Verify database schema matches requirements
3. Test with different isolation modes
4. Review this documentation

## Credits

Branch-aware mobile app implementation completed with:
- Custom React hooks for branch management
- iOS-style UI components
- Event-driven architecture
- Comprehensive data filtering
- Real-time updates

Built with ❤️ for multi-branch POS systems.

