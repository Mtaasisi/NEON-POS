#!/usr/bin/env node

/**
 * AUTOMATED FIX: Apply IMEI Function to Neon Database
 * ====================================================
 * This script reads ALL_IN_ONE_FIX.sql and applies it to your Neon database
 * 
 * Usage:
 *   node APPLY_FIX_NOW.mjs
 */

import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('\n❌ ERROR: DATABASE_URL not found in environment variables');
  console.error('Please set your Neon database connection string in .env file:\n');
  console.error('DATABASE_URL=postgres://user:password@host/database\n');
  process.exit(1);
}

console.log('🚀 Starting IMEI Function Fix...\n');
console.log('📁 Reading SQL file...');

// Read the SQL file
const sqlFilePath = join(__dirname, 'ALL_IN_ONE_FIX.sql');
let sqlContent;
try {
  sqlContent = readFileSync(sqlFilePath, 'utf8');
  console.log('✅ SQL file loaded successfully\n');
} catch (error) {
  console.error('❌ Error reading SQL file:', error.message);
  process.exit(1);
}

// Import postgres client
let postgres;
try {
  postgres = (await import('@neondatabase/serverless')).default;
} catch (error) {
  console.error('\n❌ Error: @neondatabase/serverless not installed');
  console.error('Please install it first:\n');
  console.error('npm install @neondatabase/serverless\n');
  process.exit(1);
}

console.log('🔗 Connecting to Neon database...');

const sql = postgres(DATABASE_URL, {
  ssl: 'require'
});

try {
  console.log('✅ Connected to database\n');
  console.log('📝 Executing SQL (this may take a moment)...\n');
  
  // Execute the SQL
  await sql.unsafe(sqlContent);
  
  console.log('\n✨ SUCCESS! IMEI function has been created!\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ All database changes applied successfully');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('📋 Next Steps:');
  console.log('   1. Refresh your browser (Cmd+Shift+R or Ctrl+Shift+R)');
  console.log('   2. Clear browser console');
  console.log('   3. Try receiving your Purchase Order with IMEI numbers');
  console.log('   4. The error should be gone! ✨\n');
  
  await sql.end();
  process.exit(0);
  
} catch (error) {
  console.error('\n❌ ERROR executing SQL:');
  console.error('─────────────────────────────────────────────────────');
  console.error(error.message);
  console.error('─────────────────────────────────────────────────────\n');
  
  if (error.message.includes('permission denied')) {
    console.error('💡 TIP: Make sure your database user has CREATE FUNCTION permissions\n');
  }
  
  await sql.end();
  process.exit(1);
}

