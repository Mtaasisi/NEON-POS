# 🔄 Auto-Reorder Feature Guide

Complete guide for implementing and testing the automatic purchase order creation feature.

## 📋 Overview

The Auto-Reorder feature automatically creates draft purchase orders when product stock levels fall to or below their reorder points. This helps maintain optimal inventory levels without manual intervention.

## 🎯 Features

- ✅ Automatic detection of low stock levels
- ✅ Intelligent calculation of reorder quantities
- ✅ Draft PO creation for manager review
- ✅ Supplier selection (prefers designated suppliers)
- ✅ Comprehensive logging and monitoring
- ✅ Configurable settings
- ✅ Duplicate prevention (won't create multiple POs for same item)

## 📦 Installation

### Step 1: Implement the Feature

Run the implementation SQL script in your Neon database:

```bash
# Using psql
psql <your_connection_string> -f IMPLEMENT-AUTO-REORDER-FEATURE.sql

# Or use Neon's SQL Editor
# Copy and paste IMPLEMENT-AUTO-REORDER-FEATURE.sql
```

This creates:
- `auto_reorder_log` table - Tracking table for all auto-generated POs
- Helper functions to check settings
- `auto_create_purchase_order_for_low_stock()` - Main PO creation function
- `trigger_auto_reorder` - Database trigger on stock changes
- `check_all_products_for_reorder()` - Manual check function
- `auto_reorder_status` - Monitoring view

### Step 2: Enable the Feature

1. Go to **Admin Settings** → **Inventory Settings**
2. Find the "Supplier Management" section
3. Enable these settings:
   - ☑️ **Auto Reorder Enabled** - Main toggle for the feature
   - ☑️ **Auto-Create PO at Reorder** - Creates POs automatically

Or via SQL:

```sql
UPDATE admin_settings 
SET setting_value = 'true' 
WHERE category = 'inventory' 
  AND setting_key IN ('auto_reorder_enabled', 'auto_create_po_at_reorder');
```

### Step 3: Configure Products

Set reorder points on your products:

1. Go to **Inventory** → **Products**
2. Edit a product
3. Set the **Reorder Point** field (e.g., 10)
4. Optionally set **Maximum Stock Level**

Or via SQL:

```sql
UPDATE lats_product_variants
SET reorder_point = 10
WHERE id = 'your-variant-id';
```

## 🧪 Testing

### Option 1: Automated Test (Recommended)

Run the test script:

```bash
node test-auto-reorder.mjs
```

This will:
1. Check settings
2. Enable auto-reorder if needed
3. Find a test product
4. Reduce stock below reorder point
5. Verify a PO was created
6. Restore original stock

### Option 2: SQL Verification Test

Run in Neon SQL Editor:

```bash
# Full verification test
\i VERIFY-AUTO-REORDER-WORKING.sql

# Or basic test
\i TEST-AUTO-REORDER-FEATURE.sql
```

### Option 3: Manual Test

1. Find a product with stock > 20
2. Set its reorder_point to 10
3. Enable auto-reorder settings
4. Manually reduce quantity to 8 (below reorder point)
5. Check if a new PO was created:

```sql
SELECT * FROM lats_purchase_orders 
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;
```

## 🔍 Monitoring

### Check Auto-Reorder Status

See all products and their reorder status:

```sql
SELECT * FROM auto_reorder_status;
```

This shows:
- Product name and SKU
- Current stock levels
- Reorder points
- Stock status (OK, LOW, BELOW_REORDER, OUT_OF_STOCK)
- Latest auto-generated PO info

### View Auto-Reorder Log

See history of all auto-reorder events:

```sql
SELECT 
  p.name as product_name,
  arl.*
FROM auto_reorder_log arl
JOIN lats_products p ON p.id = arl.product_id
ORDER BY arl.created_at DESC
LIMIT 20;
```

### Manual Reorder Check

Force a check of all products:

```sql
SELECT * FROM check_all_products_for_reorder();
```

This scans all products and creates POs for any below reorder point.

## ⚙️ Configuration

### Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `auto_reorder_enabled` | false | Master switch for auto-reorder feature |
| `auto_create_po_at_reorder` | false | Automatically create POs (vs just alerts) |
| `minimum_order_quantity` | 1 | Minimum quantity for any order |
| `maximum_stock_level` | 1000 | Target max stock level |
| `safety_stock_level` | 5 | Extra buffer stock |

### Reorder Quantity Calculation

The system calculates suggested order quantity as:

```
Suggested Qty = (Max Stock - Current Stock) + Safety Stock
```

Then ensures it meets `minimum_order_quantity`.

### Supplier Selection

Priority order:
1. Product's preferred supplier (from `lats_product_suppliers`)
2. Any supplier associated with the product
3. First active supplier in system

## 🎯 How It Works

### Trigger Flow

```
Stock Update
    ↓
Quantity <= Reorder Point?
    ↓ (YES)
Auto-Reorder Enabled?
    ↓ (YES)
Recent PO exists? (last hour)
    ↓ (NO)
Calculate Order Quantity
    ↓
Find Supplier
    ↓
Create Draft PO
    ↓
Log Event
```

### Draft PO Review

Auto-generated POs are created with status = 'draft' so managers can:
- Review quantities
- Verify supplier
- Adjust pricing
- Approve or reject

## 📊 Database Objects Created

### Tables

- `auto_reorder_log` - Tracks all auto-reorder events

### Functions

- `is_auto_reorder_enabled()` - Checks setting
- `is_auto_create_po_enabled()` - Checks setting
- `get_minimum_order_quantity()` - Gets setting
- `calculate_suggested_order_quantity()` - Calculates order qty
- `auto_create_purchase_order_for_low_stock()` - Creates PO
- `trigger_auto_reorder_check()` - Trigger function
- `check_all_products_for_reorder()` - Manual scan

### Triggers

- `trigger_auto_reorder` - Fires on stock quantity updates

### Views

- `auto_reorder_status` - Real-time monitoring view

## 🚨 Troubleshooting

### No POs Being Created

1. **Check settings are enabled:**
   ```sql
   SELECT setting_key, setting_value 
   FROM admin_settings 
   WHERE category = 'inventory' 
     AND setting_key IN ('auto_reorder_enabled', 'auto_create_po_at_reorder');
   ```

2. **Check reorder points are set:**
   ```sql
   SELECT COUNT(*) 
   FROM lats_product_variants 
   WHERE reorder_point > 0;
   ```

3. **Check error logs:**
   ```sql
   SELECT * FROM auto_reorder_log 
   WHERE po_created = false 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

4. **Verify trigger exists:**
   ```sql
   SELECT tgname FROM pg_trigger 
   WHERE tgname = 'trigger_auto_reorder';
   ```

### Duplicate POs

The system prevents duplicates by:
- Checking if a PO was created in the last hour for the same variant
- Only triggering when stock **crosses** the reorder point (not every update)

To adjust the prevention window:

```sql
-- Edit the trigger function and change INTERVAL '1 hour' to desired time
```

### Wrong Quantities

Check your settings:
```sql
SELECT setting_key, setting_value 
FROM admin_settings 
WHERE category = 'inventory' 
  AND setting_key IN (
    'minimum_order_quantity',
    'maximum_stock_level',
    'safety_stock_level'
  );
```

## 📱 UI Integration

The feature works automatically in the background. Users will see:

1. **Purchase Orders Tab** - Draft POs marked as "Auto-generated"
2. **Product Cards** - Stock status indicators
3. **Dashboard** - Alerts for low stock items

## 🔐 Security

All functions use `SECURITY DEFINER` to ensure consistent permissions. The functions run with the permissions of the user who created them, allowing the trigger to create POs even when fired by stock updates from regular users.

## 📈 Performance

- ✅ Indexed for fast lookups
- ✅ Prevents duplicate processing
- ✅ Minimal overhead on stock updates
- ✅ Configurable batch checking

## 🎓 Best Practices

1. **Start with a few products** - Test with 5-10 products first
2. **Set realistic reorder points** - Usually 20-30% of max stock
3. **Review draft POs regularly** - Check daily or weekly
4. **Monitor the logs** - Watch for patterns or issues
5. **Adjust settings** - Fine-tune based on your business needs

## 📞 Support

For issues or questions:
1. Check `auto_reorder_log` for error messages
2. Review this guide's troubleshooting section
3. Run the verification test: `VERIFY-AUTO-REORDER-WORKING.sql`

## 🔄 Updates

To update the feature:
1. Re-run `IMPLEMENT-AUTO-REORDER-FEATURE.sql`
2. The script uses `CREATE OR REPLACE` so it's safe to rerun
3. No data will be lost from `auto_reorder_log`

---

**Last Updated:** October 13, 2025  
**Version:** 1.0.0  
**Status:** Production Ready ✅

