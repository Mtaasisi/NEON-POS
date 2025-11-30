# Branch Data Isolation - Complete Integration Guide

## Overview
This document outlines the complete integration of branch-based data isolation across the NEON-POS system. All data types now respect branch isolation settings configured in the `store_locations` table.

## Current Configuration

### Database Settings (Verified)
```sql
-- Both branches configured as:
data_isolation_mode: 'hybrid'
share_products: false      -- Products ISOLATED
share_inventory: false     -- Inventory/Variants ISOLATED  
share_customers: true      -- Customers SHARED
share_suppliers: true      -- Suppliers SHARED
share_accounts: false      -- Payment Accounts ISOLATED
```

## Core Integration Points

### 1. Branch-Aware API (`src/lib/branchAwareApi.ts`)

#### `isDataShared(entityType)`
- **Purpose**: Checks if a specific entity type is shared based on branch settings
- **Entity Types Supported**:
  - `products`, `customers`, `inventory`, `suppliers`, `categories`
  - `employees`, `payments`, `accounts`, `gift_cards`
  - `quality_checks`, `recurring_expenses`, `communications`, `reports`, `finance_transfers`
- **Logic**:
  - `shared` mode: Always returns `true`
  - `isolated` mode: Always returns `false`
  - `hybrid` mode: Returns the specific `share_*` flag value

#### `addBranchFilter(query, entityType)`
- **Purpose**: Applies branch filtering to any Supabase query
- **Usage**: `const filteredQuery = await addBranchFilter(query, 'products');`
- **Behavior**:
  - **Shared**: No filter applied (shows all data)
  - **Isolated**: Filters by `branch_id = currentBranchId` (ignores `is_shared`)
  - **Hybrid**: 
    - If shared: Shows `branch_id = currentBranchId OR is_shared = true OR branch_id IS NULL`
    - If isolated: Shows only `branch_id = currentBranchId`

### 2. Product Isolation

#### Files Modified:
- ✅ `src/lib/latsProductApi.ts` - `_getProductsImpl()` - Filters products by `share_products`
- ✅ `src/lib/latsProductApi.ts` - Variant filtering - Filters variants by `share_inventory`
- ✅ `src/lib/branchAwareApi.ts` - `getBranchProducts()` - Uses `isDataShared('products')`
- ✅ `src/lib/deduplicatedQueries.ts` - `fetchInventoryStats()` - Filters products and variants
- ✅ `src/services/fullDatabaseDownloadService.ts` - `downloadProducts()` - Respects isolation
- ✅ `src/features/lats/lib/data/provider.supabase.ts` - `getProductVariants()` - Filters variants
- ✅ `src/features/lats/lib/variantHelpers.ts` - `loadParentVariants()` - Filters variants
- ✅ `src/features/lats/lib/variantHelpers.ts` - `calculateParentStock()` - Filters children

#### Product Creation:
- ✅ Products automatically assigned to current branch (`branch_id = currentBranchId`)
- ✅ Variants automatically inherit product's `branch_id`
- ✅ Database triggers ensure variants get correct `branch_id`

### 3. Inventory/Variant Isolation

#### Files Modified:
- ✅ `src/lib/latsProductApi.ts` - Variant queries respect `share_inventory`
- ✅ `src/features/lats/lib/realTimeStock.ts` - `getStockLevels()` - Filters by branch
- ✅ `src/features/lats/lib/liveInventoryService.ts` - Filters variants by branch
- ✅ `src/lib/deduplicatedQueries.ts` - `fetchInventoryStats()` - Filters variants
- ✅ `src/services/fullDatabaseDownloadService.ts` - Variant filtering
- ✅ `src/features/lats/lib/data/provider.supabase.ts` - `getProductVariants()` - Branch filtering
- ✅ `src/features/lats/lib/variantHelpers.ts` - All variant queries filtered

### 4. Customer Sharing

#### Files Modified:
- ✅ `src/lib/customerApi/core.ts` - `performFetchAllCustomers()` - Respects `share_customers`
- ✅ `src/lib/customerApi/core.ts` - `performFetchAllCustomersLight()` - Respects `share_customers`
- ✅ `src/lib/customerApi/core.ts` - `performFetchAllCustomersSimple()` - Respects `share_customers`
- ✅ `src/lib/branchAwareApi.ts` - `addBranchFilter()` - Handles customers entity type

