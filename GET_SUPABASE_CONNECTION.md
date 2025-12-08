# How to Get Your Supabase Database Connection String

The hostname `db.jxhzveborezjhsmzsgbc.supabase.co` cannot be resolved. Let's get the correct connection details from your Supabase dashboard.

## 🔍 Step 1: Get Connection String from Supabase

1. **Go to Supabase Dashboard:**
   - https://app.supabase.com/project/jxhzveborezjhsmzsgbc/settings/database

2. **Find "Connection string" section:**
   - Look for "Connection string" or "Connection pooling"
   - You'll see options like:
     - **Direct connection** (for server-side)
     - **Connection pooling** (recommended for serverless)

3. **Copy the connection string:**
   - It should look like one of these:
     ```
     # Direct connection
     postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
     
     # Or connection pooler
     postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres
     ```

## 🔧 Step 2: Use the Correct Format

Supabase connection strings typically use one of these formats:

### Option A: Connection Pooler (Recommended)
```
postgresql://postgres.jxhzveborezjhsmzsgbc:[PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres
```

### Option B: Direct Connection
```
postgresql://postgres.jxhzveborezjhsmzsgbc:[PASSWORD]@db.jxhzveborezjhsmzsgbc.supabase.co:5432/postgres
```

### Option C: Transaction Mode Pooler
```
postgresql://postgres.jxhzveborezjhsmzsgbc:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
```

## 📝 Step 3: Replace Password

Once you have the connection string, replace `[PASSWORD]` with your actual password: `@SMASIKA1010`

**Important:** If your password contains special characters like `@`, you may need to URL-encode it:
- `@` becomes `%40`
- So `@SMASIKA1010` becomes `%40SMASIKA1010`

## 🚀 Step 4: Test Connection

Once you have the correct connection string, test it:

```bash
# Test with psql
psql "postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@[host]:[port]/postgres" -c "SELECT version();"
```

## 🔄 Alternative: Use Supabase Dashboard SQL Editor

If direct connection doesn't work, you can:

1. **Use Supabase SQL Editor:**
   - Go to: https://app.supabase.com/project/jxhzveborezjhsmzsgbc/sql/new
   - Run your migration SQL directly there

2. **Export schema from source:**
   ```bash
   # Export schema
   pg_dump "postgresql://mtaasisi@localhost:5432/neondb" --schema-only > schema.sql
   ```

3. **Import via Supabase Dashboard:**
   - Copy the SQL from `schema.sql`
   - Paste into Supabase SQL Editor
   - Run it

## 🆘 Troubleshooting

### If hostname doesn't resolve:
- Check if you're using the correct region
- Verify the project reference is correct: `jxhzveborezjhsmzsgbc`
- Try the connection pooler URL instead

### If connection is refused:
- Check if your IP is allowed in Supabase settings
- Verify the port (5432 for direct, 6543 for pooler)
- Check if SSL is required

### If password authentication fails:
- Verify password in Supabase dashboard
- Try resetting the database password
- Make sure password is URL-encoded if it has special characters

## 📞 Next Steps

Once you have the working connection string:

1. **Update the migration script:**
   ```bash
   export SUPABASE_DATABASE_URL="[your-correct-connection-string]"
   ```

2. **Run migration:**
   ```bash
   node migrate-to-supabase.mjs
   ```

Or use the simple script:
```bash
./migrate-to-supabase-simple.sh
```

