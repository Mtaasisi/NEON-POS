# 🗄️ Database Setup Guide - Simplified POS Settings

## Quick Start

### Option 1: Using psql (Terminal)
```bash
# Connect to your database
psql your_database_connection_string

# Run the setup script
\i COMPLETE-SIMPLIFIED-POS-DATABASE.sql

# Check everything was created
\dt lats_pos_*
```

### Option 2: Using Supabase Dashboard
1. Go to your Supabase project
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy/paste the contents of `COMPLETE-SIMPLIFIED-POS-DATABASE.sql`
5. Click **Run**
6. Verify tables in the **Table Editor**

### Option 3: Using pgAdmin
1. Open pgAdmin
2. Connect to your database
3. Right-click on your database → **Query Tool**
4. Open file: `COMPLETE-SIMPLIFIED-POS-DATABASE.sql`
5. Click **Execute** (F5)

---

## What Gets Created

### ✅ 5 Core Tables:

1. **`lats_pos_general_settings`** (32 columns)
   - Business information
   - Interface settings
   - Display preferences
   - Hardware settings (barcode scanner)
   - Notifications
   - Security (passcode)

2. **`lats_pos_pricing_settings`** (11 columns)
   - Master toggle
   - Happy Hour preset
   - Bulk Discount preset
   - VIP/Loyalty preset

3. **`lats_pos_receipt_settings`** (36 columns)
   - Receipt design
   - Business info display
   - Transaction details
   - Printing options
   - Footer messages

4. **`lats_pos_features`** (13 columns)
   - Delivery toggle
   - Loyalty program toggle
   - Customer profiles toggle
   - Payment tracking toggle
   - Dynamic pricing toggle

5. **`lats_pos_user_permissions`** (19 columns)
   - Simple/Advanced mode
   - Default role (cashier/manager/admin)
   - Custom permissions

### ✅ Performance Features:
- **13+ Indexes** for fast queries
- **Auto-update timestamps** on all tables
- **Row Level Security (RLS)** for data protection
- **Helper functions** for maintenance
- **View** for complete settings summary

---

## Verification

### Check Tables Were Created:
```sql
SELECT table_name, 
       (SELECT COUNT(*) 
        FROM information_schema.columns 
        WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name LIKE 'lats_pos_%'
ORDER BY table_name;
```

**Expected Output:**
```
lats_pos_features              | 13
lats_pos_general_settings      | 32
lats_pos_pricing_settings      | 11
lats_pos_receipt_settings      | 36
lats_pos_user_permissions      | 19
```

### Check RLS is Enabled:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'lats_pos_%'
ORDER BY tablename;
```

**All should show:** `rowsecurity = true`

### Check Your Settings (Replace with your user_id):
```sql
SELECT * FROM get_user_settings_summary('your-user-id-here');
```

---

## Insert Default Data for Your User

Once you're logged in, run this to create default settings:

```sql
-- Get your current user ID
SELECT auth.uid();

-- Insert defaults (replace auth.uid() with your actual user ID if needed)
INSERT INTO lats_pos_general_settings (user_id, business_name)
VALUES (auth.uid(), 'My Business')
ON CONFLICT (user_id, business_id) DO NOTHING;

INSERT INTO lats_pos_pricing_settings (user_id)
VALUES (auth.uid())
ON CONFLICT (user_id, business_id) DO NOTHING;

INSERT INTO lats_pos_receipt_settings (user_id)
VALUES (auth.uid())
ON CONFLICT (user_id, business_id) DO NOTHING;

INSERT INTO lats_pos_features (user_id)
VALUES (auth.uid())
ON CONFLICT (user_id, business_id) DO NOTHING;

INSERT INTO lats_pos_user_permissions (user_id)
VALUES (auth.uid())
ON CONFLICT (user_id, business_id) DO NOTHING;
```

---

## Migration from Old System

If you had the old 11-table system, run the cleanup first:

```bash
# 1. Backup your data (optional)
psql your_db -f backup-old-settings.sql

# 2. Clean up old tables
psql your_db -f CLEANUP-POS-SETTINGS-TABLES.sql

# 3. Create new simplified tables
psql your_db -f COMPLETE-SIMPLIFIED-POS-DATABASE.sql
```

---

## Helper Functions

### Reset All Settings for a User:
```sql
SELECT reset_user_pos_settings('user-id-here');
```

### Check Which Settings Exist:
```sql
SELECT * FROM get_user_settings_summary('user-id-here');
```

### View Complete Settings:
```sql
SELECT * FROM lats_pos_complete_settings 
WHERE user_id = 'your-user-id';
```

---

## Troubleshooting

### Issue: "relation already exists"
**Solution:** Tables already exist. Either:
- Drop them first: `DROP TABLE IF EXISTS lats_pos_* CASCADE;`
- Or skip to verification queries

### Issue: "permission denied for schema public"
**Solution:** Grant permissions:
```sql
GRANT ALL ON SCHEMA public TO your_user;
```

### Issue: RLS policies preventing access
**Solution:** Make sure you're authenticated:
```sql
-- Check your current user
SELECT current_user;

-- If using Supabase, make sure you're calling with auth context
```

### Issue: "auth.users does not exist"
**Solution:** Using Supabase? The auth schema exists. If using plain Postgres:
```sql
-- Create a users table or remove the foreign key constraints
ALTER TABLE lats_pos_general_settings 
DROP CONSTRAINT IF EXISTS lats_pos_general_settings_user_id_fkey;
```

---

## Table Relationships

```
auth.users (Supabase)
    ↓ (user_id)
    ├── lats_pos_general_settings
    ├── lats_pos_pricing_settings
    ├── lats_pos_receipt_settings
    ├── lats_pos_features
    └── lats_pos_user_permissions
```

All tables:
- Have `user_id` foreign key to auth.users
- Have optional `business_id` for multi-business support
- Have `created_at` and `updated_at` timestamps
- Have unique constraint on (user_id, business_id)
- Have RLS enabled for security

---

## Performance Tips

1. **Indexes are already created** for commonly queried columns
2. **Use the view** for complete settings: `lats_pos_complete_settings`
3. **Batch updates** when changing multiple settings
4. **Cache settings** in your app to reduce database queries

---

## Next Steps

1. ✅ Run the database script
2. ✅ Verify tables were created
3. ✅ Insert default data for your user
4. ✅ Test with your application
5. ✅ Update your frontend to use new tables
6. ✅ Run cleanup script to remove old tables

---

## Support

If you encounter issues:
1. Check the verification queries above
2. Look at the SQL output for error messages
3. Ensure you have proper permissions
4. Check your Supabase/Postgres version compatibility

---

## Database Stats

- **Tables:** 5
- **Total Columns:** 111
- **Indexes:** 13+
- **Triggers:** 5 (auto-update timestamps)
- **RLS Policies:** 20 (4 per table)
- **Functions:** 3
- **Views:** 1

**Your settings are now 60% simpler!** 🎉

