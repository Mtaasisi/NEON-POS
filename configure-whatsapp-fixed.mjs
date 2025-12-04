#!/usr/bin/env node

/**
 * Configure WhatsApp with Correct Database Connection
 * Uses the working database credentials from webhook.php
 */

// Working database credentials from webhook.php
const DB_HOST = 'ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech';
const DB_NAME = 'neondb';
const DB_USER = 'neondb_owner';
const DB_PASS = 'npg_vABqUKk73tEW';

// Get credentials from command line arguments
const apiKey = process.argv[2];
const sessionId = process.argv[3];

if (!apiKey || !sessionId) {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║          Configure WhatsApp Integration                      ║
╚══════════════════════════════════════════════════════════════╝

Usage:
  node configure-whatsapp-fixed.mjs YOUR_API_KEY YOUR_SESSION_ID

Example:
  node configure-whatsapp-fixed.mjs f864609fa10f... 37637
`);
  process.exit(1);
}

async function configure() {
  console.log('\n🔧 Configuring WhatsApp Integration...\n');

  try {
    const { Pool } = await import('pg');
    
    // Use working database connection
    const connectionString = `postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}/${DB_NAME}?sslmode=require`;
    const pool = new Pool({ connectionString });

    console.log('📝 Configuration:');
    console.log('   API Key:', apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4));
    console.log('   Session ID:', sessionId);
    console.log('   Database:', DB_HOST);
    console.log('');

    const credentials = {
      api_key: apiKey.trim(),
      bearer_token: apiKey.trim(),
      session_id: sessionId.trim(),
      whatsapp_session: sessionId.trim()
    };

    const config = {
      api_url: 'https://wasenderapi.com/api'
    };

    // Check if configuration exists
    console.log('🔍 Checking for existing configuration...');
    const checkResult = await pool.query(`
      SELECT id, is_enabled FROM lats_pos_integrations_settings
      WHERE integration_name = 'WHATSAPP_WASENDER'
    `);

    if (checkResult.rows.length > 0) {
      // Update existing configuration
      console.log('📝 Updating existing configuration...');
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
      console.log('✅ Configuration UPDATED successfully');
    } else {
      // Create new configuration
      console.log('📝 Creating new configuration...');
      
      // Get admin user ID
      const userResult = await pool.query(`
        SELECT id FROM users WHERE role = 'admin' OR role = 'owner' LIMIT 1
      `);
      
      const userId = userResult.rows.length > 0 ? userResult.rows[0].id : null;
      
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
      console.log('✅ Configuration CREATED successfully');
    }

    // Verify the configuration
    console.log('\n🔍 Verifying configuration...');
    const verifyResult = await pool.query(`
      SELECT 
        integration_name,
        provider_name,
        is_enabled,
        is_active,
        credentials,
        config
      FROM lats_pos_integrations_settings
      WHERE integration_name = 'WHATSAPP_WASENDER'
    `);

    if (verifyResult.rows.length > 0) {
      const config = verifyResult.rows[0];
      console.log('\n✅ Configuration verified:');
      console.log('   Integration:', config.integration_name);
      console.log('   Provider:', config.provider_name);
      console.log('   Enabled:', config.is_enabled ? '✓ YES' : '✗ NO');
      console.log('   Active:', config.is_active ? '✓ YES' : '✗ NO');
      console.log('   API Key:', config.credentials.api_key ? '✓ Configured' : '✗ Missing');
      console.log('   Session ID:', config.credentials.session_id ? '✓ Configured' : '✗ Missing');
    }

    await pool.end();

    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ WhatsApp Configuration Complete!

  Integration: WasenderAPI
  Status: ENABLED ✓
  API Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}
  Session ID: ${sessionId}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 Next Steps:

1. Refresh your browser:
   - Press Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
   - Or go to: http://localhost:5173

2. Test the integration:
   a) Navigate to: Customers page
   b) Click on any customer
   c) Click the green "WhatsApp" button
   d) Send a test message
   e) The message should be sent successfully! ✅

3. If you still see an error:
   - Check the browser console (F12) for errors
   - Verify your API key is correct at https://wasenderapi.com
   - Make sure your WhatsApp session is connected

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   - Check your database connection');
    console.error('   - Verify the API key is correct');
    console.error('   - Make sure the database table exists');
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

configure();

