# ✅ ENSURE IMEIs ARE CHILDREN OF "128" VARIANT

## Current Architecture

Your system is designed so that:
- **Parent Variant:** "128" (or "iPhone X - 128")
- **Child Variants:** Individual IMEIs (123456789012345, 234567890123456, etc.)

Each IMEI should have `parent_variant_id` pointing to the "128" variant.

---

## 🔍 **Step 1: Verify Current Structure**

Run this query in your Neon database to check the current state:

```sql
-- See the parent-child structure for "128" variant
SELECT 
  parent.id as parent_id,
  parent.variant_name as parent_variant,
  parent.quantity as parent_stock,
  COUNT(child.id) as imei_count,
  STRING_AGG(child.variant_attributes->>'imei', ', ') as imeis
FROM lats_product_variants parent
LEFT JOIN lats_product_variants child 
  ON child.parent_variant_id = parent.id 
  AND child.variant_type = 'imei_child'
WHERE parent.variant_name ILIKE '%128%'
  AND (parent.is_parent = TRUE OR parent.variant_type = 'parent')
GROUP BY parent.id, parent.variant_name, parent.quantity;
```

**Expected Output:**
```
parent_id                              | parent_variant | parent_stock | imei_count | imeis
---------------------------------------|----------------|--------------|------------|-------------------
550e8400-e29b-41d4-a716-446655440000  | 128            | 5            | 5          | 123..., 234...
```

---

## ✅ **How the System Works (It's Automatic!)**

When you receive a PO with IMEIs through the Serial Number modal:

### **What Happens Automatically:**

1. **You enter IMEI:** `123456789012345`
2. **System detects:** "This is an IMEI (15 digits)"
3. **Backend calls:** `addIMEIToParentVariant(parent_id, imeiData)`
4. **Database function:** `add_imei_to_parent_variant()` creates child
5. **Child created with:**
   - ✅ `parent_variant_id` = "128" variant ID
   - ✅ `variant_type` = 'imei_child'
   - ✅ `variant_attributes` → `{"imei": "123456789012345", ...}`

### **The Code That Does This:**

**File:** `src/features/lats/services/purchaseOrderService.ts`

```typescript
// Lines 1600-1612
if (variants.length > 0 && orderItem.variant_id) {
  // ✅ orderItem.variant_id is the "128" parent variant ID from PO
  
  // Ensure parent is marked correctly
  await convertToParentVariant(orderItem.variant_id);
  
  // Add all IMEIs as children of the "128" variant
  const result = await addIMEIsToParentVariant(
    orderItem.variant_id,  // ← This is the "128" variant UUID
    variants               // ← Array of IMEI data
  );
}
```

---

## 📊 **Complete Verification Queries**

### **Query 1: View All IMEIs Under "128"**

```sql
SELECT 
  parent.variant_name as parent,
  child.variant_attributes->>'imei' as imei,
  child.variant_attributes->>'serial_number' as serial,
  child.cost_price,
  child.quantity,
  child.is_active,
  child.created_at
FROM lats_product_variants child
JOIN lats_product_variants parent ON parent.id = child.parent_variant_id
WHERE parent.variant_name ILIKE '%128%'
  AND child.variant_type = 'imei_child'
ORDER BY child.created_at DESC;
```

### **Query 2: Check Parent Stock Calculation**

```sql
-- Parent stock should equal sum of all children
SELECT 
  parent.variant_name,
  parent.quantity as parent_quantity,
  COUNT(child.id) as child_count,
  SUM(child.quantity) as children_total,
  CASE 
    WHEN parent.quantity = SUM(child.quantity) THEN '✅ CORRECT'
    ELSE '❌ NEEDS UPDATE'
  END as status
FROM lats_product_variants parent
LEFT JOIN lats_product_variants child 
  ON child.parent_variant_id = parent.id 
  AND child.variant_type = 'imei_child'
WHERE parent.variant_name ILIKE '%128%'
  AND parent.is_parent = TRUE
GROUP BY parent.id, parent.variant_name, parent.quantity;
```

### **Query 3: Find Any Orphaned IMEIs**

```sql
-- This should return NO rows
SELECT 
  id,
  variant_attributes->>'imei' as imei,
  parent_variant_id,
  'ORPHANED!' as issue
FROM lats_product_variants
WHERE variant_type = 'imei_child'
  AND parent_variant_id IS NULL;
```

---

## 🔧 **If You Need to Fix Issues**

### **Issue 1: IMEIs Without Parent**

If you find IMEIs without a `parent_variant_id`:

```sql
-- First, find the "128" parent variant ID
SELECT id, variant_name 
FROM lats_product_variants 
WHERE variant_name ILIKE '%128%' 
  AND is_parent = TRUE;

-- Then update orphaned IMEIs
UPDATE lats_product_variants
SET parent_variant_id = 'your-128-parent-uuid-here'
WHERE variant_type = 'imei_child'
  AND parent_variant_id IS NULL
  AND variant_attributes->>'imei' IS NOT NULL;
```

