# How to Add Sample Payment Data

## Quick Start

1. **Open Supabase SQL Editor**
   - Go to your Supabase project
   - Click on **SQL Editor** in the left sidebar

2. **Copy and Run the Script**
   - Open the file: `INSERT-SAMPLE-PAYMENT-DATA.sql`
   - Copy all contents
   - Paste into Supabase SQL Editor
   - Click **Run** or press `Ctrl+Enter`

3. **Wait for Completion**
   - Script will take ~10-30 seconds
   - You'll see a summary message when done

4. **Refresh Payment Dashboard**
   - Go to Payment Management → Tracking tab
   - Click refresh button
   - All 11 graphs should now display data!

## What Data Gets Created

### Payment Transactions (200+ records)
- **Date Range:** Last 90 days
- **Time Range:** 8 AM to 8 PM (business hours)
- **Payment Methods:**
  - 💵 Cash
  - 📱 Mobile Money (M-Pesa, Tigo Pesa, Airtel Money)
  - 💳 Card
  - 🏦 Bank Transfer
- **Status Distribution:**
  - ✅ 85% Completed
  - ⏳ 8% Pending
  - ❌ 7% Failed
- **Amount Range:** TZS 50,000 - 2,000,000

### Purchase Order Payments (~30 records)
- **Date Range:** Last 60 days
- **Amount Range:** TZS 500,000 - 5,500,000
- **Methods:** Bank Transfer, Mobile Money
- **Status:** 90% Completed, 5% Pending, 5% Cancelled

### Customer Payments (100 records)
- **Date Range:** Last 30 days
- **Amount Range:** TZS 20,000 - 220,000
- **Methods:** Cash, Mobile Money, Card
- **Status:** 92% Completed, 5% Pending, 3% Failed

### Failed Payments (15 records)
- **Failure Reasons:**
  - Insufficient Funds
  - Network Timeout
  - Invalid Card
  - Transaction Declined

## Expected Results

After running the script, you'll see:

```
========================================
✅ SAMPLE DATA INSERTION COMPLETE
========================================

📊 Payment Transactions: 200+ records
📦 Purchase Order Payments: 30+ records
👥 Customer Payments: 100 records
💰 Total Sample Amount: TZS 50,000,000+
❌ Failed Payments: 15 records

📈 CHARTS THAT WILL NOW DISPLAY:
   ✅ Daily Performance (last 7-30 days)
   ✅ Monthly Trends (last 3 months)
   ✅ Hourly Trends (8 AM - 8 PM)
   ✅ Payment Methods Distribution
   ✅ Payment Status Breakdown
   ✅ Failed Payment Analysis
   ✅ Currency Usage (TZS)
```

## Verify the Data

### In Payment Management Dashboard

Navigate to **Payment Management → Tracking Tab** and you should see:

1. ✅ **Payment Status Chart** - Shows Completed/Pending/Failed bars
2. ✅ **Payment Methods Pie Chart** - Shows 4 methods distribution
3. ✅ **Currency Usage Chart** - Shows TZS bar
4. ✅ **Hourly Trends Chart** - Shows activity from 8 AM to 8 PM
5. ✅ **Top Customers Chart** - Shows top 10 sample customers
6. ✅ **Failed Payments Chart** - Shows 4 failure reasons
7. ✅ **Daily Performance Chart** - Shows last 7 days trend
8. ✅ **Monthly Trends Chart** - Shows last 3 months trend
9. ✅ **Financial Overview** - Shows revenue/expenses/profit
10. ✅ **Growth Trends** - Shows growth percentages
11. ✅ **Financial Distribution** - Shows revenue vs expenses

### In Database (SQL Queries)

Run these queries in Supabase SQL Editor to verify:

```sql
-- Count sample records
SELECT 
  'Payment Transactions' as table_name,
  COUNT(*) as count
FROM payment_transactions 
WHERE reference LIKE 'SAMPLE-%'
UNION ALL
SELECT 
  'Purchase Order Payments',
  COUNT(*)
FROM purchase_order_payments 
WHERE reference LIKE 'SAMPLE-%'
UNION ALL
SELECT 
  'Customer Payments',
  COUNT(*)
FROM customer_payments 
WHERE reference LIKE 'SAMPLE-%';
```

```sql
-- View payment methods distribution
SELECT 
  payment_method,
  COUNT(*) as transactions,
  TO_CHAR(SUM(amount), 'FM999,999,999') as total_amount
FROM payment_transactions
WHERE reference LIKE 'SAMPLE-%'
GROUP BY payment_method
ORDER BY transactions DESC;
```

