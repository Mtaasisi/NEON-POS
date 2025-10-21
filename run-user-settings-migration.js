#!/usr/bin/env node

/**
 * User Settings Migration Runner
 * This script creates the user_settings table in the Neon database
 */

import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

// Database URL from database-config.json
const configPath = path.join(process.cwd(), 'database-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const DATABASE_URL = config.url;

console.log('🔧 Running User Settings Migration...');
console.log('📊 Database URL:', DATABASE_URL.substring(0, 50) + '...');

// Create Neon client
const sql = neon(DATABASE_URL);

async function runMigration() {
  try {
    console.log('📋 Reading migration file...');
    const migrationPath = path.join(process.cwd(), 'migrations', 'create_user_settings_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🚀 Executing migration...');
    // Execute the entire migration as one block to handle dollar-quoted strings
    console.log('📝 Executing full migration...');
    await sql.query(migrationSQL);
    
    console.log('✅ User settings table created successfully!');
    
    // Test the table creation
    console.log('🧪 Testing table access...');
    const testResult = await sql`SELECT COUNT(*) as count FROM user_settings`;
    console.log('✅ Table test successful:', testResult);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    // Check if table already exists
    if (error.message.includes('already exists')) {
      console.log('ℹ️ Table already exists, checking structure...');
      try {
        const checkResult = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_settings'`;
        console.log('📋 Table structure:', checkResult);
        console.log('✅ User settings table is ready!');
      } catch (checkError) {
        console.error('❌ Could not verify table structure:', checkError.message);
      }
    }
  }
}

runMigration().then(() => {
  console.log('🎉 Migration process completed!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Migration process failed:', error);
  process.exit(1);
});
