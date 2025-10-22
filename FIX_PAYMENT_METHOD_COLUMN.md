# Fix Missing payment_method Column

## The Problem
The `installment_payments` table is missing the `payment_method` column, which causes this error:
```
column "payment_method" of relation "installment_payments" does not exist
```

## Quick Fix (Recommended)

### Option 1: Run SQL Directly in Supabase
1. Go to your Supabase Dashboard
2. Click on "SQL Editor"
3. Paste this SQL and run it:

```sql
-- Add payment_method column if it doesn't exist
ALTER TABLE installment_payments 
ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'cash';

-- Verify it worked
SELECT 
    table_name, 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'installment_payments' 
AND column_name = 'payment_method';
```

### Option 2: Run the Fix Script
```bash
node fix-payment-method-column.mjs
```

## What This Does
- Adds the `payment_method` column to `installment_payments` table
- Sets it as TEXT NOT NULL with default value 'cash'
- Allows the payment recording to work properly

## After Running
1. Refresh your browser
2. Try recording an installment payment again
3. Should work without errors! ✅

