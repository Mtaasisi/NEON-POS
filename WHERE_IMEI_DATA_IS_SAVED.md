# 📍 WHERE IMEI DATA IS SAVED - COMPLETE FLOW

## Overview
When you enter an IMEI in the Serial Number Receiving Modal, here's the complete journey of that data from the UI to the database.

---

## 🎯 **Database Location**

### **Table:** `lats_product_variants`
### **Columns:**

| Column | Data Type | Contains |
|--------|-----------|----------|
| `variant_attributes` | JSONB | **PRIMARY** IMEI storage (NEW system) |
| `attributes` | JSONB | **LEGACY** IMEI storage (backward compatibility) |
| `name` | VARCHAR | Serial number or IMEI (for NOT NULL constraint) |
| `variant_name` | VARCHAR | Descriptive name: "IMEI: 123456789012345" |
| `variant_type` | VARCHAR | Set to `'imei_child'` |
| `parent_variant_id` | UUID | Links to parent variant |

---

## 📊 **Example: What Gets Saved**

When you enter: `123456789012345` in the IMEI field

### **Database Record Created:**
```sql
INSERT INTO lats_product_variants (
  product_id,              -- From purchase order item
  parent_variant_id,       -- The "iPhone X - 128" variant ID
  variant_type,            -- 'imei_child'
  name,                    -- '123456789012345' (for NOT NULL)
  variant_name,            -- 'IMEI: 123456789012345'
  sku,                     -- 'IPH-128-IMEI-012345'
  
  -- ✅ PRIMARY STORAGE (NEW SYSTEM)
  variant_attributes,      -- JSONB: {
                          --   "imei": "123456789012345",
                          --   "serial_number": "SN12345",
                          --   "mac_address": "AA:BB:CC:DD:EE:FF",
                          --   "condition": "new",
                          --   "imei_status": "available",
                          --   "parent_variant_name": "128",
                          --   "added_at": "2025-10-26T...",
                          --   "notes": "Received from PO-001"
                          -- }
  
  -- ✅ LEGACY STORAGE (BACKWARD COMPATIBILITY)
  attributes,              -- JSONB: Same as above
  
  quantity,                -- 1 (each IMEI = 1 unit)
  cost_price,              -- 1000.00
  selling_price,           -- 1200.00
  is_active,               -- TRUE
  branch_id                -- Inherited from parent
)
```

---

## 🔄 **Complete Data Flow**

```
[STEP 1] User Input in Modal
---------------------------------
Location: SerialNumberReceiveModal.tsx
Field: "Serial Number / IMEI"
User Types: "123456789012345"

↓ (Smart Detection)

System Detects: ✓ IMEI (15 digits)
Populates:
  - serial_number: "123456789012345"
  - imei: "123456789012345"

↓

[STEP 2] User Clicks "Continue"
---------------------------------
Location: SerialNumberReceiveModal.tsx
Function: handleConfirmReceive()
Data Structure:
{
  id: "po-item-id",
  receivedQuantity: 1,
  serialNumbers: [{
    serial_number: "123456789012345",
    imei: "123456789012345",  // ← IMEI data here
    location: "Room A",
    cost_price: 1000,
    selling_price: 1200,
    ...
  }]
}

↓

[STEP 3] Sent to Backend
---------------------------------
Location: PurchaseOrderDetailPage.tsx
Function: handleSerialNumberReceive()
Stores temporarily in: tempSerialNumberData
Then opens: SetPricingModal

↓ (After pricing confirmed)

[STEP 4] Process Receiving
---------------------------------
Location: PurchaseOrderDetailPage.tsx
Function: handleConfirmPricingAndReceive()
Calls: PurchaseOrderService.updateReceivedQuantities()

↓

[STEP 5] Backend Service
---------------------------------
Location: purchaseOrderService.ts
Function: processSerialNumbers()

Code:
```typescript
const hasIMEI = receivedItem.serialNumbers.some(
  s => s.imei && s.imei.trim() !== ''
);

