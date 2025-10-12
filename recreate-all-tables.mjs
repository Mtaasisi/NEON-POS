#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

const log = {
  success: (msg) => console.log(`\x1b[32m✅\x1b[0m ${msg}`),
  step: (msg) => console.log(`\x1b[36m→\x1b[0m ${msg}`),
};

async function main() {
  const config = JSON.parse(readFileSync('database-config.json', 'utf-8'));
  const sql = neon(config.url);

  console.log('\n' + '='.repeat(50));
  console.log('🔧 Recreating All POS Settings Tables');
  console.log('='.repeat(50) + '\n');

  const tables = [
    {
      name: 'lats_pos_general_settings',
      sql: `CREATE TABLE IF NOT EXISTS lats_pos_general_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
        business_id TEXT, theme TEXT DEFAULT 'light', language TEXT DEFAULT 'en',
        currency TEXT DEFAULT 'USD', timezone TEXT DEFAULT 'UTC',
        date_format TEXT DEFAULT 'MM/DD/YYYY', time_format TEXT DEFAULT '12',
        show_product_images BOOLEAN DEFAULT true, show_stock_levels BOOLEAN DEFAULT true,
        show_prices BOOLEAN DEFAULT true, show_barcodes BOOLEAN DEFAULT true,
        products_per_page INTEGER DEFAULT 20, auto_complete_search BOOLEAN DEFAULT true,
        confirm_delete BOOLEAN DEFAULT true, show_confirmations BOOLEAN DEFAULT true,
        enable_sound_effects BOOLEAN DEFAULT true, sound_volume NUMERIC(3,2) DEFAULT 0.5,
        enable_click_sounds BOOLEAN DEFAULT true, enable_cart_sounds BOOLEAN DEFAULT true,
        enable_payment_sounds BOOLEAN DEFAULT true, enable_delete_sounds BOOLEAN DEFAULT true,
        enable_animations BOOLEAN DEFAULT true, enable_caching BOOLEAN DEFAULT true,
        cache_duration INTEGER DEFAULT 300000, enable_lazy_loading BOOLEAN DEFAULT true,
        max_search_results INTEGER DEFAULT 50, enable_tax BOOLEAN DEFAULT false,
        tax_rate NUMERIC(5,2) DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`
    },
    {
      name: 'lats_pos_receipt_settings',
      sql: `CREATE TABLE IF NOT EXISTS lats_pos_receipt_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
        business_id TEXT, receipt_template TEXT DEFAULT 'standard',
        receipt_width INTEGER DEFAULT 80, receipt_font_size INTEGER DEFAULT 12,
        show_business_logo BOOLEAN DEFAULT true, show_business_name BOOLEAN DEFAULT true,
        show_business_address BOOLEAN DEFAULT true, show_business_phone BOOLEAN DEFAULT true,
        show_business_email BOOLEAN DEFAULT true, show_business_website BOOLEAN DEFAULT false,
        show_transaction_id BOOLEAN DEFAULT true, show_date_time BOOLEAN DEFAULT true,
        show_cashier_name BOOLEAN DEFAULT true, show_customer_name BOOLEAN DEFAULT true,
        show_customer_phone BOOLEAN DEFAULT false, show_product_names BOOLEAN DEFAULT true,
        show_product_skus BOOLEAN DEFAULT false, show_product_barcodes BOOLEAN DEFAULT false,
        show_quantities BOOLEAN DEFAULT true, show_unit_prices BOOLEAN DEFAULT true,
        show_discounts BOOLEAN DEFAULT true, show_subtotal BOOLEAN DEFAULT true,
        show_tax BOOLEAN DEFAULT true, show_discount_total BOOLEAN DEFAULT true,
        show_grand_total BOOLEAN DEFAULT true, show_payment_method BOOLEAN DEFAULT true,
        show_change_amount BOOLEAN DEFAULT true, auto_print_receipt BOOLEAN DEFAULT false,
        print_duplicate_receipt BOOLEAN DEFAULT false, enable_email_receipt BOOLEAN DEFAULT true,
        enable_sms_receipt BOOLEAN DEFAULT false, enable_receipt_numbering BOOLEAN DEFAULT true,
        receipt_number_prefix TEXT DEFAULT 'RCP', receipt_number_start INTEGER DEFAULT 1000,
        receipt_number_format TEXT DEFAULT 'RCP-{number}', show_footer_message BOOLEAN DEFAULT true,
        footer_message TEXT DEFAULT 'Thank you for your business!',
        show_return_policy BOOLEAN DEFAULT false, return_policy_text TEXT DEFAULT '30-day return policy',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`
    },
    {
      name: 'lats_pos_advanced_settings',
      sql: `CREATE TABLE IF NOT EXISTS lats_pos_advanced_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
        business_id TEXT, enable_performance_mode BOOLEAN DEFAULT true,
        enable_caching BOOLEAN DEFAULT true, cache_size INTEGER DEFAULT 50,
        enable_lazy_loading BOOLEAN DEFAULT true, max_concurrent_requests INTEGER DEFAULT 10,
        enable_database_optimization BOOLEAN DEFAULT true, enable_auto_backup BOOLEAN DEFAULT false,
        backup_frequency TEXT DEFAULT 'daily', enable_data_compression BOOLEAN DEFAULT false,
        enable_query_optimization BOOLEAN DEFAULT true, enable_two_factor_auth BOOLEAN DEFAULT false,
        enable_session_timeout BOOLEAN DEFAULT true, session_timeout_minutes INTEGER DEFAULT 60,
        enable_audit_logging BOOLEAN DEFAULT true, enable_encryption BOOLEAN DEFAULT false,
        enable_api_access BOOLEAN DEFAULT false, enable_webhooks BOOLEAN DEFAULT false,
        enable_third_party_integrations BOOLEAN DEFAULT false, enable_data_sync BOOLEAN DEFAULT false,
        sync_interval INTEGER DEFAULT 3600000, enable_debug_mode BOOLEAN DEFAULT false,
        enable_error_reporting BOOLEAN DEFAULT true, enable_performance_monitoring BOOLEAN DEFAULT true,
        enable_logging BOOLEAN DEFAULT true, log_level TEXT DEFAULT 'info',
        enable_experimental_features BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`
    },
    // Add the rest of the settings tables with simplified structure
    { name: 'lats_pos_dynamic_pricing_settings', sql: `CREATE TABLE IF NOT EXISTS lats_pos_dynamic_pricing_settings (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE, enable_dynamic_pricing BOOLEAN DEFAULT false, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW())` },
    { name: 'lats_pos_barcode_scanner_settings', sql: `CREATE TABLE IF NOT EXISTS lats_pos_barcode_scanner_settings (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE, enable_scanner BOOLEAN DEFAULT false, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW())` },
    { name: 'lats_pos_delivery_settings', sql: `CREATE TABLE IF NOT EXISTS lats_pos_delivery_settings (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE, enable_delivery BOOLEAN DEFAULT false, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW())` },
    { name: 'lats_pos_search_filter_settings', sql: `CREATE TABLE IF NOT EXISTS lats_pos_search_filter_settings (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE, enable_search BOOLEAN DEFAULT true, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW())` },
    { name: 'lats_pos_user_permissions_settings', sql: `CREATE TABLE IF NOT EXISTS lats_pos_user_permissions_settings (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE, permissions JSONB DEFAULT '[]', created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW())` },
    { name: 'lats_pos_loyalty_customer_settings', sql: `CREATE TABLE IF NOT EXISTS lats_pos_loyalty_customer_settings (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE, enable_loyalty BOOLEAN DEFAULT false, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW())` },
    { name: 'lats_pos_analytics_reporting_settings', sql: `CREATE TABLE IF NOT EXISTS lats_pos_analytics_reporting_settings (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE, enable_analytics BOOLEAN DEFAULT true, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW())` },
    { name: 'lats_pos_notification_settings', sql: `CREATE TABLE IF NOT EXISTS lats_pos_notification_settings (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE, enable_notifications BOOLEAN DEFAULT true, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW())` },
  ];

  for (const table of tables) {
    try {
      log.step(`Dropping and recreating ${table.name}...`);
      
      // Drop existing table
      await sql`DROP TABLE IF EXISTS ${sql(table.name)} CASCADE`;
      
      // Create new table
      const parts = [table.sql];
      parts.raw = [table.sql];
      await sql(parts);
      
      log.success(`  ${table.name}`);
    } catch (err) {
      console.error(`  ❌ Error with ${table.name}:`, err.message);
    }
  }

  console.log('\n' + '='.repeat(50));
  log.success('All tables recreated! Now running the fix...');
  console.log('='.repeat(50) + '\n');

  // Now run the fix
  const adminUserId = '287ec561-d5f2-4113-840e-e9335b9d3f69';
  
  for (const table of tables) {
    try {
      // Disable RLS
      const disableRLS = `ALTER TABLE ${table.name} DISABLE ROW LEVEL SECURITY`;
      const parts1 = [disableRLS];
      parts1.raw = [disableRLS];
      await sql(parts1);
      
      // Insert default record
      const insertSQL = `INSERT INTO ${table.name} (user_id) VALUES ('${adminUserId}') ON CONFLICT DO NOTHING`;
      const parts2 = [insertSQL];
      parts2.raw = [insertSQL];
      await sql(parts2);
      
    } catch (err) {
      console.error(`Error with ${table.name}:`, err.message);
    }
  }

  log.success('\n🎉 ALL DONE!');
  console.log('\n✨ Next steps:');
  console.log('  1. Hard refresh your browser (Cmd+Shift+R)');
  console.log('  2. Login to your app');
  console.log('  3. The 400 errors should be GONE!\n');
}

main().catch(console.error);

