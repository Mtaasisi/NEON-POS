#!/usr/bin/env node

/**
 * Run WhatsApp Bulk Campaigns migration using Neon postgres driver
 */

import postgres from 'postgres';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

console.log('🚀 Running WhatsApp Bulk Campaigns migration...');
console.log(`📍 Database: ${databaseUrl.substring(0, 50)}...\n`);

const sql = postgres(databaseUrl, {
  ssl: 'require',
});

async function runMigration() {
  try {
    console.log('📝 Creating whatsapp_bulk_campaigns table...');
    
    // Read the SQL file
    const migrationSQL = readFileSync(
      join(__dirname, 'migrations', 'create_whatsapp_bulk_campaigns.sql'),
      'utf8'
    );
    
    // Execute the migration
    await sql.unsafe(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 Table whatsapp_bulk_campaigns created');
    console.log('📊 Table campaign_notifications created');
    console.log('🎯 Indexes created for optimal performance');
    console.log('\n✨ Your bulk WhatsApp feature is now ready to use!\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Details:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();