### **Issue 2: Parent Not Marked as Parent**

```sql
-- Ensure "128" variant is marked as parent
UPDATE lats_product_variants
SET 
  is_parent = TRUE,
  variant_type = 'parent',
  updated_at = NOW()
WHERE variant_name ILIKE '%128%'
  AND (is_parent IS NULL OR is_parent = FALSE);
```

### **Issue 3: Parent Stock Not Synced**

```sql
-- Manually recalculate parent stock
UPDATE lats_product_variants parent
SET 
  quantity = (
    SELECT COALESCE(SUM(child.quantity), 0)
    FROM lats_product_variants child
    WHERE child.parent_variant_id = parent.id
      AND child.variant_type = 'imei_child'
      AND child.is_active = TRUE
  ),
  updated_at = NOW()
WHERE parent.variant_name ILIKE '%128%'
  AND parent.is_parent = TRUE;
```

---

## 🎯 **Expected Database Structure**

```
lats_product_variants table:

Row 1 (Parent):
├── id: 550e8400-e29b-41d4-a716-446655440000
├── variant_name: "128"
├── variant_type: "parent"
├── is_parent: TRUE
├── parent_variant_id: NULL
└── quantity: 5 (auto-calculated from children)

Row 2 (Child IMEI 1):
├── id: 660e8400-e29b-41d4-a716-446655440001
├── variant_name: "IMEI: 123456789012345"
├── variant_type: "imei_child"
├── is_parent: FALSE
├── parent_variant_id: 550e8400-... (points to Row 1) ✅
├── variant_attributes: {"imei": "123456789012345", ...}
└── quantity: 1

Row 3 (Child IMEI 2):
├── id: 770e8400-e29b-41d4-a716-446655440002
├── variant_name: "IMEI: 234567890123456"
├── variant_type: "imei_child"
├── is_parent: FALSE
├── parent_variant_id: 550e8400-... (points to Row 1) ✅
├── variant_attributes: {"imei": "234567890123456", ...}
└── quantity: 1

... (more IMEI children)
```

---

## 🚀 **When Receiving New POs**

The system **automatically** ensures IMEIs are children of "128":

1. **PO Item has:** `variant_id` = UUID of "128" variant
2. **You enter IMEI:** in Serial Number modal
3. **System calls:** 
   ```typescript
   addIMEIsToParentVariant(
     orderItem.variant_id,  // ← "128" UUID from PO
     [{imei: "123456789012345", ...}]
   )
   ```
4. **Database creates:** Child with `parent_variant_id` = "128" UUID
5. **Trigger updates:** Parent "128" quantity automatically

✅ **Nothing manual needed!**

---

## 📋 **Quick Checklist**

Use this checklist to verify everything is correct:

- [ ] Run verification queries from `verify_imei_parent_child_structure.sql`
- [ ] Confirm "128" variant has `is_parent = TRUE`
- [ ] Confirm all IMEIs have `variant_type = 'imei_child'`
- [ ] Confirm all IMEIs have `parent_variant_id` pointing to "128"
- [ ] Confirm parent "128" quantity = sum of all children quantities
- [ ] No orphaned IMEIs (IMEIs without parent)
- [ ] Database function `add_imei_to_parent_variant()` exists
- [ ] Trigger `trigger_update_parent_stock` is active

---

## 🔍 **Using the Database Function Directly**

You can also use the helper function:

```sql
-- Get the "128" parent UUID first
SELECT id FROM lats_product_variants 
WHERE variant_name ILIKE '%128%' AND is_parent = TRUE;

-- Then use the function (replace UUID)
SELECT * FROM get_child_imeis('your-128-parent-uuid-here');
```

**Output:**
```
child_id  | imei            | serial_number | status    | quantity | cost_price
----------|-----------------|---------------|-----------|----------|------------
uuid-1    | 123456789012345 | SN123         | available | 1        | 1000.00
uuid-2    | 234567890123456 | SN234         | available | 1        | 1000.00
...
```

---

## ✅ **Summary**

Your system is **designed correctly** from the start:

1. ✅ Parent Variant: "128" (or similar)
2. ✅ Child Variants: IMEIs with `parent_variant_id` → "128"
3. ✅ Automatic: System handles parent-child linking
4. ✅ Auto-sync: Parent stock updates via trigger

When you receive a PO:
- Select "128" variant when creating PO
- Enter IMEIs in Serial Number modal
- System automatically creates children under "128"

**No manual intervention needed!** 🎉

---

**Last Updated:** October 26, 2025  
**Status:** ✅ System Working Correctly

