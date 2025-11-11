# 🔍 DIAGNOSIS: Purchase Order IMEI Receiving Issues

**Date**: October 25, 2025  
**Status**: ⚠️ Issues Identified  

---

## 📋 Summary

Your POS system has issues receiving Purchase Orders with IMEI numbers. Based on the codebase analysis, here are the identified problems and solutions:

---

## 🔴 Issue #1: Missing Database Function (CRITICAL)

### Problem
The PostgreSQL function `add_imei_to_parent_variant` may not exist in your Neon database, or might be outdated.

### Symptoms
- Error: `function add_imei_to_parent_variant(uuid, text, text, text, text, integer, text, text) does not exist`
- Purchase orders can be received but IMEI numbers are NOT saved
- Console shows: "Error adding IMEI to parent variant"

### Solution
Apply the critical fix SQL script to your database.

**File to apply**: `CRITICAL_FIX_RECEIVING_PO_IMEI.sql`

**How to apply**:

#### Option A: Via Neon Console (Recommended)
1. Open https://console.neon.tech
2. Select your database
3. Go to SQL Editor
4. Copy and paste the entire contents of `CRITICAL_FIX_RECEIVING_PO_IMEI.sql`
5. Click "Run" or press Ctrl+Enter
6. Verify you see success messages

#### Option B: Via Command Line (If you have psql installed)
```bash
# Set your database URL
export DATABASE_URL="postgresql://your-username:your-password@your-host.neon.tech/neondb?sslmode=require"

# Apply the fix
psql $DATABASE_URL < CRITICAL_FIX_RECEIVING_PO_IMEI.sql
```

---

## 🟡 Issue #2: IMEI Validation Too Strict

### Problem
The database function validates IMEI numbers with this rule:
```sql
IF imei_param !~ '^[0-9]{15}$' THEN
  RETURN QUERY SELECT FALSE, NULL::UUID, 'IMEI must be exactly 15 numeric digits';
END IF;
```

This rejects:
- ❌ IMEIs with spaces: `123 456 789 012 345`
- ❌ IMEIs with dashes: `123-456-789-012-345`
- ❌ IMEIs shorter or longer than 15 digits
- ❌ Non-numeric IMEIs (like some serial numbers)

### Symptoms
- Serial numbers are saved, but not as IMEI
- Error message: "IMEI must be exactly 15 numeric digits"
- IMEIs appear in logs but don't save to database

### Solution
The frontend already handles this correctly (SerialNumberReceiveModal.tsx lines 252-276):
```typescript
// Smart IMEI detection
const cleanValue = value.replace(/[\s\-_.]/g, '');
const isIMEI = /^\d{15}$/.test(cleanValue);

if (isIMEI) {
  // Saves both serial_number and imei fields
  updatedSerialNumbers[index] = {
    ...currentSerial,
    serial_number: value,    // Original format with spaces
    imei: cleanValue         // Clean 15-digit format
  };
}
```

**No action needed** - The frontend properly cleans IMEIs before sending to backend.

**However**, if you're still getting validation errors, you may need to relax the database validation.

---

## 🟢 Issue #3: UUID Casting Bug (ALREADY FIXED ✅)

### Problem
Previously, the supabase client incorrectly cast ALL parameters containing `_param` to UUID type, breaking IMEI receiving.

### Status
✅ **FIXED** - Your codebase already has the corrected logic in `src/lib/supabaseClient.ts` line 1120:

```typescript
// ✅ Correct implementation
if ((key.endsWith('_id') || key.endsWith('_id_param')) && isUUID(value)) {
  return `'${escapedValue}'::uuid`;
}
```

**No action needed** - This is already fixed.

---

## 🔧 Step-by-Step Fix Instructions

### Step 1: Verify Database Function Exists

Run this query in your Neon SQL Editor:

```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'add_imei_to_parent_variant';
```

**Expected result**: Should return 1 row
- If returns **0 rows** → Function is missing, proceed to Step 2
- If returns **1 row** → Function exists, proceed to Step 3

