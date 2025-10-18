# 🔧 SQL Migration Fixed!

## ❌ The Problem

You were getting this error:
```
ERROR: syntax error at or near "ral_settings" (SQLSTATE 42601)
```

### Root Cause:
PostgreSQL doesn't support inline CHECK constraints with `ADD COLUMN IF NOT EXISTS`. This syntax is invalid:

```sql
-- ❌ THIS DOESN'T WORK:
ALTER TABLE lats_pos_general_settings 
ADD COLUMN IF NOT EXISTS font_size TEXT DEFAULT 'medium' 
CHECK (font_size IN ('tiny', 'extra-small', 'small', 'medium', 'large'));
```

## ✅ The Solution

I've created **two fixed versions** for you:

### Option 1: Advanced Version (Recommended)
**File:** `ADD-FONT-SIZE-COLUMN.sql`

This version:
- ✅ Checks if column exists before adding
- ✅ Handles existing constraints gracefully
- ✅ Safe to run multiple times
- ✅ Provides helpful feedback messages

```sql
-- Uses DO blocks for conditional logic
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_general_settings' 
        AND column_name = 'font_size'
    ) THEN
        ALTER TABLE lats_pos_general_settings 
        ADD COLUMN font_size TEXT DEFAULT 'medium';
    END IF;
END $$;
-- ... plus constraint handling
```

### Option 2: Simple Version
**File:** `ADD-FONT-SIZE-SIMPLE.sql`

This version:
- ✅ Straightforward ALTER TABLE statements
- ✅ Will error if column exists (that's OK, just ignore it)
- ✅ Easy to understand
- ✅ Quick to run

```sql
-- Simple and direct
ALTER TABLE lats_pos_general_settings 
ADD COLUMN font_size TEXT DEFAULT 'medium';

ALTER TABLE lats_pos_general_settings 
ADD CONSTRAINT lats_pos_general_settings_font_size_check 
CHECK (font_size IN ('tiny', 'extra-small', 'small', 'medium', 'large'));
```

## 🚀 How to Run

### Using Neon Console:

1. **Open your Neon Dashboard**
2. Go to your database
3. Click **SQL Editor**
4. **Copy and paste** one of the migration files:
   - `ADD-FONT-SIZE-COLUMN.sql` (recommended)
   - OR `ADD-FONT-SIZE-SIMPLE.sql` (if issues)
5. Click **Run** or press Ctrl+Enter
6. ✅ Done!

### Using Supabase SQL Editor:

1. **Open Supabase Dashboard**
2. Go to **SQL Editor**
3. Click **New Query**
4. **Paste** the migration SQL
5. Click **Run**
6. ✅ Done!

### Using psql Command Line:

```bash
# Connect to your database
psql -h your-host -U your-user -d your-database

# Run the migration
\i ADD-FONT-SIZE-COLUMN.sql

# Or paste the SQL directly
```

## 🔍 Verify It Worked

After running the migration, check with:

```sql
-- Check if column exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'lats_pos_general_settings' 
AND column_name = 'font_size';

-- Should return:
-- column_name | data_type | column_default
-- font_size   | text      | 'medium'::text
```

## 🎯 What This Migration Does

### Step 1: Add Column
```sql
ALTER TABLE lats_pos_general_settings 
ADD COLUMN font_size TEXT DEFAULT 'medium';
```
Adds a new `font_size` column with default value 'medium'

### Step 2: Update Existing Rows
```sql
UPDATE lats_pos_general_settings 
SET font_size = 'medium' 
WHERE font_size IS NULL;
```
Ensures all existing rows have a valid font size

### Step 3: Add Constraint
```sql
ALTER TABLE lats_pos_general_settings 
ADD CONSTRAINT lats_pos_general_settings_font_size_check 
CHECK (font_size IN ('tiny', 'extra-small', 'small', 'medium', 'large'));
```
Ensures only valid font sizes can be saved

## ⚠️ Common Issues & Solutions

### Issue 1: Column Already Exists
```
ERROR: column "font_size" of relation "lats_pos_general_settings" already exists
```

**Solution:**
- ✅ This is fine! The column is already there
- Just run the constraint part:
```sql
ALTER TABLE lats_pos_general_settings 
ADD CONSTRAINT lats_pos_general_settings_font_size_check 
CHECK (font_size IN ('tiny', 'extra-small', 'small', 'medium', 'large'));
```

### Issue 2: Constraint Already Exists
```
ERROR: constraint "lats_pos_general_settings_font_size_check" already exists
```

**Solution:**
- ✅ Perfect! Everything is already set up
- No action needed, you're good to go!

### Issue 3: Need to Update Constraint
If you need to update the constraint (e.g., already had old values):

```sql
-- Drop old constraint
ALTER TABLE lats_pos_general_settings 
DROP CONSTRAINT IF EXISTS lats_pos_general_settings_font_size_check;

-- Add new constraint with updated values
ALTER TABLE lats_pos_general_settings 
ADD CONSTRAINT lats_pos_general_settings_font_size_check 
CHECK (font_size IN ('tiny', 'extra-small', 'small', 'medium', 'large'));
```

## 📊 Final Database Structure

After migration, your table will have:

```
lats_pos_general_settings
├── id (UUID, Primary Key)
├── user_id (UUID)
├── business_id (TEXT)
├── theme (TEXT)
├── language (TEXT)
├── ... (other columns)
├── font_size (TEXT, DEFAULT 'medium') ← NEW! ✨
│   └── CONSTRAINT: Must be one of:
│       • 'tiny' (11px)
│       • 'extra-small' (12px)
│       • 'small' (14px)
│       • 'medium' (16px)
│       • 'large' (18px)
└── ... (other columns)
```

## ✅ Testing

After migration, test in your app:

1. **Open POS Settings**
2. Go to **General** tab
3. Find **Font Size** dropdown
4. Try selecting different sizes
5. Click **Save**
6. Refresh page - your choice should persist!

## 🎉 Success!

Once the migration runs successfully, you'll see:

```
✅ Font size column migration completed successfully!
```

And you can use all 5 font size options:
- Tiny (11px) ✨
- Extra Small (12px)
- Small (14px)
- Medium (16px) ⭐
- Large (18px)

---

**Fixed:** October 17, 2025  
**Issue:** PostgreSQL syntax error with inline CHECK  
**Solution:** Separated constraint from column creation  
**Status:** ✅ Ready to run!

Run either migration file and enjoy your font size control! 🎨

