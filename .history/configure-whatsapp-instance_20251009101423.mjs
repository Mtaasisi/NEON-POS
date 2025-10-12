#!/usr/bin/env node

import { readFile } from 'fs/promises';
import pg from 'pg';
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

const { Pool } = pg;

// Load database configuration
const dbConfig = JSON.parse(
  await readFile('./database-config.json', 'utf-8')
);

const pool = new Pool({
  connectionString: dbConfig.url,
  ssl: { rejectUnauthorized: false }
});

const rl = readline.createInterface({ input, output });

async function configureWhatsAppInstance() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 WhatsApp Instance Configuration\n');
    console.log('═══════════════════════════════════════════\n');
    
    // Check if settings already exist
    const existingSettings = await client.query(
      'SELECT * FROM whatsapp_instance_settings LIMIT 1'
    );
    
    if (existingSettings.rows.length > 0) {
      console.log('⚠️  WhatsApp instance settings already exist!\n');
      console.log('Current settings:');
      const current = existingSettings.rows[0];
      console.log(`  Instance ID: ${current.whatsapp_instance_id}`);
      console.log(`  API URL: ${current.whatsapp_api_url || 'Not set'}`);
      console.log(`  Notifications: ${current.whatsapp_notifications_enabled ? 'Enabled' : 'Disabled'}\n`);
      
      const overwrite = await rl.question('Do you want to update these settings? (y/n): ');
      if (overwrite.toLowerCase() !== 'y') {
        console.log('\n❌ Configuration cancelled.');
        rl.close();
        return;
      }
      console.log('');
    }
    
    // Collect configuration
    console.log('Please provide your WhatsApp instance details:\n');
    
    const instanceId = await rl.question('WhatsApp Instance ID (e.g., 12345): ');
    const apiUrl = await rl.question('API URL (e.g., https://api.green-api.com): ');
    const greenApiKey = await rl.question('Green API Key (leave empty if not using Green API): ');
    const providerApiKey = await rl.question('Provider API Key: ');
    const senderId = await rl.question('Sender ID / Phone Number (e.g., +255123456789): ');
    
    console.log('\nOptional settings (press Enter to use defaults):');
    const dailyLimitInput = await rl.question('Daily message limit (default: 1000): ');
    const monthlyLimitInput = await rl.question('Monthly message limit (default: 20000): ');
    const testModeInput = await rl.question('Enable test mode? (y/n, default: n): ');
    
    const dailyLimit = dailyLimitInput ? parseInt(dailyLimitInput) : 1000;
    const monthlyLimit = monthlyLimitInput ? parseInt(monthlyLimitInput) : 20000;
    const testMode = testModeInput.toLowerCase() === 'y';
    
    rl.close();
    
    console.log('\n💾 Saving configuration...');
    
    if (existingSettings.rows.length > 0) {
      // Update existing settings
      await client.query(`
        UPDATE whatsapp_instance_settings SET
          whatsapp_instance_id = $1,
          whatsapp_api_url = $2,
          whatsapp_green_api_key = $3,
          whatsapp_provider_api_key = $4,
          whatsapp_sender_id = $5,
          whatsapp_daily_limit = $6,
          whatsapp_monthly_limit = $7,
          whatsapp_test_mode = $8,
          updated_at = NOW()
        WHERE id = $9
      `, [
        parseInt(instanceId) || 0,
        apiUrl,
        greenApiKey,
        providerApiKey,
        senderId,
        dailyLimit,
        monthlyLimit,
        testMode,
        existingSettings.rows[0].id
      ]);
    } else {
      // Insert new settings
      await client.query(`
        INSERT INTO whatsapp_instance_settings (
          whatsapp_instance_id,
          whatsapp_api_url,
          whatsapp_green_api_key,
          whatsapp_provider_api_key,
          whatsapp_sender_id,
          whatsapp_daily_limit,
          whatsapp_monthly_limit,
          whatsapp_test_mode,
          whatsapp_notifications_enabled,
          whatsapp_enable_auto,
          whatsapp_enable_bulk
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, true, true)
      `, [
        parseInt(instanceId) || 0,
        apiUrl,
        greenApiKey,
        providerApiKey,
        senderId,
        dailyLimit,
        monthlyLimit,
        testMode
      ]);
    }
    
    console.log('✅ WhatsApp instance configured successfully!\n');
    
    // Display final configuration
    const finalSettings = await client.query('SELECT * FROM whatsapp_instance_settings LIMIT 1');
    const settings = finalSettings.rows[0];
    
    console.log('📊 Configuration Summary:');
    console.log('═══════════════════════════════════════════');
    console.log(`  Instance ID: ${settings.whatsapp_instance_id}`);
    console.log(`  API URL: ${settings.whatsapp_api_url}`);
    console.log(`  Sender ID: ${settings.whatsapp_sender_id}`);
    console.log(`  Notifications: ${settings.whatsapp_notifications_enabled ? 'Enabled' : 'Disabled'}`);
    console.log(`  Auto Send: ${settings.whatsapp_enable_auto ? 'Enabled' : 'Disabled'}`);
    console.log(`  Bulk Send: ${settings.whatsapp_enable_bulk ? 'Enabled' : 'Disabled'}`);
    console.log(`  Test Mode: ${settings.whatsapp_test_mode ? 'Yes' : 'No'}`);
    console.log(`  Daily Limit: ${settings.whatsapp_daily_limit} messages`);
    console.log(`  Monthly Limit: ${settings.whatsapp_monthly_limit} messages`);
    console.log('═══════════════════════════════════════════\n');
    
    console.log('🎉 Your WhatsApp instance is now ready to use!');
    console.log('\n💡 Next steps:');
    console.log('  1. Test your configuration by sending a test message');
    console.log('  2. Verify your API credentials are working');
    console.log('  3. Check your message templates: node verify-whatsapp-import.mjs');
    
  } catch (error) {
    console.error('❌ Error configuring WhatsApp instance:');
    console.error(error);
    rl.close();
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run configuration
configureWhatsAppInstance().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