### Step 2: Create Missing Database Functions

1. Open Neon Console SQL Editor
2. Run the complete file: `CRITICAL_FIX_RECEIVING_PO_IMEI.sql`
3. Verify success messages appear
4. Verify with this query:

```sql
-- Check all required functions
SELECT proname as function_name
FROM pg_proc
WHERE proname IN (
  'add_imei_to_parent_variant',
  'mark_imei_as_sold',
  'get_available_imeis_for_pos',
  'update_parent_stock_from_children',
  'recalculate_all_parent_stocks'
);
```

Should return **5 rows**.

### Step 3: Test IMEI Receiving

1. **Create a test Purchase Order**:
   - Select a product with variants (e.g., iPhone 14 Pro 256GB Deep Purple)
   - Set quantity: 2
   - Status: Send to Supplier

2. **Receive the Order**:
   - Click "Receive Items"
   - Enter 2 IMEI numbers:
     - IMEI 1: `123456789012345` (15 digits)
     - IMEI 2: `234567890123456` (15 digits)
   - Set prices
   - Click "Confirm"

3. **Verify Success**:
   - Should see: "✅ Added 2 IMEI children to parent variant"
   - Check console logs for errors
   - Run verification query:

```sql
-- Check if IMEIs were saved
SELECT 
  v.id,
  v.variant_name,
  v.variant_type,
  v.quantity,
  v.variant_attributes->>'imei' as imei,
  v.parent_variant_id,
  v.is_active
FROM lats_product_variants v
WHERE v.variant_type = 'imei_child'
  AND v.variant_attributes->>'imei' IN ('123456789012345', '234567890123456')
ORDER BY v.created_at DESC;
```

Should return **2 rows** with your test IMEIs.

### Step 4: Verify Parent-Child Relationship

```sql
-- Check parent variant stock is updated
SELECT 
  parent.id as parent_id,
  parent.variant_name as parent_name,
  parent.quantity as parent_stock,
  COUNT(child.id) as child_count,
  json_agg(
    json_build_object(
      'imei', child.variant_attributes->>'imei',
      'status', child.variant_attributes->>'imei_status',
      'quantity', child.quantity
    )
  ) as children
FROM lats_product_variants parent
LEFT JOIN lats_product_variants child 
  ON child.parent_variant_id = parent.id 
  AND child.variant_type = 'imei_child'
WHERE parent.variant_type = 'parent'
  OR parent.is_parent = TRUE
GROUP BY parent.id, parent.variant_name, parent.quantity
HAVING COUNT(child.id) > 0
ORDER BY parent.created_at DESC
LIMIT 5;
```

---

## 🐛 Common Issues & Solutions

### Issue: "IMEI must be exactly 15 numeric digits"

**Cause**: User entered IMEI with spaces or special characters

**Solution**: 
- The frontend should auto-clean IMEIs (already implemented)
- If still happening, ensure you're using the latest SerialNumberReceiveModal.tsx
- Manually clean IMEI: Remove all spaces, dashes, dots before entering

### Issue: "Device with IMEI XXX already exists"

**Cause**: Trying to add a duplicate IMEI

**Solution**:
1. Search for existing IMEI:
```sql
SELECT * FROM lats_product_variants
WHERE variant_attributes->>'imei' = 'YOUR_IMEI_HERE';
```

2. If it's an old/wrong entry, delete it:
```sql
DELETE FROM lats_product_variants
WHERE id = 'old-imei-variant-id';
```

3. Or mark it as sold:
```sql
SELECT mark_imei_as_sold('YOUR_IMEI_HERE', 'manual_removal');
```

### Issue: Parent stock not updating

**Cause**: Trigger not running or disabled

**Solution**: Manually recalculate:
```sql
SELECT * FROM recalculate_all_parent_stocks();
```

### Issue: Console shows "Function doesn't exist" even after applying fix

