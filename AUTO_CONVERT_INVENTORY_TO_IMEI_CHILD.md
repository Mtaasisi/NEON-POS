# Auto-Convert Inventory Items to IMEI Child Variants

## Overview
This system automatically converts legacy `inventory_items` to IMEI child variants (`lats_product_variants` with `variant_type = 'imei_child'`) when they are created or updated with a serial number or IMEI.

## How It Works

### Triggers
1. **`trigger_auto_convert_inventory_to_imei_child`** - Fires on INSERT
2. **`trigger_auto_convert_inventory_on_update`** - Fires on UPDATE when status changes to 'available'

### Conversion Logic

The system automatically converts an inventory item to an IMEI child variant when:
- ✅ `variant_id` is set (item belongs to a parent variant)
- ✅ `status = 'available'`
- ✅ Has a `serial_number` OR `imei` (not empty)

### Processing Steps

1. **Check if conversion is needed**
   - Validates that all required fields are present
   - Checks if an IMEI child variant already exists (prevents duplicates)

2. **Determine identifier type**
   - Uses `COALESCE(imei, serial_number)` as the identifier
   - Checks if identifier is a valid 15-digit numeric IMEI: `^[0-9]{15}$`

3. **Create IMEI child variant**
   - **For 15-digit numeric IMEIs:**
     - Sets both `imei` and `serial_number` in `variant_attributes`
   - **For non-numeric identifiers:**
     - Sets only `serial_number` in `variant_attributes` (IMEI field is NULL to comply with database constraint)

4. **Mark inventory item as sold**
   - Updates the original inventory item: `status = 'sold'`
   - Preserves the item for historical records

5. **Parent variant stock**
   - Automatically updated by existing trigger: `trigger_sync_parent_quantity_on_imei_change`

## Database Functions

### `auto_convert_inventory_item_to_imei_child()`
- Handles conversion on INSERT
- Temporarily disables validation triggers to allow non-numeric identifiers
- Creates IMEI child variant with proper attributes
- Marks inventory item as sold

### `auto_convert_inventory_item_on_update()`
- Handles conversion on UPDATE when status changes to 'available'
- Same logic as INSERT function
- Prevents duplicate conversions

## Example

### Before (Legacy Inventory Item)
```sql
inventory_items:
- id: abc-123
- product_id: prod-456
- variant_id: parent-789
- serial_number: 'EQWEQWEWQE'
- status: 'available'
```

### After (Auto-Converted)
```sql
lats_product_variants:
- id: xyz-999
- parent_variant_id: parent-789
- variant_type: 'imei_child'
- variant_attributes: {
    "serial_number": "EQWEQWEWQE",
    "imei": null,  -- NULL because not 15-digit numeric
    "notes": "Auto-converted from inventory_items (non-numeric identifier)",
    "auto_converted_at": "2025-01-20T15:00:00Z",
    "original_inventory_item_id": "abc-123"
  }

inventory_items:
- id: abc-123
- status: 'sold'  -- Marked as sold
```

## Benefits

1. **Automatic Migration**: No manual intervention needed
2. **Data Integrity**: Prevents duplicates by checking existing IMEI children
3. **Historical Preservation**: Original inventory items marked as sold, not deleted
4. **Consistent Structure**: All devices stored as IMEI child variants
5. **Stock Accuracy**: Parent variant stock automatically updated

## Notes

- Non-numeric identifiers (like "EQWEQWEWQE") are stored with only `serial_number` (no `imei` field) to comply with the database constraint that requires IMEI to be exactly 15 digits
- The system treats IMEI and serial_number as the same value (synced in the application layer)
- Conversion happens automatically in the background - no API calls or manual steps required

