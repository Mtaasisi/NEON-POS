#!/usr/bin/env node

/**
 * Diagnostic script to troubleshoot sales query issues
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync, existsSync } from 'fs';

console.log('\n🔍 Sales Query Diagnostic');
console.log('=====================================\n');

// Get database URL
let DATABASE_URL;
try {
  if (existsSync('database-config.json')) {
    const config = JSON.parse(readFileSync('database-config.json', 'utf-8'));
    DATABASE_URL = config.connectionString || config.url;
    console.log('✅ Using database-config.json\n');
  } else {
    DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
    console.log('✅ Using configured database URL\n');
  }
} catch (e) {
  console.error('❌ Error reading database config:', e.message);
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function diagnose() {
  try {
    console.log('📊 Step 1: Checking lats_sales table structure...\n');
    
    // Get all columns
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'lats_sales'
      ORDER BY ordinal_position
    `;
    
    console.log('   Columns in lats_sales table:');
    columns.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
    console.log('');

    console.log('📊 Step 2: Counting total sales records...\n');
    
    const countResult = await sql`SELECT COUNT(*) as count FROM lats_sales`;
    const totalCount = countResult[0]?.count || 0;
    console.log(`   Total records: ${totalCount}\n`);

    console.log('📊 Step 3: Testing simple SELECT query...\n');
    
    try {
      const simpleSales = await sql`
        SELECT id, sale_number, customer_id, total_amount, payment_method, status, created_by, created_at
        FROM lats_sales
        ORDER BY created_at DESC
        LIMIT 5
      `;
      
      console.log(`   ✅ Query successful! Found ${simpleSales.length} records`);
      if (simpleSales.length > 0) {
        console.log('\n   Sample record:');
        console.log('   ', JSON.stringify(simpleSales[0], null, 2));
      }
      console.log('');
    } catch (err) {
      console.error('   ❌ Simple query failed:', err.message);
      console.log('');
    }

    console.log('📊 Step 4: Testing SELECT * query...\n');
    
    try {
      const allColumnsSales = await sql`
        SELECT *
        FROM lats_sales
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      console.log(`   ✅ SELECT * successful! Found ${allColumnsSales.length} records`);
      if (allColumnsSales.length > 0) {
        console.log('\n   All columns in first record:');
        console.log('   Keys:', Object.keys(allColumnsSales[0]).join(', '));
      }
      console.log('');
    } catch (err) {
      console.error('   ❌ SELECT * failed:', err.message);
      console.error('   Error code:', err.code);
      console.log('');
    }

    console.log('📊 Step 5: Checking for sales in last 24 hours...\n');
    
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const recentSales = await sql`
      SELECT COUNT(*) as count 
      FROM lats_sales 
      WHERE created_at >= ${oneDayAgo.toISOString()}
    `;
    
    console.log(`   Sales in last 24 hours: ${recentSales[0]?.count || 0}\n`);

    console.log('📊 Step 6: Checking daily_sales_closures table...\n');
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const closureCheck = await sql`
        SELECT * FROM daily_sales_closures 
        WHERE date = ${today}
      `;
      
      if (closureCheck.length > 0) {
        console.log('   ✅ Found daily closure for today');
        console.log('   ', JSON.stringify(closureCheck[0], null, 2));
      } else {
        console.log('   ℹ️  No daily closure found for today (this is normal)');
      }
      console.log('');
    } catch (err) {
      console.error('   ❌ Closure check failed:', err.message);
      console.log('');
    }

    console.log('✅ DIAGNOSIS COMPLETE!\n');
    console.log('=====================================\n');
    console.log('Summary:');
    console.log(`- lats_sales table has ${columns.length} columns`);
    console.log(`- Total sales records: ${totalCount}`);
    console.log(`- Recent sales (24h): ${recentSales[0]?.count || 0}\n`);

  } catch (error) {
    console.error('\n❌ Diagnostic error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

console.log('🚀 Starting diagnostics...\n');
diagnose();

