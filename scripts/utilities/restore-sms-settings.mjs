#!/usr/bin/env node

/**
 * Restore SMS Settings from Backup
 * 
 * This script copies ONLY the SMS settings from the backup file
 * and inserts/updates them in your current database.
 * 
 * Usage: node restore-sms-settings.mjs
 */

import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load database connection string from .env file
const envPath = join(__dirname, '.env');
let connectionString = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!connectionString) {
  try {
    const envContent = readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n');
    for (const line of envLines) {
      if (line.startsWith('DATABASE_URL=')) {
        connectionString = line.split('=')[1].trim().replace(/['"]/g, '');
      } else if (line.startsWith('VITE_DATABASE_URL=')) {
        connectionString = line.split('=')[1].trim().replace(/['"]/g, '');
      }
    }
  } catch (error) {
    console.error('❌ Could not load environment variables from .env file');
    console.error('   Error:', error.message);
  }
}

if (!connectionString) {
  console.error('❌ Error: Missing database connection string');
  console.error('   Please ensure DATABASE_URL or VITE_DATABASE_URL is set in your .env file');
  process.exit(1);
}

async function restoreSMSSettings() {
  console.log('🔄 Starting SMS Settings Restore...\n');

  // Ensure SSL is enabled in connection string
  let finalConnectionString = connectionString;
  if (!finalConnectionString.includes('sslmode=')) {
    finalConnectionString += (finalConnectionString.includes('?') ? '&' : '?') + 'sslmode=require';
  }

  const client = new Client({ 
    connectionString: finalConnectionString,
    ssl: { rejectUnauthorized: false } // Neon requires SSL but allows self-signed certs
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // First, check what user_id to use (we'll need it for integrations table)
    // Get the first user_id from the integrations table or use a common one
    const userCheckResult = await client.query(`
      SELECT user_id FROM lats_pos_integrations_settings 
      WHERE integration_name = 'SMS_GATEWAY' 
      LIMIT 1
    `);
    
    let userId = null;
    if (userCheckResult.rows.length > 0) {
      userId = userCheckResult.rows[0].user_id;
      console.log(`✅ Found existing user_id: ${userId}`);
    } else {
      // Try to get a user_id from the general settings table
      const generalSettingsResult = await client.query(`
        SELECT user_id FROM lats_pos_general_settings LIMIT 1
      `);
      if (generalSettingsResult.rows.length > 0) {
        userId = generalSettingsResult.rows[0].user_id;
        console.log(`✅ Found user_id from general settings: ${userId}`);
      } else {
        console.warn('⚠️  No user_id found. Will try to restore without it.');
      }
    }

    // SMS integration settings from backup
    const smsIntegration = {
      integration_name: 'SMS_GATEWAY',
      integration_type: 'sms',
      provider_name: 'MShastra',
      is_enabled: true,
      is_active: true,
      is_test_mode: false,
      credentials: {
        api_key: 'Inauzwa',
        sender_id: 'INAUZWA',
        api_password: '@Masika10'
      },
      config: {
        api_url: 'https://mshastra.com/sendurl.aspx',
        timeout: 30000,
        priority: 'High',
        max_retries: 3,
        country_code: 'ALL'
      },
      description: 'MShastra SMS Gateway - Inauzwa',
      environment: 'production'
    };

    console.log('📋 SMS Integration to restore:');
    console.log(`   - Integration: ${smsIntegration.integration_name}`);
    console.log(`   - Provider: ${smsIntegration.provider_name}`);
    console.log(`   - API Key: ${smsIntegration.credentials.api_key}`);
    console.log(`   - API URL: ${smsIntegration.config.api_url}`);
    console.log(`   - Password: ${smsIntegration.credentials.api_password ? '***' : 'Missing'}`);
    console.log('');

    // Start transaction
    await client.query('BEGIN');

    let successCount = 0;
    let errorCount = 0;

    try {
      // Check if SMS_GATEWAY already exists
      const existingCheck = await client.query(`
        SELECT id FROM lats_pos_integrations_settings 
        WHERE integration_name = $1 ${userId ? 'AND user_id = $2' : ''}
        LIMIT 1
      `, userId ? [smsIntegration.integration_name, userId] : [smsIntegration.integration_name]);

      let integrationResult;
      if (existingCheck.rows.length > 0) {
        // Update existing record
        const updateQuery = userId
          ? `
            UPDATE lats_pos_integrations_settings SET
              integration_type = $3,
              provider_name = $4,
              is_enabled = $5,
              is_active = $6,
              is_test_mode = $7,
              credentials = $8,
              config = $9,
              description = $10,
              environment = $11,
              updated_at = NOW()
            WHERE integration_name = $1 AND user_id = $2
            RETURNING integration_name
          `
          : `
            UPDATE lats_pos_integrations_settings SET
              integration_type = $2,
              provider_name = $3,
              is_enabled = $4,
              is_active = $5,
              is_test_mode = $6,
              credentials = $7,
              config = $8,
              description = $9,
              environment = $10,
              updated_at = NOW()
            WHERE integration_name = $1
            RETURNING integration_name
          `;

        const updateParams = userId
          ? [
              smsIntegration.integration_name,
              userId,
              smsIntegration.integration_type,
              smsIntegration.provider_name,
              smsIntegration.is_enabled,
              smsIntegration.is_active,
              smsIntegration.is_test_mode,
              JSON.stringify(smsIntegration.credentials),
              JSON.stringify(smsIntegration.config),
              smsIntegration.description,
              smsIntegration.environment
            ]
          : [
              smsIntegration.integration_name,
              smsIntegration.integration_type,
              smsIntegration.provider_name,
              smsIntegration.is_enabled,
              smsIntegration.is_active,
              smsIntegration.is_test_mode,
              JSON.stringify(smsIntegration.credentials),
              JSON.stringify(smsIntegration.config),
              smsIntegration.description,
              smsIntegration.environment
            ];

        integrationResult = await client.query(updateQuery, updateParams);
      } else {
        // Insert new record
        const insertQuery = userId 
          ? `
            INSERT INTO lats_pos_integrations_settings (
              user_id, integration_name, integration_type, provider_name,
              is_enabled, is_active, is_test_mode, credentials, config,
              description, environment, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
            RETURNING integration_name
          `
          : `
            INSERT INTO lats_pos_integrations_settings (
              integration_name, integration_type, provider_name,
              is_enabled, is_active, is_test_mode, credentials, config,
              description, environment, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
            RETURNING integration_name
          `;

        const insertParams = userId
          ? [
              userId,
              smsIntegration.integration_name,
              smsIntegration.integration_type,
              smsIntegration.provider_name,
              smsIntegration.is_enabled,
              smsIntegration.is_active,
              smsIntegration.is_test_mode,
              JSON.stringify(smsIntegration.credentials),
              JSON.stringify(smsIntegration.config),
              smsIntegration.description,
              smsIntegration.environment
            ]
          : [
              smsIntegration.integration_name,
              smsIntegration.integration_type,
              smsIntegration.provider_name,
              smsIntegration.is_enabled,
              smsIntegration.is_active,
              smsIntegration.is_test_mode,
              JSON.stringify(smsIntegration.credentials),
              JSON.stringify(smsIntegration.config),
              smsIntegration.description,
              smsIntegration.environment
            ];

        integrationResult = await client.query(insertQuery, insertParams);
      }

      if (integrationResult.rows.length > 0) {
        console.log(`✅ Successfully restored SMS integration: ${integrationResult.rows[0].integration_name}`);
        successCount++;
      } else {
        console.error(`❌ Failed to restore SMS integration: No rows returned`);
        errorCount++;
      }

      // Also restore to settings table for backward compatibility (optional)
      const settingsToRestore = [
        {
          key: 'sms_api_url',
          value: smsIntegration.config.api_url,
          description: 'SMS provider API URL'
        },
        {
          key: 'sms_provider_api_key',
          value: smsIntegration.credentials.api_key,
          description: 'API key for SMS provider'
        },
        {
          key: 'sms_provider_password',
          value: smsIntegration.credentials.api_password,
          description: 'SMS provider password'
        }
      ];

      for (const setting of settingsToRestore) {
        try {
          const result = await client.query(`
            INSERT INTO settings (key, value, description, created_at, updated_at)
            VALUES ($1, $2, $3, NOW(), NOW())
            ON CONFLICT (key) DO UPDATE SET
              value = EXCLUDED.value,
              description = EXCLUDED.description,
              updated_at = NOW()
            RETURNING key
          `, [setting.key, setting.value, setting.description]);

          if (result.rows.length > 0) {
            console.log(`✅ Also restored to settings table: ${setting.key}`);
          }
        } catch (err) {
          console.warn(`⚠️  Could not restore ${setting.key} to settings table:`, err.message);
        }
      }
    } catch (err) {
      console.error(`❌ Exception while restoring SMS integration:`, err.message);
      errorCount++;
    }

    // Commit transaction if all successful, otherwise rollback
    if (errorCount === 0) {
      await client.query('COMMIT');
      console.log('\n✅ Transaction committed successfully');
    } else {
      await client.query('ROLLBACK');
      console.log('\n⚠️  Transaction rolled back due to errors');
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Restore Summary:');
    console.log(`   ✅ Successfully restored: ${successCount} integration${successCount !== 1 ? 's' : ''}`);
    if (errorCount > 0) {
      console.log(`   ❌ Errors: ${errorCount}`);
    }
    console.log('='.repeat(50) + '\n');

    if (successCount > 0) {
      console.log('🎉 SMS integration restored successfully!');
      console.log('\n💡 Your SMS configuration should now work correctly.');
      console.log('   The SMS service reads from the integrations table, which has been updated.');
      console.log('   Try processing a sale to verify SMS notifications work.\n');
      return true;
    } else {
      console.log('❌ Failed to restore SMS integration. Please check the errors above.\n');
      return false;
    }

  } catch (error) {
    console.error('❌ Fatal error during restore:', error.message || error);
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        // Ignore rollback errors
      }
    }
    return false;
  } finally {
    if (client) {
      try {
        await client.end();
        console.log('🔌 Database connection closed');
      } catch (closeError) {
        // Ignore close errors
      }
    }
  }
}

// Run the restore
restoreSMSSettings()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });

