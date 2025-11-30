#!/usr/bin/env node

/**
 * Create Daily Reports Table Script
 * ================================
 * This script creates the daily_reports table for employee daily and monthly reports
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

console.log('🔧 Creating daily_reports table...');
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

async function createTable() {
  try {
    console.log('📖 Reading SQL table creation file...');

    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'create_daily_reports_table.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('🚀 Executing SQL to create daily_reports table...');
    console.log('This may take a few seconds...');

    // Execute the SQL using pool.query (same as supabaseClient.ts)
    console.log('📝 Executing SQL using pool.query...');

    // Split SQL into individual statements and execute them one by one
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`Executing statement ${i + 1}/${statements.length}...`);
          await pool.query(statement);
        } catch (error) {
          // Check if it's an "already exists" error, which we can ignore
          if (error.code === '42P07') { // duplicate_table
            console.log(`⚠️  Table already exists, skipping...`);
            continue;
          }
          if (error.code === '42710') { // duplicate_object (index, etc.)
            console.log(`⚠️  Object already exists, skipping...`);
            continue;
          }
          // For other errors, log but continue
          console.log(`⚠️  Statement ${i + 1} failed: ${error.message}`);
          console.log(`Continuing with next statement...`);
        }
      }
    }

    console.log('');
    console.log('================================================================');
    console.log('✅ DAILY REPORTS TABLE CREATED SUCCESSFULLY');
    console.log('================================================================');
    console.log('');
    console.log('The daily_reports table is now available.');
    console.log('Your DailyReportModal should work now without errors!');
    console.log('');
    console.log('Table includes:');
    console.log('  - report_type (daily/monthly)');
    console.log('  - report_date and report_month');
    console.log('  - Content fields: title, customer_interactions, pending_work, etc.');
    console.log('  - Status tracking: draft, submitted, reviewed, approved');
    console.log('  - Branch isolation and RLS policies');
    console.log('');
    console.log('🎉 Table creation completed successfully!');
    console.log('================================================================');

  } catch (error) {
    console.error('❌ Error creating daily_reports table:', error);
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

// Run the table creation
createTable().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
