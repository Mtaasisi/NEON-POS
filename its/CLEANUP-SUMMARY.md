# Database Cleanup Summary

## 🎯 What This Cleanup Does

This cleanup will **remove all transactional/operational data** while **preserving your configuration, settings, and templates**.

---

## ✅ **DATA THAT WILL BE KEPT (Not Cleaned)**

### Settings Tables (Configuration)
- ✅ `settings` - General system settings
- ✅ `system_settings` - System-wide configuration
- ✅ `admin_settings` - Admin configuration
- ✅ `admin_settings_log` - Settings change history
- ✅ `admin_settings_view` - Settings view
- ✅ `lats_pos_general_settings` - POS general settings
- ✅ `lats_pos_advanced_settings` - POS advanced settings
- ✅ `lats_pos_receipt_settings` - POS receipt settings
- ✅ `user_settings` - User preferences
- ✅ `whatsapp_instance_settings_view` - WhatsApp instance settings

### Template Tables (Reusable Templates)
- ✅ `communication_templates` - Communication templates
- ✅ `notification_templates` - Notification templates
- ✅ `whatsapp_templates` - WhatsApp templates
- ✅ `whatsapp_message_templates` - WhatsApp message templates
- ✅ `diagnostic_templates` - Diagnostic test templates

### Configuration Tables
- ✅ `sms_triggers` - SMS automation triggers
- ✅ `integrations` - Third-party integrations
- ✅ `contact_methods` - Contact method configurations

### User & Employee Data (PRESERVED!)
- ✅ `auth_users` - User accounts (4 users)
- ✅ `employees` - Employee records (1 employee)
- ✅ `lats_employees` - Extended employee data

### Location Data
- ✅ `lats_branches` - Branch/location information (3 branches)

---

## 🗑️ **DATA THAT WILL BE REMOVED (Cleaned)**

### Customer Data
- ❌ `customers` - All customer records
- ❌ `customer_notes` - Customer notes
- ❌ `customer_checkins` - Visit history
- ❌ `customer_payments` - Payment records
- ❌ `customer_revenue` - Revenue tracking
- ❌ `contact_history` - Communication history
- ❌ `contact_preferences` - Contact preferences
- ❌ `appointments` - Appointments

### Product & Inventory Data
- ❌ `lats_products` - All products
- ❌ `lats_product_variants` - Product variants (parent & child IMEI)
- ❌ `product_images` - Product images
- ❌ `lats_categories` - Product categories
- ❌ `lats_stock_movements` - Stock movement history
- ❌ `lats_purchase_orders` - Purchase orders
- ❌ `lats_suppliers` - Supplier information

### Device/Repair Data
- ❌ `devices` - Device records
- ❌ `device_attachments` - Device attachments
- ❌ `device_checklists` - Service checklists
- ❌ `device_ratings` - Customer ratings
- ❌ `device_remarks` - Service notes
- ❌ `device_transitions` - Status changes
- ❌ `diagnostic_requests` - Diagnostic requests
- ❌ `diagnostic_devices` - Devices in diagnostics
- ❌ `diagnostic_checks` - Diagnostic results

### Financial Data
- ❌ `finance_accounts` - Financial accounts
- ❌ `finance_expenses` - Expenses
- ❌ `finance_expense_categories` - Expense categories
- ❌ `finance_transfers` - Money transfers
- ❌ `gift_cards` - Gift cards
- ❌ `gift_card_transactions` - Gift card transactions
- ❌ `installment_payments` - Installment payments

### Employee Activity Data (Users/Employees Preserved!)
- ❌ `user_daily_goals` - Daily goals
- ❌ `attendance_records` - Attendance tracking
- ❌ `employee_shifts` - Shift schedules

### Communication Logs (Not Templates!)
- ❌ `email_logs` - Email history
- ❌ `sms_logs` - SMS history
- ❌ `chat_messages` - Chat messages

### Audit & Tracking
- ❌ `audit_logs` - Audit trail
- ❌ `uuid_diagnostic_log` - UUID logs

---

## 🚀 **How to Execute the Cleanup**

### Option 1: Using Database Tool (Recommended)
```bash
psql -h your-database-host -U your-username -d your-database-name -f clean-database-keep-settings.sql
```

### Option 2: Using pgAdmin or Database GUI
1. Open the file `clean-database-keep-settings.sql`
2. Copy the entire content
3. Paste into your SQL query window
4. Execute

### Option 3: Using Node.js/Application
```typescript
import { sql } from '@vercel/postgres';
import fs from 'fs';

const sqlScript = fs.readFileSync('./clean-database-keep-settings.sql', 'utf-8');
await sql.query(sqlScript);
```

---

## ⚠️ **IMPORTANT WARNINGS**

1. **BACKUP FIRST**: You already have a backup at:
   - `database-backup-2025-10-26T17-18-24-701Z.json`
   - Verify this backup is complete before proceeding!

2. **THIS IS IRREVERSIBLE**: Once you run this script, the data is gone forever (unless you have a backup)

3. **TEST IN DEVELOPMENT**: If possible, test this script in a development/staging environment first

4. **USER ACCOUNTS**: Your user accounts will be PRESERVED - you can log in immediately after cleanup!

5. **DOWNTIME**: Your application should be offline during this cleanup to prevent data inconsistencies

---

## 📝 **Post-Cleanup Checklist**

After running the cleanup:
- [ ] Verify settings are still intact
- [ ] Verify templates are still intact
- [ ] Verify user accounts still work (login test)
- [ ] Restore your real data
- [ ] Test critical functionality
- [ ] Verify stock levels are correct
- [ ] Check POS functionality
- [ ] Verify reporting works

---

## 🆘 **If Something Goes Wrong**

If you need to rollback:
1. Stop all operations immediately
2. Restore from your backup: `database-backup-2025-10-26T17-18-24-701Z.json`
3. Contact your database administrator

---

## 💡 **Estimated Cleanup Time**

- Small database (< 10,000 records): ~5 seconds
- Medium database (10,000 - 100,000 records): ~30 seconds
- Large database (> 100,000 records): ~2-5 minutes

**Current database size**: ~15 customers + product/variant data (should take < 10 seconds)