### 5. Supplier Sharing

#### Files Modified:
- ✅ `src/lib/supplierApi.ts` - `getActiveSuppliers()` - Uses `addBranchFilter('suppliers')`
- ✅ `src/lib/supplierApi.ts` - `getAllSuppliers()` - Uses `addBranchFilter('suppliers')`
- ✅ `src/lib/deduplicatedQueries.ts` - `fetchSuppliers()` - Uses `addBranchFilter('suppliers')`
- ✅ `src/lib/branchAwareApi.ts` - `isDataShared()` - Checks `share_suppliers`

### 6. Payment Accounts Isolation

#### Files Modified:
- ✅ `src/lib/deduplicatedQueries.ts` - `fetchPaymentMethods()` - Uses `addBranchFilter('accounts')`
- ✅ `src/lib/financeAccountService.ts` - `getPaymentMethods()` - Uses `addBranchFilter('accounts')`
- ✅ `src/lib/branchAwareApi.ts` - `addBranchFilter()` - Handles accounts entity type
- ✅ `src/features/payments/components/ExpenseManagement.tsx` - Removed client-side filtering override

### 7. UI Components

#### Files Modified:
- ✅ `src/features/admin/components/StoreManagementSettings.tsx` - Added `data_isolation_mode` dropdown
- ✅ `src/features/admin/components/StoreManagementSettings.tsx` - Disables individual toggles when mode is 'shared' or 'isolated'
- ✅ `src/features/lats/components/inventory/EnhancedInventoryTab.tsx` - Shows products even with 0 variants
- ✅ `src/features/shared/components/dashboard/StockLevelChart.tsx` - Fixed NaN handling for isolated branches

## Data Flow

### Query Flow:
```
1. User Action (e.g., load products)
   ↓
2. API Function (e.g., getProducts())
   ↓
3. Get Branch Settings (from store_locations)
   ↓
4. Check isDataShared(entityType)
   ↓
5. Apply addBranchFilter(query, entityType)
   ↓
6. Execute Filtered Query
   ↓
7. Return Branch-Filtered Results
```

### Creation Flow:
```
1. User Creates Entity (e.g., product)
   ↓
2. Get Current Branch ID (from localStorage)
   ↓
3. Assign branch_id to Entity
   ↓
4. If Variant: Inherit branch_id from Product
   ↓
5. Save to Database
```

## Isolation Modes

### 1. Shared Mode (`data_isolation_mode = 'shared'`)
- **Behavior**: All data types are shared across all branches
- **Filter Applied**: None (shows all data)
- **Use Case**: Single-store operations or fully shared multi-branch

### 2. Isolated Mode (`data_isolation_mode = 'isolated'`)
- **Behavior**: All data types are isolated per branch
- **Filter Applied**: `branch_id = currentBranchId` (ignores `is_shared` flag)
- **Use Case**: Completely independent branches

### 3. Hybrid Mode (`data_isolation_mode = 'hybrid'`) ⭐ RECOMMENDED
- **Behavior**: Each data type can be configured individually
- **Filter Applied**: Based on specific `share_*` flags
- **Use Case**: Flexible multi-branch operations
- **Current Setup**:
  - Products: Isolated (`share_products = false`)
  - Inventory: Isolated (`share_inventory = false`)
  - Customers: Shared (`share_customers = true`)
  - Suppliers: Shared (`share_suppliers = true`)
  - Accounts: Isolated (`share_accounts = false`)

## Key Functions Reference

### Core Functions:
```typescript
// Check if entity type is shared
const isShared = await isDataShared('products');

// Apply branch filter to query
const filteredQuery = await addBranchFilter(query, 'products');

// Get branch settings
const branch = await getBranchSettings(branchId);

// Get current branch ID
const branchId = getCurrentBranchId();
```

### Product Functions:
```typescript
// Get products (automatically filtered)
const products = await getProducts();

// Get single product
const product = await getProduct(productId);

// Get product variants (automatically filtered)
const variants = await provider.getProductVariants(productId);
```

### Variant Functions:
```typescript
// Load parent variants (automatically filtered)
const variants = await loadParentVariants(productId);

// Calculate parent stock (automatically filtered)
const stock = await calculateParentStock(variantId);
```

