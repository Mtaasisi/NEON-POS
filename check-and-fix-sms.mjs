#!/usr/bin/env node

/**
 * Check and Fix SMS Gateway Configuration
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
  log.title('🔍 CHECK AND FIX SMS GATEWAY');
  console.log('━'.repeat(60));

  const DATABASE_URL = process.argv[2];
  
  if (!DATABASE_URL) {
    log.error('DATABASE_URL not provided!');
    log.info('Usage: node check-and-fix-sms.mjs <DATABASE_URL>');
    process.exit(1);
  }

  const sql = neon(DATABASE_URL);

  try {
    // Step 1: Check current configuration
    log.step('\n📍 Step 1: Checking current SMS configuration...');
    
    const current = await sql`
      SELECT 
        id,
        user_id,
        integration_name,
        provider_name,
        is_enabled,
        is_active,
        environment,
        credentials,
        config
      FROM lats_pos_integrations_settings
      WHERE integration_name = 'SMS_GATEWAY'
    `;

    if (current.length === 0) {
      log.warning('No SMS_GATEWAY integration found!');
      log.info('Creating new configuration...');
    } else {
      log.info(`Found ${current.length} SMS_GATEWAY integration(s)`);
      current.forEach((config, idx) => {
        console.log(`\n  Integration #${idx + 1}:`);
        console.log(`  - ID: ${config.id}`);
        console.log(`  - User ID: ${config.user_id}`);
        console.log(`  - Enabled: ${config.is_enabled}`);
        console.log(`  - Active: ${config.is_active}`);
        console.log(`  - Environment: ${config.environment}`);
        console.log(`  - API Key: ${config.credentials?.api_key || 'NOT SET'}`);
        console.log(`  - API URL: ${config.config?.api_url || 'NOT SET'}`);
      });
    }

    // Step 2: Delete ALL existing SMS_GATEWAY integrations
    log.step('\n🗑️  Step 2: Removing all existing SMS_GATEWAY integrations...');
    
    const deleted = await sql`
      DELETE FROM lats_pos_integrations_settings
      WHERE integration_name = 'SMS_GATEWAY'
      RETURNING id
    `;
    
    if (deleted.length > 0) {
      log.success(`Deleted ${deleted.length} old integration(s)`);
    }

    // Step 3: Find a valid user_id
    log.step('\n📍 Step 3: Finding valid user_id...');
    
    let userId = null;

    // Try from integrations table
    try {
      const integrations = await sql`
        SELECT DISTINCT user_id
        FROM lats_pos_integrations_settings
        WHERE user_id IS NOT NULL
        LIMIT 1
      `;
      if (integrations.length > 0 && integrations[0].user_id) {
        userId = integrations[0].user_id;
        log.success(`Found user_id: ${userId}`);
      }
    } catch (err) {
      log.warning('Could not find user_id');
    }

    if (!userId) {
      log.error('No valid user_id found! Cannot create integration.');
      process.exit(1);
    }

    // Step 4: Create fresh SMS configuration
    log.step('\n🔧 Step 4: Creating fresh SMS configuration...');
    
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

    const newIntegration = await sql`
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
      RETURNING *
    `;

    log.success('Fresh SMS Gateway created successfully!');

    // Step 5: Verify
    log.step('\n✅ Step 5: Final verification...');
    
    const verification = await sql`
      SELECT 
        id,
        integration_name,
        provider_name,
        is_enabled,
        is_active,
        environment,
        credentials->>'api_key' as api_key,
        credentials->>'api_password' as api_password,
        credentials->>'sender_id' as sender_id,
        config->>'api_url' as api_url
      FROM lats_pos_integrations_settings
      WHERE integration_name = 'SMS_GATEWAY'
    `;

    if (verification.length > 0) {
      const config = verification[0];
      log.success('SMS Gateway is properly configured!');
      console.log('\n' + '─'.repeat(60));
      log.info(`ID: ${config.id}`);
      log.info(`Provider: ${config.provider_name}`);
      log.info(`API Key: ${config.api_key}`);
      log.info(`API Password: ${config.api_password ? '***' : 'NOT SET'}`);
      log.info(`Sender ID: ${config.sender_id}`);
      log.info(`API URL: ${config.api_url}`);
      log.info(`Enabled: ${config.is_enabled ? '✅ YES' : '❌ NO'}`);
      log.info(`Active: ${config.is_active ? '✅ YES' : '❌ NO'}`);
      log.info(`Environment: ${config.environment}`);
      console.log('─'.repeat(60));
    }

    log.title('\n🎉 FIX COMPLETE!');
    console.log('━'.repeat(60));
    log.success('SMS Gateway is ready!');
    log.warning('\n⚠️  IMPORTANT: Hard refresh your app!');
    console.log('  - Chrome/Edge: Cmd/Ctrl + Shift + R');
    console.log('  - Or clear browser cache');
    console.log('  - Or use Incognito/Private mode\n');

  } catch (error) {
    log.error(`Fix failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

main().catch(console.error);

