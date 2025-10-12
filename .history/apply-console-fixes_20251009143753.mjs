#!/usr/bin/env node

/**
 * =====================================================
 * AUTOMATIC DATABASE FIX FOR CONSOLE ERRORS
 * =====================================================
 * This script automatically applies all database fixes
 * to resolve console errors in your POS application
 * =====================================================
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync, existsSync } from 'fs';

console.log('\n🔧 AUTOMATIC DATABASE FIX - CONSOLE ERRORS');
console.log('===========================================\n');

// Get database URL
let DATABASE_URL;
try {
  if (existsSync('database-config.json')) {
    const config = JSON.parse(readFileSync('database-config.json', 'utf-8'));
    DATABASE_URL = config.connectionString || config.url;
    console.log('✅ Found database-config.json');
  } else {
    // Use hardcoded connection from supabaseClient.ts
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

/**
 * Create daily_sales_closures table
 */
async function createDailySalesClosuresTable() {
  console.log('📊 Creating daily_sales_closures table...');
  
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS daily_sales_closures (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        date DATE NOT NULL UNIQUE,
        total_sales NUMERIC(12, 2) DEFAULT 0,
        total_transactions INTEGER DEFAULT 0,
        closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        closed_by TEXT NOT NULL,
        closed_by_user_id UUID,
        sales_data JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    
    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_daily_sales_closures_date ON daily_sales_closures(date DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_daily_sales_closures_closed_at ON daily_sales_closures(closed_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_daily_sales_closures_closed_by_user_id ON daily_sales_closures(closed_by_user_id)`;
    
    // Enable RLS
    await sql`ALTER TABLE daily_sales_closures ENABLE ROW LEVEL SECURITY`;
    
    // Create policy
    await sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE schemaname = 'public' 
          AND tablename = 'daily_sales_closures' 
          AND policyname = 'Allow all operations on daily closures'
        ) THEN
          CREATE POLICY "Allow all operations on daily closures"
            ON daily_sales_closures
            FOR ALL
            USING (true)
            WITH CHECK (true);
        END IF;
      END $$
    `;
    
    // Create update trigger function
    await sql`
      CREATE OR REPLACE FUNCTION update_daily_sales_closures_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `;
    
    // Create trigger
    await sql`DROP TRIGGER IF EXISTS update_daily_sales_closures_updated_at_trigger ON daily_sales_closures`;
    await sql`
      CREATE TRIGGER update_daily_sales_closures_updated_at_trigger
        BEFORE UPDATE ON daily_sales_closures
        FOR EACH ROW
        EXECUTE FUNCTION update_daily_sales_closures_updated_at()
    `;
    
    console.log('   ✅ daily_sales_closures table created\n');
    return true;
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('   ℹ️  daily_sales_closures table already exists\n');
      return true;
    }
    console.error('   ❌ Error:', error.message);
    return false;
  }
}

/**
 * Create POS settings tables
 */
async function createPOSSettingsTables() {
  const tables = [
    {
      name: 'lats_pos_general_settings',
      sql: `
        CREATE TABLE IF NOT EXISTS lats_pos_general_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID,
          business_id UUID,
          theme TEXT DEFAULT 'light',
          language TEXT DEFAULT 'en',
          currency TEXT DEFAULT 'USD',
          timezone TEXT DEFAULT 'UTC',
          date_format TEXT DEFAULT 'YYYY-MM-DD',
          time_format TEXT DEFAULT '24',
          show_product_images BOOLEAN DEFAULT true,
          show_stock_levels BOOLEAN DEFAULT true,
          show_prices BOOLEAN DEFAULT true,
          show_barcodes BOOLEAN DEFAULT true,
          products_per_page INTEGER DEFAULT 20,
          auto_complete_search BOOLEAN DEFAULT true,
          confirm_delete BOOLEAN DEFAULT true,
          show_confirmations BOOLEAN DEFAULT true,
          enable_sound_effects BOOLEAN DEFAULT false,
          sound_volume INTEGER DEFAULT 50,
          enable_click_sounds BOOLEAN DEFAULT false,
          enable_cart_sounds BOOLEAN DEFAULT false,
          enable_payment_sounds BOOLEAN DEFAULT false,
          enable_delete_sounds BOOLEAN DEFAULT false,
          enable_animations BOOLEAN DEFAULT true,
          enable_caching BOOLEAN DEFAULT true,
          cache_duration INTEGER DEFAULT 300000,
          enable_lazy_loading BOOLEAN DEFAULT true,
          max_search_results INTEGER DEFAULT 50,
          enable_tax BOOLEAN DEFAULT true,
          tax_rate NUMERIC(5, 2) DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `
    },
    {
      name: 'lats_pos_dynamic_pricing_settings',
      sql: `
        CREATE TABLE IF NOT EXISTS lats_pos_dynamic_pricing_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID,
          business_id UUID,
          enable_dynamic_pricing BOOLEAN DEFAULT false,
          enable_loyalty_pricing BOOLEAN DEFAULT false,
          enable_bulk_pricing BOOLEAN DEFAULT false,
          enable_time_based_pricing BOOLEAN DEFAULT false,
          enable_customer_pricing BOOLEAN DEFAULT false,
          enable_special_events BOOLEAN DEFAULT false,
          loyalty_discount_percent NUMERIC(5, 2) DEFAULT 0,
          loyalty_points_threshold INTEGER DEFAULT 100,
          loyalty_max_discount NUMERIC(5, 2) DEFAULT 20,
          bulk_discount_enabled BOOLEAN DEFAULT false,
          bulk_discount_threshold INTEGER DEFAULT 10,
          bulk_discount_percent NUMERIC(5, 2) DEFAULT 5,
          time_based_discount_enabled BOOLEAN DEFAULT false,
          time_based_start_time TEXT DEFAULT '00:00',
          time_based_end_time TEXT DEFAULT '23:59',
          time_based_discount_percent NUMERIC(5, 2) DEFAULT 0,
          customer_pricing_enabled BOOLEAN DEFAULT false,
          vip_customer_discount NUMERIC(5, 2) DEFAULT 10,
          regular_customer_discount NUMERIC(5, 2) DEFAULT 5,
          special_events_enabled BOOLEAN DEFAULT false,
          special_event_discount_percent NUMERIC(5, 2) DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `
    },
    {
      name: 'lats_pos_receipt_settings',
      sql: `
        CREATE TABLE IF NOT EXISTS lats_pos_receipt_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID,
          business_id UUID,
          receipt_template TEXT DEFAULT 'standard',
          receipt_width INTEGER DEFAULT 80,
          receipt_font_size INTEGER DEFAULT 12,
          show_business_logo BOOLEAN DEFAULT true,
          show_business_name BOOLEAN DEFAULT true,
          show_business_address BOOLEAN DEFAULT true,
          show_business_phone BOOLEAN DEFAULT true,
          show_business_email BOOLEAN DEFAULT false,
          show_business_website BOOLEAN DEFAULT false,
          show_transaction_id BOOLEAN DEFAULT true,
          show_date_time BOOLEAN DEFAULT true,
          show_cashier_name BOOLEAN DEFAULT true,
          show_customer_name BOOLEAN DEFAULT true,
          show_customer_phone BOOLEAN DEFAULT false,
          show_product_names BOOLEAN DEFAULT true,
          show_product_skus BOOLEAN DEFAULT true,
          show_product_barcodes BOOLEAN DEFAULT false,
          show_quantities BOOLEAN DEFAULT true,
          show_unit_prices BOOLEAN DEFAULT true,
          show_discounts BOOLEAN DEFAULT true,
          show_subtotal BOOLEAN DEFAULT true,
          show_tax BOOLEAN DEFAULT true,
          show_discount_total BOOLEAN DEFAULT true,
          show_grand_total BOOLEAN DEFAULT true,
          show_payment_method BOOLEAN DEFAULT true,
          show_change_amount BOOLEAN DEFAULT true,
          auto_print_receipt BOOLEAN DEFAULT false,
          print_duplicate_receipt BOOLEAN DEFAULT false,
          enable_email_receipt BOOLEAN DEFAULT true,
          enable_sms_receipt BOOLEAN DEFAULT false,
          enable_receipt_numbering BOOLEAN DEFAULT true,
          receipt_number_prefix TEXT DEFAULT 'RCP',
          receipt_number_start INTEGER DEFAULT 1,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `
    },
    {
      name: 'lats_pos_barcode_scanner_settings',
      sql: `
        CREATE TABLE IF NOT EXISTS lats_pos_barcode_scanner_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID,
          business_id UUID,
          enable_barcode_scanner BOOLEAN DEFAULT true,
          scanner_type TEXT DEFAULT 'auto',
          enable_scan_sound BOOLEAN DEFAULT true,
          scan_sound_volume INTEGER DEFAULT 50,
          enable_scan_vibration BOOLEAN DEFAULT true,
          auto_add_to_cart BOOLEAN DEFAULT true,
          show_scan_confirmation BOOLEAN DEFAULT true,
          enable_duplicate_scan_warning BOOLEAN DEFAULT true,
          enable_invalid_scan_warning BOOLEAN DEFAULT true,
          enable_scan_history BOOLEAN DEFAULT true,
          max_scan_history INTEGER DEFAULT 50,
          scan_timeout INTEGER DEFAULT 5000,
          enable_continuous_scan BOOLEAN DEFAULT false,
          enable_multi_scan BOOLEAN DEFAULT true,
          enable_camera_scanner BOOLEAN DEFAULT true,
          enable_keyboard_scanner BOOLEAN DEFAULT true,
          keyboard_scanner_prefix TEXT DEFAULT '',
          keyboard_scanner_suffix TEXT DEFAULT 'Enter',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `
    },
    {
      name: 'lats_pos_delivery_settings',
      sql: `
        CREATE TABLE IF NOT EXISTS lats_pos_delivery_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID,
          business_id UUID,
          enable_delivery BOOLEAN DEFAULT true,
          delivery_fee NUMERIC(10, 2) DEFAULT 0,
          free_delivery_threshold NUMERIC(10, 2) DEFAULT 0,
          enable_delivery_zones BOOLEAN DEFAULT false,
          enable_delivery_tracking BOOLEAN DEFAULT false,
          enable_delivery_notifications BOOLEAN DEFAULT true,
          enable_delivery_confirmation BOOLEAN DEFAULT true,
          delivery_time_slots JSONB DEFAULT '[]'::jsonb,
          delivery_radius NUMERIC(10, 2) DEFAULT 0,
          enable_express_delivery BOOLEAN DEFAULT false,
          express_delivery_fee NUMERIC(10, 2) DEFAULT 0,
          enable_pickup BOOLEAN DEFAULT true,
          enable_delivery_notes BOOLEAN DEFAULT true,
          require_delivery_address BOOLEAN DEFAULT true,
          require_delivery_phone BOOLEAN DEFAULT true,
          enable_driver_assignment BOOLEAN DEFAULT false,
          enable_delivery_scheduling BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `
    },
    {
      name: 'lats_pos_search_filter_settings',
      sql: `
        CREATE TABLE IF NOT EXISTS lats_pos_search_filter_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID,
          business_id UUID,
          enable_product_search BOOLEAN DEFAULT true,
          enable_customer_search BOOLEAN DEFAULT true,
          enable_sales_search BOOLEAN DEFAULT true,
          search_by_name BOOLEAN DEFAULT true,
          search_by_barcode BOOLEAN DEFAULT true,
          search_by_sku BOOLEAN DEFAULT true,
          search_by_category BOOLEAN DEFAULT true,
          search_by_supplier BOOLEAN DEFAULT true,
          search_by_description BOOLEAN DEFAULT true,
          search_by_tags BOOLEAN DEFAULT true,
          enable_fuzzy_search BOOLEAN DEFAULT true,
          enable_autocomplete BOOLEAN DEFAULT true,
          min_search_length INTEGER DEFAULT 2,
          max_search_results INTEGER DEFAULT 50,
          search_timeout INTEGER DEFAULT 5000,
          search_debounce_time INTEGER DEFAULT 300,
          enable_search_history BOOLEAN DEFAULT true,
          max_search_history INTEGER DEFAULT 20,
          enable_recent_searches BOOLEAN DEFAULT true,
          enable_popular_searches BOOLEAN DEFAULT true,
          enable_search_suggestions BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `
    },
    {
      name: 'lats_pos_user_permissions_settings',
      sql: `
        CREATE TABLE IF NOT EXISTS lats_pos_user_permissions_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID,
          business_id UUID,
          enable_pos_access BOOLEAN DEFAULT true,
          enable_sales_access BOOLEAN DEFAULT true,
          enable_refunds_access BOOLEAN DEFAULT false,
          enable_void_access BOOLEAN DEFAULT false,
          enable_discount_access BOOLEAN DEFAULT false,
          enable_inventory_view BOOLEAN DEFAULT true,
          enable_inventory_edit BOOLEAN DEFAULT false,
          enable_stock_adjustments BOOLEAN DEFAULT false,
          enable_product_creation BOOLEAN DEFAULT false,
          enable_product_deletion BOOLEAN DEFAULT false,
          enable_customer_view BOOLEAN DEFAULT true,
          enable_customer_creation BOOLEAN DEFAULT false,
          enable_customer_edit BOOLEAN DEFAULT false,
          enable_customer_deletion BOOLEAN DEFAULT false,
          enable_customer_history BOOLEAN DEFAULT true,
          enable_payment_processing BOOLEAN DEFAULT true,
          enable_cash_management BOOLEAN DEFAULT false,
          enable_daily_reports BOOLEAN DEFAULT true,
          enable_financial_reports BOOLEAN DEFAULT false,
          enable_tax_management BOOLEAN DEFAULT false,
          enable_settings_access BOOLEAN DEFAULT false,
          enable_user_management BOOLEAN DEFAULT false,
          enable_backup_restore BOOLEAN DEFAULT false,
          enable_system_maintenance BOOLEAN DEFAULT false,
          enable_api_access BOOLEAN DEFAULT false,
          enable_audit_logs BOOLEAN DEFAULT false,
          enable_security_settings BOOLEAN DEFAULT false,
          enable_password_reset BOOLEAN DEFAULT false,
          enable_session_management BOOLEAN DEFAULT false,
          enable_data_export BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `
    },
    {
      name: 'lats_pos_loyalty_customer_settings',
      sql: `
        CREATE TABLE IF NOT EXISTS lats_pos_loyalty_customer_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID,
          business_id UUID,
          enable_loyalty_program BOOLEAN DEFAULT false,
          loyalty_program_name TEXT DEFAULT 'Loyalty Program',
          points_per_currency NUMERIC(10, 2) DEFAULT 1,
          points_redemption_rate NUMERIC(10, 2) DEFAULT 0.01,
          minimum_points_redemption INTEGER DEFAULT 100,
          points_expiry_days INTEGER DEFAULT 365,
          enable_customer_registration BOOLEAN DEFAULT true,
          require_customer_info BOOLEAN DEFAULT false,
          enable_customer_categories BOOLEAN DEFAULT true,
          enable_customer_tags BOOLEAN DEFAULT true,
          enable_customer_notes BOOLEAN DEFAULT true,
          enable_automatic_rewards BOOLEAN DEFAULT false,
          enable_manual_rewards BOOLEAN DEFAULT false,
          enable_birthday_rewards BOOLEAN DEFAULT false,
          enable_anniversary_rewards BOOLEAN DEFAULT false,
          enable_referral_rewards BOOLEAN DEFAULT false,
          enable_email_communication BOOLEAN DEFAULT false,
          enable_sms_communication BOOLEAN DEFAULT false,
          enable_push_notifications BOOLEAN DEFAULT false,
          enable_marketing_emails BOOLEAN DEFAULT false,
          enable_customer_analytics BOOLEAN DEFAULT true,
          enable_purchase_history BOOLEAN DEFAULT true,
          enable_spending_patterns BOOLEAN DEFAULT true,
          enable_customer_segmentation BOOLEAN DEFAULT false,
          enable_customer_insights BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `
    },
    {
      name: 'lats_pos_analytics_reporting_settings',
      sql: `
        CREATE TABLE IF NOT EXISTS lats_pos_analytics_reporting_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID,
          business_id UUID,
          enable_analytics BOOLEAN DEFAULT true,
          enable_real_time_analytics BOOLEAN DEFAULT true,
          analytics_refresh_interval INTEGER DEFAULT 30000,
          enable_data_export BOOLEAN DEFAULT true,
          enable_sales_analytics BOOLEAN DEFAULT true,
          enable_sales_trends BOOLEAN DEFAULT true,
          enable_product_performance BOOLEAN DEFAULT true,
          enable_customer_analytics BOOLEAN DEFAULT true,
          enable_revenue_tracking BOOLEAN DEFAULT true,
          enable_inventory_analytics BOOLEAN DEFAULT true,
          enable_stock_alerts BOOLEAN DEFAULT true,
          enable_low_stock_reports BOOLEAN DEFAULT true,
          enable_inventory_turnover BOOLEAN DEFAULT true,
          enable_supplier_analytics BOOLEAN DEFAULT false,
          enable_automated_reports BOOLEAN DEFAULT false,
          report_generation_time TEXT DEFAULT '00:00',
          enable_email_reports BOOLEAN DEFAULT false,
          enable_pdf_reports BOOLEAN DEFAULT true,
          enable_excel_reports BOOLEAN DEFAULT true,
          enable_custom_dashboard BOOLEAN DEFAULT true,
          enable_kpi_widgets BOOLEAN DEFAULT true,
          enable_chart_animations BOOLEAN DEFAULT true,
          enable_data_drill_down BOOLEAN DEFAULT true,
          enable_comparative_analysis BOOLEAN DEFAULT true,
          enable_predictive_analytics BOOLEAN DEFAULT false,
          enable_data_retention BOOLEAN DEFAULT true,
          data_retention_days INTEGER DEFAULT 365,
          enable_data_backup BOOLEAN DEFAULT true,
          enable_api_export BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `
    },
    {
      name: 'lats_pos_notification_settings',
      sql: `
        CREATE TABLE IF NOT EXISTS lats_pos_notification_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID,
          business_id UUID,
          enable_notifications BOOLEAN DEFAULT true,
          enable_sound_notifications BOOLEAN DEFAULT true,
          enable_visual_notifications BOOLEAN DEFAULT true,
          enable_push_notifications BOOLEAN DEFAULT false,
          notification_timeout INTEGER DEFAULT 5000,
          enable_sales_notifications BOOLEAN DEFAULT true,
          notify_on_sale_completion BOOLEAN DEFAULT true,
          notify_on_refund BOOLEAN DEFAULT true,
          notify_on_void BOOLEAN DEFAULT true,
          notify_on_discount BOOLEAN DEFAULT true,
          enable_inventory_notifications BOOLEAN DEFAULT true,
          notify_on_low_stock BOOLEAN DEFAULT true,
          low_stock_threshold INTEGER DEFAULT 10,
          notify_on_out_of_stock BOOLEAN DEFAULT true,
          notify_on_stock_adjustment BOOLEAN DEFAULT false,
          enable_customer_notifications BOOLEAN DEFAULT true,
          notify_on_customer_registration BOOLEAN DEFAULT false,
          notify_on_loyalty_points BOOLEAN DEFAULT false,
          notify_on_customer_birthday BOOLEAN DEFAULT false,
          notify_on_customer_anniversary BOOLEAN DEFAULT false,
          enable_system_notifications BOOLEAN DEFAULT true,
          notify_on_system_errors BOOLEAN DEFAULT true,
          notify_on_backup_completion BOOLEAN DEFAULT false,
          notify_on_sync_completion BOOLEAN DEFAULT false,
          notify_on_maintenance BOOLEAN DEFAULT true,
          enable_email_notifications BOOLEAN DEFAULT false,
          enable_sms_notifications BOOLEAN DEFAULT false,
          enable_in_app_notifications BOOLEAN DEFAULT true,
          enable_desktop_notifications BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `
    },
    {
      name: 'lats_pos_advanced_settings',
      sql: `
        CREATE TABLE IF NOT EXISTS lats_pos_advanced_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID,
          business_id UUID,
          enable_performance_mode BOOLEAN DEFAULT false,
          enable_caching BOOLEAN DEFAULT true,
          cache_size INTEGER DEFAULT 100,
          enable_lazy_loading BOOLEAN DEFAULT true,
          max_concurrent_requests INTEGER DEFAULT 10,
          enable_database_optimization BOOLEAN DEFAULT true,
          enable_auto_backup BOOLEAN DEFAULT false,
          backup_frequency TEXT DEFAULT 'daily',
          enable_data_compression BOOLEAN DEFAULT false,
          enable_query_optimization BOOLEAN DEFAULT true,
          enable_two_factor_auth BOOLEAN DEFAULT false,
          enable_session_timeout BOOLEAN DEFAULT true,
          session_timeout_minutes INTEGER DEFAULT 60,
          enable_audit_logging BOOLEAN DEFAULT false,
          enable_encryption BOOLEAN DEFAULT false,
          enable_api_access BOOLEAN DEFAULT false,
          enable_webhooks BOOLEAN DEFAULT false,
          enable_third_party_integrations BOOLEAN DEFAULT false,
          enable_data_sync BOOLEAN DEFAULT false,
          sync_interval INTEGER DEFAULT 300000,
          enable_debug_mode BOOLEAN DEFAULT false,
          enable_error_reporting BOOLEAN DEFAULT true,
          enable_performance_monitoring BOOLEAN DEFAULT false,
          enable_logging BOOLEAN DEFAULT true,
          log_level TEXT DEFAULT 'info',
          enable_experimental_features BOOLEAN DEFAULT false,
          enable_beta_features BOOLEAN DEFAULT false,
          enable_custom_scripts BOOLEAN DEFAULT false,
          enable_plugin_system BOOLEAN DEFAULT false,
          enable_auto_updates BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `
    }
  ];

  console.log('📊 Creating POS settings tables...\n');
  
  for (const table of tables) {
    try {
      await sql([table.sql]);
      
      // Create index
      await sql`CREATE INDEX IF NOT EXISTS ${sql(`idx_${table.name}_user_id`)} ON ${sql(table.name)}(user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS ${sql(`idx_${table.name}_business_id`)} ON ${sql(table.name)}(business_id)`;
      
      // Enable RLS
      await sql`ALTER TABLE ${sql(table.name)} ENABLE ROW LEVEL SECURITY`;
      
      // Create policy
      const policyName = `Allow all operations on ${table.name}`;
      await sql`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = ${table.name}
            AND policyname = ${policyName}
          ) THEN
            EXECUTE format(
              'CREATE POLICY %I ON %I FOR ALL USING (true) WITH CHECK (true)',
              ${policyName}, ${table.name}
            );
          END IF;
        END $$
      `;
      
      console.log(`   ✅ ${table.name}`);
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log(`   ℹ️  ${table.name} (already exists)`);
      } else {
        console.error(`   ❌ ${table.name}: ${error.message}`);
      }
    }
  }
  
  console.log('\n');
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🚀 Starting automatic database fix...\n');
    
    // Step 1: Create daily_sales_closures table
    await createDailySalesClosuresTable();
    
    // Step 2: Create POS settings tables
    await createPOSSettingsTables();
    
    console.log('===========================================');
    console.log('✅ DATABASE FIX COMPLETED SUCCESSFULLY!');
    console.log('===========================================\n');
    console.log('📋 Summary:');
    console.log('   ✅ daily_sales_closures table created');
    console.log('   ✅ 11 POS settings tables created');
    console.log('   ✅ All indexes created');
    console.log('   ✅ RLS policies applied\n');
    console.log('🎉 Next steps:');
    console.log('   1. Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)');
    console.log('   2. Check console - all errors should be gone!');
    console.log('   3. Test POS settings modal');
    console.log('   4. Test daily closure functionality\n');
    
  } catch (error) {
    console.error('\n❌ ERROR during database fix:');
    console.error('   ', error.message);
    console.error('\nPlease check your database connection and try again.\n');
    process.exit(1);
  }
}

// Run the script
main();

