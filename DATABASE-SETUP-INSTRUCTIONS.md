# 📊 Database Setup Instructions

## ✅ How to Add Notifications & Receipt Settings to Database

Follow these steps to update your database with the new WhatsApp PDF and enhanced notification settings.

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Run the SQL Migration
```bash
# Open your database (Neon, Supabase, or PostgreSQL)
# Run this SQL file:
```

**File:** `ADD-WHATSAPP-PDF-AND-NOTIFICATION-SETTINGS.sql`

This will:
- ✅ Add WhatsApp PDF columns to `lats_pos_receipt_settings`
- ✅ Create `lats_pos_notification_settings` table
- ✅ Set up Row Level Security (RLS) policies
- ✅ Add triggers for `updated_at` fields
- ✅ Create indexes for performance

### Step 2: Verify the Changes
Run these verification queries:

```sql
-- Check receipt settings columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'lats_pos_receipt_settings'
AND column_name LIKE '%whatsapp%'
ORDER BY ordinal_position;

-- Check notification settings table
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'lats_pos_notification_settings'
ORDER BY ordinal_position;
```

### Step 3: Test in Your App
1. Open POS Settings → Receipt Tab
2. Scroll to "WhatsApp PDF & Receipt Sharing"
3. Enable it and configure
4. Save settings
5. Check database to confirm data is saved

---

## 📋 What Gets Added

### Receipt Settings Table (lats_pos_receipt_settings)
**New Columns Added:**

```sql
enable_whatsapp_pdf            BOOLEAN DEFAULT true
whatsapp_pdf_auto_send         BOOLEAN DEFAULT false
whatsapp_pdf_show_preview      BOOLEAN DEFAULT true
whatsapp_pdf_format            TEXT DEFAULT 'a4'
whatsapp_pdf_quality           TEXT DEFAULT 'standard'
whatsapp_pdf_include_logo      BOOLEAN DEFAULT true
whatsapp_pdf_include_images    BOOLEAN DEFAULT false
whatsapp_pdf_include_qr        BOOLEAN DEFAULT true
whatsapp_pdf_include_barcode   BOOLEAN DEFAULT false
whatsapp_pdf_message           TEXT DEFAULT 'Thank you...'
enable_email_pdf               BOOLEAN DEFAULT true
enable_print_pdf               BOOLEAN DEFAULT true
enable_download_pdf            BOOLEAN DEFAULT true
show_share_button              BOOLEAN DEFAULT true
```

### Notification Settings Table (lats_pos_notification_settings)
**New Table Created:**

```sql
CREATE TABLE lats_pos_notification_settings (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id UUID,
  
  -- WhatsApp Text
  whatsapp_enabled BOOLEAN,
  whatsapp_auto_send BOOLEAN,
  whatsapp_show_preview BOOLEAN,
  whatsapp_include_logo BOOLEAN,
  whatsapp_include_items BOOLEAN,
  whatsapp_message TEXT,
  whatsapp_closing_message TEXT,
  
  -- SMS
  sms_enabled BOOLEAN,
  sms_auto_send BOOLEAN,
  sms_template TEXT,
  sms_include_total BOOLEAN,
  sms_include_balance BOOLEAN,
  
  -- Email
  email_enabled BOOLEAN,
  email_auto_send BOOLEAN,
  email_subject TEXT,
  email_template TEXT,
  email_attach_pdf BOOLEAN,
  
  -- General
  notify_on_payment BOOLEAN,
  notify_on_refund BOOLEAN,
  notify_low_stock BOOLEAN,
  notify_new_customer BOOLEAN,
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## 🔧 Data Storage Strategy

Your app now uses a **hybrid approach** for flexibility:

### 🗄️ Database Storage (Persistent)
**Receipt Settings** → `lats_pos_receipt_settings` table
- All receipt design & layout
- WhatsApp PDF settings
- Print & sharing options
- Syncs across devices
- ✅ Best for: Multi-device businesses

### 💾 LocalStorage (Quick Access)
**Notification Settings** → Browser localStorage
- WhatsApp text templates
- SMS templates
- Email templates
- Quick template customization
- ✅ Best for: Single device, fast access

### Why This Approach?

**Advantages:**
1. **Receipt settings in DB** = Consistent across all POS terminals
2. **Notification templates in localStorage** = Fast, no API calls
3. **Flexible** = Can migrate notifications to DB later if needed
4. **Simple** = No complex syncing needed

**When to Migrate Notifications to DB:**
- If you have multiple POS terminals
- If you want centralized template management
- If you need admin control over templates

---

## 🔄 Migration Options

### Option 1: Keep Current Hybrid Approach (Recommended)
```
✅ Receipt Settings → Database
✅ Notification Templates → LocalStorage
✅ Works out of the box
✅ Fast and simple
```

### Option 2: Move Everything to Database
If you prefer all settings in the database:

1. **Already have the table:** `lats_pos_notification_settings` is created!
2. **Update the service:** Modify `notificationSettingsService.ts` to use Supabase
3. **Benefits:** Centralized management, multi-device sync

**To switch to database storage:**

```typescript
// In notificationSettingsService.ts
// Replace localStorage calls with Supabase calls

// Current (localStorage):
localStorage.setItem('lats-pos-notifications', JSON.stringify(settings));

// New (database):
await supabase
  .from('lats_pos_notification_settings')
  .upsert(settings);
