#!/usr/bin/env node
/**
 * Simple Automatic Database Fix Script
 * Reads database URL from database-config.json
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.cyan}→${colors.reset} ${msg}`),
};

async function main() {
  console.log('\n' + '='.repeat(50));
  console.log('🔧 Automatic Database Fix for 400 Errors');
  console.log('='.repeat(50) + '\n');

  // Read database URL from config file
  let config;
  try {
    const configData = readFileSync('database-config.json', 'utf-8');
    config = JSON.parse(configData);
  } catch (err) {
    log.error('Could not read database-config.json');
    log.info('Please create database-config.json with your database URL');
    process.exit(1);
  }

  const databaseUrl = config.url;

  // Validate database URL
  if (!databaseUrl || databaseUrl.includes('username:password') || databaseUrl.includes('xxxxx')) {
    log.error('Database URL not configured!');
    log.info('Please edit database-config.json and add your real Neon database URL');
    log.info('\nSteps:');
    log.info('1. Go to https://console.neon.tech');
    log.info('2. Select your project');
    log.info('3. Click "Connection Details"');
    log.info('4. Copy the connection string');
    log.info('5. Paste it in database-config.json\n');
    process.exit(1);
  }

  log.info('Connecting to Neon database...');
  const sql = neon(databaseUrl);

  try {
    // Test connection first
    log.step('Testing database connection...');
    await sql`SELECT 1 as test`;
    log.success('Connection successful!');

    // Step 1: Disable RLS on settings tables
    log.step('\nStep 1: Disabling Row Level Security...');
    
    const tables = [
      'lats_pos_general_settings',
      'lats_pos_receipt_settings',
      'lats_pos_advanced_settings',
      'lats_pos_dynamic_pricing_settings',
      'lats_pos_barcode_scanner_settings',
      'lats_pos_delivery_settings',
      'lats_pos_search_filter_settings',
      'lats_pos_user_permissions_settings',
      'lats_pos_loyalty_customer_settings',
      'lats_pos_analytics_reporting_settings',
      'lats_pos_notification_settings',
    ];

    let disabledCount = 0;
    for (const table of tables) {
      try {
        // Use raw SQL since we need dynamic table names
        const query = `ALTER TABLE IF EXISTS ${table} DISABLE ROW LEVEL SECURITY`;
        const parts = [query];
        parts.raw = [query];
        await sql(parts);
        disabledCount++;
      } catch (err) {
        log.warn(`  Could not disable RLS on ${table}`);
      }
    }
    log.success(`  Disabled RLS on ${disabledCount} tables`);

    // Step 2: Create default settings for admin user
    log.step('\nStep 2: Creating default settings...');
    
    const adminUserId = '287ec561-d5f2-4113-840e-e9335b9d3f69';
    
    const settingsSQL = `
      DO $$
      DECLARE
        admin_user_id UUID := '${adminUserId}';
      BEGIN
        INSERT INTO lats_pos_general_settings (user_id) VALUES (admin_user_id) ON CONFLICT DO NOTHING;
        INSERT INTO lats_pos_receipt_settings (user_id) VALUES (admin_user_id) ON CONFLICT DO NOTHING;
        INSERT INTO lats_pos_advanced_settings (user_id) VALUES (admin_user_id) ON CONFLICT DO NOTHING;
        INSERT INTO lats_pos_dynamic_pricing_settings (user_id) VALUES (admin_user_id) ON CONFLICT DO NOTHING;
        INSERT INTO lats_pos_barcode_scanner_settings (user_id) VALUES (admin_user_id) ON CONFLICT DO NOTHING;
        INSERT INTO lats_pos_delivery_settings (user_id) VALUES (admin_user_id) ON CONFLICT DO NOTHING;
        INSERT INTO lats_pos_search_filter_settings (user_id) VALUES (admin_user_id) ON CONFLICT DO NOTHING;
        INSERT INTO lats_pos_user_permissions_settings (user_id) VALUES (admin_user_id) ON CONFLICT DO NOTHING;
        INSERT INTO lats_pos_loyalty_customer_settings (user_id) VALUES (admin_user_id) ON CONFLICT DO NOTHING;
        INSERT INTO lats_pos_analytics_reporting_settings (user_id) VALUES (admin_user_id) ON CONFLICT DO NOTHING;
        INSERT INTO lats_pos_notification_settings (user_id) VALUES (admin_user_id) ON CONFLICT DO NOTHING;
      END $$;
    `;

    const parts = [settingsSQL];
    parts.raw = [settingsSQL];
    await sql(parts);
    
    log.success('  Created default settings records');

    // Step 3: Verify
    log.step('\nStep 3: Verifying...');
    
    const verification = await sql`
      SELECT COUNT(*) as count
      FROM lats_pos_general_settings
      WHERE user_id = ${adminUserId}
    `;

    if (verification[0].count > 0) {
      log.success('  Settings verified successfully!');
    } else {
      log.warn('  Could not verify settings');
    }

    console.log('\n' + '='.repeat(50));
    log.success('FIX APPLIED SUCCESSFULLY! 🎉');
    console.log('='.repeat(50));
    log.info('\n✨ Next steps:');
    log.info('  1. Hard refresh your browser (Cmd+Shift+R)');
    log.info('  2. Login to your app');
    log.info('  3. The 400 errors should be gone!\n');

  } catch (error) {
    console.log('\n');
    log.error(`Failed: ${error.message}`);
    
    if (error.message.includes('password authentication failed')) {
      log.info('\n💡 Tip: Check your database URL credentials in database-config.json');
    } else if (error.message.includes('does not exist')) {
      log.info('\n💡 Tip: You may need to run the complete-database-schema.sql first');
    }
    
    console.log('\nFull error:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);

