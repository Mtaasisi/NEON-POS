# Fix: Serial Number Items Not Adding to Inventory

## Problem
When receiving purchase orders with serial numbers (but no IMEI), inventory items were being created but the variant quantity was not being updated. This caused items to not show up in inventory even though they were received.

## Root Cause
The `createLegacyInventoryItems` function in `purchaseOrderService.ts` was creating `inventory_items` records but not updating the variant quantity. While there's a database trigger that should handle this automatically, it wasn't working reliably.

## Solution
Updated `createLegacyInventoryItems` to explicitly:
1. Update the variant quantity after creating inventory items
2. Create stock movement records for tracking
3. Log the quantity update for debugging

## Changes Made
**File**: `src/features/lats/services/purchaseOrderService.ts`

Added explicit variant quantity update after inserting inventory items:
- Gets current variant quantity
- Adds the number of new inventory items created
- Updates the variant quantity
- Creates a stock movement record
- Logs the update for debugging

## Testing
1. Fixed the variant quantity for the existing purchase order (PO-1763632747493)
2. Updated quantity from 1 to 3 (matching the 3 inventory items created)

## Next Steps
1. Test receiving a new purchase order with serial numbers (no IMEI)
2. Verify that variant quantity updates correctly
3. Check that items appear in inventory

## Note
If you received 5 items but only 3 inventory items were created, it's likely because:
- 2 serial numbers were duplicates (already exist in the system)
- 2 serial numbers were empty or invalid
- Only 3 serial numbers were provided during receiving

The system filters out duplicate serial numbers to prevent data integrity issues.

