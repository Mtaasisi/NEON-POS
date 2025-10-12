#!/usr/bin/env node

import { readFile } from 'fs/promises';
import pg from 'pg';
const { Pool } = pg;

// Load database configuration
const dbConfig = JSON.parse(
  await readFile('./database-config.json', 'utf-8')
);

const pool = new Pool({
  connectionString: dbConfig.url,
  ssl: { rejectUnauthorized: false }
});

async function verifyWhatsAppData() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verifying WhatsApp Data Import\n');
    console.log('═══════════════════════════════════════════\n');
    
    // Check WhatsApp Templates
    console.log('📋 WhatsApp Templates:');
    console.log('─────────────────────────────────────────\n');
    const templates = await client.query('SELECT * FROM whatsapp_templates ORDER BY created_at');
    
    if (templates.rows.length > 0) {
      templates.rows.forEach((template, index) => {
        console.log(`${index + 1}. ${template.name}`);
        console.log(`   Category: ${template.category}`);
        console.log(`   Language: ${template.language}`);
        console.log(`   Variables: ${template.variables.join(', ')}`);
        console.log(`   Active: ${template.is_active ? 'Yes' : 'No'}`);
        console.log(`   Template: ${template.template.substring(0, 100)}...`);
        console.log('');
      });
    } else {
      console.log('   No templates found\n');
    }
    
    // Check WhatsApp Message Templates
    console.log('📨 WhatsApp Message Templates:');
    console.log('─────────────────────────────────────────\n');
    const messageTemplates = await client.query('SELECT * FROM whatsapp_message_templates ORDER BY created_at');
    
    if (messageTemplates.rows.length > 0) {
      messageTemplates.rows.forEach((template, index) => {
        console.log(`${index + 1}. ${template.name}`);
        console.log(`   Category: ${template.category}`);
        console.log(`   Language: ${template.language}`);
        console.log(`   Variables: ${JSON.parse(template.variables).join(', ')}`);
        console.log(`   Active: ${template.is_active ? 'Yes' : 'No'}`);
        console.log(`   Template Preview: ${template.template.substring(0, 80)}...`);
        console.log('');
      });
    } else {
      console.log('   No message templates found\n');
    }
    
    // Check WhatsApp Campaigns
    try {
      console.log('🎯 WhatsApp Campaigns:');
      console.log('─────────────────────────────────────────\n');
      const campaigns = await client.query('SELECT * FROM whatsapp_campaigns ORDER BY created_at');
      
      if (campaigns.rows.length > 0) {
        campaigns.rows.forEach((campaign, index) => {
          console.log(`${index + 1}. ${campaign.name}`);
          console.log(`   Status: ${campaign.status}`);
          console.log(`   Target Count: ${campaign.target_count}`);
          console.log(`   Sent: ${campaign.sent_count}`);
          console.log(`   Failed: ${campaign.failed_count}`);
          console.log('');
        });
      } else {
        console.log('   No campaigns found\n');
      }
    } catch (err) {
      console.log('   Table does not exist\n');
    }
    
    // Check WhatsApp Instance Settings
    try {
      console.log('⚙️  WhatsApp Instance Settings:');
      console.log('─────────────────────────────────────────\n');
      const settings = await client.query('SELECT * FROM whatsapp_instance_settings LIMIT 1');
      
      if (settings.rows.length > 0) {
        const setting = settings.rows[0];
        console.log(`   Instance ID: ${setting.whatsapp_instance_id}`);
        console.log(`   API URL: ${setting.whatsapp_api_url || 'Not configured'}`);
        console.log(`   Provider API Key: ${setting.whatsapp_provider_api_key ? '***configured***' : 'Not set'}`);
        console.log(`   Green API Key: ${setting.whatsapp_green_api_key ? '***configured***' : 'Not set'}`);
        console.log(`   Sender ID: ${setting.whatsapp_sender_id || 'Not set'}`);
        console.log(`   Notifications: ${setting.whatsapp_notifications_enabled ? 'Enabled' : 'Disabled'}`);
        console.log(`   Auto Send: ${setting.whatsapp_enable_auto ? 'Enabled' : 'Disabled'}`);
        console.log(`   Bulk Send: ${setting.whatsapp_enable_bulk ? 'Enabled' : 'Disabled'}`);
        console.log(`   Test Mode: ${setting.whatsapp_test_mode ? 'Yes' : 'No'}`);
        console.log(`   Daily Limit: ${setting.whatsapp_daily_limit}`);
        console.log(`   Monthly Limit: ${setting.whatsapp_monthly_limit}`);
        console.log(`   Price per Message: $${setting.whatsapp_price}`);
        console.log(`   Default Language: ${setting.whatsapp_default_language}`);
        console.log(`   Log Retention: ${setting.whatsapp_log_retention_days} days`);
        console.log('');
      } else {
        console.log('   No instance settings configured yet\n');
      }
    } catch (err) {
      console.log('   Table does not exist\n');
    }
    
    console.log('═══════════════════════════════════════════');
    console.log('✅ Verification Complete!\n');
    
  } catch (error) {
    console.error('❌ Error verifying WhatsApp data:');
    console.error(error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run verification
verifyWhatsAppData().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