```

---

## 📊 Database Schema Overview

### Current Structure After Migration

```
┌─────────────────────────────────────────────┐
│           DATABASE TABLES                   │
├─────────────────────────────────────────────┤
│                                             │
│  lats_pos_general_settings                  │
│  ├── Business info                          │
│  ├── Interface settings                     │
│  └── Tax settings                           │
│                                             │
│  lats_pos_receipt_settings                  │
│  ├── Receipt design                         │
│  ├── Print settings                         │
│  ├── WhatsApp PDF (NEW!)                    │
│  └── Sharing options (NEW!)                 │
│                                             │
│  lats_pos_notification_settings (NEW!)      │
│  ├── WhatsApp text settings                 │
│  ├── SMS settings                           │
│  ├── Email settings                         │
│  └── General notifications                  │
│                                             │
│  lats_pos_dynamic_pricing_settings          │
│  lats_pos_barcode_scanner_settings          │
│  lats_pos_delivery_settings                 │
│  ... (other settings tables)                │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🔐 Security (Row Level Security)

The migration automatically sets up RLS policies:

```sql
-- Users can only access their own settings
CREATE POLICY "Users can view own receipt settings"
  ON lats_pos_receipt_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own receipt settings"
  ON lats_pos_receipt_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Same for notification settings
CREATE POLICY "Users can view own notification settings"
  ON lats_pos_notification_settings FOR SELECT
  USING (auth.uid() = user_id);
```

**This ensures:**
- ✅ Users can only see their own settings
- ✅ No user can access another user's settings
- ✅ Admin can manage all if needed (modify policies)

---

## ✅ Verification Checklist

After running the migration, verify:

- [ ] `lats_pos_receipt_settings` has 14 new columns
- [ ] `lats_pos_notification_settings` table exists
- [ ] Indexes created for performance
- [ ] Triggers set up for `updated_at`
- [ ] RLS policies active
- [ ] App can read/write settings
- [ ] Settings persist after refresh

---

## 🐛 Troubleshooting

### Issue: "Column already exists"
**Solution:** Safe to ignore. The migration uses `IF NOT EXISTS` to prevent errors.

### Issue: "Permission denied"
**Solution:** 
1. Check you're logged in with correct user
2. Verify RLS policies allow your user
3. Check `auth.uid()` matches `user_id`

### Issue: "Settings not saving"
**Solution:**
1. Check browser console for errors
2. Verify database connection
3. Check RLS policies
4. Try disabling RLS temporarily to test

### Issue: "Old settings missing after migration"
**Solution:**
- Old settings are preserved
- New columns added with defaults
- No data loss
- Re-save settings to populate new fields

---

## 📈 Performance Optimization

The migration includes:

```sql
-- Indexes for faster queries
CREATE INDEX idx_receipt_settings_user_id 
  ON lats_pos_receipt_settings(user_id);

CREATE INDEX idx_notification_settings_user_id 
  ON lats_pos_notification_settings(user_id);

CREATE INDEX idx_notification_settings_business_id 
  ON lats_pos_notification_settings(business_id);
```

**Result:**
- ⚡ Faster settings lookup
- ⚡ Faster save operations
- ⚡ Better performance with many users

---

## 🔄 Rollback (If Needed)

If something goes wrong, you can rollback:

```sql
-- Remove new columns from receipt settings
ALTER TABLE lats_pos_receipt_settings 
DROP COLUMN IF EXISTS enable_whatsapp_pdf,
DROP COLUMN IF EXISTS whatsapp_pdf_auto_send,
DROP COLUMN IF EXISTS whatsapp_pdf_show_preview,
DROP COLUMN IF EXISTS whatsapp_pdf_format,
DROP COLUMN IF EXISTS whatsapp_pdf_quality,
DROP COLUMN IF EXISTS whatsapp_pdf_include_logo,
DROP COLUMN IF EXISTS whatsapp_pdf_include_images,
DROP COLUMN IF EXISTS whatsapp_pdf_include_qr,
DROP COLUMN IF EXISTS whatsapp_pdf_include_barcode,
DROP COLUMN IF EXISTS whatsapp_pdf_message,
DROP COLUMN IF EXISTS enable_email_pdf,
DROP COLUMN IF EXISTS enable_print_pdf,
DROP COLUMN IF EXISTS enable_download_pdf,
DROP COLUMN IF EXISTS show_share_button;

-- Drop notification settings table
DROP TABLE IF EXISTS lats_pos_notification_settings CASCADE;
```

---

## 📚 Next Steps

After database setup:

1. **Test in UI**
   - Open POS Settings
   - Configure all tabs
   - Save and verify

2. **Test Sending**
   - Process test transaction
   - Try WhatsApp PDF
   - Try text notifications
   - Check messages received

3. **Go Live**
   - Enable auto-send if desired
   - Monitor for issues
   - Collect user feedback

---

## 🎯 Summary

✅ **What You Did:**
- Added 14 new columns to receipt settings
- Created new notification settings table
- Set up security policies
- Added performance indexes
- Everything backed up and safe

✅ **What You Can Now Do:**
- Send WhatsApp PDF receipts
- Configure PDF quality & format
- Customize all notification templates
- Use auto or manual sending
- Full template control

✅ **Storage:**
- Receipt & PDF settings → Database
- Notification templates → LocalStorage (or migrate to DB if needed)

---

**🎉 You're all set! Your database is ready for the enhanced notification system!**

---

*For questions or issues, check the troubleshooting section above.*

