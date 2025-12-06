# Parent Variant Auto-Cleanup Feature

## Issue Resolved

When receiving a PO with IMEI numbers for an existing variant, the system now:
1. ✅ Creates IMEI child variants under the selected parent variant
2. ✅ **Automatically deactivates the parent variant** (NEW!)
3. ✅ Only shows the IMEI variants in the UI

## Why This Is Needed

**Problem:**
- When IMEI variants are created, the stock moves to the IMEI child variants
- The parent variant (e.g., "128GB") becomes empty with 0 stock
- This empty parent variant clutters the variant list
- It serves no purpose since all stock is tracked in IMEI variants

**Solution:**
- Automatically deactivate (soft delete) the parent variant
- Only the IMEI variants remain visible
- Parent remains in database for historical tracking

## What Happens Now

### Before (Old Behavior):
```
Variants:
├── 128GB (Stock: 0) ❌ Empty parent - clutters UI
├── 128GB - IMEI: 453454353454354 (Stock: 1) ✅
└── 128GB - IMEI: 435435435435444 (Stock: 1) ✅
```

### After (New Behavior):
```
Variants:
├── 128GB - IMEI: 453454353454354 (Stock: 1) ✅
└── 128GB - IMEI: 435435435435444 (Stock: 1) ✅

(Parent "128GB" is hidden - is_active = false)
```

## Technical Implementation

### File Modified: `imeiVariantService.ts` (Line 439-459)

After creating IMEI child variants, the system now:

```typescript
// Deactivate the parent variant since stock has moved to IMEI child variants
if (results.length > 0) {
  await supabase
    .from('lats_product_variants')
    .update({
      is_active: false,
      quantity: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', target_variant_id);
    
  console.log(`✅ Parent variant deactivated (stock moved to IMEI variants)`);
}
```

### What Gets Updated:
- `is_active`: Set to `false` (hides from UI)
- `quantity`: Set to `0` (confirms no stock)
- `updated_at`: Updated timestamp

## Database State

### Parent Variant (Deactivated):
```sql
SELECT id, name, sku, is_active, quantity
FROM lats_product_variants
WHERE id = '953d2fc4-6b29-4b95-9c4f-127ff2b23b6b';

-- Result:
-- name: 128GB
-- sku: SKU-1761244859910-59R-V01
-- is_active: false ✅
-- quantity: 0
```

### IMEI Child Variants (Active):
```sql
SELECT id, name, sku, is_active, quantity, variant_attributes->>'imei' as imei
FROM lats_product_variants
WHERE variant_attributes->>'parent_variant_id' = '953d2fc4-6b29-4b95-9c4f-127ff2b23b6b';

-- Results:
-- 1. name: 128GB - IMEI: 453454353454354, is_active: true ✅
-- 2. name: 128GB - IMEI: 435435435435444, is_active: true ✅
```

## Benefits

1. **Cleaner UI**: Only shows variants with actual stock
2. **No Manual Cleanup**: Automatic process, no user intervention needed
3. **Data Integrity**: Parent variant kept for historical records
4. **Proper Stock Tracking**: All stock in IMEI variants where it belongs
5. **Backward Compatible**: Old variants unaffected

## Manual Cleanup Script

For existing empty parent variants, run:
```bash
node delete-empty-parent-variant.mjs
```

This script will:
- Find all empty parent variants (quantity = 0)
- Check if they have IMEI child variants
- Deactivate the parent variant
- Keep child variants active

## Testing

### Expected Console Output:
```
✅ Created IMEI variant for 123456789012345 under parent variant
✅ Created IMEI variant for 543210987654321 under parent variant
✅ Added 2 IMEI variants to existing variant
✅ Parent variant deactivated (stock moved to IMEI variants)
```

### UI Verification:
1. Go to Product Variants page
2. The empty parent variant should NOT appear
3. Only IMEI variants should be visible
4. Each IMEI variant shows stock = 1

### Database Verification:
```sql
-- Check parent is deactivated
SELECT name, is_active FROM lats_product_variants 
WHERE sku = 'SKU-1761244859910-59R-V01' AND name = '128GB';
-- Expected: is_active = false

-- Check children are active
SELECT name, is_active, quantity FROM lats_product_variants 
WHERE name LIKE '128GB - IMEI:%';
-- Expected: All have is_active = true, quantity = 1
```

## Restoration (If Needed)

If you need to restore a deactivated parent variant:
```sql
UPDATE lats_product_variants
SET is_active = true, updated_at = NOW()
WHERE id = 'parent-variant-id';
```

## Status

✅ **IMPLEMENTED AND ACTIVE**

From now on, whenever you receive a PO with IMEI numbers:
1. IMEI variants are created under the selected parent
2. Parent variant is automatically deactivated
3. Only IMEI variants appear in the UI
4. No manual cleanup required

---

**Date**: October 24, 2025  
**Feature**: Automatic Parent Variant Cleanup  
**Status**: COMPLETE ✅

