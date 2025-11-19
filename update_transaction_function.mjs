#!/usr/bin/env node

/**
 * Update create_account_transaction function to include branch_id
 * This ensures all transactions created by the database function are branch-aware
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get database URL from environment
const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL not found in environment variables');
  console.error('');
  console.error('Please set VITE_DATABASE_URL in your .env file:');
  console.error('VITE_DATABASE_URL=postgresql://user:password@host/database');
  process.exit(1);
}

console.log('🚀 Updating create_account_transaction function...');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📡 Connecting to:', DATABASE_URL.substring(0, 50) + '...');
console.log('');

// Create postgres connection
const sql = postgres(DATABASE_URL, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
});

async function runMigration() {
  try {
    console.log('⚙️  Updating create_account_transaction function...');

    // Read the SQL migration file
    const migrationPath = join(__dirname, 'update_transaction_function_branch.sql');
    const migrationSql = readFileSync(migrationPath, 'utf-8');

    // Execute the migration
    await sql.unsafe(migrationSql);

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ MIGRATION COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('📊 Changes made:');
    console.log('   ✓ Updated create_account_transaction function');
    console.log('   ✓ Added branch_id parameter and assignment');
    console.log('   ✓ Function now creates branch-aware transactions');
    console.log('');
    console.log('🎉 Database function updated!');

  } catch (error) {
    console.error('');
    console.error('❌ ERROR during migration:');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(error.message);
    console.error('');

    if (error.message.includes('already exists')) {
      console.log('ℹ️  Note: Function may already exist. Migration might be partially complete.');
    } else if (error.message.includes('connection')) {
      console.error('💡 Connection issue detected. Please check:');
      console.error('   - Your internet connection');
      console.error('   - The DATABASE_URL is correct');
      console.error('   - The database server is accessible');
      console.error('');
    } else {
      console.error('Full error:', error);
    }

    process.exit(1);
  } finally {
    // Close the connection
    await sql.end();
  }
}

// Run the migration
runMigration();
