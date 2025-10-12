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

async function importWhatsAppData() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting WhatsApp data import...\n');
    
    // Load backup file
    console.log('📂 Loading backup file...');
    const backupPath = '/Users/mtaasisi/Downloads/database-backup-2025-10-01T22-09-09-482Z.json';
    const backup = JSON.parse(await readFile(backupPath, 'utf-8'));
    
    console.log(`✅ Backup loaded: ${backup.databaseInfo.totalTables} tables found\n`);
    
    await client.query('BEGIN');
    
    // 1. Import WhatsApp Templates
    console.log('📋 Importing WhatsApp Templates...');
    const whatsappTemplates = backup.tables.whatsapp_templates?.data || [];
    
    if (whatsappTemplates.length > 0) {
      // Check if table exists
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'whatsapp_templates'
        );
      `);
      
      if (!tableCheck.rows[0].exists) {
        console.log('  Creating whatsapp_templates table...');
        await client.query(`
          CREATE TABLE whatsapp_templates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            category TEXT,
            template TEXT NOT NULL,
            variables TEXT[],
            language TEXT DEFAULT 'both',
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);
      }
      
      // Clear existing data
      await client.query('DELETE FROM whatsapp_templates');
      
      for (const template of whatsappTemplates) {
        await client.query(`
          INSERT INTO whatsapp_templates (
            id, name, category, template, variables, language, is_active, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            category = EXCLUDED.category,
            template = EXCLUDED.template,
            variables = EXCLUDED.variables,
            language = EXCLUDED.language,
            is_active = EXCLUDED.is_active,
            updated_at = EXCLUDED.updated_at
        `, [
          template.id,
          template.name,
          template.category,
          template.template,
          template.variables,
          template.language,
          template.is_active,
          template.created_at,
          template.updated_at
        ]);
      }
      console.log(`  ✅ Imported ${whatsappTemplates.length} templates\n`);
    } else {
      console.log('  ⚠️  No templates found in backup\n');
    }
    
    // 2. Import WhatsApp Message Templates
    console.log('📨 Importing WhatsApp Message Templates...');
    const messageTemplates = backup.tables.whatsapp_message_templates?.data || [];
    
    if (messageTemplates.length > 0) {
      // Check if table exists
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'whatsapp_message_templates'
        );
      `);
      
      if (!tableCheck.rows[0].exists) {
        console.log('  Creating whatsapp_message_templates table...');
        await client.query(`
          CREATE TABLE whatsapp_message_templates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            template_text TEXT NOT NULL,
            variables JSONB DEFAULT '[]'::jsonb,
            category TEXT,
            language TEXT DEFAULT 'en',
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);
      }
      
      // Clear existing data
      await client.query('DELETE FROM whatsapp_message_templates');
      
      for (const template of messageTemplates) {
        await client.query(`
          INSERT INTO whatsapp_message_templates (
            id, name, template_text, variables, category, language, is_active, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            template_text = EXCLUDED.template_text,
            variables = EXCLUDED.variables,
            category = EXCLUDED.category,
            language = EXCLUDED.language,
            is_active = EXCLUDED.is_active,
            updated_at = EXCLUDED.updated_at
        `, [
          template.id,
          template.name,
          template.template_text,
          JSON.stringify(template.variables || []),
          template.category,
          template.language || 'en',
          template.is_active !== false,
          template.created_at,
          template.updated_at
        ]);
      }
      console.log(`  ✅ Imported ${messageTemplates.length} message templates\n`);
    } else {
      console.log('  ⚠️  No message templates found in backup\n');
    }
    
    // 3. Import WhatsApp Campaigns
    console.log('🎯 Importing WhatsApp Campaigns...');
    const campaigns = backup.tables.whatsapp_campaigns?.data || [];
    
    if (campaigns.length > 0) {
      // Check if table exists
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'whatsapp_campaigns'
        );
      `);
      
      if (!tableCheck.rows[0].exists) {
        console.log('  Creating whatsapp_campaigns table...');
        await client.query(`
          CREATE TABLE whatsapp_campaigns (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            template_id UUID,
            status TEXT DEFAULT 'draft',
            scheduled_at TIMESTAMPTZ,
            sent_at TIMESTAMPTZ,
            target_count INTEGER DEFAULT 0,
            sent_count INTEGER DEFAULT 0,
            failed_count INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);
      }
      
      // Clear existing data
      await client.query('DELETE FROM whatsapp_campaigns');
      
      for (const campaign of campaigns) {
        await client.query(`
          INSERT INTO whatsapp_campaigns (
            id, name, template_id, status, scheduled_at, sent_at,
            target_count, sent_count, failed_count, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            template_id = EXCLUDED.template_id,
            status = EXCLUDED.status,
            scheduled_at = EXCLUDED.scheduled_at,
            sent_at = EXCLUDED.sent_at,
            target_count = EXCLUDED.target_count,
            sent_count = EXCLUDED.sent_count,
            failed_count = EXCLUDED.failed_count,
            updated_at = EXCLUDED.updated_at
        `, [
          campaign.id,
          campaign.name,
          campaign.template_id,
          campaign.status || 'draft',
          campaign.scheduled_at,
          campaign.sent_at,
          campaign.target_count || 0,
          campaign.sent_count || 0,
          campaign.failed_count || 0,
          campaign.created_at,
          campaign.updated_at
        ]);
      }
      console.log(`  ✅ Imported ${campaigns.length} campaigns\n`);
    } else {
      console.log('  ⚠️  No campaigns found in backup\n');
    }
    
    // 4. Extract and Import WhatsApp Instance Settings from settings table
    console.log('⚙️  Importing WhatsApp Instance Settings...');
    const settingsData = backup.tables.settings?.data || [];
    
    if (settingsData.length > 0) {
      // Check if whatsapp_instance_settings table exists
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'whatsapp_instance_settings'
        );
      `);
      
      if (!tableCheck.rows[0].exists) {
        console.log('  Creating whatsapp_instance_settings table...');
        await client.query(`
          CREATE TABLE whatsapp_instance_settings (
            id SERIAL PRIMARY KEY,
            whatsapp_instance_id INTEGER DEFAULT 0,
            whatsapp_api_url TEXT,
            whatsapp_green_api_key TEXT,
            whatsapp_provider_api_key TEXT,
            whatsapp_provider_username TEXT,
            whatsapp_provider_password TEXT,
            whatsapp_sender_id TEXT,
            whatsapp_notifications_enabled BOOLEAN DEFAULT true,
            whatsapp_enable_auto BOOLEAN DEFAULT true,
            whatsapp_enable_bulk BOOLEAN DEFAULT true,
            whatsapp_test_mode BOOLEAN DEFAULT false,
            whatsapp_daily_limit INTEGER DEFAULT 1000,
            whatsapp_monthly_limit INTEGER DEFAULT 20000,
            whatsapp_price DECIMAL(10, 2) DEFAULT 0,
            whatsapp_default_language TEXT DEFAULT 'en',
            whatsapp_default_template TEXT,
            whatsapp_notification_email TEXT,
            whatsapp_log_retention_days INTEGER DEFAULT 365,
            whatsapp_custom_variables JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);
      }
      
      // Extract WhatsApp settings from settings table
      for (const setting of settingsData) {
        const whatsappSettings = {
          whatsapp_instance_id: setting.whatsapp_instance_id,
          whatsapp_api_url: setting.whatsapp_api_url,
          whatsapp_green_api_key: setting.whatsapp_green_api_key,
          whatsapp_provider_api_key: setting.whatsapp_provider_api_key,
          whatsapp_provider_username: setting.whatsapp_provider_username,
          whatsapp_provider_password: setting.whatsapp_provider_password,
          whatsapp_sender_id: setting.whatsapp_sender_id,
          whatsapp_notifications_enabled: setting.whatsapp_notifications_enabled,
          whatsapp_enable_auto: setting.whatsapp_enable_auto,
          whatsapp_enable_bulk: setting.whatsapp_enable_bulk,
          whatsapp_test_mode: setting.whatsapp_test_mode,
          whatsapp_daily_limit: setting.whatsapp_daily_limit,
          whatsapp_monthly_limit: setting.whatsapp_monthly_limit,
          whatsapp_price: setting.whatsapp_price,
          whatsapp_default_language: setting.whatsapp_default_language,
          whatsapp_default_template: setting.whatsapp_default_template,
          whatsapp_notification_email: setting.whatsapp_notification_email,
          whatsapp_log_retention_days: setting.whatsapp_log_retention_days,
          whatsapp_custom_variables: setting.whatsapp_custom_variables
        };
        
        // Only insert if at least one WhatsApp setting exists
        if (Object.values(whatsappSettings).some(v => v !== undefined && v !== null)) {
          // Check if a record already exists
          const existingCheck = await client.query(
            'SELECT id FROM whatsapp_instance_settings LIMIT 1'
          );
          
          if (existingCheck.rows.length > 0) {
            // Update existing record
            await client.query(`
              UPDATE whatsapp_instance_settings SET
                whatsapp_instance_id = COALESCE($1, whatsapp_instance_id),
                whatsapp_api_url = COALESCE($2, whatsapp_api_url),
                whatsapp_green_api_key = COALESCE($3, whatsapp_green_api_key),
                whatsapp_provider_api_key = COALESCE($4, whatsapp_provider_api_key),
                whatsapp_provider_username = COALESCE($5, whatsapp_provider_username),
                whatsapp_provider_password = COALESCE($6, whatsapp_provider_password),
                whatsapp_sender_id = COALESCE($7, whatsapp_sender_id),
                whatsapp_notifications_enabled = COALESCE($8, whatsapp_notifications_enabled),
                whatsapp_enable_auto = COALESCE($9, whatsapp_enable_auto),
                whatsapp_enable_bulk = COALESCE($10, whatsapp_enable_bulk),
                whatsapp_test_mode = COALESCE($11, whatsapp_test_mode),
                whatsapp_daily_limit = COALESCE($12, whatsapp_daily_limit),
                whatsapp_monthly_limit = COALESCE($13, whatsapp_monthly_limit),
                whatsapp_price = COALESCE($14, whatsapp_price),
                whatsapp_default_language = COALESCE($15, whatsapp_default_language),
                whatsapp_default_template = COALESCE($16, whatsapp_default_template),
                whatsapp_notification_email = COALESCE($17, whatsapp_notification_email),
                whatsapp_log_retention_days = COALESCE($18, whatsapp_log_retention_days),
                whatsapp_custom_variables = COALESCE($19::jsonb, whatsapp_custom_variables),
                updated_at = NOW()
              WHERE id = $20
            `, [
              whatsappSettings.whatsapp_instance_id,
              whatsappSettings.whatsapp_api_url,
              whatsappSettings.whatsapp_green_api_key,
              whatsappSettings.whatsapp_provider_api_key,
              whatsappSettings.whatsapp_provider_username,
              whatsappSettings.whatsapp_provider_password,
              whatsappSettings.whatsapp_sender_id,
              whatsappSettings.whatsapp_notifications_enabled,
              whatsappSettings.whatsapp_enable_auto,
              whatsappSettings.whatsapp_enable_bulk,
              whatsappSettings.whatsapp_test_mode,
              whatsappSettings.whatsapp_daily_limit,
              whatsappSettings.whatsapp_monthly_limit,
              whatsappSettings.whatsapp_price,
              whatsappSettings.whatsapp_default_language,
              whatsappSettings.whatsapp_default_template,
              whatsappSettings.whatsapp_notification_email,
              whatsappSettings.whatsapp_log_retention_days,
              JSON.stringify(whatsappSettings.whatsapp_custom_variables || {}),
              existingCheck.rows[0].id
            ]);
          } else {
            // Insert new record
            await client.query(`
              INSERT INTO whatsapp_instance_settings (
                whatsapp_instance_id, whatsapp_api_url, whatsapp_green_api_key,
                whatsapp_provider_api_key, whatsapp_provider_username, whatsapp_provider_password,
                whatsapp_sender_id, whatsapp_notifications_enabled, whatsapp_enable_auto,
                whatsapp_enable_bulk, whatsapp_test_mode, whatsapp_daily_limit,
                whatsapp_monthly_limit, whatsapp_price, whatsapp_default_language,
                whatsapp_default_template, whatsapp_notification_email, whatsapp_log_retention_days,
                whatsapp_custom_variables
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            `, [
              whatsappSettings.whatsapp_instance_id || 0,
              whatsappSettings.whatsapp_api_url || '',
              whatsappSettings.whatsapp_green_api_key || '',
              whatsappSettings.whatsapp_provider_api_key || '',
              whatsappSettings.whatsapp_provider_username || '',
              whatsappSettings.whatsapp_provider_password || '',
              whatsappSettings.whatsapp_sender_id || '',
              whatsappSettings.whatsapp_notifications_enabled !== false,
              whatsappSettings.whatsapp_enable_auto !== false,
              whatsappSettings.whatsapp_enable_bulk !== false,
              whatsappSettings.whatsapp_test_mode || false,
              whatsappSettings.whatsapp_daily_limit || 1000,
              whatsappSettings.whatsapp_monthly_limit || 20000,
              whatsappSettings.whatsapp_price || 0,
              whatsappSettings.whatsapp_default_language || 'en',
              whatsappSettings.whatsapp_default_template || '',
              whatsappSettings.whatsapp_notification_email || '',
              whatsappSettings.whatsapp_log_retention_days || 365,
              JSON.stringify(whatsappSettings.whatsapp_custom_variables || {})
            ]);
          }
          
          console.log('  ✅ WhatsApp instance settings imported');
          break; // Only process first settings record
        }
      }
      console.log('');
    } else {
      console.log('  ⚠️  No settings found in backup\n');
    }
    
    await client.query('COMMIT');
    
    // Show summary
    console.log('📊 Import Summary:');
    console.log('═══════════════════════════════════════════\n');
    
    const templatesCount = await client.query('SELECT COUNT(*) FROM whatsapp_templates');
    console.log(`  📋 WhatsApp Templates: ${templatesCount.rows[0].count}`);
    
    const messageTemplatesCount = await client.query('SELECT COUNT(*) FROM whatsapp_message_templates');
    console.log(`  📨 Message Templates: ${messageTemplatesCount.rows[0].count}`);
    
    try {
      const campaignsCount = await client.query('SELECT COUNT(*) FROM whatsapp_campaigns');
      console.log(`  🎯 Campaigns: ${campaignsCount.rows[0].count}`);
    } catch (err) {
      console.log(`  🎯 Campaigns: 0 (table not created)`);
    }
    
    try {
      const instanceSettings = await client.query('SELECT * FROM whatsapp_instance_settings LIMIT 1');
      if (instanceSettings.rows.length > 0) {
        const settings = instanceSettings.rows[0];
        console.log(`  ⚙️  Instance Settings:`);
        console.log(`     - Instance ID: ${settings.whatsapp_instance_id}`);
        console.log(`     - API URL: ${settings.whatsapp_api_url || 'Not set'}`);
        console.log(`     - Notifications: ${settings.whatsapp_notifications_enabled ? 'Enabled' : 'Disabled'}`);
        console.log(`     - Daily Limit: ${settings.whatsapp_daily_limit}`);
        console.log(`     - Monthly Limit: ${settings.whatsapp_monthly_limit}`);
      } else {
        console.log(`  ⚙️  Instance Settings: Not configured`);
      }
    } catch (err) {
      console.log(`  ⚙️  Instance Settings: Not available`);
    }
    
    console.log('\n✅ WhatsApp data import completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error importing WhatsApp data:');
    console.error(error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the import
importWhatsAppData().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

