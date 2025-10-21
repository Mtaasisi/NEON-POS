# 🎛️ Branch Isolation Toggle Guide

## Overview

Your system now has **centralized control** for branch isolation! You can easily enable or disable branch isolation for different modules from one place.

## Configuration Location

**File**: `src/features/lats/lib/data/provider.supabase.ts`

Look for the `ISOLATION_CONFIG` object at the top:

```typescript
// 🔒 BRANCH ISOLATION SETTINGS
// Toggle these to enable/disable branch isolation for different modules
const ISOLATION_CONFIG = {
  ENABLE_PURCHASE_ORDER_ISOLATION: true,  // Purchase orders isolation
  ENABLE_PRODUCT_ISOLATION: true,         // Products & inventory isolation
  ENABLE_SALES_ISOLATION: true,           // Sales & transactions isolation
  ENABLE_DEVICE_ISOLATION: true,          // Devices & repairs isolation (NEW)
  ENABLE_PAYMENT_ISOLATION: true          // Payment records isolation (NEW)
};
```

## How to Toggle Isolation

### Turn OFF Device Isolation
```typescript
const ISOLATION_CONFIG = {
  // ... other settings
  ENABLE_DEVICE_ISOLATION: false,  // ❌ Disabled - all branches see all devices
  ENABLE_PAYMENT_ISOLATION: true
};
```

### Turn OFF Payment Isolation
```typescript
const ISOLATION_CONFIG = {
  // ... other settings
  ENABLE_DEVICE_ISOLATION: true,
  ENABLE_PAYMENT_ISOLATION: false  // ❌ Disabled - all branches see all payments
};
```

### Turn OFF All Isolation (Multi-tenant Mode OFF)
```typescript
const ISOLATION_CONFIG = {
  ENABLE_PURCHASE_ORDER_ISOLATION: false,
  ENABLE_PRODUCT_ISOLATION: false,
  ENABLE_SALES_ISOLATION: false,
  ENABLE_DEVICE_ISOLATION: false,
  ENABLE_PAYMENT_ISOLATION: false
};
```

### Turn ON All Isolation (Multi-tenant Mode ON)
```typescript
const ISOLATION_CONFIG = {
  ENABLE_PURCHASE_ORDER_ISOLATION: true,
  ENABLE_PRODUCT_ISOLATION: true,
  ENABLE_SALES_ISOLATION: true,
  ENABLE_DEVICE_ISOLATION: true,
  ENABLE_PAYMENT_ISOLATION: true
};
```

## What Each Setting Does

| Setting | When ON (true) | When OFF (false) |
|---------|---------------|------------------|
| **ENABLE_PURCHASE_ORDER_ISOLATION** | Only shows POs from current branch | Shows all POs from all branches |
| **ENABLE_PRODUCT_ISOLATION** | Only shows products from current branch | Shows all products from all branches |
| **ENABLE_SALES_ISOLATION** | Only shows sales from current branch | Shows all sales from all branches |
| **ENABLE_DEVICE_ISOLATION** | Only shows devices from current branch | Shows all devices from all branches |
| **ENABLE_PAYMENT_ISOLATION** | Only shows payments from current branch | Shows all payments from all branches |

## Use Cases

### 1. Single Branch Business
**Recommendation**: Turn OFF all isolation
```typescript
// All settings = false
```
**Why**: No need for isolation if you only have one location.

### 2. Multi-Branch with Shared Inventory
**Recommendation**: 
```typescript
ENABLE_DEVICE_ISOLATION: true,        // Devices stay in their branch
ENABLE_PAYMENT_ISOLATION: true,       // Payments stay in their branch
ENABLE_PRODUCT_ISOLATION: false,      // Products are shared
ENABLE_PURCHASE_ORDER_ISOLATION: true, // POs stay in their branch
ENABLE_SALES_ISOLATION: true          // Sales stay in their branch
```

### 3. Completely Isolated Branches
**Recommendation**: Turn ON all isolation
```typescript
// All settings = true
```
**Why**: Each branch operates independently.

### 4. Franchise Model
**Recommendation**:
```typescript
ENABLE_DEVICE_ISOLATION: true,
ENABLE_PAYMENT_ISOLATION: true,
ENABLE_PRODUCT_ISOLATION: true,
ENABLE_PURCHASE_ORDER_ISOLATION: true,
ENABLE_SALES_ISOLATION: true
```
**Why**: Each franchise needs complete isolation.

