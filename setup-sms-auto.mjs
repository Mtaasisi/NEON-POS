#!/usr/bin/env node

/**
 * Automatic SMS Gateway Setup Script
 * Finds a valid user_id and configures MShastra SMS integration
 */

import { neon } from '@neondatabase/serverless';

// Colors for terminal output
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
  log.title('📱 SMS GATEWAY AUTOMATIC SETUP');
  console.log('━'.repeat(60));

  // Check for DATABASE_URL
  let DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL || process.argv[2];
  
  if (!DATABASE_URL) {
    log.error('DATABASE_URL not provided!');
    log.info('Usage: node setup-sms-auto.mjs <DATABASE_URL>');
    log.info('Or set VITE_DATABASE_URL in your .env file');
    log.warning('\nExample:');
    console.log('  node setup-sms-auto.mjs "postgresql://user:pass@host/db"');
    process.exit(1);
  }

  log.info(`Connecting to database...`);
  const sql = neon(DATABASE_URL);

  try {
    // Step 1: Find a valid user_id
    log.step('\n📍 Step 1: Finding valid user_id...');
    
    let userId = null;

    // Try from customers table
    try {
      const customers = await sql`
        SELECT DISTINCT created_by as user_id
        FROM lats_pos_customers
        WHERE created_by IS NOT NULL
        LIMIT 1
      `;
      if (customers.length > 0 && customers[0].user_id) {
        userId = customers[0].user_id;
        log.success(`Found user_id from customers table: ${userId}`);
      }
    } catch (err) {
      log.warning('Could not find user_id from customers table');
    }

    // Try from sales table if not found
    if (!userId) {
      try {
        const sales = await sql`
          SELECT DISTINCT sold_by as user_id
          FROM lats_pos_sales
          WHERE sold_by IS NOT NULL
          LIMIT 1
        `;
        if (sales.length > 0 && sales[0].user_id) {
          userId = sales[0].user_id;
          log.success(`Found user_id from sales table: ${userId}`);
        }
      } catch (err) {
        log.warning('Could not find user_id from sales table');
      }
    }

    // Try from devices table if not found
    if (!userId) {
      try {
        const devices = await sql`
          SELECT DISTINCT received_by as user_id
          FROM lats_pos_devices
          WHERE received_by IS NOT NULL
          LIMIT 1
        `;
        if (devices.length > 0 && devices[0].user_id) {
          userId = devices[0].user_id;
          log.success(`Found user_id from devices table: ${userId}`);
        }
      } catch (err) {
        log.warning('Could not find user_id from devices table');
      }
    }

    // Try from existing integrations
    if (!userId) {
      try {
        const integrations = await sql`
          SELECT DISTINCT user_id
          FROM lats_pos_integrations_settings
          WHERE user_id IS NOT NULL
          LIMIT 1
        `;
        if (integrations.length > 0 && integrations[0].user_id) {
          userId = integrations[0].user_id;
          log.success(`Found user_id from integrations table: ${userId}`);
        }
      } catch (err) {
        log.warning('Could not find user_id from integrations table');
      }
    }

    if (!userId) {
      log.error('Could not find any valid user_id in the database!');
      log.info('Please create a user first or manually specify a user_id');
      process.exit(1);
    }

    // Step 2: Insert SMS Configuration
    log.step('\n🔧 Step 2: Configuring SMS Gateway...');
    
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
      ON CONFLICT (user_id, business_id, integration_name) 
      DO UPDATE SET
        credentials = EXCLUDED.credentials,
        config = EXCLUDED.config,
        is_enabled = true,
        is_active = true,
        updated_at = NOW()
    `;

    log.success('SMS Gateway configuration inserted successfully!');

    // Step 3: Verify the configuration
    log.step('\n✅ Step 3: Verifying configuration...');
    
    const verification = await sql`
      SELECT 
        integration_name,
        provider_name,
        is_enabled,
        is_active,
        environment,
        credentials->>'api_key' as username,
        credentials->>'sender_id' as sender_id,
        config->>'api_url' as api_url
      FROM lats_pos_integrations_settings
      WHERE integration_name = 'SMS_GATEWAY'
    `;

    if (verification.length > 0) {
      const config = verification[0];
      log.success('SMS Gateway is configured!');
      console.log('\n' + '─'.repeat(60));
      log.info(`Provider: ${config.provider_name}`);
      log.info(`Username: ${config.username}`);
      log.info(`Sender ID: ${config.sender_id}`);
      log.info(`API URL: ${config.api_url}`);
      log.info(`Status: ${config.is_enabled ? 'Enabled' : 'Disabled'}`);
      log.info(`Environment: ${config.environment}`);
      console.log('─'.repeat(60));
    } else {
      log.warning('Could not verify SMS configuration');
    }

    // Final message
    log.title('\n🎉 SETUP COMPLETE!');
    console.log('━'.repeat(60));
    log.success('SMS Gateway is ready to use!');
    log.info('Next steps:');
    console.log('  1. Refresh your POS application (Cmd/Ctrl + Shift + R)');
    console.log('  2. Check browser console for: "✅ SMS service initialized"');
    console.log('  3. Try sending an SMS from customer details!');
    console.log('\n');

  } catch (error) {
    log.error(`Setup failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

main().catch(console.error);