## Testing Checklist

### ✅ Products Isolation
- [x] ARUSHA branch sees only ARUSHA products (90 products)
- [x] DAR branch sees only DAR products (2 products)
- [x] Products created in ARUSHA are not visible in DAR
- [x] Products created in DAR are not visible in ARUSHA

### ✅ Inventory Isolation
- [x] ARUSHA branch sees only ARUSHA variants (235 variants)
- [x] DAR branch sees only DAR variants (2 variants)
- [x] Stock levels are branch-specific
- [x] Variants created in ARUSHA are not visible in DAR

### ✅ Customer Sharing
- [x] Customers visible in all branches
- [x] Customer data is shared across branches

### ✅ Supplier Sharing
- [x] Suppliers visible in all branches
- [x] Supplier data is shared across branches

### ✅ Account Isolation
- [x] Payment accounts are branch-specific
- [x] Accounts created in ARUSHA are not visible in DAR

## Database Schema

### Key Tables:
- `store_locations` - Branch settings and isolation configuration
- `lats_products` - Products with `branch_id` column
- `lats_product_variants` - Variants with `branch_id` column
- `customers` - Customers with `branch_id` and `is_shared` columns
- `lats_suppliers` - Suppliers with `branch_id` column
- `finance_accounts` - Payment accounts with `branch_id` column

### Isolation Flags:
All flags in `store_locations` table:
- `share_products` - Controls product sharing
- `share_inventory` - Controls variant/stock sharing
- `share_customers` - Controls customer sharing
- `share_suppliers` - Controls supplier sharing
- `share_accounts` - Controls payment account sharing
- `share_categories`, `share_employees`, `share_payments`, etc.

## Migration Notes

### When Adding New Entity Types:
1. Add `branch_id` column to the entity table
2. Add `share_<entity>` flag to `store_locations` table
3. Add entity type to `isDataShared()` shareMapping
4. Add entity type to `addBranchFilter()` entityType union
5. Update all fetch functions to use `addBranchFilter()`
6. Ensure creation functions assign `branch_id`

## Best Practices

1. **Always use `addBranchFilter()`** for queries instead of manual filtering
2. **Always assign `branch_id`** when creating entities
3. **Check `isDataShared()`** before applying filters
4. **Use hybrid mode** for flexible configuration
5. **Test isolation** after changing settings
6. **Clear cache** after updating branch settings

## Troubleshooting

### Products showing in wrong branch:
- Check `share_products` flag in database
- Verify `branch_id` is set correctly on products
- Clear browser cache and refresh

### Variants showing in wrong branch:
- Check `share_inventory` flag in database
- Verify `branch_id` is set correctly on variants
- Check variant filtering in `getProductVariants()`

### Data not updating after settings change:
- Clear branch settings cache: `clearBranchCache()`
- Hard refresh browser (Cmd+Shift+R)
- Check console logs for filtering messages

## Files Modified Summary

### Core Files:
- `src/lib/branchAwareApi.ts` - Core isolation logic
- `src/lib/latsProductApi.ts` - Product and variant filtering
- `src/lib/customerApi/core.ts` - Customer filtering
- `src/lib/supplierApi.ts` - Supplier filtering
- `src/lib/deduplicatedQueries.ts` - Stats and supplier queries
- `src/lib/financeAccountService.ts` - Account filtering

### Service Files:
- `src/features/lats/lib/realTimeStock.ts` - Stock level filtering
- `src/features/lats/lib/liveInventoryService.ts` - Live metrics filtering
- `src/services/fullDatabaseDownloadService.ts` - Download filtering

### Provider Files:
- `src/features/lats/lib/data/provider.supabase.ts` - Variant filtering

### Helper Files:
- `src/features/lats/lib/variantHelpers.ts` - Variant query filtering

### UI Files:
- `src/features/admin/components/StoreManagementSettings.tsx` - Settings UI
- `src/features/lats/components/inventory/EnhancedInventoryTab.tsx` - Display logic
- `src/features/shared/components/dashboard/StockLevelChart.tsx` - NaN handling

## Conclusion

All branch isolation changes are now permanently integrated into the codebase. The system supports three isolation modes (shared, isolated, hybrid) with flexible per-entity-type configuration. All data fetching functions respect branch settings, and all creation functions automatically assign entities to the current branch.

