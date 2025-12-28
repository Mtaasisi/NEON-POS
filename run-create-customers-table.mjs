#!/usr/bin/env node

/**
 * Run Create Customers Table Migration
 * Creates the customers table that is referenced by the application
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
  console.error('Usage: node run-create-customers-table.mjs "postgresql://..."');
  console.error('Or set DATABASE_URL or VITE_DATABASE_URL environment variable');
  console.error('');
  console.error('Example:');
  console.error('node run-create-customers-table.mjs "postgresql://user:pass@host:port/db"');
  process.exit(1);
}

console.log('🔗 Connecting to Supabase database...');
console.log(`📍 Host: ${DATABASE_URL.match(/@([^/]+)/)?.[1] || 'unknown'}`);

const sql = postgres(DATABASE_URL, {
  ssl: 'require',
  max: 1
});

async function runMigration() {
  try {
    console.log('\n🚀 Running Create Customers Table Migration...\n');

    const migrationFile = 'migrations/create_customers_table.sql';
    const filePath = join(__dirname, migrationFile);

    console.log(`📄 Reading migration file: ${migrationFile}`);
    const migrationSQL = readFileSync(filePath, 'utf-8');

    console.log('🔄 Executing migration...');
    await sql.unsafe(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('🎉 customers table created successfully');
    console.log('');
    console.log('📝 The table includes:');
    console.log('   ✅ Customer information (name, contact, address)');
    console.log('   ✅ Loyalty program fields (points, purchases)');
    console.log('   ✅ Branch isolation support');
    console.log('   ✅ Performance indexes');

  } catch (error) {
    console.error('❌ Migration failed!');
    console.error(`   Error: ${error.message}`);

    // Check if error is because table already exists
    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      console.log('   ℹ️  Table already exists, no action needed.');
      console.log('✅ Migration completed (table already exists)');
    } else {
      console.error('\n🔧 Troubleshooting:');
      console.error('   1. Check your database connection');
      console.error('   2. Verify you have admin permissions');
      console.error('   3. Try running the SQL manually in Supabase SQL Editor');
      process.exit(1);
    }
  } finally {
    await sql.end();
  }
}

// Run the migration
runMigration().catch(error => {
  console.error('\n💥 Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
