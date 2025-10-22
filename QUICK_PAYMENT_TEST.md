# Quick Payment Test - Manual Steps

## Login
1. Open http://localhost:5173 in your browser
2. Login with:
   - Email: `care@care.com`
   - Password: `123456`

## Test POS Payment

### Step 1: Navigate to POS
- Click on "POS" in the sidebar
- Or go to http://localhost:5173/pos

### Step 2: Select Customer (REQUIRED)
- Click "Select Customer" button
- Choose any customer from the list
- ✅ Customer name should appear

### Step 3: Add Products
- Search for a product
- Click to add to cart
- Adjust quantity if needed
- ✅ Check subtotal updates

### Step 4: Make Payment
- Click "Pay Now" or "Checkout" button
- Payment dialog should open
- Select payment method (Cash, Card, M-Pesa, etc.)
- Select payment account (where money goes)
- Click "Complete Payment"

### Step 5: Verify Success
**In Browser:**
- ✅ Success message appears
- ✅ Receipt modal shows (optional)
- ✅ Cart clears

**In Browser Console (F12):**
Look for these messages:
```
✅ User authenticated: care@care.com
✅ Sale saved to database: [sale-id]
✅ Finance account balance updated
✅ Transaction recorded
✅ Sale processed successfully
```

## Verify in Database

### Option 1: Run Verification Script
```bash
node verify-payment-recording.mjs
```

This will show:
- Recent sales
- Sale items
- Account transactions
- Account balances
- Any data integrity issues

### Option 2: Manual Database Check
Connect to your database and run:

```sql
-- Check last 5 sales
SELECT sale_number, customer_name, total_amount, payment_status, created_at 
FROM lats_sales 
ORDER BY created_at DESC 
LIMIT 5;

-- Check account transactions
SELECT transaction_type, amount, description, created_at 
FROM account_transactions 
ORDER BY created_at DESC 
LIMIT 5;

-- Check account balances
SELECT account_name, balance, currency, updated_at 
FROM finance_accounts 
ORDER BY updated_at DESC;
```

## What Should Happen

When you make a payment, the system should:

1. ✅ Create record in `lats_sales` table
2. ✅ Create records in `lats_sale_items` table
3. ✅ Update `finance_accounts` balance (increase)
4. ✅ Create record in `account_transactions` table
5. ✅ Update customer stats (`total_spent`, `total_orders`)
6. ✅ Decrease product inventory quantities

## Common Issues

### Issue 1: "Customer is required"
- **Solution**: Make sure to select a customer before checkout

### Issue 2: "Insufficient stock"
- **Solution**: Check product quantity in inventory
- Add stock if needed via Products page

### Issue 3: Payment not recording
- **Check**: Browser console (F12) for errors
- **Check**: Network tab for failed API calls
- **Solution**: Look for specific error message

### Issue 4: Balance not updating
- **Check**: Verify payment account was selected
- **Check**: Console for "account_transactions insert failed"
- **Check**: Database permissions

## Test Different Payment Types

### Cash Payment
- Select "Cash" as payment method
- Select cash account
- Complete payment
- ✅ Cash account balance should increase

### Card Payment
- Select "Card" as payment method  
- Select card/bank account
- Enter reference number (optional)
- Complete payment
- ✅ Account balance should increase

### M-Pesa Payment
- Select "M-Pesa" as payment method
- Select M-Pesa account
- Enter M-Pesa reference
- Complete payment
- ✅ M-Pesa account balance should increase

### Split Payment (Multiple Methods)
- Click "Split Payment" or "Multiple Methods"
- Add first payment (e.g., Cash 50,000)
- Add second payment (e.g., M-Pesa 50,000)
- Complete payment
- ✅ Both accounts should update

## Quick Checklist

Before testing:
- [ ] Server is running (npm run dev)
- [ ] Database is accessible
- [ ] You have products with stock
- [ ] You have customers in the system
- [ ] You have payment accounts configured

During testing:
- [ ] Login successful
- [ ] Customer selected
- [ ] Product added to cart
- [ ] Payment dialog opens
- [ ] Payment method selected
- [ ] Payment account selected
- [ ] Payment completes without error

After testing:
- [ ] Run `node verify-payment-recording.mjs`
- [ ] Check browser console for errors
- [ ] Verify database records
- [ ] Check account balance updated
- [ ] Verify inventory decreased

## Troubleshooting Commands

```bash
# Check if server is running
lsof -i :5173

# View recent logs
npm run dev

# Run database verification
node verify-payment-recording.mjs

# Check database connection
node -e "import('pg').then(({Pool})=>{const pool=new Pool({connectionString:process.env.DATABASE_URL||process.env.VITE_DATABASE_URL,ssl:{rejectUnauthorized:false}});pool.query('SELECT NOW()').then(r=>console.log('✅ DB Connected:',r.rows[0].now)).catch(e=>console.error('❌',e)).finally(()=>pool.end())})"
```

## Need Help?

If payments aren't recording:
1. Check browser console (F12) for specific error
2. Run `node verify-payment-recording.mjs` to see database state
3. Check the `PAYMENT_TEST_GUIDE.md` for detailed diagnostics
4. Look at Network tab in DevTools for failed API calls

