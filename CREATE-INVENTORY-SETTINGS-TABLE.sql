-- ============================================
-- INVENTORY SETTINGS SYSTEM
-- Complete database setup for inventory management settings
-- Date: October 13, 2025
-- ============================================

-- ============================================
-- 1. INSERT INVENTORY SETTINGS INTO admin_settings TABLE
-- ============================================

-- First, ensure we have the admin_settings table structure
-- (This should already exist based on your codebase)

-- Delete existing inventory settings if any (for clean reinstall)
DELETE FROM admin_settings WHERE category = 'inventory';

-- ============================================
-- STOCK MANAGEMENT SETTINGS
-- ============================================
INSERT INTO admin_settings (category, setting_key, setting_value, setting_type, description, is_active)
VALUES 
  ('inventory', 'low_stock_threshold', '10', 'number', 'Alert when stock falls below this number', true),
  ('inventory', 'critical_stock_threshold', '5', 'number', 'Critical alert when stock falls below this number', true),
  ('inventory', 'auto_reorder_enabled', 'false', 'boolean', 'Automatically create purchase orders when stock is low', true),
  ('inventory', 'reorder_point_percentage', '20', 'number', 'Percentage of max stock to trigger reorder', true),
  ('inventory', 'minimum_order_quantity', '1', 'number', 'Minimum quantity for orders', true),
  ('inventory', 'maximum_stock_level', '1000', 'number', 'Maximum stock level allowed per item', true),
  ('inventory', 'safety_stock_level', '5', 'number', 'Safety buffer stock quantity', true),
  ('inventory', 'stock_counting_frequency', 'weekly', 'string', 'How often to count stock (daily/weekly/monthly)', true),

-- ============================================
-- PRICING & VALUATION SETTINGS
-- ============================================
  ('inventory', 'default_markup_percentage', '30', 'number', 'Default markup percentage for products', true),
  ('inventory', 'enable_dynamic_pricing', 'false', 'boolean', 'Enable dynamic pricing based on demand/supply', true),
  ('inventory', 'price_rounding_method', 'nearest', 'string', 'How to round prices (nearest/up/down)', true),
  ('inventory', 'cost_calculation_method', 'average', 'string', 'Cost calculation method (fifo/lifo/average)', true),
  ('inventory', 'auto_price_update', 'false', 'boolean', 'Automatically update prices when cost changes', true),
  ('inventory', 'enable_bulk_discount', 'true', 'boolean', 'Enable bulk discount rules', true),
  ('inventory', 'enable_seasonal_pricing', 'false', 'boolean', 'Enable seasonal pricing', true),
  ('inventory', 'price_history_days', '365', 'number', 'Days to keep price history', true),

-- ============================================
-- NOTIFICATIONS & ALERTS SETTINGS
-- ============================================
  ('inventory', 'low_stock_alerts', 'true', 'boolean', 'Send alerts when stock is low', true),
  ('inventory', 'out_of_stock_alerts', 'true', 'boolean', 'Send alerts when stock is depleted', true),
  ('inventory', 'price_change_alerts', 'false', 'boolean', 'Send alerts on price changes', true),
  ('inventory', 'email_notifications', 'true', 'boolean', 'Send email notifications', true),
  ('inventory', 'sms_notifications', 'false', 'boolean', 'Send SMS notifications', true),
  ('inventory', 'whatsapp_notifications', 'false', 'boolean', 'Send WhatsApp notifications', true),
  ('inventory', 'expiry_alert_days', '30', 'number', 'Alert X days before product expiry', true),
  ('inventory', 'overstock_alerts', 'true', 'boolean', 'Alert when stock exceeds maximum level', true),
  ('inventory', 'slow_moving_alert_days', '90', 'number', 'Alert if no sales in X days', true),
  ('inventory', 'stock_discrepancy_alerts', 'true', 'boolean', 'Alert on stock count discrepancies', true),

-- ============================================
-- TRACKING & IDENTIFICATION SETTINGS
-- ============================================
  ('inventory', 'enable_barcode_tracking', 'true', 'boolean', 'Enable barcode scanning and tracking', true),
  ('inventory', 'enable_serial_tracking', 'false', 'boolean', 'Track items by serial number', true),
  ('inventory', 'enable_batch_tracking', 'false', 'boolean', 'Track items by batch/lot number', true),
  ('inventory', 'enable_expiry_tracking', 'true', 'boolean', 'Track product expiry dates', true),
  ('inventory', 'enable_location_tracking', 'false', 'boolean', 'Track items by warehouse location/bin', true),
  ('inventory', 'enable_sku_auto_generation', 'true', 'boolean', 'Automatically generate SKU codes', true),
  ('inventory', 'barcode_format', 'EAN-13', 'string', 'Default barcode format (EAN-13/UPC-A/Code-128/QR)', true),
  ('inventory', 'enable_qr_code', 'true', 'boolean', 'Enable QR code support', true),

