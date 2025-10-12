# 🚀 How to Automatically Fix 400 Errors

## Step 1: Get Your Database URL

1. Go to https://console.neon.tech
2. Select your project
3. Click **"Connection Details"** or **"Dashboard"**
4. Look for **"Connection string"** - it looks like:
   ```
   postgresql://username:password@ep-xxxxx.us-east-1.aws.neon.tech/dbname?sslmode=require
   ```
5. **Copy it!**

## Step 2: Add URL to Config

Open the file `database-config.json` and replace the placeholder URL with your real one:

```json
{
  "url": "YOUR_ACTUAL_DATABASE_URL_HERE"
}
```

## Step 3: Run the Fix

```bash
npm run fix-database
```

That's it! 🎉

---

## Full Example

If your database URL is:
```
postgresql://myuser:mypass123@ep-cool-moon-123456.us-east-1.aws.neon.tech/neondb?sslmode=require
```

Then your `database-config.json` should be:
```json
{
  "url": "postgresql://myuser:mypass123@ep-cool-moon-123456.us-east-1.aws.neon.tech/neondb?sslmode=require"
}
```

Then run:
```bash
npm run fix-database
```

The script will:
- ✅ Connect to your database
- ✅ Disable RLS on settings tables
- ✅ Create default settings for admin user
- ✅ Verify everything worked

After it completes, just **hard refresh your app** and the 400 errors will be gone!

