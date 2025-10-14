# 🔧 How to Fix Inventory Settings Error

## ❌ The Problem

Your console shows this error:
```
Error in getInventorySettings: {data: null, error: {…}, count: null}
```

**Root Cause:** The `admin_settings` table doesn't exist in your database, or it exists but has no inventory settings data.

## ✅ The Solution

### Step 1: Run the Fix Script

Execute this SQL file in your Neon database:
```
🔧-FIX-INVENTORY-SETTINGS-ERROR.sql
```

This script will:
1. ✅ Create the `admin_settings` table (if it doesn't exist)
2. ✅ Create the `admin_settings_log` table for audit trails
3. ✅ Insert all 89 inventory settings with proper defaults
4. ✅ Create helper functions and views
5. ✅ Set up proper indexes for performance
6. ✅ Enable Row Level Security for data protection

### Step 2: Verify the Fix

Run this test script to verify everything is working:
```
TEST-INVENTORY-SETTINGS-FIX.sql
```

This will check:
- ✅ Table exists
- ✅ All 89 settings are installed
- ✅ Critical settings are present
- ✅ Data types are correct
- ✅ Functions and views are created
- ✅ Indexes are in place

### Step 3: Refresh Your App

After running the fix:
1. Refresh your browser (F5 or Cmd+R)
2. Navigate to the Inventory Settings page
3. The error should be gone! 🎉

## 📊 What Gets Created

### Tables

**admin_settings**
- Stores all system settings (not just inventory)
- 89 inventory-specific settings
- Organized by category

**admin_settings_log**
- Audit trail for setting changes
- Tracks who changed what and when

### Settings Categories

The 89 inventory settings are organized into:

1. **Stock Management** (8 settings)
   - Low stock thresholds
   - Auto-reorder rules
   - Stock counting frequency

2. **Pricing & Valuation** (8 settings)
   - Markup percentages
   - Price rounding
   - Cost calculation methods

3. **Notifications & Alerts** (10 settings)
   - Low stock alerts
   - Email/SMS/WhatsApp notifications
   - Expiry alerts

4. **Tracking & Identification** (8 settings)
   - Barcode tracking
   - Serial number tracking
   - SKU auto-generation

5. **Multi-Branch/Multi-Location** (7 settings)
   - Branch isolation
   - Inter-branch transfers
   - Stock visibility modes

6. **Security & Approvals** (7 settings)
   - Approval workflows
   - Audit logging
   - Manager PIN requirements

7. **Backup & Data Management** (6 settings)
   - Auto-backup
   - Data archiving
   - Export formats

8. **Performance & Optimization** (7 settings)
   - Caching
   - Lazy loading
   - Search indexing

9. **Product Organization** (7 settings)
   - Categories
   - Tags
   - Product variants

10. **Supplier Management** (6 settings)
    - Supplier tracking
    - Purchase orders
    - Lead times

11. **Reporting & Analytics** (6 settings)
    - Inventory turnover
    - ABC analysis
    - Real-time reporting

12. **Integration** (5 settings)
    - POS integration
    - E-commerce sync
    - API access

13. **Returns & Adjustments** (5 settings)
    - Return policies
    - Stock adjustments
    - Damaged stock handling

14. **Units of Measure** (4 settings)
    - Multiple UOM support
    - UOM conversion
    - Decimal precision

## 🎯 Expected Results

After running the fix, you should see in your console:
```
✅ INVENTORY SETTINGS FIXED SUCCESSFULLY!
📊 Total Settings Installed: 89
🎯 Settings are now ready to use
💾 Changes will be logged and audited
🔒 Row Level Security enabled
```

In your app, the Inventory Settings page should:
- ✅ Load without errors
- ✅ Display all setting sections
- ✅ Allow you to modify and save settings
- ✅ Show last saved timestamp

## 🚨 Troubleshooting

### If you still see errors:

1. **Check database connection**
   ```sql
   SELECT current_database();
   ```

2. **Verify table was created**
   ```sql
   SELECT COUNT(*) FROM admin_settings WHERE category = 'inventory';
   ```
   Should return: 89

3. **Check for RLS issues**
   ```sql
   SELECT * FROM admin_settings LIMIT 1;
   ```
   If this fails, you may need to adjust RLS policies

4. **Check user permissions**
   ```sql
   SELECT * FROM user_profiles WHERE id = auth.uid();
   ```

### Common Issues:

**Issue:** "relation admin_settings does not exist"
**Fix:** Run the fix script - the table hasn't been created yet

**Issue:** "permission denied for table admin_settings"
**Fix:** Check RLS policies or run as admin user

**Issue:** "No data returned but no error"
**Fix:** Run the INSERT statements from the fix script again

## 📝 Notes

- All settings are stored as TEXT in the database
- Type conversion happens in the application layer
- Default values are optimized for most POS systems
- You can modify any setting through the UI
- All changes are logged in `admin_settings_log`

## 🔄 Re-running the Script

The fix script is **idempotent** - you can run it multiple times safely:
- Existing tables won't be dropped
- Settings are updated (not duplicated) using `ON CONFLICT`
- No data will be lost

## 💡 Next Steps

After fixing the inventory settings:

1. Review and customize settings for your business
2. Test key features:
   - Stock alerts
   - Price calculations
   - Branch transfers
   - Reports

3. Configure notifications:
   - Set up email alerts
   - Configure thresholds
   - Test alert delivery

4. Set up branch-specific rules:
   - Branch isolation
   - Transfer approvals
   - Stock visibility

---

**Need Help?** Check the test results from `TEST-INVENTORY-SETTINGS-FIX.sql` for detailed diagnostics.

