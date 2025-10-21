# Sales Funnel Diagnostic Report

Generated: 2025-10-20T09:27:10.202Z

## Summary

The Sales Funnel component exists but is **fetching data from the wrong table**.

### Current Implementation
- **Table**: `devices` (repair/service devices)
- **Stages**: Device repair pipeline stages
- **Purpose**: Tracking repair status, NOT sales

### Expected Implementation
- **Table**: `lats_sales` (actual sales data)
- **Stages**: Sales pipeline stages
- **Purpose**: Tracking sales conversion

## Issues Found

### 1. Wrong Data Source ❌
- Currently querying `devices` table
- Should query `lats_sales` table
- Impact: Shows repair pipeline instead of sales funnel

### 2. Misleading Stage Names ❌
- Current stages represent device repair status
- Not actual sales stages
- Causes confusion for sales analytics

### 3. No Payment Status Tracking ❌
- Not using `payment_status` field
- Cannot track payment conversion
- Missing revenue tracking

## Recommended Fix

Update `SalesFunnelChart.tsx` to:

```typescript
// Fetch sales data
const { data: salesData, error } = await supabase
  .from('lats_sales')
  .select('payment_status, total_amount, created_at')
  .eq('branch_id', currentBranchId);

// Group by payment status
const statusCounts = {
  'Leads': 0,        // Total customers/inquiries
  'Pending': 0,      // payment_status = 'pending'
  'Completed': 0,    // payment_status = 'completed'
  'Failed': 0,       // payment_status = 'failed'
  'Refunded': 0      // payment_status = 'refunded'
};
```

## Testing Instructions

1. Open browser DevTools (F12)
2. Navigate to Dashboard
3. Check Network tab for API calls
4. Verify query uses `lats_sales` table
5. Confirm data shows actual sales records

## Status: ⚠️ NEEDS FIX

The component needs to be updated to query the correct table and track actual sales data.
