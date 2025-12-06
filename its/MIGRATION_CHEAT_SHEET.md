# 📋 Schema Migration - Cheat Sheet

## ⚡ One-Page Quick Reference

---

## 🎯 What You Need

### Database Connection Strings (from Neon Console)

```bash
DEV_DATABASE_URL=postgresql://user:pass@dev-endpoint.neon.tech/db?sslmode=require
PROD_DATABASE_URL=postgresql://user:pass@prod-endpoint.neon.tech/db?sslmode=require
```

---

## 🚀 Commands (Pick One)

### Method 1: Quick Check (Safest - Recommended First)
```bash
# Set URLs
export DEV_DATABASE_URL="postgresql://..."
export PROD_DATABASE_URL="postgresql://..."

# Run check (generates SQL, doesn't execute)
npm run migrate:check

# Review output
cat schema_migration.sql

# Apply manually
psql "$PROD_DATABASE_URL" -f schema_migration.sql
```

### Method 2: Interactive (Asks Confirmation)
```bash
# Set URLs
export DEV_DATABASE_URL="postgresql://..."
export PROD_DATABASE_URL="postgresql://..."

# Run interactive migration
npm run migrate:schema

# Type "yes" to confirm
```

### Method 3: Bash Script
```bash
bash migrate-schema-dev-to-prod.sh
# Follow prompts
```

---

## 📊 What Gets Migrated

| Item | Action | Safe? |
|------|--------|-------|
| New Columns | ✅ Added | Yes |
| New Tables | ⚠️ Noted (manual) | N/A |
| New Indexes | ✅ Added | Yes |
| New Constraints | ✅ Added | Yes |
| Modified Columns | ✅ Updated | Yes |
| Removed Columns | ❌ Not touched | Safe |
| Removed Tables | ❌ Not touched | Safe |
| Data | ❌ Never touched | Safe |

---

## 🛡️ Safety Checklist

- [ ] Have both database URLs
- [ ] Reviewed what will change
- [ ] Tested on clone/test branch (optional)
- [ ] Low traffic time (if needed)
- [ ] Team notified
- [ ] Rollback plan ready

---

## 🔍 Verify Migration

```bash
# Connect to production
psql "$PROD_DATABASE_URL"

# List tables
\dt

# Describe a table
\d your_table_name

# Check data count
SELECT COUNT(*) FROM your_table;

# Exit
\q
```

---

## 🆘 Common Issues

| Error | Fix |
|-------|-----|
| "URLs not found" | `export DEV_DATABASE_URL="..."` |
| "Permission denied" | Check user permissions |
| "Column exists" | Already migrated (OK) |
| Migration fails | Auto-rolled back (no changes) |

---

## 📁 Generated Files

```
backups/
├── schema_comparison_TIMESTAMP.txt  # What's different
├── migration_TIMESTAMP.sql          # SQL to execute
└── schema_migration.sql             # Quick check output
```

---

## 🎓 Documentation

| File | Purpose |
|------|---------|
| 📖_START_HERE_SCHEMA_MIGRATION.md | Start here |
| QUICK_START_MIGRATION.md | 5-min guide |
| MIGRATION_README.md | Detailed examples |
| SCHEMA_MIGRATION_GUIDE.md | Complete reference |
| 🚀_MIGRATION_TOOLS_READY.md | Tools overview |

---

## 💡 Pro Tips

1. **First time?** Use `npm run migrate:check` first
2. **Not sure?** Test on a clone branch
3. **Always review** the generated SQL
4. **Low traffic** time is best
5. **Keep backups** accessible

---

## 🔄 Rollback

### If Migration Fails
- Automatic rollback (transaction)
- No changes applied

### If Need to Undo
```bash
# Option 1: Neon Console → Point-in-Time Recovery
# Option 2: Create reverse migration SQL
```

---

## 📞 Need Help?

1. Read: **📖_START_HERE_SCHEMA_MIGRATION.md**
2. Check: **MIGRATION_README.md**
3. Review: **SCHEMA_MIGRATION_GUIDE.md**

---

## ✅ Post-Migration

- [ ] Migration completed
- [ ] New columns/tables exist
- [ ] Data is intact
- [ ] App tested
- [ ] Logs checked
- [ ] Team notified

---

## 🎯 The Absolute Simplest Way

```bash
export DEV_DATABASE_URL="postgresql://..."
export PROD_DATABASE_URL="postgresql://..."
npm run migrate:schema
```

Type `yes` when asked. Done! ✨

---

**Print this page and keep it handy!** 📋

