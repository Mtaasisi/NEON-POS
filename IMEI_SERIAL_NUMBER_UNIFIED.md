# IMEI/Serial Number Unified System

## Overview
The system now treats IMEI and Serial Number as the **same field**. You can enter any value (IMEI or Serial Number) and the system will store it in both fields automatically.

## Changes Made

### Database Level

1. **Removed IMEI Validation**
   - `validate_new_imei()` trigger now allows any value (no 15-digit requirement)
   - `check_imei_format` constraint allows any value or NULL

2. **Auto-Sync Fields**
   - `sync_variant_imei_serial_number()` trigger keeps `imei` and `serial_number` in sync
   - When you set one, the other is automatically set to the same value

3. **Updated Functions**
   - `add_imei_to_parent_variant()` accepts any IMEI/Serial Number value
   - Both `imei` and `serial_number` fields are set to the same value
   - No format validation - accepts any string

### UI Level

1. **Single Input Field**
   - IMEIVariantManager: Single "IMEI / Serial Number" field
   - SerialNumberReceiveModal: Single "IMEI / Serial Number" field
   - Both fields automatically sync when you type

2. **Display**
   - All displays show "IMEI / Serial Number" or use the `imei` field (which contains both)
   - VariantHierarchyDisplay uses single identifier
   - VariantSelectionModal uses single identifier

### Code Level

1. **Helper Functions**
   - `getVariantIMEI()` returns value from either `imei` or `serial_number` field
   - All code treats them as the same value

2. **Data Access**
   - When reading: Use `variant_attributes->>'imei'` (contains both IMEI and Serial Number)
   - When writing: Set both fields to the same value (auto-synced by trigger)

## Usage

### In UI
- Enter any value in the "IMEI / Serial Number" field
- No format restrictions
- Can be 15-digit IMEI, serial number, or any identifier

### In Database
- Both `variant_attributes->>'imei'` and `variant_attributes->>'serial_number'` contain the same value
- The database trigger automatically syncs them

### In Code
```typescript
// Reading IMEI/Serial Number
const identifier = variant.variant_attributes?.imei || variant.variant_attributes?.serial_number;

// Writing IMEI/Serial Number (both fields set to same value)
const variantAttributes = {
  imei: identifier,
  serial_number: identifier, // Same value
  // ... other fields
};
```

## Benefits

1. **Flexibility**: Enter any identifier format
2. **Simplicity**: Single field in UI
3. **Consistency**: Database automatically keeps fields in sync
4. **No Validation Errors**: No format restrictions

