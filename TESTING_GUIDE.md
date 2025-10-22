# Installment Payment Testing Guide

## Quick Test

To test the installment payment feature:

```bash
node test-installment-payment-flow.mjs
```

This will:
- ✅ Login as care@care.com
- ✅ Navigate to installments page
- ✅ Open payment modal
- ✅ Verify modal is visible
- ✅ Fill payment form
- ⏭️  Skip actual submission (to avoid test data)

## Test with Actual Submission

```bash
node test-installment-payment-flow.mjs --submit
```

**Warning**: This will create actual payment data in the database.

## Test Results

Results are saved to:
- `test-results/installment-payment-[timestamp].json`
- Screenshots in `test-screenshots/`

## What Was Fixed

### Issue
The payment modal was not visible when clicking "Pay" button on installments.

### Root Cause
The modal had `z-index: 50` which was the same as navigation tooltips, causing it to be hidden behind them.

### Solution
Changed all modal z-indexes from `z-50` to `z-[9999]` in:
- `src/features/installments/pages/InstallmentsPage.tsx`

### Verification
✅ Modal now appears with:
- Z-Index: 9999
- Display: flex
- Visibility: visible
- Opacity: 1

## Manual Testing

1. Login at http://localhost:5173
2. Navigate to "Installment Plans"
3. Click any "Pay" button
4. **Expected**: Modal should appear with payment form
5. Fill in payment details
6. Click "Record Payment"

## Payment Modal Features

The modal includes:
- 📝 Amount input (pre-filled with installment amount)
- 💳 Payment method selector
- 🏦 Payment account selector  
- 🔢 Reference number input
- 📄 Notes textarea
- ✅ Submit button

All fields are now accessible and the modal is fully functional!

