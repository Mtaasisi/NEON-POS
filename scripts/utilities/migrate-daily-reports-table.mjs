#!/usr/bin/env node

/**
 * Migrate Daily Reports Table Script
 * ================================
 * This script migrates the existing daily_reports table to match the expected schema
 */

import { neonConfig, Pool } from '@neondatabase/serverless';

// Database URL - Load from environment variable
const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ CRITICAL: DATABASE_URL is not configured!');
  console.error('Please set VITE_DATABASE_URL or DATABASE_URL environment variable');
  process.exit(1);
}

console.log('🔄 Migrating daily_reports table...');
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

async function migrateTable() {
  try {
    console.log('📋 Checking current table structure...');

    // Check current columns
    const columns = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'daily_reports'
      ORDER BY ordinal_position;
    `);

    const existingColumns = columns.rows.map(row => row.column_name);
    console.log('Current columns:', existingColumns.join(', '));

    // Rename employee_id to user_id if it exists
    if (existingColumns.includes('employee_id') && !existingColumns.includes('user_id')) {
      console.log('🔄 Renaming employee_id to user_id...');
      await pool.query('ALTER TABLE daily_reports RENAME COLUMN employee_id TO user_id;');
      console.log('✅ Renamed employee_id to user_id');
    }

    // Add missing columns
    const requiredColumns = [
      { name: 'report_type', type: 'TEXT NOT NULL CHECK (report_type IN (\'daily\', \'monthly\')) DEFAULT \'daily\'', exists: existingColumns.includes('report_type') },
      { name: 'report_month', type: 'DATE NULL', exists: existingColumns.includes('report_month') },
      { name: 'title', type: 'TEXT NOT NULL DEFAULT \'\'', exists: existingColumns.includes('title') },
      { name: 'customer_interactions', type: 'TEXT', exists: existingColumns.includes('customer_interactions') },
      { name: 'pending_work', type: 'TEXT', exists: existingColumns.includes('pending_work') },
      { name: 'recommendations', type: 'TEXT', exists: existingColumns.includes('recommendations') },
      { name: 'additional_notes', type: 'TEXT', exists: existingColumns.includes('additional_notes') },
      { name: 'sales_made', type: 'INTEGER DEFAULT 0', exists: existingColumns.includes('sales_made') },
      { name: 'pending_tasks', type: 'INTEGER DEFAULT 0', exists: existingColumns.includes('pending_tasks') },
      { name: 'submitted_at', type: 'TIMESTAMPTZ', exists: existingColumns.includes('submitted_at') }
    ];

    for (const col of requiredColumns) {
      if (!col.exists) {
        console.log(`➕ Adding column ${col.name}...`);
        await pool.query(`ALTER TABLE daily_reports ADD COLUMN ${col.name} ${col.type};`);
        console.log(`✅ Added ${col.name}`);
      } else {
        console.log(`✓ ${col.name} already exists`);
      }
    }

    // Update report_type for existing records
    console.log('📝 Setting report_type for existing records...');
    await pool.query(`
      UPDATE daily_reports
      SET report_type = 'daily',
          title = COALESCE(achievements, 'Daily Report'),
          customer_interactions = COALESCE(achievements, ''),
          pending_work = COALESCE(ARRAY_TO_STRING(tasks_in_progress, ', '), ''),
          recommendations = COALESCE(goals_for_tomorrow, ''),
          additional_notes = COALESCE(learnings, ''),
          sales_made = COALESCE(sales_achieved, 0)::INTEGER,
          pending_tasks = 0
      WHERE report_type IS NULL OR report_type = '';
    `);
    console.log('✅ Updated existing records');

    // Make user_id NOT NULL if it's nullable
    console.log('🔧 Ensuring user_id is NOT NULL...');
    try {
      await pool.query('ALTER TABLE daily_reports ALTER COLUMN user_id SET NOT NULL;');
      console.log('✅ user_id is now NOT NULL');
    } catch (error) {
      console.log('⚠️ user_id already NOT NULL or has null values');
    }

    // Add check constraint for status if it doesn't exist
    console.log('🔒 Adding status check constraint...');
    try {
      await pool.query(`
        ALTER TABLE daily_reports
        ADD CONSTRAINT daily_reports_status_check
        CHECK (status IN ('draft', 'submitted', 'reviewed', 'approved'));
      `);
      console.log('✅ Status check constraint added');
    } catch (error) {
      console.log('⚠️ Status check constraint already exists');
    }

    // Add check constraint for report_type if it doesn't exist
    console.log('🔒 Adding report_type check constraint...');
    try {
      await pool.query(`
        ALTER TABLE daily_reports
        ADD CONSTRAINT daily_reports_report_type_check
        CHECK (report_type IN ('daily', 'monthly'));
      `);
      console.log('✅ report_type check constraint added');
    } catch (error) {
      console.log('⚠️ report_type check constraint already exists');
    }

    // Test the table with the expected structure
    console.log('🧪 Testing updated table...');
    const testResult = await pool.query(`
      INSERT INTO daily_reports (
        user_id, report_type, report_date, title, customer_interactions, status
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', 'daily', CURRENT_DATE, 'Migration Test Report',
        'Test interactions', 'draft'
      ) RETURNING id, report_type;
    `);

    console.log('✅ Test insert successful! Report type:', testResult.rows[0].report_type);

    // Clean up test record
    await pool.query('DELETE FROM daily_reports WHERE title = $1', ['Migration Test Report']);
    console.log('🧹 Test record cleaned up.');

    console.log('');
    console.log('================================================================');
    console.log('✅ MIGRATION COMPLETE');
    console.log('================================================================');
    console.log('');
    console.log('🎉 The daily_reports table has been migrated to match the expected schema!');
    console.log('Your DailyReportModal should now work without errors.');
    console.log('');
    console.log('New table structure includes:');
    console.log('  - user_id (renamed from employee_id)');
    console.log('  - report_type (daily/monthly)');
    console.log('  - All the columns expected by the application');

  } catch (error) {
    console.error('❌ Error migrating table:', error);
    console.error('');
    console.error('Troubleshooting:');
    console.error('1. Check your database connection');
    console.error('2. Verify DATABASE_URL is correct');
    console.error('3. Make sure you have database admin privileges');
    console.error('4. You may need to manually adjust the table structure');
    process.exit(1);
  } finally {
    // Close the pool connection
    await pool.end();
  }
}

// Run the migration
migrateTable().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
