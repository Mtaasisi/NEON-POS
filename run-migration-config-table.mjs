#!/usr/bin/env node
/**
 * Run migration_configurations table creation
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  console.error('Please set DATABASE_URL in your .env file');
  process.exit(1);
}

console.log('🚀 Creating migration_configurations table...\n');

const sql = neon(DATABASE_URL);

async function runMigration() {
  try {
    const migrationFile = join(__dirname, 'migrations', 'create_migration_configurations_table.sql');
    console.log('📖 Reading migration file...');
    const migrationSQL = readFileSync(migrationFile, 'utf-8');
    
    console.log('📊 Executing migration...');
    console.log('   Database URL:', DATABASE_URL.substring(0, 50) + '...');
    
    // Execute migration
    await sql.unsafe(migrationSQL);
    
    // Verify table was created
    console.log('🔍 Verifying table creation...');
    const verifyResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'migration_configurations'
    `;
    
    if (verifyResult.length > 0) {
      console.log('✅ Migration completed successfully!');
      console.log('\n📋 Table created: migration_configurations');
      console.log('   ✓ Stores user migration configurations');
      console.log('   ✓ Includes RLS policies for security');
      console.log('   ✓ Indexed for performance\n');
    } else {
      console.error('❌ Table was not created! Migration may have failed silently.');
      process.exit(1);
    }
    
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Table already exists, skipping...');
    } else {
      console.error('❌ Migration failed:', error.message);
      console.error('   Full error:', error);
      process.exit(1);
    }
  }
}

runMigration();

