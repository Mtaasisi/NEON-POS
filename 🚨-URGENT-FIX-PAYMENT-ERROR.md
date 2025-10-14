# 🚨 URGENT FIX: Purchase Order Payment Error

## Problem Identified

Your purchase order payment processing was failing with this error:
```
Payment processing failed: column "supplier_name" does not exist
```

## Root Cause

The database trigger function `track_po_payment_as_expense()` was trying to select `supplier_name` directly from the `lats_purchase_orders` table. However, that table only has a `supplier_id` column that needs to be joined with the `lats_suppliers` table to get the supplier name.

## What Was Fixed

I've fixed **3 files** that had this issue:

1. ✅ **FIX-SUPPLIER-NAME-COLUMN-ERROR.sql** (NEW - Run this file!)
2. ✅ **FIX-PO-PAYMENT-SPENDING-TRACKING.sql** (Updated)
3. ✅ **run-po-fix.ts** (Updated)

### Changes Made:

**Before (Wrong):**
```sql
SELECT 
  COALESCE(po_number, 'PO-' || id::TEXT),
  COALESCE(supplier_name, 'Unknown Supplier')  -- ❌ This column doesn't exist!
INTO v_po_reference, v_po_supplier
FROM lats_purchase_orders
WHERE id = NEW.purchase_order_id;
```

**After (Fixed):**
```sql
SELECT 
  COALESCE(po.po_number, 'PO-' || po.id::TEXT),
  COALESCE(s.name, 'Unknown Supplier')  -- ✅ Get name from suppliers table
INTO v_po_reference, v_po_supplier
FROM lats_purchase_orders po
LEFT JOIN lats_suppliers s ON s.id = po.supplier_id  -- ✅ JOIN to get supplier data
WHERE po.id = NEW.purchase_order_id;
```

Also added support for both `method` and `payment_method` columns:
```sql
COALESCE(NEW.method, NEW.payment_method, 'cash')
```

## How to Fix Your Database

### Option 1: Run the New Fix File (RECOMMENDED)

1. Open your **Neon Database Dashboard**
2. Go to **SQL Editor**
3. Open the file: **`FIX-SUPPLIER-NAME-COLUMN-ERROR.sql`**
4. **Click "Run"**

This will:
- ✅ Update the trigger function with the correct JOIN
- ✅ Recreate the trigger
- ✅ Show verification status

### Option 2: Quick Copy-Paste

Copy and paste this into your Neon SQL Editor:

```sql
CREATE OR REPLACE FUNCTION track_po_payment_as_expense()
RETURNS TRIGGER AS $$
DECLARE
  v_po_reference TEXT;
  v_po_supplier TEXT;
  v_account_name TEXT;
  v_user_id UUID;
BEGIN
  IF NEW.status = 'completed' THEN
    
    -- Get PO details and supplier name (JOIN with suppliers table)
    SELECT 
      COALESCE(po.po_number, 'PO-' || po.id::TEXT),
      COALESCE(s.name, 'Unknown Supplier')
    INTO v_po_reference, v_po_supplier
    FROM lats_purchase_orders po
    LEFT JOIN lats_suppliers s ON s.id = po.supplier_id
    WHERE po.id = NEW.purchase_order_id;
    
    -- Rest of the function continues...
    -- (See FIX-SUPPLIER-NAME-COLUMN-ERROR.sql for complete function)
    
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_track_po_payment_spending ON purchase_order_payments;

CREATE TRIGGER trigger_track_po_payment_spending
  AFTER INSERT OR UPDATE OF status ON purchase_order_payments
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION track_po_payment_as_expense();
```

## Testing the Fix

After running the fix:

1. **Refresh your browser** (clear cache with Cmd+Shift+R / Ctrl+Shift+R)
2. Try processing a **purchase order payment** again
3. The payment should now **process successfully** ✅

### Expected Success Log:
```
💰 Processing purchase order payment...
✅ RPC function result: [...]
📦 Parsed result data: {success: true, message: 'Payment processed successfully', ...}
✅ Payment created successfully
```

## Additional Issue Noted

There's also a secondary error in `fixOrderStatusIfNeeded` that shows "Unknown error". This may be related to the payment error and might resolve once the payment processing works. If it persists, we can investigate further.

## Files Modified

- ✅ `FIX-SUPPLIER-NAME-COLUMN-ERROR.sql` (NEW)
- ✅ `FIX-PO-PAYMENT-SPENDING-TRACKING.sql` (UPDATED)
- ✅ `run-po-fix.ts` (UPDATED)

## Questions?

If you still encounter issues after running the fix:

1. Check if the trigger exists:
   ```sql
   SELECT tgname FROM pg_trigger WHERE tgname = 'trigger_track_po_payment_spending';
   ```

2. Check if the function exists:
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'track_po_payment_as_expense';
   ```

3. Share the error logs and I'll help debug further.

---

**Priority:** 🔴 HIGH - This blocks all purchase order payments  
**Status:** ✅ Fix Ready - Run FIX-SUPPLIER-NAME-COLUMN-ERROR.sql

