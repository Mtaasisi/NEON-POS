#!/usr/bin/env node

/**
 * Quick WhatsApp Configuration - No Prompts
 * Configure with provided credentials
 */

import { config } from 'dotenv';
config();

// Get database URL from environment
const dbUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ DATABASE_URL not found');
  console.log('\nSet it in .env file or run with:');
  console.log('DATABASE_URL=your_url node quick-configure-whatsapp.mjs YOUR_API_KEY YOUR_SESSION_ID');
  process.exit(1);
}

// Get credentials from command line arguments
const apiKey = process.argv[2];
const sessionId = process.argv[3];

if (!apiKey || !sessionId) {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║          Quick WhatsApp Configuration                        ║
╚══════════════════════════════════════════════════════════════╝

Usage:
  node quick-configure-whatsapp.mjs YOUR_API_KEY YOUR_SESSION_ID

Example:
  node quick-configure-whatsapp.mjs f864609fa10f... session_12345

Get your Session ID from:
  1. Login to https://wasenderapi.com
  2. Go to "Sessions" or "My Sessions"
  3. Copy your Session ID
  4. Run this script with both credentials

Need help? Check CONFIGURE_WHATSAPP_NOW.md
`);
  process.exit(1);
}

async function configure() {
  console.log('\n🔧 Configuring WhatsApp...\n');

  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: dbUrl });

    const credentials = {
      api_key: apiKey.trim(),
      bearer_token: apiKey.trim(),
      session_id: sessionId.trim(),
      whatsapp_session: sessionId.trim()
    };

    const config = {
      api_url: 'https://wasenderapi.com/api'
    };

    // Check if exists
    const checkResult = await pool.query(`
      SELECT id FROM lats_pos_integrations_settings
      WHERE integration_name = 'WHATSAPP_WASENDER'
    `);

    if (checkResult.rows.length > 0) {
      // Update
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
      console.log('✅ WhatsApp configuration UPDATED');
    } else {
      // Get a user ID (any admin user)
      const userResult = await pool.query(`
        SELECT id FROM users WHERE role = 'admin' OR role = 'owner' LIMIT 1
      `);
      
      const userId = userResult.rows.length > 0 ? userResult.rows[0].id : null;
      
      // Insert
      await pool.query(`
        INSERT INTO lats_pos_integrations_settings (
          user_id,
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
          $1,
          'WHATSAPP_WASENDER',
          'whatsapp',
          'WasenderAPI',
          true,
          true,
          false,
          $2::jsonb,
          $3::jsonb,
          'Send WhatsApp messages via WasenderAPI',
          'production',
          NOW(),
          NOW()
        )
      `, [userId, JSON.stringify(credentials), JSON.stringify(config)]);
      console.log('✅ WhatsApp configuration CREATED');
    }

    await pool.end();

    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Configuration Complete!

  Integration: WasenderAPI
  Status: ENABLED ✓
  API Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}
  Session ID: ${sessionId.substring(0, 8)}...${sessionId.substring(sessionId.length - 4)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 Next Steps:

1. Refresh your NEON POS (Cmd+Shift+R or Ctrl+Shift+R)
2. Go to Customers page
3. Click any customer
4. Click green "WhatsApp" button
5. Send a message - it will work now! ✅

Verify: node check-whatsapp-status.mjs

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

configure();

