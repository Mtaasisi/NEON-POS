# How to Check if INS-006 Exists in Database

## Problem
You have an installment plan showing in the UI (INS-006), but we need to verify if it actually exists in the Neon database.

## Method 1: Using Browser Developer Console (EASIEST)

Since the app is running in the browser and already connected to Neon, you can check directly from the browser:

### Steps:
1. Open your POS app in the browser
2. Open Developer Tools (F12 or Right-click → Inspect)
3. Go to the **Console** tab
4. Copy and paste this code:

```javascript
// Check if INS-006 exists
import { sql } from './src/lib/supabaseClient';

(async () => {
  try {
    console.log('🔍 Checking for INS-006...');
    
    // Query the plan
    const result = await sql`
      SELECT * FROM customer_installment_plans 
      WHERE plan_number = 'INS-006'
    `;
    
    if (result && result.length > 0) {
      console.log('✅ Found INS-006!');
      console.table(result);
      
      // Check customer
      const customerId = result[0].customer_id;
      const customer = await sql`
        SELECT * FROM customers WHERE id = ${customerId}
      `;
      console.log('👤 Customer:', customer);
      
      // Check payments
      const payments = await sql`
        SELECT * FROM installment_payments 
        WHERE installment_plan_id = ${result[0].id}
      `;
      console.log(`💳 Payments: ${payments.length}`);
      console.table(payments);
    } else {
      console.log('❌ INS-006 not found in database');
      
      // Show all plans
      const allPlans = await sql`
        SELECT plan_number, status, customer_id, created_at
        FROM customer_installment_plans 
        ORDER BY created_at DESC LIMIT 10
      `;
      console.log('📋 Recent plans:');
      console.table(allPlans);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();
```

## Method 2: Using Neon Dashboard (RECOMMENDED)

This is the most reliable way:

### Steps:
1. Go to [Neon Dashboard](https://console.neon.tech)
2. Select your project
3. Click on "SQL Editor" in the left sidebar
4. Copy and paste the contents of `check-ins-006.sql` file
5. Click "Run" button

The query will show you:
- Plan details
- Customer information  
- Sale information
- Payment records
- Schedule
- All recent plans (if INS-006 doesn't exist)

## Method 3: Check Database Connection String

If you have access to your `.env` file, you should see:
```
VITE_DATABASE_URL=postgresql://user:pass@ep-xxx-pooler.neon.tech/neondb?sslmode=require
```

## What You're Looking For

Based on your UI screenshot, INS-006 should have:
- **Customer**: Samuel masika
- **Phone**: +255746605561
- **Status**: ACTIVE
- **Total Amount**: TSh 104
- **Down Payment**: TSh 0
- **Total Paid**: TSh 0
- **Balance Due**: TSh 104
- **Installments**: 3 (monthly)
- **Installment Amount**: TSh 34.67
- **Sale**: SALE-87156439-S1KP
- **Created**: Oct 22, 2025
- **Start Date**: Oct 21, 2025
- **End Date**: Jan 19, 2026

## Possible Scenarios

### ✅ Scenario 1: Data Exists
If INS-006 is found with matching data, the database is correct.

### ❌ Scenario 2: Data Missing
If INS-006 doesn't exist:
- The UI might be showing cached data
- The plan might have been created but not saved
- There might be a database sync issue
- Check browser's Local Storage: `localStorage.getItem('installmentPlans')`

### ⚠️ Scenario 3: Data Mismatch
If INS-006 exists but with different data:
- UI might be showing outdated cache
- Recent update might not have been saved properly
- Check the `updated_at` timestamp in database vs UI

## Quick Browser Check (Alternative)

You can also check what the frontend is actually querying:

1. Go to the Installments page in your app
2. Open Network tab in Developer Tools
3. Filter by "WS" (WebSocket) or look for database requests
4. See what data is being returned

OR check the app state:

```javascript
// In browser console
// Check React component state
const installments = JSON.parse(localStorage.getItem('installmentPlans') || '[]');
const ins006 = installments.find(p => p.plan_number === 'INS-006');
console.log('INS-006 in local storage:', ins006);
```

## Need More Help?

If INS-006 is not in the database:
1. Check if the sale (SALE-87156439-S1KP) exists
2. Check if the customer (Samuel masika, +255746605561) exists
3. Look at the logs when the plan was created
4. Check for any error messages in browser console or network tab

## Files to Use

1. **check-ins-006.sql** - Complete SQL verification script for Neon Dashboard
2. **check-ins-006-browser.html** - Standalone HTML file (requires database URL update)
3. This instruction file

Choose the method that works best for you!

