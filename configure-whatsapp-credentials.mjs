#!/usr/bin/env node

/**
 * Quick WhatsApp Configuration Script
 * Adds WasenderAPI credentials directly to the database
 */

import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';

// Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

// Get database URL from environment
const dbUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!dbUrl) {
  console.error(`${colors.red}❌ DATABASE_URL not found in environment${colors.reset}`);
  console.log('\nPlease set VITE_DATABASE_URL in your .env file or run:');
  console.log('DATABASE_URL=your_connection_string node configure-whatsapp-credentials.mjs');
  process.exit(1);
}

const supabase = createClient(dbUrl, 'dummy-key'); // Using direct connection

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function configureWhatsApp() {
  console.log(`
${colors.cyan}╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║          WhatsApp Configuration Script                       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝${colors.reset}
`);

  console.log(`${colors.blue}ℹ${colors.reset}  This script will configure WasenderAPI credentials in your database.\n`);

  // Get credentials
  const apiKey = await question(`${colors.yellow}Enter your API Key (Bearer Token): ${colors.reset}`);
  
  if (!apiKey || apiKey.trim().length === 0) {
    console.log(`${colors.red}❌ API Key is required${colors.reset}`);
    rl.close();
    process.exit(1);
  }

  const sessionId = await question(`${colors.yellow}Enter your WhatsApp Session ID: ${colors.reset}`);
  
  if (!sessionId || sessionId.trim().length === 0) {
    console.log(`${colors.red}❌ Session ID is required${colors.reset}`);
    rl.close();
    process.exit(1);
  }

  const apiUrl = await question(`${colors.yellow}API Base URL (press Enter for default): ${colors.reset}`) || 'https://wasenderapi.com/api';

  console.log(`\n${colors.blue}ℹ${colors.reset}  Configuring WhatsApp integration...`);

  try {
    // Connect to database using pg
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: dbUrl });

    // Check if integration exists
    const checkResult = await pool.query(`
      SELECT id, integration_name FROM lats_pos_integrations_settings
      WHERE integration_name = 'WHATSAPP_WASENDER'
    `);

    const credentials = {
      api_key: apiKey.trim(),
      bearer_token: apiKey.trim(),
      session_id: sessionId.trim(),
      whatsapp_session: sessionId.trim()
    };

    const config = {
      api_url: apiUrl.trim()
    };

    if (checkResult.rows.length > 0) {
      // Update existing integration
      console.log(`${colors.blue}ℹ${colors.reset}  Updating existing WhatsApp integration...`);
      
      await pool.query(`
        UPDATE lats_pos_integrations_settings
        SET 
          credentials = $1::jsonb,
          config = $2::jsonb,
          is_enabled = true,
          is_active = true,
          updated_at = NOW()
        WHERE integration_name = 'WHATSAPP_WASENDER'
      `, [JSON.stringify(credentials), JSON.stringify(config)]);

      console.log(`${colors.green}✅ WhatsApp integration updated successfully!${colors.reset}`);
    } else {
      // Insert new integration
      console.log(`${colors.blue}ℹ${colors.reset}  Creating new WhatsApp integration...`);
      
      await pool.query(`
        INSERT INTO lats_pos_integrations_settings (
          integration_name,
          integration_type,
          provider_name,
          is_enabled,
          is_active,
          is_test_mode,
          credentials,
          config,
          description,
          environment,
          created_at,
          updated_at
        ) VALUES (
          'WHATSAPP_WASENDER',
          'whatsapp',
          'WasenderAPI',
          true,
          true,
          false,
          $1::jsonb,
          $2::jsonb,
          'Send WhatsApp messages, receipts, and media via WasenderAPI',
          'production',
          NOW(),
          NOW()
        )
      `, [JSON.stringify(credentials), JSON.stringify(config)]);

      console.log(`${colors.green}✅ WhatsApp integration created successfully!${colors.reset}`);
    }

    await pool.end();

    // Show summary
    console.log(`
${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}

${colors.green}✅ Configuration Summary${colors.reset}

  Integration: WasenderAPI
  Status: ENABLED
  API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}
  Session ID: ${sessionId.substring(0, 10)}...${sessionId.substring(sessionId.length - 4)}
  API URL: ${apiUrl}

${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}

${colors.green}🚀 Next Steps:${colors.reset}

1. Refresh your NEON POS application
2. Go to Customers page
3. Click on any customer
4. Click the green "WhatsApp" button
5. Send a test message!

${colors.blue}ℹ${colors.reset}  You can verify the configuration by running:
   node check-whatsapp-status.mjs

${colors.green}✨ WhatsApp is now ready to use!${colors.reset}
`);

  } catch (error) {
    console.error(`${colors.red}❌ Error configuring WhatsApp:${colors.reset}`, error.message);
    console.error(error);
    process.exit(1);
  }

  rl.close();
}

configureWhatsApp();

