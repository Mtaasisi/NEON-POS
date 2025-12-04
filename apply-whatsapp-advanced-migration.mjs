#!/usr/bin/env node

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get database URL from environment
const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL not found in environment variables');
  console.error('');
  console.error('Please set DATABASE_URL in your .env file or environment:');
  console.error('   DATABASE_URL="postgresql://user:pass@host/database"');
  process.exit(1);
}

console.log('');
console.log('═'.repeat(60));
console.log('🚀 WhatsApp Advanced Features Migration');
console.log('═'.repeat(60));
console.log('');
console.log('📡 Connecting to database...');

// Create postgres connection
const sql = postgres(DATABASE_URL, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
});

async function applyMigration() {
  try {
    // Read the migration file
    const migrationPath = join(__dirname, 'migrations', 'create_whatsapp_advanced_features.sql');
    console.log('📄 Reading migration file...');
    console.log(`   Path: ${migrationPath}`);
    
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    console.log(`   ✅ Loaded (${migrationSQL.length} bytes)\n`);

    console.log('⏳ Executing migration...\n');

    try {
      // Execute the entire SQL file as one transaction
      // This is safer and handles complex SQL (functions, triggers, etc.)
      await sql.unsafe(migrationSQL);
      
      console.log('   ✅ Created tables successfully');
      console.log('   ✅ Created indexes successfully');
      console.log('   ✅ Created functions successfully');
      console.log('   ✅ Inserted sample data successfully');
      
      
      console.log('\n' + '═'.repeat(60));
      console.log('✅ Migration completed successfully!\n');
      console.log('\n' + '═'.repeat(60));
      
      console.log('\n📋 Tables created:');
      console.log('   ✓ whatsapp_campaigns');
      console.log('   ✓ whatsapp_blacklist');
      console.log('   ✓ whatsapp_media_library');
      console.log('   ✓ whatsapp_reply_templates');
      console.log('   ✓ whatsapp_ab_tests');
      console.log('   ✓ whatsapp_scheduled_campaigns');
      console.log('   ✓ whatsapp_customer_segments');
      console.log('   ✓ whatsapp_api_health');
      console.log('   ✓ whatsapp_campaign_metrics');
      console.log('   ✓ whatsapp_failed_queue');
      console.log('\n🎉 Your WhatsApp advanced features are now ready!\n');
      console.log('Next step: Refresh your browser to see the changes.');
      console.log('');
      
    } catch (migrationError) {
      // Handle errors gracefully
      if (
        migrationError.message.includes('already exists') ||
        migrationError.message.includes('duplicate')
      ) {
        console.log('\n' + '═'.repeat(60));
        console.log('ℹ️  Tables already exist - no changes needed\n');
        console.log('   Your WhatsApp advanced features are already set up!');
        console.log('\n' + '═'.repeat(60));
      } else {
        console.error('\n' + '═'.repeat(60));
        console.error('❌ Migration failed with error:\n');
        console.error('   ' + migrationError.message);
        console.error('\n' + '═'.repeat(60));
        throw migrationError;
      }
    }

  } catch (error) {
    console.error('\n❌ MIGRATION FAILED\n');
    console.error('Error:', error.message);
    console.error('');
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run the migration
applyMigration();

