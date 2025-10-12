# 🚀 Automatic Database Setup

## Three Easy Ways to Setup Your Database

Choose the method that works best for you:

---

## 🎯 Method 1: Node.js Auto-Setup (Recommended)

### Prerequisites:
```bash
npm install @supabase/supabase-js
# or
yarn add @supabase/supabase-js
```

### Setup:
1. **Set your environment variables** in `.env`:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   # or for service role access:
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. **Run the auto-setup script:**
   ```bash
   node setup-database-auto.mjs
   ```

3. **Done!** The script will:
   - ✅ Check your environment
   - ✅ Create all 5 tables
   - ✅ Add performance indexes
   - ✅ Enable Row Level Security
   - ✅ Create security policies
   - ✅ Verify everything worked

### Output will look like:
```
🚀 POS Settings Database Auto-Setup
🔍 Checking Environment...
✓ Environment variables found
📊 Creating Database Tables...
✓ General Settings Table completed
✓ Pricing Settings Table completed
✓ Receipt Settings Table completed
✓ Features Table completed
✓ User Permissions Table completed
⚡ Creating Performance Indexes...
✓ Index completed (x13)
🔒 Enabling Row Level Security...
✓ RLS on lats_pos_general_settings
...
✅ Verifying Setup...
✓ General Settings table exists
✓ Pricing Settings table exists
✓ Receipt Settings table exists
✓ Features table exists
✓ User Permissions table exists

🎉 Setup Complete!
```

---

## 💻 Method 2: Supabase SQL Editor (Web UI)

### Steps:
1. **Go to your Supabase Dashboard**
   - Navigate to https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the sidebar
   - Click "New Query"

3. **Copy & Paste**
   - Open `setup-database-direct.sql`
   - Copy ALL the contents
   - Paste into the SQL Editor

4. **Run**
   - Click "Run" button (or press Cmd/Ctrl + Enter)
   - Wait for completion (~10-20 seconds)

5. **Verify**
   - Go to "Table Editor"
   - You should see 5 new tables:
     - `lats_pos_general_settings`
     - `lats_pos_pricing_settings`
     - `lats_pos_receipt_settings`
     - `lats_pos_features`
     - `lats_pos_user_permissions`

---

## 🗄️ Method 3: Direct psql (Terminal)

### For Local or Remote Postgres:

```bash
# Connect to your database
psql "your_database_connection_string"

# Run the setup file
\i setup-database-direct.sql

# Or in one command:
psql "your_connection_string" -f setup-database-direct.sql
```

### For Supabase via psql:
```bash
# Get your connection string from Supabase Dashboard > Project Settings > Database
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" \
  -f setup-database-direct.sql
```

---

## 🔍 Verification

After running any method, verify the setup:

### Check Tables:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE 'lats_pos_%'
ORDER BY table_name;
```

**Expected output:**
```
lats_pos_features
lats_pos_general_settings
lats_pos_pricing_settings
lats_pos_receipt_settings
lats_pos_user_permissions
```

### Check RLS is Enabled:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables
WHERE tablename LIKE 'lats_pos_%';
```

**All should show:** `rowsecurity = t` (true)

### Check Indexes:
```sql
SELECT tablename, indexname 
FROM pg_indexes
WHERE tablename LIKE 'lats_pos_%'
ORDER BY tablename;
```

**Should show:** 13+ indexes

---

## 🐛 Troubleshooting

### Issue: "permission denied to create extension"
**Solution:** You need superuser access or have someone with access run:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Issue: "@supabase/supabase-js not found"
**Solution:** Install the dependency:
```bash
npm install @supabase/supabase-js
```

### Issue: "environment variables not found"
**Solution:** Create a `.env` file with:
```env
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key
```

### Issue: "tables already exist"
**Solution:** Tables were created successfully before. You can:
- Skip setup (you're already done!)
- Or drop tables first: `DROP TABLE lats_pos_* CASCADE;`

### Issue: "auth.uid() does not exist"
**Solution:** Using plain Postgres (not Supabase)? Either:
- Use Supabase (recommended)
- Or modify the policies to not use auth.uid()

---

## 📝 What Gets Created

### 5 Tables:
1. ✅ `lats_pos_general_settings` (32 columns) - Business, display, hardware
2. ✅ `lats_pos_pricing_settings` (11 columns) - Pricing presets
3. ✅ `lats_pos_receipt_settings` (36 columns) - Receipt configuration
4. ✅ `lats_pos_features` (13 columns) - Feature toggles
5. ✅ `lats_pos_user_permissions` (19 columns) - User roles & permissions

### Performance:
- ✅ 13 indexes for fast queries
- ✅ Unique constraints on (user_id, business_id)
- ✅ Default values on all columns
- ✅ Timestamps (created_at, updated_at)

### Security:
- ✅ Row Level Security enabled
- ✅ 20 RLS policies (4 per table)
- ✅ User-based data isolation
- ✅ Secure by default

---

## 🎯 Next Steps

After successful setup:

1. **Test in your app:**
   ```bash
   npm run dev
   ```

2. **Open POS Settings**
   - Navigate to Settings in your app
   - You should see 5 tabs
   - Try saving settings in each tab

3. **Verify data is saved:**
   ```sql
   SELECT * FROM lats_pos_general_settings;
   -- Should show your settings
   ```

4. **Update your frontend** (if needed):
   - Make sure your app uses the new table names
   - Clear localStorage: `localStorage.clear()`
   - Hard refresh browser

---

## 🚀 Quick Commands Reference

### Node.js Setup:
```bash
node setup-database-auto.mjs
```

### Supabase SQL Editor:
```
1. Copy setup-database-direct.sql
2. Paste in SQL Editor
3. Click Run
```

### psql Setup:
```bash
psql your_db -f setup-database-direct.sql
```

### Verify:
```sql
\dt lats_pos_*
```

---

## 📊 Comparison

| Method | Speed | Ease | Automation |
|--------|-------|------|------------|
| Node.js | ⚡⚡⚡ | ⭐⭐⭐ | ✅ Full |
| Supabase UI | ⚡⚡ | ⭐⭐⭐⭐ | ⚠️ Manual |
| psql | ⚡⚡⚡ | ⭐⭐ | ✅ Full |

**Recommendation:** Use Node.js method for automation, or Supabase UI for simplicity.

---

## ✅ Success Checklist

- [ ] Environment variables configured (if using Node.js)
- [ ] Database setup script executed successfully
- [ ] 5 tables verified in database
- [ ] RLS enabled on all tables
- [ ] Indexes created
- [ ] App tested with new tables
- [ ] Settings save and load correctly
- [ ] All 5 tabs work in UI

---

**Your database is ready!** 🎉

Choose your preferred method above and get started in minutes!

