# 🚀 Quick Start: Database Cleanup

## 📍 Access

1. Go to **Admin Settings** → **Database** section
2. Scroll to **Database Data Cleanup** panel
3. Click **Refresh Scan** to load tables

## 🎯 Quick Actions

### Option 1: Clean Specific Tables
```
1. Expand category (click arrow)
2. Check specific tables
3. Click "Delete Data from X Selected Tables"
4. Type "DELETE" → Confirm
```

### Option 2: Clean Entire Category
```
1. Click checkbox next to category name
2. All tables in category selected
3. Click "Delete Data from X Selected Tables"
4. Type "DELETE" → Confirm
```

### Option 3: Clean Everything (⚠️ DANGER!)
```
1. Click "Select All" button
2. All 157 tables selected
3. Click delete button
4. Type "DELETE" → Confirm
```

## 🗂️ Most Common Categories

### 📊 Clean Test/Demo Data
**Select:**
- Sales & Transactions category
- Customers category

### 🗑️ Clean Old Logs
**Select:**
- System & Audit Logs category
- Communications category

### 📦 Reset Inventory
**Select:**
- Inventory & Products category

### 💰 Clean Financial Data
**Select:**
- Finance & Expenses category
- Sales & Transactions category

## ⚠️ BEFORE YOU START

### ✅ Pre-Cleanup Checklist
- [ ] Create full database backup
- [ ] Test on development database first
- [ ] Verify what you're deleting
- [ ] Schedule during off-peak hours
- [ ] Inform your team

### 🛡️ Safety Steps
1. Backup first (use "Download Full Backup" above)
2. Start with small tables
3. Verify results before cleaning more
4. Keep audit logs for legal compliance

## 📊 Statistics Display

```
┌─────────────────────────────────────────┐
│ Total Tables: 157                        │
│ Total Rows: 1,234,567                   │
│ Selected Tables: 5                       │
│ Rows to Delete: 45,678                  │
└─────────────────────────────────────────┘
```

## 🔍 Search Tables

**Search box**: Type any table name
- Example: "customer" → shows all customer-related tables
- Example: "log" → shows all log tables
- Example: "lats_" → shows all LATS tables

## 📋 Common Scenarios

### Scenario 1: Weekly Log Cleanup
```bash
Tables to clean:
✓ audit_logs
✓ sms_logs  
✓ email_logs
✓ api_request_logs

Estimated time: < 1 minute
Risk level: LOW ✅
```

### Scenario 2: Monthly Data Archival
```bash
Tables to clean (after archiving):
✓ Old sales records
✓ Customer communications
✓ Expired notifications

Estimated time: 5-10 minutes
Risk level: MEDIUM ⚠️
Backup required: YES
```

### Scenario 3: Fresh Start (Test Environment)
```bash
Tables to clean:
✓ ALL tables (Select All)

Estimated time: 10-30 minutes
Risk level: HIGH 🔴
Backup required: MANDATORY
Environment: TEST ONLY!
```

## 🎨 Visual Guide

### Category Structure
```
📁 Sales & Transactions (10 tables)
   ├─ lats_sales (25,000 rows)
   ├─ lats_sale_items (75,000 rows)
   ├─ lats_receipts (25,000 rows)
   └─ ...

📁 Customers (16 tables)
   ├─ lats_customers (5,000 rows)
   ├─ customer_notes (12,000 rows)
   └─ ...

📁 System & Audit Logs (5 tables)
   ├─ audit_logs (500,000 rows) ← Often cleaned
   ├─ sms_logs (100,000 rows) ← Often cleaned
   └─ ...
```

## ⚡ Quick Tips

### 💡 Pro Tips
- **Search first** - Find tables quickly
- **Expand to verify** - Check row counts before selecting
- **Start small** - Clean logs first, critical data last
- **Check statistics** - Review "Rows to Delete" count
- **Type carefully** - Must type "DELETE" exactly (capitals)

### 🚫 Don't Clean These (Usually)
- `users` - Your admin/employee accounts
- `auth_users` - Authentication data
- `admin_settings` - System configuration
- `lats_products` - Your product catalog
- `lats_branches` - Your store locations

### ✅ Safe to Clean Regularly
- `audit_logs` - Keep last 90 days
- `sms_logs` - Keep last 30 days
- `email_logs` - Keep last 30 days
- `notifications` - Keep last 7 days
- `api_request_logs` - Keep last 30 days

## 🔢 Row Count Guide

| Rows | Time to Delete | Risk Level |
|------|---------------|------------|
| < 1,000 | < 1 second | ✅ Low |
| 1,000 - 10,000 | < 10 seconds | ✅ Low |
| 10,000 - 100,000 | < 1 minute | ⚠️ Medium |
| 100,000 - 1M | 1-5 minutes | ⚠️ Medium |
| > 1M | 5+ minutes | 🔴 High |

## 📞 Emergency Contacts

### If Something Goes Wrong

1. **Stop immediately** - Close the dialog
2. **Check what was deleted** - Review success messages
3. **Restore from backup** - Use your backup file
4. **Contact support** - Have backup ready

### Rollback Steps
```bash
1. Download your backup (created before cleanup)
2. Go to database management
3. Restore from backup file
4. Verify data is restored
```

## 🎓 Video Tutorial (Coming Soon)

### Step-by-Step Screenshots
1. Navigate to Admin Settings
2. Find Database section
3. Scan database
4. Select tables
5. Confirm deletion
6. Verify results

## 📚 Additional Resources

- **Full Guide**: `DATABASE_CLEANUP_GUIDE.md`
- **SQL Script**: `database-cleanup-verification.sql`
- **Implementation**: `IMPLEMENTATION_SUMMARY.md`

## 🆘 Need Help?

**Common Questions:**

**Q: Can I undo a deletion?**
A: No! Always backup first.

**Q: Which tables should I never delete?**
A: Users, products, branches, system settings.

**Q: How often should I clean logs?**
A: Monthly for audit logs, weekly for communication logs.

**Q: Why did deletion fail?**
A: Usually foreign key constraints. Delete child tables first.

**Q: Is there a limit?**
A: No, but very large deletions may timeout.

---

## 🎯 Remember

1. **BACKUP FIRST** - Always, no exceptions!
2. **TEST FIRST** - Use development database
3. **START SMALL** - Clean logs before critical data
4. **VERIFY ALWAYS** - Check results immediately
5. **DOCUMENT IT** - Keep track of what you cleaned

**You're ready! Start with cleaning old logs (low risk) and work your way up.** 🚀

---

*Last updated: November 7, 2025*
*Version: 1.0*

