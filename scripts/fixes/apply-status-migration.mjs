#!/usr/bin/env node

/**
 * Apply Status Column Migration Script
 * ====================================
 * This script applies the add_status_column_to_account_transactions.sql
 * to add the missing status column that's causing expense creation errors.
 */

import { neonConfig, Pool } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config();

// Database URL - Load from environment variable
const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ CRITICAL: DATABASE_URL is not configured!');
  console.error('Please set VITE_DATABASE_URL or DATABASE_URL environment variable');
  process.exit(1);
}

console.log('🔧 Applying status column migration...');
console.log('📡 Database URL:', DATABASE_URL.substring(0, 50) + '...');

// Configure Neon for browser environment (same as app)
if (typeof WebSocket !== 'undefined') {
  neonConfig.webSocketConstructor = WebSocket;
}
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = false;
neonConfig.pipelineTLS = false;
neonConfig.disableWarningInBrowsers = true;

// Create pool connection (same as supabaseClient.ts)
const pool = new Pool({ connectionString: DATABASE_URL });

async function applyMigration() {
  try {
    console.log('📖 Reading SQL migration file...');

    // Read the SQL migration file
    const sqlFilePath = path.join(__dirname, 'add_status_column_to_account_transactions.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('🚀 Executing SQL migration...');
    console.log('This may take a few seconds...');

    // Execute the SQL using pool.query (same as supabaseClient.ts)
    console.log('📝 Executing SQL migration using pool.query...');
    await pool.query(sqlContent);

    console.log('');
    console.log('================================================================');
    console.log('✅ STATUS COLUMN MIGRATION COMPLETED SUCCESSFULLY');
    console.log('================================================================');
    console.log('');
    console.log('The status column has been added to account_transactions table.');
    console.log('Your expense creation should now work without SQL errors!');
    console.log('');
    console.log('Column details:');
    console.log('  - Name: status');
    console.log('  - Type: TEXT');
    console.log('  - Default: approved');
    console.log('  - Check constraint: (pending, approved, rejected, cancelled)');
    console.log('');
    console.log('🎉 Migration applied successfully!');
    console.log('================================================================');

  } catch (error) {
    console.error('❌ Error applying database migration:', error);
    console.error('');
    console.error('Troubleshooting:');
    console.error('1. Check your database connection');
    console.error('2. Verify DATABASE_URL is correct');
    console.error('3. Make sure you have database admin privileges');
    console.error('4. Try running the SQL manually in the Neon console');
    process.exit(1);
  } finally {
    // Close the pool connection
    await pool.end();
  }
}

// Run the migration
applyMigration().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
