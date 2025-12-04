#!/usr/bin/env node

/**
 * Configure WhatsApp Integration
 * Run this script with your WasenderAPI credentials
 */

import { config } from 'dotenv';
config();

// INSTRUCTIONS:
// 1. Go to https://wasenderapi.com/login
// 2. Login to your account
// 3. Navigate to your WhatsApp session
// 4. Copy your API Key (Bearer Token) and Session ID
// 5. Update the values below:

// ============================================================
// TODO: UPDATE THESE VALUES WITH YOUR WASENDERAPI CREDENTIALS
// ============================================================

const YOUR_API_KEY = 'PASTE_YOUR_API_KEY_HERE';  // Get from https://wasenderapi.com
const YOUR_SESSION_ID = '37637';  // Your session ID

// ============================================================

const dbUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ DATABASE_URL not found in .env file');
  process.exit(1);
}

if (YOUR_API_KEY === 'PASTE_YOUR_API_KEY_HERE') {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║          Configure WhatsApp Integration                      ║
╚══════════════════════════════════════════════════════════════╝

📋 INSTRUCTIONS:

1. Login to WasenderAPI:
   👉 https://wasenderapi.com/login

2. Navigate to your session:
   👉 https://wasenderapi.com/whatsapp/manage/37637

3. Copy your API Key (Bearer Token):
   - Look for "API Key" or "Bearer Token"
   - Click "Copy" or select and copy the key
   - It should look like: f864609fa10f4062f5ce346b1bfe830ae49ca286226e0462c65b1a550b2a29d2

4. Update this script:
   - Open: configure-whatsapp-now.mjs
   - Line 18: Replace 'PASTE_YOUR_API_KEY_HERE' with your actual API key
   - Line 19: Verify session ID is '37637'

5. Run the script again:
   node configure-whatsapp-now.mjs

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
  process.exit(0);
}

async function configure() {
  console.log('\n🔧 Configuring WhatsApp Integration...\n');

  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: dbUrl });

    const credentials = {
      api_key: YOUR_API_KEY.trim(),
      bearer_token: YOUR_API_KEY.trim(),
      session_id: YOUR_SESSION_ID.trim(),
      whatsapp_session: YOUR_SESSION_ID.trim()
    };

    const config = {
      api_url: 'https://wasenderapi.com/api'
    };

    console.log('📝 Configuration:');
    console.log('   API Key:', YOUR_API_KEY.substring(0, 8) + '...' + YOUR_API_KEY.substring(YOUR_API_KEY.length - 4));
    console.log('   Session ID:', YOUR_SESSION_ID);
    console.log('   API URL:', config.api_url);
    console.log('');

    // Check if configuration exists
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
      console.log('✅ Configuration verified:');
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

🚀 Next Steps:

1. Refresh your browser:
   - Press Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
   - Or close and reopen the browser tab

2. Test the integration:
   a) Navigate to: http://localhost:5173/customers
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
    process.exit(1);
  }
}

configure();