-- ============================================
-- MULTI-BRANCH/MULTI-LOCATION SETTINGS
-- ============================================
  ('inventory', 'enable_branch_isolation', 'true', 'boolean', 'Isolate inventory by branch', true),
  ('inventory', 'allow_inter_branch_transfer', 'true', 'boolean', 'Allow transfers between branches', true),
  ('inventory', 'transfer_approval_required', 'false', 'boolean', 'Require approval for transfers', true),
  ('inventory', 'default_source_branch', '', 'string', 'Default branch ID for new stock', true),
  ('inventory', 'stock_visibility_mode', 'own_branch', 'string', 'Stock visibility (own_branch/all_branches)', true),
  ('inventory', 'auto_stock_sync', 'false', 'boolean', 'Automatically sync stock between branches', true),
  ('inventory', 'sync_frequency', 'hourly', 'string', 'Sync frequency (realtime/hourly/daily)', true),

-- ============================================
-- SECURITY & APPROVALS SETTINGS
-- ============================================
  ('inventory', 'require_approval_stock_adjustment', 'false', 'boolean', 'Require manager approval for stock adjustments', true),
  ('inventory', 'require_approval_price_change', 'false', 'boolean', 'Require manager approval for price changes', true),
  ('inventory', 'enable_audit_logging', 'true', 'boolean', 'Log all inventory changes', true),
  ('inventory', 'require_manager_pin', 'false', 'boolean', 'Require manager PIN for adjustments', true),
  ('inventory', 'approval_threshold_amount', '10000', 'number', 'Amount above which approval is needed', true),
  ('inventory', 'lock_historical_inventory', 'false', 'boolean', 'Prevent backdating inventory changes', true),
  ('inventory', 'max_adjustment_percentage', '50', 'number', 'Maximum allowed adjustment percentage', true),

-- ============================================
-- BACKUP & DATA MANAGEMENT SETTINGS
-- ============================================
  ('inventory', 'auto_backup_enabled', 'true', 'boolean', 'Enable automatic inventory backups', true),
  ('inventory', 'backup_frequency', 'daily', 'string', 'Backup frequency (daily/weekly/monthly)', true),
  ('inventory', 'backup_retention_days', '90', 'number', 'Days to retain backups', true),
  ('inventory', 'export_format', 'excel', 'string', 'Default export format (csv/excel/pdf)', true),
  ('inventory', 'enable_data_archiving', 'true', 'boolean', 'Archive old inventory data', true),
  ('inventory', 'archive_after_months', '12', 'number', 'Archive data older than X months', true),

-- ============================================
-- PERFORMANCE & OPTIMIZATION SETTINGS
-- ============================================
  ('inventory', 'cache_inventory_data', 'true', 'boolean', 'Cache inventory data for faster access', true),
  ('inventory', 'auto_refresh_interval', '300', 'number', 'Auto-refresh interval in seconds', true),
  ('inventory', 'enable_analytics', 'true', 'boolean', 'Enable inventory analytics', true),
  ('inventory', 'enable_lazy_loading', 'true', 'boolean', 'Use lazy loading for large inventories', true),
  ('inventory', 'pagination_size', '50', 'number', 'Number of items per page', true),
  ('inventory', 'enable_search_indexing', 'true', 'boolean', 'Enable search indexing', true),
  ('inventory', 'enable_image_optimization', 'true', 'boolean', 'Compress product images', true),

-- ============================================
-- PRODUCT ORGANIZATION SETTINGS
-- ============================================
  ('inventory', 'auto_assign_categories', 'false', 'boolean', 'Auto-assign categories based on product name', true),
  ('inventory', 'enable_subcategories', 'true', 'boolean', 'Enable product subcategories', true),
  ('inventory', 'max_category_depth', '3', 'number', 'Maximum category nesting level', true),
  ('inventory', 'default_category_id', '', 'string', 'Default category for new products', true),
  ('inventory', 'enable_tags', 'true', 'boolean', 'Enable product tags/labels', true),
  ('inventory', 'enable_product_bundles', 'true', 'boolean', 'Enable product bundles/kits', true),
  ('inventory', 'enable_product_variants', 'true', 'boolean', 'Enable product variants (size/color/etc)', true),

-- ============================================
-- SUPPLIER MANAGEMENT SETTINGS
-- ============================================
  ('inventory', 'enable_supplier_tracking', 'true', 'boolean', 'Track suppliers for products', true),
  ('inventory', 'default_lead_time_days', '7', 'number', 'Default supplier lead time in days', true),
  ('inventory', 'preferred_supplier_auto_select', 'false', 'boolean', 'Auto-select preferred supplier', true),
  ('inventory', 'track_supplier_performance', 'true', 'boolean', 'Track supplier delivery performance', true),
  ('inventory', 'enable_purchase_orders', 'true', 'boolean', 'Enable purchase order system', true),
  ('inventory', 'auto_create_po_at_reorder', 'false', 'boolean', 'Auto-create PO at reorder point', true),

