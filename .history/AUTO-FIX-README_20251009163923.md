# 🚀 Auto-Fix: Product Deletion Issues

## ⚡ One-Command Fix

### Option 1: Using Shell Script (Easiest)

```bash
# Set your database URL and run
export DATABASE_URL="your-neon-connection-string-here"
./run-fix.sh
```

### Option 2: Using Node.js Script

```bash
# Set your database URL and run
export DATABASE_URL="your-neon-connection-string-here"
node auto-fix-product-deletion.mjs
```

### Option 3: Inline (No export needed)

```bash
DATABASE_URL="your-neon-connection-string-here" ./run-fix.sh
```

## 📋 Prerequisites

- ✅ Node.js installed
- ✅ Neon database connection string
- ✅ Database privileges (ALTER TABLE)

## 🔑 Get Your Connection String

1. **Go to Neon Dashboard**: https://console.neon.tech
2. **Select your project**
3. **Go to "Connection Details"**
4. **Copy the connection string** (looks like):
   ```
   postgresql://username:password@host.neon.tech/database?sslmode=require
   ```

## 🎯 Quick Start

### Step 1: Set Your Connection String

```bash
export DATABASE_URL="postgresql://username:password@host.neon.tech/database?sslmode=require"
```

Or add to your `.env` file:
```bash
DATABASE_URL=postgresql://username:password@host.neon.tech/database?sslmode=require
```

Then load it:
```bash
source .env
```

### Step 2: Run the Fix

```bash
./run-fix.sh
```

### Step 3: Done! 🎉

Your products can now be deleted successfully.

## 📊 What the Scripts Do

1. ✅ Connect to your Neon database
2. ✅ Apply foreign key constraint fixes
3. ✅ Verify the changes
4. ✅ Show you a summary

## 🔧 What Gets Fixed

| Table | Change |
|-------|--------|
| `lats_stock_movements` | product_id → `ON DELETE SET NULL` |
| `lats_purchase_order_items` | product_id → `ON DELETE SET NULL` |
| `lats_sale_items` | product_id → `ON DELETE SET NULL` |
| `inventory_items` | product_id → `ON DELETE CASCADE` |
| `lats_inventory_items` | product_id → `ON DELETE CASCADE` |

## 📺 Expected Output

```
🔧 AUTO-FIX: Product Deletion Issues
==================================================

📡 Connecting to database...
✅ Connected successfully

🔄 Applying fixes...

✅ Fix applied successfully!

🔍 Verifying foreign key constraints...

📋 Current Product Foreign Key Constraints:

✅ lats_stock_movements           | product_id      | SET NULL
✅ lats_purchase_order_items      | product_id      | SET NULL
✅ lats_sale_items                | product_id      | SET NULL
✅ inventory_items                | product_id      | CASCADE

✅ ============================================
✅ Product deletion fix completed successfully!
✅ ============================================

💡 What changed:
  • Products can now be deleted
  • Historical records are preserved
  • Product references in history become NULL
  • Reports continue to work

🧪 Test it:
  1. Open your POS application
  2. Go to Products/Inventory
  3. Select a product and delete it
  4. Deletion should work now! 🎉
```

## ❌ Troubleshooting

### Error: "No database connection string found"

**Solution:**
```bash
# Make sure you set the DATABASE_URL
export DATABASE_URL="your-connection-string-here"
```

### Error: "Authentication failed"

**Solution:**
- Check your username and password in the connection string
- Verify the connection string is correct

### Error: "Permission denied"

**Solution:**
- You need ALTER TABLE privileges
- Connect as database owner or request permissions

### Error: "pg module not found"

**Solution:**
The script will automatically install it, or run:
```bash
npm install pg
```

### Error: "Node.js not found"

**Solution:**
Install Node.js from https://nodejs.org

## 🔄 Alternative: Manual Fix

If the automatic scripts don't work, you can fix it manually:

1. **Open Neon SQL Editor**
2. **Copy contents of `fix-product-deletion.sql`**
3. **Paste and run**
4. **Done!**

## 🧪 Test the Fix

After running the fix:

1. Open your POS application
2. Navigate to Products/Inventory
3. Select any product
4. Click "Delete"
5. ✅ Product should delete successfully!

## 📁 Files Included

| File | Purpose |
|------|---------|
| `run-fix.sh` | ⭐ Shell script (easiest) |
| `auto-fix-product-deletion.mjs` | Node.js script |
| `fix-product-deletion.sql` | SQL fix (for manual use) |
| `diagnose-product-deletion.sql` | Diagnostic tool |
| `AUTO-FIX-README.md` | This guide |

## 💡 Tips

### Use .env File

Create a `.env` file in your project:
```bash
DATABASE_URL=postgresql://username:password@host.neon.tech/database?sslmode=require
```

Load and run:
```bash
source .env
./run-fix.sh
```

### Add to package.json

```json
{
  "scripts": {
    "fix-products": "node auto-fix-product-deletion.mjs"
  }
}
```

Then run:
```bash
npm run fix-products
```

### GitHub Actions / CI/CD

```yaml
- name: Fix Product Deletion
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
  run: ./run-fix.sh
```

## ✅ Verification

After running the fix, verify it worked:

```bash
# Check if products can be deleted
psql "$DATABASE_URL" -c "
  SELECT 
    tc.table_name,
    rc.delete_rule
  FROM information_schema.table_constraints tc
  JOIN information_schema.referential_constraints rc 
    ON tc.constraint_name = rc.constraint_name
  WHERE tc.constraint_name LIKE '%product_id%'
  ORDER BY tc.table_name;
"
```

All should show `SET NULL` or `CASCADE`.

## 🎉 Success Checklist

- [x] Connection string set
- [ ] Run `./run-fix.sh`
- [ ] See ✅ success message
- [ ] Test product deletion in app
- [ ] Products delete successfully!

---

**Need help?** Check `PRODUCT-DELETION-FIX-README.md` for detailed documentation.