```sql
-- View daily trends (last 14 days)
SELECT 
  DATE(created_at) as date,
  COUNT(*) as transactions,
  TO_CHAR(SUM(amount), 'FM999,999,999') as total_amount
FROM payment_transactions
WHERE reference LIKE 'SAMPLE-%'
  AND created_at >= CURRENT_DATE - INTERVAL '14 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## Remove Sample Data Later

When you're done testing and want to remove all sample data:

```sql
-- Remove all sample payment transactions
DELETE FROM payment_transactions 
WHERE reference LIKE 'SAMPLE-%';

-- Remove all sample purchase order payments
DELETE FROM purchase_order_payments 
WHERE reference LIKE 'SAMPLE-%';

-- Remove all sample customer payments
DELETE FROM customer_payments 
WHERE reference LIKE 'SAMPLE-%';

-- Verify removal
SELECT 'Remaining sample records' as info, COUNT(*) as count
FROM payment_transactions 
WHERE reference LIKE 'SAMPLE-%'
UNION ALL
SELECT 'Remaining PO payments', COUNT(*)
FROM purchase_order_payments 
WHERE reference LIKE 'SAMPLE-%'
UNION ALL
SELECT 'Remaining customer payments', COUNT(*)
FROM customer_payments 
WHERE reference LIKE 'SAMPLE-%';
```

## Customize Sample Data

You can modify the script to:

### Change Date Range
```sql
-- Change from 90 days to 180 days
FROM generate_series(0, 179) AS n  -- Instead of 89
```

### Change Number of Records
```sql
-- Change probability to get more/fewer records
WHERE RANDOM() < 0.6  -- 60% instead of 40% for more records
WHERE RANDOM() < 0.2  -- 20% instead of 40% for fewer records
```

### Change Amount Ranges
```sql
-- Increase amounts
WHEN RANDOM() < 0.3 THEN 100000 + (RANDOM() * 200000)::INTEGER  -- 100K-300K
WHEN RANDOM() < 0.7 THEN 300000 + (RANDOM() * 700000)::INTEGER  -- 300K-1M
ELSE 1000000 + (RANDOM() * 3000000)::INTEGER                     -- 1M-4M
```

### Add More Failure Reasons
```sql
failure_reason', CASE (RANDOM() * 6)::INTEGER
  WHEN 0 THEN 'Insufficient Funds'
  WHEN 1 THEN 'Network Timeout'
  WHEN 2 THEN 'Invalid Card'
  WHEN 3 THEN 'Transaction Declined'
  WHEN 4 THEN 'Card Expired'
  ELSE 'Bank Error'
END
```

## Troubleshooting

### "Table doesn't exist" Error
**Solution:** The script handles this automatically. Only tables that exist will get sample data.

### "Permission denied" Error
**Solution:** Make sure you're using the Supabase service role or have proper permissions:
- Go to Supabase → Settings → API
- Use the `service_role` key (for admin operations)

### No Data Appearing in Dashboard
**Solutions:**
1. **Refresh the dashboard** - Click the refresh button
2. **Check console** - Look for success messages
3. **Verify in database:**
   ```sql
   SELECT COUNT(*) FROM payment_transactions WHERE reference LIKE 'SAMPLE-%';
   ```
4. **Check date filters** - Make sure dashboard date filter includes sample data dates

### Duplicate Key Errors
**Solution:** The script uses `ON CONFLICT DO NOTHING` - safe to run multiple times. If you see this, it means some sample data already exists (which is fine).

## Best Practices

1. **Run Once:** One execution creates enough data for testing
2. **Test First:** Run verification queries before checking dashboard
3. **Clean Up:** Remove sample data when done testing
4. **Backup:** If you have real data, backup before adding samples
5. **Identify Samples:** All sample records have `SAMPLE-` prefix in reference field

## What to Test

After adding sample data:

- [ ] All 11 graphs display
- [ ] Hover tooltips work
- [ ] Filters work (status, method, date)
- [ ] Daily trends show last 7 days
- [ ] Monthly trends show last 3 months
- [ ] Hourly trends show 8 AM - 8 PM
- [ ] Payment methods show 4 types
- [ ] Failed payments show reasons
- [ ] Top customers show names
- [ ] Currency chart shows TZS
- [ ] Refresh button updates data

## Summary

✅ **One script** - Generates all sample data automatically
✅ **Realistic data** - Varied dates, times, amounts, methods
✅ **Safe to run** - Won't duplicate or break existing data
✅ **Easy to remove** - All samples marked with `SAMPLE-` prefix
✅ **Tests all graphs** - Covers all 11 payment dashboard charts

Run the script and enjoy testing your Payment Management dashboard! 🚀

