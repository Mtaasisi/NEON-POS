#!/usr/bin/env node

/**
 * Apply Database Fix Script
 * ========================
 * This script applies the FINAL_FIX_RUN_THIS_NOW.sql to fix the missing
 * add_imei_to_parent_variant function that's causing the application error.
 */

import { neonConfig, Pool } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database URL - Load from environment variable
const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ CRITICAL: DATABASE_URL is not configured!');
  console.error('Please set VITE_DATABASE_URL or DATABASE_URL environment variable');
  process.exit(1);
}

console.log('🔧 Applying database fix...');
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

async function applyFix() {
  try {
    console.log('📖 Reading SQL fix file...');

    // Read the SQL fix file
    const sqlFilePath = path.join(__dirname, 'FINAL_FIX_RUN_THIS_NOW.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('🚀 Executing SQL fix...');
    console.log('This may take a few seconds...');

    // Execute the SQL (split by semicolon to handle multiple statements)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    // Execute the SQL using pool.query (same as supabaseClient.ts)
    console.log('📝 Executing SQL fix using pool.query...');
    await pool.query(sqlContent);

    console.log('');
    console.log('================================================================');
    console.log('✅ DATABASE FUNCTION CREATED SUCCESSFULLY');
    console.log('================================================================');
    console.log('');
    console.log('The add_imei_to_parent_variant function is now available.');
    console.log('Your application should work now without errors!');
    console.log('');
    console.log('Function signature:');
    console.log('  add_imei_to_parent_variant(');
    console.log('    parent_variant_id UUID,');
    console.log('    imei TEXT,');
    console.log('    serial_number TEXT,');
    console.log('    mac_address TEXT,');
    console.log('    cost_price NUMERIC,');
    console.log('    selling_price NUMERIC,');
    console.log('    condition TEXT,');
    console.log('    notes TEXT');
    console.log('  )');
    console.log('');
    console.log('🎉 Fix applied successfully!');
    console.log('================================================================');

  } catch (error) {
    console.error('❌ Error applying database fix:', error);
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

// Run the fix
applyFix().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
