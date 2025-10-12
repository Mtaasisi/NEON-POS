#!/usr/bin/env node
/**
 * 🏗️  CREATE MISSING TABLES
 * Creates the three missing tables that are causing 400 errors
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const log = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
};

async function main() {
  console.log('\n🏗️  CREATING MISSING TABLES...\n');
  
  const sql = neon(DATABASE_URL);
  
  try {
    // Create settings table
    log.info('Creating settings table...');
    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    log.success('Created settings table');
    
    // Insert default SMS settings
    await sql`
      INSERT INTO settings (key, value) VALUES 
        ('sms_provider_api_key', ''),
        ('sms_api_url', ''),
        ('sms_provider_password', '')
      ON CONFLICT (key) DO NOTHING
    `;
    log.success('Inserted default settings');
    
    // Create notifications table
    log.info('Creating notifications table...');
    await sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info',
        is_read BOOLEAN DEFAULT false,
        link TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        read_at TIMESTAMP WITH TIME ZONE
      )
    `;
    log.success('Created notifications table');
    
    // Create whatsapp_instances_comprehensive table
    log.info('Creating whatsapp_instances_comprehensive table...');
    await sql`
      CREATE TABLE IF NOT EXISTS whatsapp_instances_comprehensive (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        instance_name TEXT NOT NULL,
        instance_id TEXT UNIQUE,
        phone_number TEXT,
        api_key TEXT,
        api_url TEXT,
        status TEXT DEFAULT 'inactive',
        qr_code TEXT,
        is_active BOOLEAN DEFAULT true,
        last_connected TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    log.success('Created whatsapp_instances_comprehensive table');
    
    // Disable RLS on all new tables
    log.info('Disabling RLS on new tables...');
    await sql`ALTER TABLE settings DISABLE ROW LEVEL SECURITY`;
    await sql`ALTER TABLE notifications DISABLE ROW LEVEL SECURITY`;
    await sql`ALTER TABLE whatsapp_instances_comprehensive DISABLE ROW LEVEL SECURITY`;
    log.success('Disabled RLS on all new tables');
    
    // Grant permissions
    log.info('Granting permissions...');
    await sql`GRANT ALL ON settings TO neondb_owner`;
    await sql`GRANT ALL ON notifications TO neondb_owner`;
    await sql`GRANT ALL ON whatsapp_instances_comprehensive TO neondb_owner`;
    log.success('Granted permissions');
    
    console.log('\n✨ ALL TABLES CREATED SUCCESSFULLY!\n');
    log.success('All database fixes are now complete!');
    console.log('\n📝 FINAL STEPS:');
    console.log('1. Hard refresh your browser (Cmd+Shift+R or Ctrl+Shift+R)');
    console.log('2. Clear browser cache if needed');
    console.log('3. The 400 errors should be completely fixed now! 🎉\n');
    
  } catch (err) {
    log.error('Error:');
    console.error(err);
    process.exit(1);
  }
}

main();

