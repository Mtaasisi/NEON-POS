#!/usr/bin/env node

/**
 * =====================================================
 * INSERT DEFAULT SETTINGS FOR ALL POS TABLES
 * =====================================================
 * This script inserts default settings rows so the
 * app can load settings without errors
 * =====================================================
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync, existsSync } from 'fs';

console.log('\n🔧 INSERTING DEFAULT POS SETTINGS');
console.log('===================================\n');

// Get database URL
let DATABASE_URL;
try {
  if (existsSync('database-config.json')) {
    const config = JSON.parse(readFileSync('database-config.json', 'utf-8'));
    DATABASE_URL = config.connectionString || config.url;
    console.log('✅ Found database-config.json');
  } else {
    DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
    console.log('✅ Using hardcoded database URL');
  }
  console.log(`   URL: ${DATABASE_URL.substring(0, 50)}...\n`);
} catch (e) {
  console.error('❌ Error reading database config:', e.message);
  process.exit(1);
}

const sql = neon(DATABASE_URL);

console.log('📡 Connecting to database...\n');

async function insertDefaultSettings() {
  console.log('📝 Inserting default settings...\n');
  
  try {
    // Insert or update general settings
    await sql.unsafe(`
      INSERT INTO lats_pos_general_settings (
        theme, language, currency, timezone, date_format, time_format,
        show_product_images, show_stock_levels, show_prices, show_barcodes,
        products_per_page, auto_complete_search, confirm_delete, show_confirmations,
        enable_sound_effects, sound_volume, enable_click_sounds, enable_cart_sounds,
        enable_payment_sounds, enable_delete_sounds, enable_animations, enable_caching,
        cache_duration, enable_lazy_loading, max_search_results, enable_tax, tax_rate
      ) VALUES (
        'light', 'en', 'USD', 'UTC', 'YYYY-MM-DD', '24',
        true, true, true, true,
        20, true, true, true,
        false, 50, false, false,
        false, false, true, true,
        300000, true, 50, true, 0
      )
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('   ✅ lats_pos_general_settings');

    // Insert dynamic pricing settings
    await sql.unsafe(`
      INSERT INTO lats_pos_dynamic_pricing_settings (
        enable_dynamic_pricing, enable_loyalty_pricing, enable_bulk_pricing,
        enable_time_based_pricing, enable_customer_pricing, enable_special_events,
        loyalty_discount_percent, loyalty_points_threshold, loyalty_max_discount,
        bulk_discount_enabled, bulk_discount_threshold, bulk_discount_percent,
        time_based_discount_enabled, time_based_start_time, time_based_end_time,
        time_based_discount_percent, customer_pricing_enabled, vip_customer_discount,
        regular_customer_discount, special_events_enabled, special_event_discount_percent
      ) VALUES (
        false, false, false,
        false, false, false,
        0, 100, 20,
        false, 10, 5,
        false, '00:00', '23:59',
        0, false, 10,
        5, false, 0
      )
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('   ✅ lats_pos_dynamic_pricing_settings');

    // Insert receipt settings
    await sql.unsafe(`
      INSERT INTO lats_pos_receipt_settings (
        receipt_template, receipt_width, receipt_font_size,
        show_business_logo, show_business_name, show_business_address,
        show_business_phone, show_business_email, show_business_website,
        show_transaction_id, show_date_time, show_cashier_name,
        show_customer_name, show_customer_phone, show_product_names,
        show_product_skus, show_product_barcodes, show_quantities,
        show_unit_prices, show_discounts, show_subtotal,
        show_tax, show_discount_total, show_grand_total,
        show_payment_method, show_change_amount, auto_print_receipt,
        print_duplicate_receipt, enable_email_receipt, enable_sms_receipt,
        enable_receipt_numbering, receipt_number_prefix, receipt_number_start
      ) VALUES (
        'standard', 80, 12,
        true, true, true,
        true, false, false,
        true, true, true,
        true, false, true,
        true, false, true,
        true, true, true,
        true, true, true,
        true, true, false,
        false, true, false,
        true, 'RCP', 1
      )
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('   ✅ lats_pos_receipt_settings');

    // Insert barcode scanner settings
    await sql.unsafe(`
      INSERT INTO lats_pos_barcode_scanner_settings (
        enable_barcode_scanner, scanner_type, enable_scan_sound,
        scan_sound_volume, enable_scan_vibration, auto_add_to_cart,
        show_scan_confirmation, enable_duplicate_scan_warning, enable_invalid_scan_warning,
        enable_scan_history, max_scan_history, scan_timeout,
        enable_continuous_scan, enable_multi_scan, enable_camera_scanner,
        enable_keyboard_scanner, keyboard_scanner_prefix, keyboard_scanner_suffix
      ) VALUES (
        true, 'auto', true,
        50, true, true,
        true, true, true,
        true, 50, 5000,
        false, true, true,
        true, '', 'Enter'
      )
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('   ✅ lats_pos_barcode_scanner_settings');

    // Insert delivery settings
    await sql.unsafe(`
      INSERT INTO lats_pos_delivery_settings (
        enable_delivery, delivery_fee, free_delivery_threshold,
        enable_delivery_zones, enable_delivery_tracking, enable_delivery_notifications,
        enable_delivery_confirmation, delivery_radius, enable_express_delivery,
        express_delivery_fee, enable_pickup, enable_delivery_notes,
        require_delivery_address, require_delivery_phone, enable_driver_assignment,
        enable_delivery_scheduling
      ) VALUES (
        true, 0, 0,
        false, false, true,
        true, 0, false,
        0, true, true,
        true, true, false,
        true
      )
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('   ✅ lats_pos_delivery_settings');

    // Insert search filter settings
    await sql.unsafe(`
      INSERT INTO lats_pos_search_filter_settings (
        enable_product_search, enable_customer_search, enable_sales_search,
        search_by_name, search_by_barcode, search_by_sku,
        search_by_category, search_by_supplier, search_by_description,
        search_by_tags, enable_fuzzy_search, enable_autocomplete,
        min_search_length, max_search_results, search_timeout,
        search_debounce_time, enable_search_history, max_search_history,
        enable_recent_searches, enable_popular_searches, enable_search_suggestions
      ) VALUES (
        true, true, true,
        true, true, true,
        true, true, true,
        true, true, true,
        2, 50, 5000,
        300, true, 20,
        true, true, true
      )
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('   ✅ lats_pos_search_filter_settings');

    // Insert user permissions settings
    await sql.unsafe(`
      INSERT INTO lats_pos_user_permissions_settings (
        enable_pos_access, enable_sales_access, enable_refunds_access,
        enable_void_access, enable_discount_access, enable_inventory_view,
        enable_inventory_edit, enable_stock_adjustments, enable_product_creation,
        enable_product_deletion, enable_customer_view, enable_customer_creation,
        enable_customer_edit, enable_customer_deletion, enable_customer_history,
        enable_payment_processing, enable_cash_management, enable_daily_reports,
        enable_financial_reports, enable_tax_management, enable_settings_access,
        enable_user_management, enable_backup_restore, enable_system_maintenance,
        enable_api_access, enable_audit_logs, enable_security_settings,
        enable_password_reset, enable_session_management, enable_data_export
      ) VALUES (
        true, true, false,
        false, false, true,
        false, false, false,
        false, true, false,
        false, false, true,
        true, false, true,
        false, false, false,
        false, false, false,
        false, false, false,
        false, false, false
      )
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('   ✅ lats_pos_user_permissions_settings');

    // Insert loyalty customer settings
    await sql.unsafe(`
      INSERT INTO lats_pos_loyalty_customer_settings (
        enable_loyalty_program, loyalty_program_name, points_per_currency,
        points_redemption_rate, minimum_points_redemption, points_expiry_days,
        enable_customer_registration, require_customer_info, enable_customer_categories,
        enable_customer_tags, enable_customer_notes, enable_automatic_rewards,
        enable_manual_rewards, enable_birthday_rewards, enable_anniversary_rewards,
        enable_referral_rewards, enable_email_communication, enable_sms_communication,
        enable_push_notifications, enable_marketing_emails, enable_customer_analytics,
        enable_purchase_history, enable_spending_patterns, enable_customer_segmentation,
        enable_customer_insights
      ) VALUES (
        false, 'Loyalty Program', 1,
        0.01, 100, 365,
        true, false, true,
        true, true, false,
        false, false, false,
        false, false, false,
        false, false, true,
        true, true, false,
        false
      )
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('   ✅ lats_pos_loyalty_customer_settings');

    // Insert analytics reporting settings
    await sql.unsafe(`
      INSERT INTO lats_pos_analytics_reporting_settings (
        enable_analytics, enable_real_time_analytics, analytics_refresh_interval,
        enable_data_export, enable_sales_analytics, enable_sales_trends,
        enable_product_performance, enable_customer_analytics, enable_revenue_tracking,
        enable_inventory_analytics, enable_stock_alerts, enable_low_stock_reports,
        enable_inventory_turnover, enable_supplier_analytics, enable_automated_reports,
        report_generation_time, enable_email_reports, enable_pdf_reports,
        enable_excel_reports, enable_custom_dashboard, enable_kpi_widgets,
        enable_chart_animations, enable_data_drill_down, enable_comparative_analysis,
        enable_predictive_analytics, enable_data_retention, data_retention_days,
        enable_data_backup, enable_api_export
      ) VALUES (
        true, true, 30000,
        true, true, true,
        true, true, true,
        true, true, true,
        true, false, false,
        '00:00', false, true,
        true, true, true,
        true, true, true,
        false, true, 365,
        true, false
      )
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('   ✅ lats_pos_analytics_reporting_settings');

    // Insert notification settings
    await sql.unsafe(`
      INSERT INTO lats_pos_notification_settings (
        enable_notifications, enable_sound_notifications, enable_visual_notifications,
        enable_push_notifications, notification_timeout, enable_sales_notifications,
        notify_on_sale_completion, notify_on_refund, notify_on_void,
        notify_on_discount, enable_inventory_notifications, notify_on_low_stock,
        low_stock_threshold, notify_on_out_of_stock, notify_on_stock_adjustment,
        enable_customer_notifications, notify_on_customer_registration, notify_on_loyalty_points,
        notify_on_customer_birthday, notify_on_customer_anniversary, enable_system_notifications,
        notify_on_system_errors, notify_on_backup_completion, notify_on_sync_completion,
        notify_on_maintenance, enable_email_notifications, enable_sms_notifications,
        enable_in_app_notifications, enable_desktop_notifications
      ) VALUES (
        true, true, true,
        false, 5000, true,
        true, true, true,
        true, true, true,
        10, true, false,
        true, false, false,
        false, false, true,
        true, false, false,
        true, false, false,
        true, false
      )
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('   ✅ lats_pos_notification_settings');

    // Insert advanced settings
    await sql.unsafe(`
      INSERT INTO lats_pos_advanced_settings (
        enable_performance_mode, enable_caching, cache_size,
        enable_lazy_loading, max_concurrent_requests, enable_database_optimization,
        enable_auto_backup, backup_frequency, enable_data_compression,
        enable_query_optimization, enable_two_factor_auth, enable_session_timeout,
        session_timeout_minutes, enable_audit_logging, enable_encryption,
        enable_api_access, enable_webhooks, enable_third_party_integrations,
        enable_data_sync, sync_interval, enable_debug_mode,
        enable_error_reporting, enable_performance_monitoring, enable_logging,
        log_level, enable_experimental_features, enable_beta_features,
        enable_custom_scripts, enable_plugin_system, enable_auto_updates
      ) VALUES (
        false, true, 100,
        true, 10, true,
        false, 'daily', false,
        true, false, true,
        60, false, false,
        false, false, false,
        false, 300000, false,
        true, false, true,
        'info', false, false,
        false, false, true
      )
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('   ✅ lats_pos_advanced_settings');

    console.log('\n✅ All default settings inserted successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Error inserting settings:', error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting default settings insertion...\n');
    
    await insertDefaultSettings();
    
    console.log('===========================================');
    console.log('✅ DEFAULT SETTINGS INSERTION COMPLETE!');
    console.log('===========================================\n');
    console.log('📋 Summary:');
    console.log('   ✅ 11 default settings rows inserted\n');
    console.log('🎉 Next steps:');
    console.log('   1. Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)');
    console.log('   2. All settings loading errors should be GONE!');
    console.log('   3. POS settings will now load properly\n');
    
  } catch (error) {
    console.error('\n❌ ERROR during settings insertion:');
    console.error('   ', error.message);
    console.error('\nPlease check your database connection and try again.\n');
    process.exit(1);
  }
}

// Run the script
main();