if (hasIMEI) {
  // ✅ Use Parent-Child IMEI System
  const variants = receivedItem.serialNumbers
    .filter(serial => serial.imei && serial.imei.trim() !== '')
    .map(serial => ({
      imei: serial.imei!,        // ← IMEI extracted here
      serial_number: serial.serial_number,
      mac_address: serial.mac_address,
      condition: serial.condition || 'new',
      cost_price: serial.cost_price || 0,
      selling_price: serial.selling_price || 0,
      location: serial.location,
      warranty_start: serial.warranty_start,
      warranty_end: serial.warranty_end,
      notes: serial.notes,
      source: 'purchase',
    }));

  // Call IMEI service
  await addIMEIsToParentVariant(
    orderItem.variant_id,  // Parent: "iPhone X - 128"
    variants               // IMEIs to add
  );
}
```

↓

[STEP 6] IMEI Variant Service
---------------------------------
Location: imeiVariantService.ts
Function: addIMEIsToParentVariant()

Loops through each IMEI and calls:
```typescript
await addIMEIToParentVariant(parent_variant_id, imeiData)
```

↓

[STEP 7] Database Function Call
---------------------------------
Location: imeiVariantService.ts
Function: addIMEIToParentVariant()

Calls Database Function:
```typescript
const { data, error } = await supabase.rpc(
  'add_imei_to_parent_variant',  // ← Database function
  {
    parent_variant_id_param: parent_variant_id,
    imei_param: imeiData.imei,  // ← "123456789012345"
    serial_number_param: imeiData.serial_number,
    mac_address_param: imeiData.mac_address,
    cost_price_param: imeiData.cost_price,
    selling_price_param: imeiData.selling_price,
    condition_param: imeiData.condition || 'new',
    notes_param: imeiData.notes,
  }
);
```

↓

[STEP 8] Database Function Execution
---------------------------------
Location: Database (PostgreSQL)
Function: add_imei_to_parent_variant()

This function:
1. Validates IMEI format (15 digits)
2. Checks for duplicates
3. Creates child variant record
4. Updates parent variant stock
5. Creates stock movement record

INSERT Query:
```sql
INSERT INTO lats_product_variants (
  product_id,
  parent_variant_id,
  variant_type,
  name,
  variant_name,
  sku,
  attributes,              -- JSONB with IMEI
  variant_attributes,      -- JSONB with IMEI (primary)
  quantity,
  cost_price,
  selling_price,
  is_active,
  branch_id
) VALUES (
  v_parent_product_id,
  parent_variant_id_param,
  'imei_child',
  COALESCE(serial_number_param, imei_param),
  format('IMEI: %s', imei_param),
  v_parent_sku || '-IMEI-' || SUBSTRING(imei_param, 10, 6),
  jsonb_build_object(
    'imei', imei_param,  // ← SAVED HERE (legacy)
    'serial_number', serial_number_param,
    'mac_address', mac_address_param,
    'condition', condition_param,
    'imei_status', 'available',
    'parent_variant_name', v_parent_variant_name,
    'added_at', NOW(),
    'notes', notes_param
  ),
  jsonb_build_object(
    'imei', imei_param,  // ← SAVED HERE (primary)
    'serial_number', serial_number_param,
    'mac_address', mac_address_param,
    'condition', condition_param,
    'imei_status', 'available',
    'parent_variant_name', v_parent_variant_name,
    'added_at', NOW(),
    'notes', notes_param
  ),
  1,
  COALESCE(cost_price_param, 0),
  COALESCE(selling_price_param, 0),
  true,
  v_parent_branch_id
);
```

↓

[STEP 9] Trigger Executes
---------------------------------
Location: Database
Trigger: trigger_update_parent_stock

Automatically:
1. Calculates parent stock from all children
2. Updates parent.quantity = SUM(children.quantity)
3. Updates product.stock_quantity

↓

✅ DONE! IMEI Saved Successfully
```

---

## 🔍 **How to Query IMEI Data**

### **Find IMEI by Number:**
```sql
SELECT 
  id,
  product_id,
  parent_variant_id,
  variant_name,
  variant_attributes->>'imei' as imei,
  variant_attributes->>'serial_number' as serial_number,
  variant_attributes->>'condition' as condition,
  cost_price,
  selling_price,
  quantity,
  is_active
FROM lats_product_variants
WHERE variant_attributes->>'imei' = '123456789012345';
```

### **Find All IMEIs for a Parent Variant:**
```sql
SELECT 
  variant_attributes->>'imei' as imei,
  variant_attributes->>'serial_number' as serial_number,
  cost_price,
  quantity,
  is_active
FROM lats_product_variants
WHERE parent_variant_id = 'parent-uuid-here'
  AND variant_type = 'imei_child'
ORDER BY created_at DESC;
```

### **Use the Helper Function:**
```sql
SELECT * FROM get_child_imeis('parent-variant-id');
```

---

## 📋 **Key Points**

1. **Primary Storage:** `variant_attributes` JSONB column
2. **Legacy Storage:** `attributes` JSONB column (for backward compatibility)
3. **Variant Type:** Always `'imei_child'`
4. **Parent Link:** `parent_variant_id` connects to main variant
5. **One IMEI = One Row:** Each IMEI gets its own record in `lats_product_variants`
6. **Quantity:** Always 1 (representing one physical device)
7. **Auto-Calculate:** Parent stock automatically updated via trigger

---

## 🔐 **Data Structure in JSONB**

```json
{
  "imei": "123456789012345",
  "serial_number": "SN12345",
  "mac_address": "AA:BB:CC:DD:EE:FF",
  "condition": "new",
  "imei_status": "available",
  "parent_variant_name": "128",
  "added_at": "2025-10-26T10:30:00Z",
  "notes": "Received from PO-001",
  "warranty_start": "2025-10-26",
  "warranty_end": "2026-10-26"
}
```

---

## 🛠️ **Database Function**

The main function that saves IMEI data:

**Function Name:** `add_imei_to_parent_variant()`

**Location:** Database (created by migration)

**Parameters:**
- `parent_variant_id_param` - Parent variant ID
- `imei_param` - The IMEI number (15 digits)
- `serial_number_param` - Serial number
- `mac_address_param` - MAC address
- `cost_price_param` - Cost price
- `selling_price_param` - Selling price
- `condition_param` - Condition (new/used)
- `notes_param` - Additional notes

**Returns:**
```json
{
  "success": true,
  "child_variant_id": "uuid-of-created-child",
  "error_message": null
}
```

---

## ✅ **Verification**

After receiving a PO with IMEI, check the database:

```sql
-- Check if IMEI was saved
SELECT 
  pv.id,
  pv.variant_name,
  pv.variant_attributes->>'imei' as imei,
  pv.quantity,
  pv.parent_variant_id,
  parent.variant_name as parent_name
FROM lats_product_variants pv
LEFT JOIN lats_product_variants parent ON parent.id = pv.parent_variant_id
WHERE pv.variant_type = 'imei_child'
ORDER BY pv.created_at DESC
LIMIT 10;
```

---

**Last Updated:** October 26, 2025  
**System:** Parent-Child Variant Architecture with IMEI Tracking

