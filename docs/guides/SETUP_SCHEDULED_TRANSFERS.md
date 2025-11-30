# ⚡ Quick Setup Guide - Scheduled Transfers

## Step 1: Run Database Migration

Open your Supabase SQL Editor or PostgreSQL console and run:

```bash
migrations/create_scheduled_transfers.sql
```

This will create:
- ✅ `scheduled_transfers` table
- ✅ `scheduled_transfer_executions` table  
- ✅ `execute_scheduled_transfer()` function
- ✅ `get_due_scheduled_transfers()` function
- ✅ `calculate_next_execution_date()` function
- ✅ All necessary indexes and triggers

## Step 2: Verify Installation

Run this query to verify tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('scheduled_transfers', 'scheduled_transfer_executions');
```

Expected result: 2 tables found

## Step 3: Test the Feature

1. Navigate to **Payment Management** → **Payment Accounts**
2. Click the **Transfer** button
3. Toggle **Schedule Recurring Transfer** ON
4. Fill in the form and create a test schedule
5. Go to **Scheduled Transfers** tab to view it

## Step 4: Enable Auto-Execution (Optional)

### Option A: Frontend Monitoring
Add to your main `App.tsx` or layout component:

```typescript
import { scheduledTransferService } from './lib/scheduledTransferService';
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    // Check for due transfers every 60 minutes
    const intervalId = scheduledTransferService.startMonitoring(60);
    
    return () => scheduledTransferService.stopMonitoring(intervalId);
  }, []);

  return <YourApp />;
}
```

### Option B: Backend Cron Job (Recommended for Production)
Set up a cron job to run this SQL every hour:

```sql
-- File: execute-due-transfers.sql
DO $$
DECLARE
    transfer_record RECORD;
    result RECORD;
BEGIN
    FOR transfer_record IN 
        SELECT id FROM scheduled_transfers
        WHERE is_active = true
          AND auto_execute = true
          AND next_execution_date <= CURRENT_DATE
          AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    LOOP
        SELECT * INTO result FROM execute_scheduled_transfer(transfer_record.id);
        RAISE NOTICE 'Executed transfer %: %', transfer_record.id, result.message;
    END LOOP;
END $$;
```

**Cron entry (every hour):**
```bash
0 * * * * psql -d your_database -f /path/to/execute-due-transfers.sql
```

## Step 5: Test Execution

Create a test scheduled transfer:
- Amount: Small test amount (e.g., $10)
- Frequency: Daily
- Start Date: Today
- Auto-Execute: Yes

Then manually execute it:
```sql
SELECT * FROM execute_scheduled_transfer('your-transfer-id');
```

Check execution history in the UI or:
```sql
SELECT * FROM scheduled_transfer_executions 
ORDER BY execution_date DESC LIMIT 10;
```

## ✅ You're Done!

The scheduled transfers feature is now fully operational!

### Quick Links:
- 📖 Full documentation: `SCHEDULED_TRANSFERS_FEATURE.md`
- 🗄️ Database migration: `migrations/create_scheduled_transfers.sql`
- 💻 Service layer: `src/lib/scheduledTransferService.ts`
- 🎨 UI Components: `src/features/payments/components/`

### Common Issues:

**Issue:** Transfers not executing automatically
**Solution:** Ensure either frontend monitoring is running OR cron job is set up

**Issue:** "Insufficient balance" errors
**Solution:** Check source account has enough funds before scheduled execution

**Issue:** Can't see scheduled transfers tab
**Solution:** Refresh the page after migration

---

Need help? Check the full documentation in `SCHEDULED_TRANSFERS_FEATURE.md`

