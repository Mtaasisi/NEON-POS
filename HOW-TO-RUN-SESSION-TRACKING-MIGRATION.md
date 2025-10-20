# How to Run Session Tracking Migration

## ⚠️ Important: This is OPTIONAL!

**The POS system works perfectly fine without these tables.**

Only run this migration if you want to enable:
- Daily session tracking (who opened the POS and when)
- Daily closure tracking (who closed the day and what were the totals)

---

## Prerequisites

- Access to your Supabase/Neon database dashboard
- Or PostgreSQL client connected to your database

---

## Method 1: Using Supabase Dashboard (Recommended)

### Step 1: Log in to Supabase
1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Select your project
3. Click on "SQL Editor" in the left sidebar

### Step 2: Run the Migration
1. Click "New Query" button
2. Open the file: `migrations/create_session_tracking_tables.sql`
3. Copy all the SQL code
4. Paste it into the SQL Editor
5. Click "Run" button (or press Cmd/Ctrl + Enter)

### Step 3: Verify Success
You should see a success message and a table showing:
```
table_name                  | column_count
---------------------------+-------------
daily_opening_sessions     | 10
daily_sales_closures      | 16
```

---

## Method 2: Using psql Command Line

### Step 1: Connect to Your Database
```bash
psql "postgresql://your-connection-string"
```

### Step 2: Run the Migration
```bash
\i migrations/create_session_tracking_tables.sql
```

Or pipe it directly:
```bash
psql "postgresql://your-connection-string" < migrations/create_session_tracking_tables.sql
```

---

## Method 3: Using Neon Console

### Step 1: Log in to Neon
1. Go to [https://console.neon.tech](https://console.neon.tech)
2. Select your project
3. Click on "SQL Editor"

### Step 2: Run the Migration
1. Open the file: `migrations/create_session_tracking_tables.sql`
2. Copy all the SQL code
3. Paste it into the SQL Editor
4. Click "Run" button

---

## What Gets Created

### Tables
1. **daily_sales_closures**
   - Tracks daily closure events
   - Stores financial summaries
   - Tracks who closed the day

2. **daily_opening_sessions**
   - Tracks when POS sessions start
   - Stores who opened the session
   - Allows only one active session per day

### Functions
1. **get_current_active_session()** - Returns current active session
2. **close_current_session()** - Closes the current session

### Security
- Row Level Security (RLS) enabled on both tables
- Policies allow authenticated users to read/write
- Automatic timestamps with triggers

---

## Testing the Migration

After running the migration, test it with these queries:

### 1. Check if tables exist
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('daily_sales_closures', 'daily_opening_sessions');
```

### 2. Create a test session
```sql
INSERT INTO daily_opening_sessions (
  date,
  opened_at,
  opened_by,
  is_active
) VALUES (
  CURRENT_DATE,
  NOW(),
  'test_user',
  TRUE
);
```

### 3. Query current session
```sql
SELECT * FROM get_current_active_session();
```

### 4. Create a test closure
```sql
INSERT INTO daily_sales_closures (
  date,
  closed_at,
  closed_by,
  total_sales,
  total_transactions
) VALUES (
  CURRENT_DATE - INTERVAL '1 day',
  NOW(),
  'test_user',
  1000.00,
  10
);
```

### 5. View all closures
```sql
SELECT 
  date,
  closed_at,
  closed_by,
  total_sales,
  total_transactions
FROM daily_sales_closures
ORDER BY date DESC;
```

---

## Rollback (if needed)

If you want to remove these tables:

```sql
DROP TABLE IF EXISTS daily_opening_sessions CASCADE;
DROP TABLE IF EXISTS daily_sales_closures CASCADE;
DROP FUNCTION IF EXISTS get_current_active_session();
DROP FUNCTION IF EXISTS close_current_session();
```

**Note:** The POS will continue to work normally after rollback.

---

## Troubleshooting

### Error: "relation already exists"
This means the tables already exist. You can:
1. Skip the migration (tables are already there)
2. Or drop existing tables first (see Rollback section)

### Error: "permission denied"
Make sure you're connected as a database admin or owner.

### Error: "could not open extension control file"
This error is safe to ignore if you don't have the extension installed.

### RLS Policies Not Working
Check your Supabase authentication settings:
```sql
SELECT * FROM pg_policies 
WHERE tablename IN ('daily_sales_closures', 'daily_opening_sessions');
```

---

## What Happens After Migration

### Before Migration
- POS shows warnings: "⚠️ Session table not available - using fallback mode"
- System uses current timestamp for session tracking
- Everything works, but no persistent session records

### After Migration
- Warnings disappear
- Sessions are tracked in database
- Daily closures can be recorded
- Historical session data is stored

---

## Still Have Questions?

- Check the main documentation: `CONSOLE-ERROR-FIXES-APPLIED.md`
- Review the summary: `CONSOLE-ERRORS-FIXED-SUMMARY.md`
- The migration file is well-commented: `migrations/create_session_tracking_tables.sql`

---

## Summary

✅ Migration is **OPTIONAL** - POS works without it  
✅ Takes **< 1 minute** to run  
✅ Can be **rolled back** safely  
✅ Enables **session tracking** features  
✅ No **downtime** required  

Choose to run it if you want session tracking, or skip it if the current behavior is fine!

