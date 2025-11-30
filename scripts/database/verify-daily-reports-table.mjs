#!/usr/bin/env node

/**
 * Verify Daily Reports Table Script
 * ================================
 * This script verifies that the daily_reports table exists and has the correct structure
 */

import { neonConfig, Pool } from '@neondatabase/serverless';

// Database URL - Load from environment variable
const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ CRITICAL: DATABASE_URL is not configured!');
  console.error('Please set VITE_DATABASE_URL or DATABASE_URL environment variable');
  process.exit(1);
}

console.log('🔍 Verifying daily_reports table...');
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

async function verifyTable() {
  try {
    console.log('📋 Checking if daily_reports table exists...');

    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'daily_reports'
      );
    `);

    const tableExists = tableCheck.rows[0].exists;

    if (!tableExists) {
      console.log('❌ daily_reports table does not exist!');
      console.log('Let me try to create it manually...');

      // Try to create the table manually
      await pool.query(`
        CREATE TABLE IF NOT EXISTS daily_reports (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          branch_id UUID,
          report_type TEXT NOT NULL CHECK (report_type IN ('daily', 'monthly')),
          report_date DATE NOT NULL,
          report_month DATE NULL,
          title TEXT NOT NULL,
          customer_interactions TEXT,
          pending_work TEXT,
          recommendations TEXT,
          additional_notes TEXT,
          customers_served INTEGER DEFAULT 0,
          sales_made INTEGER DEFAULT 0,
          issues_resolved INTEGER DEFAULT 0,
          pending_tasks INTEGER DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'reviewed', 'approved')),
          submitted_at TIMESTAMPTZ,
          reviewed_at TIMESTAMPTZ,
          reviewed_by UUID,
          review_notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      console.log('✅ Table created successfully!');
    } else {
      console.log('✅ daily_reports table exists!');
    }

    // Check table structure
    console.log('📊 Checking table structure...');
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'daily_reports'
      ORDER BY ordinal_position;
    `);

    console.log('Table columns:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(required)'} ${col.column_default ? `default: ${col.column_default}` : ''}`);
    });

    // Check if report_type column exists (the one causing the error)
    const reportTypeColumn = columns.rows.find(col => col.column_name === 'report_type');
    if (reportTypeColumn) {
      console.log('✅ report_type column exists - this should fix the error!');
    } else {
      console.log('❌ report_type column is missing - this is the problem!');
    }

    // Try a test insert to make sure it works
    console.log('🧪 Testing table functionality...');
    try {
      const testResult = await pool.query(`
        INSERT INTO daily_reports (
          user_id, report_type, report_date, title, customer_interactions, status
        ) VALUES (
          '00000000-0000-0000-0000-000000000000', 'daily', CURRENT_DATE, 'Test Report',
          'Test interactions', 'draft'
        ) RETURNING id;
      `);

      console.log('✅ Test insert successful!');

      // Clean up test record
      await pool.query('DELETE FROM daily_reports WHERE title = $1', ['Test Report']);
      console.log('🧹 Test record cleaned up.');

    } catch (insertError) {
      console.log('❌ Test insert failed:', insertError.message);
    }

    console.log('');
    console.log('================================================================');
    console.log('✅ VERIFICATION COMPLETE');
    console.log('================================================================');
    console.log('');
    if (reportTypeColumn) {
      console.log('🎉 The daily_reports table is ready!');
      console.log('Your DailyReportModal should now work without the column error.');
    } else {
      console.log('❌ The table still has issues. Please check the database manually.');
    }

  } catch (error) {
    console.error('❌ Error verifying table:', error);
    console.error('');
    console.error('Troubleshooting:');
    console.error('1. Check your database connection');
    console.error('2. Verify DATABASE_URL is correct');
    console.error('3. Make sure you have database admin privileges');
    process.exit(1);
  } finally {
    // Close the pool connection
    await pool.end();
  }
}

// Run the verification
verifyTable().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
