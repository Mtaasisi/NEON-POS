#!/usr/bin/env node
/**
 * Fix Customers Table Schema - Add Missing Columns
 * 
 * This script applies the migration to add all missing columns
 * to the customers table in your Neon database.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Your Neon database connection string
const DATABASE_URL = "postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

console.log('=========================================');
console.log('🔧 Fixing Customers Table Schema');
console.log('=========================================');
console.log('');
console.log('This will add missing columns to your customers table:');
console.log('  ✓ branch_id');
console.log('  ✓ is_active (if missing)');
console.log('  ✓ total_spent (if missing)');
console.log('  ✓ And many other columns...');
console.log('');
console.log('⚠️  This migration is SAFE:');
console.log('  • Won\'t delete any existing data');
console.log('  • Won\'t modify existing columns');
console.log('  • Only adds missing columns');
console.log('  • Uses IF NOT EXISTS checks');
console.log('');

async function applyMigration() {
  try {
    // Read the migration SQL file
    const sqlPath = join(__dirname, 'migrations', 'fix_customers_table_add_missing_columns.sql');
    console.log('📁 Reading SQL file...');
    const sqlContent = readFileSync(sqlPath, 'utf-8');
    
    // Dynamic import of @neondatabase/serverless
    console.log('📦 Loading Neon database client...');
    const { Pool } = await import('@neondatabase/serverless');
    
    const pool = new Pool({ connectionString: DATABASE_URL });
    
    console.log('🔗 Connecting to Neon database...');
    console.log('');
    
    // Execute the migration
    console.log('⚡ Executing migration...');
    const result = await pool.query(sqlContent);
    
    console.log('');
    console.log('=========================================');
    console.log('✅ Migration completed successfully!');
    console.log('=========================================');
    console.log('');
    console.log('Your customers table now has all required columns.');
    console.log('The application errors should be resolved.');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Refresh your application in the browser');
    console.log('  2. Check the browser console for errors');
    console.log('  3. Test customer-related features');
    console.log('');
    
  } catch (error) {
    console.log('');
    console.log('=========================================');
    console.log('❌ Error applying migration');
    console.log('=========================================');
    console.log('');
    console.error('Error details:', error.message);
    console.log('');
    
    if (error.message.includes('Cannot find package')) {
      console.log('💡 Missing dependency. Please run:');
      console.log('   npm install @neondatabase/serverless');
      console.log('');
    } else if (error.message.includes('ENOENT')) {
      console.log('💡 SQL file not found.');
      console.log('   Make sure you\'re running this from the project root directory.');
      console.log('');
    } else {
      console.log('Common issues:');
      console.log('  • Database connection timeout');
      console.log('  • Invalid connection string');
      console.log('  • Network connectivity issues');
      console.log('');
    }
    
    process.exit(1);
  }
}

// Run the migration
applyMigration();