**Cause**: Multiple database instances or wrong database

**Solution**:
1. Verify you're connected to the correct database
2. Check which database you're connected to:
```sql
SELECT current_database();
```
3. Re-apply the fix to the correct database

---

## 📊 Health Check Queries

### Check System Status

```sql
-- Overall system health
SELECT 
  'Total Products' as metric,
  COUNT(*) as value
FROM lats_products
UNION ALL
SELECT 
  'Total Variants',
  COUNT(*)
FROM lats_product_variants
UNION ALL
SELECT 
  'Parent Variants',
  COUNT(*)
FROM lats_product_variants
WHERE is_parent = TRUE OR variant_type = 'parent'
UNION ALL
SELECT 
  'IMEI Children',
  COUNT(*)
FROM lats_product_variants
WHERE variant_type = 'imei_child'
UNION ALL
SELECT 
  'Available IMEIs',
  COUNT(*)
FROM lats_product_variants
WHERE variant_type = 'imei_child'
  AND is_active = TRUE
  AND quantity > 0;
```

### Find Orphaned IMEI Variants

```sql
-- IMEIs without parent
SELECT 
  id,
  variant_name,
  variant_attributes->>'imei' as imei,
  parent_variant_id,
  created_at
FROM lats_product_variants
WHERE variant_type = 'imei_child'
  AND parent_variant_id IS NULL
ORDER BY created_at DESC;
```

---

## 🎯 Expected Behavior After Fix

### When Receiving PO with IMEI:

1. ✅ SerialNumberReceiveModal appears
2. ✅ User enters IMEI numbers
3. ✅ System detects IMEI format (15 digits)
4. ✅ Auto-populates both serial_number and imei fields
5. ✅ User sets pricing
6. ✅ Console logs: "✅ Using Parent-Child IMEI variant system"
7. ✅ Console logs: "✅ Variant XXX marked as parent"
8. ✅ Database function creates child IMEI variants
9. ✅ Console logs: "✅ Added N IMEI children to parent variant"
10. ✅ Parent variant quantity auto-updates
11. ✅ Product stock_quantity auto-updates
12. ✅ Stock movements created for each IMEI
13. ✅ Success message: "🎉 All items received!"

### Database Structure After Successful Receive:

```
lats_products
├── iPhone 14 Pro (product_id: xxx)
    └── stock_quantity: 2 (auto-calculated)

lats_product_variants
├── Parent: "256GB Deep Purple"
│   ├── variant_type: 'parent'
│   ├── is_parent: TRUE
│   ├── quantity: 2 (auto-calculated from children)
│   │
│   └── Children:
│       ├── Child 1: IMEI 123456789012345
│       │   ├── variant_type: 'imei_child'
│       │   ├── quantity: 1
│       │   ├── is_active: TRUE
│       │   └── parent_variant_id: (points to parent)
│       │
│       └── Child 2: IMEI 234567890123456
│           ├── variant_type: 'imei_child'
│           ├── quantity: 1
│           ├── is_active: TRUE
│           └── parent_variant_id: (points to parent)

lats_stock_movements
├── Movement 1: +1 (IMEI 123456789012345)
└── Movement 2: +1 (IMEI 234567890123456)
```

---

## 📞 Need Help?

If issues persist after applying the fix:

1. **Check browser console** for error messages
2. **Check Neon logs** in the dashboard
3. **Run the health check queries** above
4. **Export console logs** and database query results

---

## ✅ Checklist

- [ ] Verified database function exists (`add_imei_to_parent_variant`)
- [ ] Applied `CRITICAL_FIX_RECEIVING_PO_IMEI.sql` if function was missing
- [ ] Tested receiving PO with 2 test IMEIs
- [ ] Verified IMEIs saved to database
- [ ] Verified parent stock auto-updated
- [ ] Verified stock movements created
- [ ] Checked for console errors
- [ ] Ran health check queries

---

**Last Updated**: October 25, 2025  
**Status**: Ready for Testing

