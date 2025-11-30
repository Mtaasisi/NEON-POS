#!/usr/bin/env node

/**
 * Comprehensive fix for customer_id column issues
 * This script checks all relevant tables and ensures they have customer_id where needed
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable is not set');
  process.exit(1);
}

console.log('🔧 Comprehensive customer_id column fix\n');

const sql = neon(DATABASE_URL);

// List of tables that should have customer_id
const TABLES_NEEDING_CUSTOMER_ID = [
  'returns',
  'customer_payments',
  'devices',
  'appointments',
  'customer_notes',
  'customer_revenue',
  'lats_sales',
  'customer_installment_plans',
  'customer_installment_plan_payments',
  'trade_in_contracts',
  'special_orders'
];

async function checkAndFixTable(tableName) {
  try {
    // Check if table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
      ) as table_exists
    `;

    if (!tableCheck[0]?.table_exists) {
      console.log(`⏭️  ${tableName} - table doesn't exist, skipping`);
      return { table: tableName, status: 'not_exist', fixed: false };
    }

    // Check if customer_id column exists
    const columnCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
        AND column_name = 'customer_id'
      ) as column_exists
    `;

    const hasColumn = columnCheck[0]?.column_exists;

    if (hasColumn) {
      console.log(`✅ ${tableName} - customer_id exists`);
      return { table: tableName, status: 'ok', fixed: false };
    }

    // Column is missing, add it
    console.log(`🔧 ${tableName} - adding customer_id column...`);
    
    // Note: Table names can't be parameterized, use string interpolation (safe since we control table names)
    // Build the queries as template strings
    const alterQuery = `ALTER TABLE ${tableName} ADD COLUMN customer_id UUID`;
    const indexQuery = `CREATE INDEX IF NOT EXISTS idx_${tableName}_customer_id ON ${tableName}(customer_id)`;
    
    // Execute using Neon's template string format
    const alterParts = [alterQuery];
    const alterRaw = [alterQuery];
    const alterTemplate = Object.assign(alterParts, { raw: alterRaw });
    await sql(alterTemplate);
    
    const indexParts = [indexQuery];
    const indexRaw = [indexQuery];
    const indexTemplate = Object.assign(indexParts, { raw: indexRaw });
    await sql(indexTemplate);
    
    console.log(`✅ ${tableName} - customer_id added successfully`);
    return { table: tableName, status: 'fixed', fixed: true };

  } catch (error) {
    console.error(`❌ ${tableName} - error: ${error.message}`);
    return { table: tableName, status: 'error', error: error.message, fixed: false };
  }
}

async function fixAll() {
  console.log('📋 Checking', TABLES_NEEDING_CUSTOMER_ID.length, 'tables...\n');

  const results = [];

  for (const tableName of TABLES_NEEDING_CUSTOMER_ID) {
    const result = await checkAndFixTable(tableName);
    results.push(result);
  }

  console.log('\n📊 Summary:');
  console.log('=' .repeat(60));
  
  const ok = results.filter(r => r.status === 'ok');
  const fixed = results.filter(r => r.status === 'fixed');
  const errors = results.filter(r => r.status === 'error');
  const notExist = results.filter(r => r.status === 'not_exist');

  console.log(`✅ Already OK: ${ok.length}`);
  console.log(`🔧 Fixed: ${fixed.length}`);
  console.log(`❌ Errors: ${errors.length}`);
  console.log(`⏭️  Doesn't exist: ${notExist.length}`);

  if (fixed.length > 0) {
    console.log('\n🎉 Fixed tables:');
    fixed.forEach(r => console.log(`   - ${r.table}`));
  }

  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(r => console.log(`   - ${r.table}: ${r.error}`));
  }

  console.log('\n' + '='.repeat(60));
  
  if (fixed.length > 0) {
    console.log('\n🔄 Refresh your application to see the changes!');
  } else if (errors.length === 0 && notExist.length < TABLES_NEEDING_CUSTOMER_ID.length) {
    console.log('\n✅ All tables already have customer_id column');
    console.log('If you\'re still seeing errors, try:');
    console.log('   1. Clear your browser cache');
    console.log('   2. Restart your development server');
    console.log('   3. Check the browser console for the exact failing query');
  }
}

fixAll().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

