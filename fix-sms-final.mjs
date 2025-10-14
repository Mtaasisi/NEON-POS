#!/usr/bin/env node

/**
 * Final SMS Gateway Fix
 */

import { neon } from '@neondatabase/serverless';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

const log = {
  title: (msg) => console.log(`\n${colors.bright}${colors.blue}${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.bright}${msg}${colors.reset}`),
};

async function main() {
  log.title('🔧 FINAL SMS GATEWAY FIX');
  console.log('━'.repeat(60));

  const DATABASE_URL = process.argv[2];
  
  if (!DATABASE_URL) {
    log.error('DATABASE_URL not provided!');
    log.info('Usage: node fix-sms-final.mjs <DATABASE_URL>');
    process.exit(1);
  }

  const sql = neon(DATABASE_URL);

  try {
    // Get user_id BEFORE deleting
    log.step('📍 Finding user_id...');
    
    const existing = await sql`
      SELECT user_id
      FROM lats_pos_integrations_settings
      LIMIT 1
    `;

    if (existing.length === 0) {
      log.error('No integrations found to get user_id from!');
      process.exit(1);
    }

    const userId = existing[0].user_id;
    log.success(`Found user_id: ${userId}`);

    // Delete all SMS_GATEWAY integrations
    log.step('\n🗑️  Deleting old SMS_GATEWAY integrations...');
    await sql`
      DELETE FROM lats_pos_integrations_settings
      WHERE integration_name = 'SMS_GATEWAY'
    `;
    log.success('Old integrations deleted');

    // Create fresh configuration
    log.step('\n🔧 Creating fresh SMS configuration...');
    
    const credentials = {
      api_key: 'Inauzwa',
      api_password: '@Masika10',
      sender_id: 'INAUZWA'
    };

    const config = {
      api_url: 'https://mshastra.com/sendurl.aspx',
      priority: 'High',
      country_code: 'ALL',
      max_retries: 3,
      timeout: 30000
    };

    await sql`
      INSERT INTO lats_pos_integrations_settings (
        user_id,
        business_id,
        integration_name,
        integration_type,
        provider_name,
        is_enabled,
        is_active,
        is_test_mode,
        environment,
        credentials,
        config,
        description
      ) VALUES (
        ${userId},
        NULL,
        'SMS_GATEWAY',
        'sms',
        'MShastra',
        true,
        true,
        false,
        'production',
        ${JSON.stringify(credentials)}::jsonb,
        ${JSON.stringify(config)}::jsonb,
        'MShastra SMS Gateway - Inauzwa'
      )
    `;

    log.success('Fresh SMS Gateway created!');

    // Verify
    log.step('\n✅ Final verification...');
    
    const verification = await sql`
      SELECT 
        integration_name,
        provider_name,
        is_enabled,
        is_active,
        environment,
        credentials->>'api_key' as api_key,
        credentials->>'sender_id' as sender_id,
        config->>'api_url' as api_url
      FROM lats_pos_integrations_settings
      WHERE integration_name = 'SMS_GATEWAY'
    `;

    if (verification.length > 0) {
      const config = verification[0];
      console.log('\n' + '─'.repeat(60));
      log.success('SMS Gateway Configuration:');
      console.log(`  Provider: ${config.provider_name}`);
      console.log(`  API Key: ${config.api_key}`);
      console.log(`  Sender ID: ${config.sender_id}`);
      console.log(`  API URL: ${config.api_url}`);
      console.log(`  Enabled: ${config.is_enabled ? '✅ YES' : '❌ NO'}`);
      console.log(`  Active: ${config.is_active ? '✅ YES' : '❌ NO'}`);
      console.log(`  Environment: ${config.environment}`);
      console.log('─'.repeat(60));
    }

    log.title('\n🎉 SETUP COMPLETE!');
    console.log('━'.repeat(60));
    log.warning('⚠️  IMPORTANT: Do a HARD REFRESH!');
    console.log('  Chrome/Edge/Firefox: Cmd/Ctrl + Shift + R');
    console.log('  Safari: Cmd + Option + R');
    console.log('  Or open in Incognito/Private mode\n');

  } catch (error) {
    log.error(`Fix failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

main().catch(console.error);

