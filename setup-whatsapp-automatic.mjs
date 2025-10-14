#!/usr/bin/env node

/**
 * ============================================
 * AUTOMATIC WHATSAPP DATABASE SETUP
 * ============================================
 * This script automatically sets up all WhatsApp tables and verifies the setup
 */

import pkg from 'pg';
const { Client } = pkg;

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}${colors.bright}${'='.repeat(60)}${colors.reset}`),
  title: (msg) => console.log(`${colors.magenta}${colors.bright}${msg}${colors.reset}`)
};

async function setupWhatsAppDatabase() {
  let client;
  
  try {
    log.section();
    log.title('🚀 AUTOMATIC WHATSAPP DATABASE SETUP');
    log.section();
    
    // Get database URL from environment or use default
    const databaseUrl = process.env.VITE_SUPABASE_URL 
      ? process.env.VITE_SUPABASE_URL.replace('https://', 'postgresql://postgres:') + ':5432/postgres'
      : process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      log.error('Database URL not found!');
      log.info('Please set DATABASE_URL or VITE_SUPABASE_URL in your environment');
      process.exit(1);
    }

    log.info('Connecting to database...');
    client = new Client({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    log.success('Connected to database!');

    // Step 1: Check existing tables
    log.section();
    log.title('📋 STEP 1: Checking Existing Tables');
    log.section();
    
    const checkTablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN (
        'whatsapp_instances',
        'green_api_message_queue',
        'green_api_bulk_campaigns',
        'whatsapp_message_templates',
        'whatsapp_templates',
        'whatsapp_messages'
      )
      ORDER BY table_name;
    `;
    
    const existingTables = await client.query(checkTablesQuery);
    
    if (existingTables.rows.length > 0) {
      log.success(`Found ${existingTables.rows.length} existing WhatsApp tables:`);
      existingTables.rows.forEach(row => {
        log.info(`  - ${row.table_name}`);
      });
    } else {
      log.warning('No WhatsApp tables found. Will create them.');
    }

    // Step 2: Check settings column
    log.section();
    log.title('📋 STEP 2: Checking Settings Column');
    log.section();
    
    const checkSettingsColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'whatsapp_instances' 
      AND column_name = 'settings'
    `);

    const hasSettingsColumn = checkSettingsColumn.rows.length > 0;
    if (hasSettingsColumn) {
      log.success('Settings column exists in whatsapp_instances');
    } else {
      log.warning('Settings column missing in whatsapp_instances');
    }

    // Step 3: Create/Update all tables
    log.section();
    log.title('🔧 STEP 3: Creating/Updating WhatsApp Tables');
    log.section();

    log.info('Creating whatsapp_instances table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_instances (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        instance_id TEXT NOT NULL UNIQUE,
        api_token TEXT NOT NULL,
        instance_name TEXT,
        description TEXT,
        green_api_host TEXT DEFAULT 'https://api.green-api.com',
        green_api_url TEXT,
        state_instance TEXT DEFAULT 'notAuthorized',
        status TEXT DEFAULT 'inactive',
        phone_number TEXT,
        wid TEXT,
        country_instance TEXT,
        type_account TEXT,
        is_active BOOLEAN DEFAULT false,
        last_connected_at TIMESTAMPTZ,
        last_activity_at TIMESTAMPTZ,
        profile_name TEXT,
        profile_picture_url TEXT,
        settings JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    log.success('whatsapp_instances table ready');

    // Add settings column if missing
    if (!hasSettingsColumn) {
      log.info('Adding settings column...');
      await client.query(`
        ALTER TABLE whatsapp_instances 
        ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
      `);
      log.success('Settings column added');
    }

    log.info('Creating message queue table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS green_api_message_queue (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
        phone_number TEXT NOT NULL,
        message TEXT NOT NULL,
        message_type TEXT DEFAULT 'text',
        media_url TEXT,
        status TEXT DEFAULT 'pending',
        error_message TEXT,
        sent_at TIMESTAMPTZ,
        delivered_at TIMESTAMPTZ,
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    log.success('green_api_message_queue table ready');

    log.info('Creating campaigns table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS green_api_bulk_campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
        campaign_name TEXT NOT NULL,
        message_template TEXT NOT NULL,
        recipients JSONB DEFAULT '[]'::jsonb,
        total_recipients INTEGER DEFAULT 0,
        sent_count INTEGER DEFAULT 0,
        delivered_count INTEGER DEFAULT 0,
        failed_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'draft',
        scheduled_at TIMESTAMPTZ,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    log.success('green_api_bulk_campaigns table ready');

    log.info('Creating message templates table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_message_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
        template_name TEXT NOT NULL,
        template_content TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        variables JSONB DEFAULT '[]'::jsonb,
        is_active BOOLEAN DEFAULT true,
        usage_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    log.success('whatsapp_message_templates table ready');

    log.info('Creating templates table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        template_id TEXT UNIQUE,
        template_name TEXT NOT NULL,
        language TEXT DEFAULT 'en',
        category TEXT,
        status TEXT DEFAULT 'active',
        header_text TEXT,
        body_text TEXT,
        footer_text TEXT,
        buttons JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    log.success('whatsapp_templates table ready');

    log.info('Creating messages log table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
        message_id TEXT,
        chat_id TEXT,
        from_number TEXT,
        to_number TEXT,
        message_type TEXT DEFAULT 'text',
        message_content TEXT,
        media_url TEXT,
        status TEXT DEFAULT 'sent',
        is_incoming BOOLEAN DEFAULT false,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        delivered_at TIMESTAMPTZ,
        read_at TIMESTAMPTZ,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    log.success('whatsapp_messages table ready');

    // Step 4: Create indexes
    log.section();
    log.title('🔧 STEP 4: Creating Indexes');
    log.section();

    const indexes = [
      { name: 'idx_whatsapp_instances_user', table: 'whatsapp_instances', column: 'user_id' },
      { name: 'idx_whatsapp_instances_status', table: 'whatsapp_instances', column: 'status' },
      { name: 'idx_whatsapp_instances_state', table: 'whatsapp_instances', column: 'state_instance' },
      { name: 'idx_message_queue_status', table: 'green_api_message_queue', column: 'status' },
      { name: 'idx_campaigns_status', table: 'green_api_bulk_campaigns', column: 'status' },
      { name: 'idx_messages_instance', table: 'whatsapp_messages', column: 'instance_id' },
      { name: 'idx_messages_chat', table: 'whatsapp_messages', column: 'chat_id' },
      { name: 'idx_messages_timestamp', table: 'whatsapp_messages', column: 'timestamp' }
    ];

    for (const index of indexes) {
      await client.query(`
        CREATE INDEX IF NOT EXISTS ${index.name} ON ${index.table}(${index.column});
      `);
    }
    log.success('All indexes created');

    // Step 5: Set permissions
    log.section();
    log.title('🔧 STEP 5: Setting Permissions');
    log.section();

    const tables = [
      'whatsapp_instances',
      'green_api_message_queue',
      'green_api_bulk_campaigns',
      'whatsapp_message_templates',
      'whatsapp_templates',
      'whatsapp_messages'
    ];

    for (const table of tables) {
      await client.query(`GRANT ALL ON ${table} TO authenticated;`);
      await client.query(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`);
    }
    log.success('Permissions configured');

    // Step 6: Create triggers
    log.section();
    log.title('🔧 STEP 6: Creating Triggers');
    log.section();

    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    const triggerTables = [
      'whatsapp_instances',
      'green_api_message_queue',
      'green_api_bulk_campaigns',
      'whatsapp_message_templates'
    ];

    for (const table of triggerTables) {
      await client.query(`
        DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
        CREATE TRIGGER update_${table}_updated_at 
          BEFORE UPDATE ON ${table} 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column();
      `);
    }
    log.success('Triggers created');

    // Step 7: Verification
    log.section();
    log.title('✅ STEP 7: Verification');
    log.section();

    const counts = await client.query(`
      SELECT 'whatsapp_instances' as table_name, COUNT(*) as record_count FROM whatsapp_instances
      UNION ALL
      SELECT 'green_api_message_queue', COUNT(*) FROM green_api_message_queue
      UNION ALL
      SELECT 'green_api_bulk_campaigns', COUNT(*) FROM green_api_bulk_campaigns
      UNION ALL
      SELECT 'whatsapp_message_templates', COUNT(*) FROM whatsapp_message_templates
      UNION ALL
      SELECT 'whatsapp_templates', COUNT(*) FROM whatsapp_templates
      UNION ALL
      SELECT 'whatsapp_messages', COUNT(*) FROM whatsapp_messages;
    `);

    log.info('Current record counts:');
    counts.rows.forEach(row => {
      log.info(`  ${row.table_name}: ${row.record_count} records`);
    });

    // Final Success Message
    log.section();
    log.title('🎉 SETUP COMPLETE!');
    log.section();
    
    console.log(`
${colors.green}${colors.bright}
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║  ✅ WhatsApp Database Setup Complete!                     ║
║                                                            ║
║  Created/Verified:                                         ║
║  • 6 tables with proper schema                             ║
║  • Settings column for Green API                           ║
║  • Performance indexes                                     ║
║  • Auto-update triggers                                    ║
║  • Proper permissions                                      ║
║                                                            ║
║  Next Steps:                                               ║
║  1. Go to: http://localhost:3000/lats/whatsapp-chat       ║
║  2. Add WhatsApp instances via Connection Manager          ║
║  3. Configure Green API settings (gear icon)               ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}
    `);

  } catch (error) {
    log.section();
    log.error('Setup failed!');
    log.error(error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

// Run the setup
setupWhatsAppDatabase();

