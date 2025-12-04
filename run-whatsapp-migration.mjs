/**
 * WhatsApp Advanced Features - Database Migration Script (Node.js)
 * Alternative to shell script for users without psql installed
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Your database connection string
const DB_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

console.log('🚀 Starting WhatsApp Advanced Features Migration...\n');

// Check if pg package is installed
let pg;
try {
  pg = await import('pg');
} catch (error) {
  console.log('❌ Error: pg package not installed');
  console.log('\nPlease install it first:');
  console.log('  npm install pg');
  console.log('\nOr use the shell script instead:');
  console.log('  ./run-whatsapp-migration.sh');
  process.exit(1);
}

const { Client } = pg.default;

async function runMigration() {
  const client = new Client({
    connectionString: DB_URL
  });

  try {
    console.log('📡 Connecting to database...');
    await client.connect();
    console.log('✅ Connected!\n');

    // Read SQL file
    const sqlFile = join(__dirname, 'migrations', 'create_whatsapp_advanced_features.sql');
    console.log('📖 Reading migration file...');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    console.log('✅ File loaded\n');

    // Execute migration
    console.log('📊 Running migration...');
    await client.query(sql);
    console.log('✅ Migration completed successfully!\n');

    console.log('📋 Tables created:');
    console.log('  ✓ whatsapp_campaigns');
    console.log('  ✓ whatsapp_blacklist');
    console.log('  ✓ whatsapp_media_library');
    console.log('  ✓ whatsapp_reply_templates');
    console.log('  ✓ whatsapp_ab_tests');
    console.log('  ✓ whatsapp_scheduled_campaigns');
    console.log('  ✓ whatsapp_customer_segments');
    console.log('  ✓ whatsapp_api_health');
    console.log('  ✓ whatsapp_campaign_metrics');
    console.log('  ✓ whatsapp_failed_queue\n');

    console.log('🎉 All set! Your WhatsApp system now has:');
    console.log('  📊 Campaign Analytics & History');
    console.log('  🚫 Blacklist Management');
    console.log('  📁 Media Library');
    console.log('  💬 Smart Reply Templates');
    console.log('  🧪 A/B Testing');
    console.log('  📅 Scheduled Campaigns');
    console.log('  🎯 Customer Segments');
    console.log('  🏥 API Health Monitoring');
    console.log('  🔄 Smart Retry Queue\n');

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();

