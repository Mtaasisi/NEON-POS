#!/usr/bin/env node
/**
 * Diagnostic Script for Product Insert Issues
 * Checks RLS policies, triggers, and performs a test insert
 */

import { Pool } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import ws from 'ws';

// Load environment variables
dotenv.config();

// Configure WebSocket for Neon
if (typeof WebSocket === 'undefined') {
  global.WebSocket = ws;
}

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

console.log('🔧 Product Insert Diagnostic Tool\n');
console.log('=' .repeat(60));

const pool = new Pool({ connectionString: DATABASE_URL });

async function runDiagnostics() {
  try {
    // 1. Check connection
    console.log('\n1️⃣ Testing Database Connection...');
    const testQuery = await pool.query('SELECT NOW()');
    console.log('   ✅ Connected successfully');
    console.log('   Server time:', testQuery.rows[0].now);

    // 2. Check RLS policies
    console.log('\n2️⃣ Checking RLS Policies for lats_products...');
    const rlsQuery = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies 
      WHERE tablename = 'lats_products'
      ORDER BY policyname;
    `);
    
    if (rlsQuery.rows.length === 0) {
      console.log('   ⚠️  No RLS policies found (table might not have RLS enabled)');
    } else {
      console.log(`   Found ${rlsQuery.rows.length} RLS policies:`);
      rlsQuery.rows.forEach((policy) => {
        console.log(`   - ${policy.policyname} (${policy.cmd})`);
        const roles = Array.isArray(policy.roles) ? policy.roles.join(', ') : (policy.roles || 'ALL');
        console.log(`     Roles: ${roles}`);
      });
    }

    // 3. Check if RLS is enabled
    console.log('\n3️⃣ Checking RLS Status...');
    const rlsStatusQuery = await pool.query(`
      SELECT relname, relrowsecurity
      FROM pg_class
      WHERE relname = 'lats_products';
    `);
    
    if (rlsStatusQuery.rows[0]?.relrowsecurity) {
      console.log('   ⚠️  RLS is ENABLED - this might block INSERT...RETURNING');
      console.log('   💡 Consider using a service role or adjusting policies');
    } else {
      console.log('   ✅ RLS is DISABLED');
    }

    // 4. Check triggers
    console.log('\n4️⃣ Checking Triggers on lats_products...');
    const triggersQuery = await pool.query(`
      SELECT 
        tgname as trigger_name,
        tgtype,
        CASE 
          WHEN tgtype::integer & 1 = 1 THEN 'ROW'
          ELSE 'STATEMENT'
        END as level,
        CASE 
          WHEN tgtype::integer & 2 = 2 THEN 'BEFORE'
          WHEN tgtype::integer & 64 = 64 THEN 'INSTEAD OF'
          ELSE 'AFTER'
        END as timing,
        CASE 
          WHEN tgtype::integer & 4 = 4 THEN 'INSERT'
          WHEN tgtype::integer & 8 = 8 THEN 'DELETE'
          WHEN tgtype::integer & 16 = 16 THEN 'UPDATE'
          ELSE 'OTHER'
        END as event,
        proname as function_name
      FROM pg_trigger t
      JOIN pg_proc p ON t.tgfoid = p.oid
      JOIN pg_class c ON t.tgrelid = c.oid
      WHERE c.relname = 'lats_products'
      AND NOT tgisinternal
      ORDER BY tgname;
    `);
    
    if (triggersQuery.rows.length === 0) {
      console.log('   ℹ️  No triggers found');
    } else {
      console.log(`   Found ${triggersQuery.rows.length} triggers:`);
      triggersQuery.rows.forEach((trigger) => {
        console.log(`   - ${trigger.trigger_name} (${trigger.timing} ${trigger.event})`);
        console.log(`     Function: ${trigger.function_name}()`);
      });
    }

    // 5. Check required columns
    console.log('\n5️⃣ Checking Table Structure...');
    const columnsQuery = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'lats_products'
      AND column_name IN ('id', 'name', 'sku', 'branch_id', 'cost_price', 'selling_price')
      ORDER BY ordinal_position;
    `);
    
    console.log('   Key columns:');
    columnsQuery.rows.forEach((col) => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const hasDefault = col.column_default ? `(default: ${col.column_default.substring(0, 30)}...)` : '';
      console.log(`   - ${col.column_name}: ${col.data_type} ${nullable} ${hasDefault}`);
    });

    // 6. Get a test branch_id
    console.log('\n6️⃣ Finding Available Branch...');
    const branchQuery = await pool.query(`
      SELECT id, name FROM lats_branches 
      ORDER BY created_at ASC 
      LIMIT 1;
    `);
    
    let testBranchId = null;
    if (branchQuery.rows.length > 0) {
      testBranchId = branchQuery.rows[0].id;
      console.log(`   ✅ Found branch: ${branchQuery.rows[0].name} (${testBranchId})`);
    } else {
      console.log('   ⚠️  No branches found - will insert without branch_id');
    }

    // 7. Test INSERT...RETURNING
    console.log('\n7️⃣ Testing INSERT...RETURNING...');
    const testSKU = `TEST-${Date.now()}`;
    const testData = {
      name: `Test Product ${Date.now()}`,
      description: 'Diagnostic test product',
      sku: testSKU,
      cost_price: 100,
      selling_price: 150,
      stock_quantity: 0,
      min_stock_level: 0,
      is_active: true,
      total_quantity: 0,
      total_value: 0,
      branch_id: testBranchId
    };

    console.log('   Inserting test product...');
    console.log('   Data:', JSON.stringify(testData, null, 2));

    const insertQuery = `
      INSERT INTO lats_products (
        name, description, sku, cost_price, selling_price,
        stock_quantity, min_stock_level, is_active, 
        total_quantity, total_value, branch_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      ) 
      RETURNING *;
    `;

    const insertResult = await pool.query(insertQuery, [
      testData.name,
      testData.description,
      testData.sku,
      testData.cost_price,
      testData.selling_price,
      testData.stock_quantity,
      testData.min_stock_level,
      testData.is_active,
      testData.total_quantity,
      testData.total_value,
      testData.branch_id
    ]);

    console.log('\n   INSERT Result:');
    console.log('   ✅ Rows returned:', insertResult.rows.length);
    if (insertResult.rows.length > 0) {
      const product = insertResult.rows[0];
      console.log('   Product ID:', product.id);
      console.log('   Product Name:', product.name);
      console.log('   Product SKU:', product.sku);
      console.log('   Branch ID:', product.branch_id);
      console.log('   Full data:', JSON.stringify(product, null, 2));
      
      // Clean up test product
      console.log('\n   Cleaning up test product...');
      await pool.query('DELETE FROM lats_products WHERE sku = $1', [testSKU]);
      console.log('   ✅ Test product removed');
    } else {
      console.log('   ❌ No data returned from INSERT!');
      console.log('   This is the problem - RLS policies might be blocking the RETURNING clause');
    }

    console.log('\n8️⃣ Recommendations:');
    console.log('   Based on the diagnostics above:');
    
    if (rlsStatusQuery.rows[0]?.relrowsecurity) {
      console.log('   1. RLS is enabled - ensure your app uses authenticated connections');
      console.log('   2. Check that the RLS policies allow SELECT on inserted rows');
      console.log('   3. Consider using a service role key for backend operations');
    }
    
    if (triggersQuery.rows.length > 0) {
      console.log('   4. Check that triggers return NEW properly and don\'t fail');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Diagnostic complete!');

  } catch (error) {
    console.error('\n❌ Error during diagnostics:', error);
    console.error('   Message:', error.message);
    if (error.code) {
      console.error('   Code:', error.code);
    }
  } finally {
    await pool.end();
  }
}

runDiagnostics().catch(console.error);