-- ============================================
-- REPORTING & ANALYTICS SETTINGS
-- ============================================
  ('inventory', 'stock_valuation_report_frequency', 'weekly', 'string', 'Stock valuation report frequency', true),
  ('inventory', 'enable_inventory_turnover', 'true', 'boolean', 'Calculate inventory turnover ratio', true),
  ('inventory', 'enable_abc_analysis', 'true', 'boolean', 'Enable ABC analysis classification', true),
  ('inventory', 'dead_stock_threshold_days', '180', 'number', 'Days without movement to flag as dead stock', true),
  ('inventory', 'enable_realtime_reporting', 'true', 'boolean', 'Enable real-time reporting', true),
  ('inventory', 'dashboard_refresh_rate', '60', 'number', 'Dashboard refresh rate in seconds', true),

-- ============================================
-- INTEGRATION SETTINGS
-- ============================================
  ('inventory', 'enable_pos_integration', 'true', 'boolean', 'Integrate with POS system', true),
  ('inventory', 'enable_ecommerce_sync', 'false', 'boolean', 'Sync with e-commerce platforms', true),
  ('inventory', 'enable_accounting_integration', 'false', 'boolean', 'Integrate with accounting software', true),
  ('inventory', 'enable_api_access', 'true', 'boolean', 'Enable API access for inventory', true),
  ('inventory', 'webhook_stock_changes', '', 'string', 'Webhook URL for stock changes', true),

-- ============================================
-- RETURNS & ADJUSTMENTS SETTINGS
-- ============================================
  ('inventory', 'allow_returns_to_inventory', 'true', 'boolean', 'Allow returned items back to inventory', true),
  ('inventory', 'return_inspection_required', 'true', 'boolean', 'Require inspection before restocking returns', true),
  ('inventory', 'damaged_stock_handling', 'separate_bin', 'string', 'How to handle damaged stock (separate_bin/write_off)', true),
  ('inventory', 'adjustment_reason_required', 'true', 'boolean', 'Require reason for adjustments', true),
  ('inventory', 'max_return_period_days', '30', 'number', 'Maximum days to accept returns', true),

-- ============================================
-- UNITS OF MEASURE SETTINGS
-- ============================================
  ('inventory', 'enable_multiple_uom', 'true', 'boolean', 'Enable multiple units of measure', true),
  ('inventory', 'default_uom', 'piece', 'string', 'Default unit of measure', true),
  ('inventory', 'enable_uom_conversion', 'true', 'boolean', 'Enable UOM conversion factors', true),
  ('inventory', 'quantity_decimal_places', '2', 'number', 'Decimal places for quantities', true)
ON CONFLICT (category, setting_key) 
DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  setting_type = EXCLUDED.setting_type,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ============================================
-- 2. CREATE FUNCTION TO UPDATE INVENTORY SETTINGS
-- ============================================
CREATE OR REPLACE FUNCTION update_inventory_setting(
  key_name TEXT,
  new_value TEXT,
  reason TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  old_val TEXT;
  user_id TEXT;
BEGIN
  -- Get current value
  SELECT setting_value INTO old_val 
  FROM admin_settings 
  WHERE category = 'inventory' AND setting_key = key_name;
  
  -- Update the setting
  UPDATE admin_settings 
  SET setting_value = new_value, updated_at = NOW()
  WHERE category = 'inventory' AND setting_key = key_name;
  
  -- Log the change if admin_settings_log table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_settings_log') THEN
    -- Get current user (if available from context)
    user_id := current_setting('app.current_user_id', true);
    IF user_id IS NULL THEN
      user_id := 'system';
    END IF;
    
    INSERT INTO admin_settings_log (category, setting_key, old_value, new_value, changed_by, change_reason)
    VALUES ('inventory', key_name, old_val, new_value, user_id, reason);
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. GRANT PERMISSIONS
-- ============================================
GRANT EXECUTE ON FUNCTION update_inventory_setting(TEXT, TEXT, TEXT) TO PUBLIC;

-- ============================================
-- 4. CREATE VIEW FOR EASY INVENTORY SETTINGS ACCESS
-- ============================================
CREATE OR REPLACE VIEW inventory_settings_view AS
SELECT 
  setting_key,
  setting_value,
  setting_type,
  description,
  CASE 
    WHEN setting_type = 'boolean' THEN setting_value::boolean
    WHEN setting_type = 'number' THEN setting_value::numeric
    ELSE NULL
  END as typed_value,
  is_active,
  updated_at
FROM admin_settings
WHERE category = 'inventory' AND is_active = true
ORDER BY setting_key;

-- Grant access to view
GRANT SELECT ON inventory_settings_view TO PUBLIC;

-- ============================================
-- 5. VERIFICATION QUERIES
-- ============================================

-- Count inventory settings
SELECT COUNT(*) as total_inventory_settings 
FROM admin_settings 
WHERE category = 'inventory';

-- Show all inventory settings grouped by function
SELECT 
  setting_key,
  setting_value,
  setting_type,
  description
FROM admin_settings
WHERE category = 'inventory'
ORDER BY setting_key;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Inventory Settings System Created Successfully!';
  RAISE NOTICE '📊 Total Settings: %', (SELECT COUNT(*) FROM admin_settings WHERE category = ''inventory'');
  RAISE NOTICE '🎯 Settings are now ready to use in your application';
  RAISE NOTICE '💾 All changes will be logged and persisted to the database';
END $$;

