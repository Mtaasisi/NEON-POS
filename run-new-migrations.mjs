#!/usr/bin/env node

/**
 * Run New Feature Migrations
 * 
 * Applies all new database migrations for:
 * - Audit logs
 * - Email logs
 * - User sessions
 */

import postgres from 'postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database connection string
const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: No database URL provided');
  console.error('Usage: node run-new-migrations.mjs "postgresql://..."');
  console.error('Or set DATABASE_URL or VITE_DATABASE_URL environment variable');
  process.exit(1);
}

console.log('🔗 Connecting to database...');
console.log(`📍 Host: ${DATABASE_URL.match(/@([^/]+)/)?.[1] || 'unknown'}`);

const sql = postgres(DATABASE_URL, {
  ssl: 'require',
  max: 1
});

const migrations = [
  {
    name: 'Audit Logs Table',
    file: 'migrations/create_audit_logs_table.sql'
  },
  {
    name: 'Email Logs Table',
    file: 'migrations/create_email_logs_table.sql'
  },
  {
    name: 'User Sessions Table',
    file: 'migrations/create_user_sessions_table.sql'
  }
];

async function runMigrations() {
  console.log('\n🚀 Starting migrations...\n');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const migration of migrations) {
    try {
      console.log(`📄 Running: ${migration.name}`);
      
      const filePath = join(__dirname, migration.file);
      const migrationSQL = readFileSync(filePath, 'utf-8');
      
      // Execute the migration
      await sql.unsafe(migrationSQL);
      
      console.log(`✅ Success: ${migration.name}`);
      successCount++;
      
    } catch (error) {
      console.error(`❌ Failed: ${migration.name}`);
      console.error(`   Error: ${error.message}`);
      
      // Check if error is because table already exists
      if (error.message.includes('already exists')) {
        console.log(`   ℹ️  Table already exists, skipping...`);
        successCount++;
      } else {
        errorCount++;
      }
    }
    
    console.log(''); // Empty line for readability
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Successful: ${successCount}/${migrations.length}`);
  console.log(`   ❌ Failed: ${errorCount}/${migrations.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (errorCount === 0) {
    console.log('🎉 All migrations completed successfully!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Add environment variables to .env');
    console.log('   2. Initialize services in main.tsx');
    console.log('   3. Read QUICK_START_NEW_FEATURES.md');
  } else {
    console.log('⚠️  Some migrations failed. Please check errors above.');
  }
  
  await sql.end();
}

// Run migrations
runMigrations().catch(error => {
  console.error('\n💥 Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
});