### 5. Testing/Development
**Recommendation**: Turn OFF isolation temporarily
```typescript
// All settings = false for easier testing
```
**Why**: See all data across branches during development.

## How It Works

### When Isolation is ON
```typescript
// Example: Devices
if (ISOLATION_CONFIG.ENABLE_DEVICE_ISOLATION && currentBranchId) {
  query = query.eq('branch_id', currentBranchId);  // ✅ Filter by branch
}
```

### When Isolation is OFF
```typescript
// Example: Devices
if (ISOLATION_CONFIG.ENABLE_DEVICE_ISOLATION && currentBranchId) {
  // ❌ This block is skipped - no filtering
}
// Result: All devices from all branches are returned
```

## Migration Considerations

### Already Ran the Migration?
✅ **Good news**: The migration added `branch_id` columns to all tables. You can toggle isolation ON/OFF without running migrations again.

### Haven't Ran the Migration Yet?
You have two options:

**Option 1**: Run migration + Use isolation
1. Run `./run-device-isolation-migration.sh`
2. Keep isolation settings ON
3. Data is properly isolated

**Option 2**: Skip migration + No isolation
1. Don't run the migration
2. Set isolation settings to OFF
3. System works as before (no branch_id columns needed)

## Dynamic Toggle (Advanced)

You can make isolation toggleable per user or per session:

```typescript
// Add to localStorage
const getUserIsolationPreference = () => {
  const pref = localStorage.getItem('enable_branch_isolation');
  return pref === null ? true : pref === 'true';
};

const ISOLATION_CONFIG = {
  ENABLE_DEVICE_ISOLATION: getUserIsolationPreference(),
  // ... etc
};
```

Or make it an admin setting:

```typescript
// In your admin panel
<Toggle
  checked={isolationEnabled}
  onChange={(enabled) => {
    // Save to database or localStorage
    localStorage.setItem('enable_branch_isolation', enabled);
    // Reload app
    window.location.reload();
  }}
  label="Enable Branch Isolation"
/>
```

## Performance Impact

### Isolation ON
- ✅ Faster queries (fewer records to scan)
- ✅ Better scalability (data grows per branch, not globally)
- ✅ Indexed queries on `branch_id`

### Isolation OFF
- ⚠️ Slower queries (more records to scan)
- ⚠️ No filtering overhead
- ℹ️ Good for small datasets (<10,000 records)

## Testing Your Changes

After changing isolation settings:

```javascript
// 1. Clear any caches
localStorage.clear();
sessionStorage.clear();

// 2. Set a test branch
localStorage.setItem('current_branch_id', 'test-branch-id');

// 3. Reload the app
window.location.reload();

// 4. Check what data appears
// - If isolation ON: Only data from 'test-branch-id'
// - If isolation OFF: All data from all branches
```

## Troubleshooting

### Not Seeing Data After Turning OFF Isolation?
```javascript
// Check if branch_id was set during isolation
// You may need to clear browser cache
localStorage.clear();
window.location.reload();
```

### Seeing Too Much Data After Turning ON Isolation?
```javascript
// Make sure branch_id is set correctly
console.log('Current Branch:', localStorage.getItem('current_branch_id'));

// Make sure migration was run
// Check database for branch_id columns
```

### Mixed Results (Some Isolated, Some Not)?
- Check that you saved the file after editing `ISOLATION_CONFIG`
- Rebuild your app if using a build process
- Clear browser cache
- Check browser console for errors

## Best Practices

1. **Document Your Choice**: Comment why you chose to enable/disable certain isolation
   ```typescript
   const ISOLATION_CONFIG = {
     // We share products across branches for easier inventory management
     ENABLE_PRODUCT_ISOLATION: false,
     
     // But keep devices separate since they're location-specific
     ENABLE_DEVICE_ISOLATION: true
   };
   ```

2. **Test Before Production**: Toggle settings in development first

3. **Backup First**: Before changing isolation settings in production, backup your database

4. **Monitor Performance**: Watch query performance after changing isolation

5. **User Communication**: Tell users if data visibility will change

## Summary

- ✅ **Easy Control**: Change one setting to toggle isolation
- ✅ **Flexible**: Different settings for different modules
- ✅ **No Code Changes**: Just flip a boolean
- ✅ **Immediate Effect**: Changes apply on next page load
- ✅ **Reversible**: Can always toggle back

---

**Current Status**: All isolation settings are ON by default for maximum security and data separation.

**File to Edit**: `src/features/lats/lib/data/provider.supabase.ts`

**Takes Effect**: After page reload

