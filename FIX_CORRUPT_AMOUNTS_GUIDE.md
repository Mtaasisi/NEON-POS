# Corrupt Amounts Diagnostic Tool

## Overview
This tool helps identify and fix unrealistic amounts in trade-in transactions that may result from data corruption or calculation bugs.

## Quick Start

### Check for Corrupt Data
```bash
node fix-corrupt-amounts.mjs
```

This performs a **dry-run** that will:
- Scan all trade-in transactions for unrealistic amounts (> 1 trillion TZS)
- Display any corrupt records found
- Suggest fixes based on pattern analysis
- **NOT make any changes** to the database

### Apply Fixes
```bash
node fix-corrupt-amounts.mjs --apply
```

This will:
- Scan for corrupt data
- Analyze patterns to suggest correct values
- **Apply the fixes** to the database
- Update the `updated_at` timestamp

## What It Checks

The tool scans these fields in `lats_trade_in_transactions`:
- `base_trade_in_price`
- `final_trade_in_value`
- `new_device_price`
- `customer_payment_amount`

Any amount with an absolute value greater than **1,000,000,000,000 TZS** (1 trillion) is flagged as unrealistic.

## Pattern Detection

The tool attempts to identify common corruption patterns:

### 1. Repetition Pattern
Example: `0300000300000300000255000`
- Detects repeated sequences (e.g., "300000" repeated)
- Suggests using the first occurrence as the correct value

### 2. Concatenation Pattern
Example: Multiple values stuck together
- Identifies separate numbers that may have been concatenated
- Suggests the first number as the likely correct value

## Example Output

### No Corrupt Data (Current Status)
```
🔧 Trade-In Corrupt Amount Fixer
============================================================

🔍 Scanning for corrupt data...

✅ No corrupt data found!
```

### If Corrupt Data Were Found
```
🔍 Scanning for corrupt data...

❌ Found 2 corrupt transaction(s):

1. Transaction: TI-2024-001
   Device: iPhone 12 Pro
   Base Price: 300000
   Final Value: 0300000300000300000255000
   New Device Price: 1200000
   Customer Payment: 7.5000075000075e+22
   Created: 2024-10-20T10:30:00.000Z

📋 Suggested Fixes:

Transaction TI-2024-001:
  Current: {
    "final_trade_in_value": 0300000300000300000255000,
    "customer_payment_amount": 7.5000075000075e+22
  }
  Suggested: {
    "final_trade_in_value": 300000,
    "customer_payment_amount": 75000
  }

🔄 DRY RUN - No changes will be made...
Would update TI-2024-001: {...}

💡 Tip: Run with --apply to apply these fixes
```

## Safety Features

1. **Dry-run by default** - Never applies changes unless `--apply` is explicitly used
2. **Pattern analysis** - Attempts to intelligently suggest correct values
3. **Detailed logging** - Shows exactly what will be changed
4. **Transaction-level updates** - Updates `updated_at` timestamp for audit trail

## When to Use

Use this tool if you see warnings like:
```
⚠️ CORRUPT DATA - Unrealistic amount: 0300000300000300000255000
```

## Troubleshooting

### Script Won't Run
Make sure you have the required dependencies:
```bash
npm install
```

### No Changes Applied
1. Check that you're using the `--apply` flag
2. Verify your database connection in `.env`
3. Check that the `VITE_DATABASE_URL` is set correctly

### Suggested Values Seem Wrong
The tool uses pattern detection which may not always be accurate. You can:
1. Review the suggested fixes in dry-run mode
2. Manually update specific records using SQL
3. Adjust the pattern detection logic in the script

## Manual Fix

If you need to manually fix a specific transaction:

```sql
UPDATE lats_trade_in_transactions
SET 
  final_trade_in_value = 300000,
  customer_payment_amount = 75000,
  updated_at = NOW()
WHERE id = 'transaction-id-here';
```

## Prevention

To prevent future corruption:
1. ✅ Always parse string inputs to numbers before calculations
2. ✅ Use the `Number()` or `parseFloat()` functions
3. ✅ Avoid string concatenation when adding amounts
4. ✅ Validate input formats in forms
5. ✅ Use database constraints for reasonable max values

## Current Status

As of the last run:
- ✅ **No corrupt data found in database**
- ✅ All amounts are within reasonable ranges
- ✅ System is healthy

Keep this tool available for future diagnostics!

