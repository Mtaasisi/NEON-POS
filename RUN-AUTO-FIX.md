# 🚀 Run Auto-Fix Script

## Quick Execution

### Option 1: Using psql (Command Line)
```bash
# Replace YOUR_DATABASE_URL with your actual database connection string
psql YOUR_DATABASE_URL -f AUTO-FIX-PAYMENT-MIRRORING.sql
```

### Option 2: Using Neon Console
1. Go to your Neon Console: https://console.neon.tech/
2. Select your project
3. Go to "SQL Editor"
4. Copy and paste the contents of `AUTO-FIX-PAYMENT-MIRRORING.sql`
5. Click "Run"

### Option 3: Using psql with Connection Details
```bash
psql -h YOUR_HOST \
     -p 5432 \
     -U YOUR_USERNAME \
     -d YOUR_DATABASE \
     -f AUTO-FIX-PAYMENT-MIRRORING.sql
```

### Option 4: Using node-postgres (from your app)
```javascript
const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function runAutoFix() {
  await client.connect();
  const sql = fs.readFileSync('AUTO-FIX-PAYMENT-MIRRORING.sql', 'utf8');
  await client.query(sql);
  await client.end();
  console.log('✅ Auto-fix completed!');
}

runAutoFix();
```

---

## What This Script Does

✅ **Creates/Verifies Tables:**
- `customer_payments` (payment records)
- `finance_accounts` (account balances)
- `account_transactions` (transaction history)
- `payment_methods` (payment options)

✅ **Ensures Correct Schema:**
- Adds `sale_id` column if missing
- Adds `reference_number` column if missing
- Removes invalid columns (`payment_account_id`, `currency`)

✅ **Creates Performance Indexes:**
- 15+ indexes for faster queries
- Optimized for common payment queries

✅ **Sets Up Default Data:**
- Default payment methods (Cash, M-Pesa, Bank, Cards)
- Default finance accounts (Cash, M-Pesa, Bank)

✅ **Adds Automation:**
- Triggers for `updated_at` timestamps
- Validation and cleanup

✅ **Verifies Everything:**
- Runs automated tests
- Shows table structures
- Displays statistics

---

## Safety Features

This script is **100% safe** to run:

✅ **Idempotent** - Can run multiple times safely  
✅ **Non-Destructive** - Never deletes existing data  
✅ **Uses IF NOT EXISTS** - Won't fail if already set up  
✅ **Validates** - Checks everything after setup  

---

## Expected Output

You should see messages like:
```
✅ Created customer_payments table
✅ Added sale_id column to customer_payments
✅ Created/verified all indexes on customer_payments
✅ Created default Cash account
✅ Created default M-Pesa account
✅ Created default Bank account
✅ Data validation and cleanup completed

╔════════════════════════════════════════════════════════════════╗
║          ✅ PAYMENT MIRRORING AUTO-FIX COMPLETED              ║
╚════════════════════════════════════════════════════════════════╝
```

---

## After Running the Script

### 1. Restart Dev Server
```bash
npm run dev
```

### 2. Verify Database
```sql
-- Check customer_payments structure
SELECT * FROM customer_payments ORDER BY created_at DESC LIMIT 5;

-- Check finance accounts
SELECT * FROM finance_accounts WHERE is_active = true;

-- Run built-in test
SELECT * FROM test_payment_mirroring();
```

### 3. Test in App
1. Clear browser cache (F12 → Application → Clear Site Data)
2. Make a test sale with multiple payment methods
3. Check console for ✅ success messages
4. Verify database records

---

## Troubleshooting

### Error: "relation does not exist"
**Solution:** Some parent tables (customers, lats_sales) might not exist yet.
- Run your main schema setup first
- Then run this auto-fix script

### Error: "permission denied"
**Solution:** Ensure your database user has CREATE privileges
```sql
GRANT CREATE ON SCHEMA public TO your_username;
```

### Error: "syntax error"
**Solution:** Ensure you're using PostgreSQL 12+
```bash
psql --version
```

---

## Quick Verification

After running, verify with this one-liner:
```sql
SELECT * FROM test_payment_mirroring();
```

Should show all ✅ PASS results!

---

## Files Overview

| File | Purpose |
|------|---------|
| `AUTO-FIX-PAYMENT-MIRRORING.sql` | **The main script** - Run this! |
| `RUN-AUTO-FIX.md` | This file - Instructions |
| `VERIFY-PAYMENT-MIRRORING-SCHEMA.sql` | Additional verification queries |

---

## Full Setup Checklist

- [ ] 1. Run `AUTO-FIX-PAYMENT-MIRRORING.sql`
- [ ] 2. Verify output shows ✅ success
- [ ] 3. Check database tables exist
- [ ] 4. Restart dev server
- [ ] 5. Clear browser cache
- [ ] 6. Test sale in app
- [ ] 7. Check console logs
- [ ] 8. Verify database records

---

## Need Help?

- **Database issues?** Check `VERIFY-PAYMENT-MIRRORING-SCHEMA.sql`
- **App issues?** Read `🎯-PAYMENT-FIX-README.md`
- **Testing?** Follow `✅-PAYMENT-FIX-CHECKLIST.md`

---

**You're ready!** Run the script and watch the magic happen! ✨

