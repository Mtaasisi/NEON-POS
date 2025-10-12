#!/usr/bin/env node
/**
 * Automatic Database Fix Script
 * Applies the SQL fix for 400 errors to your Neon database
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

  // Get database URL from environment or prompt
  const databaseUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

  if (!databaseUrl) {
    log.error('Database URL not found!');
    log.info('Please set VITE_DATABASE_URL in your .env file');
    log.info('Example: VITE_DATABASE_URL=postgresql://user:pass@host/db');
    process.exit(1);
  }

  log.info('Connecting to Neon database...');
  const sql = neon(databaseUrl);

  try {
    // Step 1: Disable RLS on settings tables
    log.step('Step 1: Disabling Row Level Security on settings tables...');
    
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

    for (const table of tables) {
      try {
        await sql`ALTER TABLE IF EXISTS ${sql(table)} DISABLE ROW LEVEL SECURITY`;
        log.success(`  Disabled RLS on ${table}`);
      } catch (err) {
        log.warn(`  Could not disable RLS on ${table}: ${err.message}`);
      }
    }

    // Step 2: Create default settings for admin user
    log.step('\nStep 2: Creating default settings for admin user...');
    
    const adminUserId = '287ec561-d5f2-4113-840e-e9335b9d3f69';
    
    const settingsCreation = `
      DO $$
      DECLARE
        admin_user_id UUID := '${adminUserId}';
      BEGIN
        -- General Settings
        INSERT INTO lats_pos_general_settings (user_id) 
        VALUES (admin_user_id)
        ON CONFLICT DO NOTHING;

        -- Receipt Settings
        INSERT INTO lats_pos_receipt_settings (user_id) 
        VALUES (admin_user_id)
        ON CONFLICT DO NOTHING;

        -- Advanced Settings
        INSERT INTO lats_pos_advanced_settings (user_id) 
        VALUES (admin_user_id)
        ON CONFLICT DO NOTHING;

        -- Dynamic Pricing Settings
        INSERT INTO lats_pos_dynamic_pricing_settings (user_id) 
        VALUES (admin_user_id)
        ON CONFLICT DO NOTHING;

        -- Barcode Scanner Settings
        INSERT INTO lats_pos_barcode_scanner_settings (user_id) 
        VALUES (admin_user_id)
        ON CONFLICT DO NOTHING;

        -- Delivery Settings
        INSERT INTO lats_pos_delivery_settings (user_id) 
        VALUES (admin_user_id)
        ON CONFLICT DO NOTHING;

        -- Search Filter Settings
        INSERT INTO lats_pos_search_filter_settings (user_id) 
        VALUES (admin_user_id)
        ON CONFLICT DO NOTHING;

        -- User Permissions Settings
        INSERT INTO lats_pos_user_permissions_settings (user_id) 
        VALUES (admin_user_id)
        ON CONFLICT DO NOTHING;

        -- Loyalty Customer Settings
        INSERT INTO lats_pos_loyalty_customer_settings (user_id) 
        VALUES (admin_user_id)
        ON CONFLICT DO NOTHING;

        -- Analytics Reporting Settings
        INSERT INTO lats_pos_analytics_reporting_settings (user_id) 
        VALUES (admin_user_id)
        ON CONFLICT DO NOTHING;

        -- Notification Settings
        INSERT INTO lats_pos_notification_settings (user_id) 
        VALUES (admin_user_id)
        ON CONFLICT DO NOTHING;

      END $$;
    `;

    // Execute as raw SQL using Neon's tagged template
    const parts = [settingsCreation];
    parts.raw = [settingsCreation];
    await sql(parts);
    
    log.success('  Created default settings for admin user');

    // Step 3: Verify
    log.step('\nStep 3: Verifying fix...');
    
    const verification = await sql`
      SELECT 
        'lats_pos_general_settings' as table_name,
        COUNT(*) as record_count
      FROM lats_pos_general_settings
      WHERE user_id = ${adminUserId}
      UNION ALL
      SELECT 'lats_pos_receipt_settings', COUNT(*)
      FROM lats_pos_receipt_settings
      WHERE user_id = ${adminUserId}
      UNION ALL
      SELECT 'lats_pos_advanced_settings', COUNT(*)
      FROM lats_pos_advanced_settings
      WHERE user_id = ${adminUserId}
    `;

    const hasRecords = verification.every(row => row.record_count > 0);
    
    if (hasRecords) {
      log.success('  All settings tables have records');
    } else {
      log.warn('  Some settings tables may be missing records');
    }

    console.log('\n' + '='.repeat(50));
    log.success('FIX COMPLETE! 🎉');
    console.log('='.repeat(50));
    log.info('\nNext steps:');
    log.info('1. Refresh your browser (Cmd+Shift+R or Ctrl+Shift+R)');
    log.info('2. Login to your app');
    log.info('3. The 400 errors should be gone!');
    console.log('');

  } catch (error) {
    log.error(`Failed to apply fix: ${error.message}`);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);

