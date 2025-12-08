#!/usr/bin/env node
/**
 * Diagnose Products Issue - Direct Database Connection
 * 
 * This script connects directly to the Neon database to diagnose
 * why getProducts() is returning no products.
 * 
 * Usage:
 *   node diagnose-products-issue.mjs
 * 
 * Or with custom connection string:
 *   DATABASE_URL="your_connection_string" node diagnose-products-issue.mjs
 */

import pg from 'pg';
const { Client } = pg;

// Get connection string from environment or use provided one
const connectionString = process.env.DATABASE_URL || 
  'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const client = new Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function diagnoseProductsIssue() {
  console.log('🔍 Diagnosing Products Issue...\n');
  console.log('='.repeat(60));
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // 1. Total products count
    console.log('1️⃣ PRODUCT COUNTS');
    console.log('-'.repeat(60));
    const totalResult = await client.query('SELECT COUNT(*) as count FROM lats_products');
    const totalProducts = parseInt(totalResult.rows[0].count);
    console.log(`📊 Total products: ${totalProducts}`);

    const activeResult = await client.query(
      'SELECT COUNT(*) as count FROM lats_products WHERE is_active = true'
    );
    const activeProducts = parseInt(activeResult.rows[0].count);
    console.log(`✅ Active products: ${activeProducts}`);

    const inactiveResult = await client.query(
      'SELECT COUNT(*) as count FROM lats_products WHERE is_active = false'
    );
    const inactiveProducts = parseInt(inactiveResult.rows[0].count);
    console.log(`⏸️  Inactive products: ${inactiveProducts}\n`);

    // 2. Products by branch_id
    console.log('2️⃣ PRODUCTS BY BRANCH_ID');
    console.log('-'.repeat(60));
    const nullBranchResult = await client.query(
      'SELECT COUNT(*) as count FROM lats_products WHERE branch_id IS NULL'
    );
    const nullBranchProducts = parseInt(nullBranchResult.rows[0].count);
    console.log(`❓ Products with NULL branch_id: ${nullBranchProducts}`);

    const activeNullBranchResult = await client.query(
      'SELECT COUNT(*) as count FROM lats_products WHERE branch_id IS NULL AND is_active = true'
    );
    const activeNullBranchProducts = parseInt(activeNullBranchResult.rows[0].count);
    console.log(`✅ Active products with NULL branch_id: ${activeNullBranchProducts}\n`);

    // Get branch distribution
    const branchDistResult = await client.query(`
      SELECT 
        COALESCE(branch_id::TEXT, 'NULL') as branch_id,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active
      FROM lats_products
      GROUP BY branch_id
      ORDER BY total DESC
      LIMIT 10
    `);
    
    if (branchDistResult.rows.length > 0) {
      console.log('📊 Products by branch (top 10):');
      branchDistResult.rows.forEach((row, i) => {
        console.log(`   ${i + 1}. Branch ${row.branch_id}: ${row.total} total (${row.active} active)`);
      });
      console.log('');
    }

    // 3. Shared products
    console.log('3️⃣ SHARED PRODUCTS');
    console.log('-'.repeat(60));
    const sharedResult = await client.query(
      'SELECT COUNT(*) as count FROM lats_products WHERE is_shared = true'
    );
    const sharedProducts = parseInt(sharedResult.rows[0].count);
    console.log(`🔗 Shared products (is_shared = true): ${sharedProducts}`);

    const activeSharedResult = await client.query(
      'SELECT COUNT(*) as count FROM lats_products WHERE is_shared = true AND is_active = true'
    );
    const activeSharedProducts = parseInt(activeSharedResult.rows[0].count);
    console.log(`✅ Active shared products: ${activeSharedProducts}\n`);

    // 4. Sample products
    console.log('4️⃣ SAMPLE PRODUCTS (first 5)');
    console.log('-'.repeat(60));
    const sampleResult = await client.query(`
      SELECT id, name, branch_id, is_active, is_shared, created_at
      FROM lats_products
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    if (sampleResult.rows.length > 0) {
      sampleResult.rows.forEach((row, i) => {
        console.log(`   ${i + 1}. ${row.name}`);
        console.log(`      ID: ${row.id}`);
        console.log(`      branch_id: ${row.branch_id || 'NULL'}`);
        console.log(`      is_active: ${row.is_active}`);
        console.log(`      is_shared: ${row.is_shared || 'NULL'}`);
        console.log(`      created_at: ${row.created_at}`);
        console.log('');
      });
    } else {
      console.log('   ⚠️  No products found in database\n');
    }

    // 5. Branch settings
    console.log('5️⃣ BRANCH SETTINGS');
    console.log('-'.repeat(60));
    const branchesResult = await client.query(`
      SELECT id, name, code, data_isolation_mode, share_products, share_inventory, is_active
      FROM store_locations
      WHERE is_active = true
      ORDER BY name
      LIMIT 10
    `);
    
    if (branchesResult.rows.length > 0) {
      console.log('📋 Active branches:');
      branchesResult.rows.forEach((row, i) => {
        console.log(`   ${i + 1}. ${row.name} (${row.code || 'no code'})`);
        console.log(`      ID: ${row.id}`);
        console.log(`      data_isolation_mode: ${row.data_isolation_mode || 'NULL'}`);
        console.log(`      share_products: ${row.share_products || 'NULL'}`);
        console.log(`      share_inventory: ${row.share_inventory || 'NULL'}`);
        console.log('');
      });
    } else {
      console.log('   ⚠️  No active branches found\n');
    }

    // 6. Recommendations
    console.log('6️⃣ RECOMMENDATIONS');
    console.log('-'.repeat(60));
    
    if (totalProducts === 0) {
      console.log('❌ No products exist in database.');
      console.log('   → Import or create products first.\n');
    } else if (activeProducts === 0) {
      console.log('❌ All products are inactive.');
      console.log('   → Run: UPDATE lats_products SET is_active = true WHERE is_active = false;\n');
    } else if (activeNullBranchProducts === 0 && nullBranchProducts > 0) {
      console.log('⚠️  Products with NULL branch_id exist but are inactive.');
      console.log('   → Activate them: UPDATE lats_products SET is_active = true WHERE branch_id IS NULL;\n');
    } else if (activeProducts > 0) {
      console.log('✅ Active products exist in database.');
      console.log('   → Check branch filtering logic in getProducts() function.');
      console.log('   → Verify branch settings match your current branch.');
      console.log('   → Check if data_isolation_mode is too restrictive.\n');
    }

    // 7. Test query that matches getProducts() logic
    console.log('7️⃣ TESTING getProducts() QUERY LOGIC');
    console.log('-'.repeat(60));
    
    // Test the exact query that getProducts() would run
    const testQuery = `
      SELECT id, name, branch_id, is_active, is_shared
      FROM lats_products
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    const testResult = await client.query(testQuery);
    console.log(`📊 Products matching is_active = true: ${testResult.rows.length}`);
    
    if (testResult.rows.length > 0) {
      console.log('   Sample results:');
      testResult.rows.slice(0, 3).forEach((row, i) => {
        console.log(`   ${i + 1}. ${row.name} (branch_id: ${row.branch_id || 'NULL'})`);
      });
    } else {
      console.log('   ⚠️  No products match is_active = true');
    }
    console.log('');

    // Test with branch filter (if we have a branch)
    if (branchesResult.rows.length > 0) {
      const firstBranch = branchesResult.rows[0];
      console.log(`   Testing with branch filter (${firstBranch.name}):`);
      
      const branchTestQuery = `
        SELECT id, name, branch_id, is_active
        FROM lats_products
        WHERE is_active = true
          AND (branch_id = $1 OR branch_id IS NULL)
        ORDER BY created_at DESC
        LIMIT 10
      `;
      
      const branchTestResult = await client.query(branchTestQuery, [firstBranch.id]);
      console.log(`   Products matching branch filter: ${branchTestResult.rows.length}`);
      
      if (branchTestResult.rows.length > 0) {
        console.log('   Sample results:');
        branchTestResult.rows.slice(0, 3).forEach((row, i) => {
          console.log(`   ${i + 1}. ${row.name} (branch_id: ${row.branch_id || 'NULL'})`);
        });
      }
      console.log('');
    }

    console.log('='.repeat(60));
    console.log('✅ Diagnosis complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Details:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the diagnosis
diagnoseProductsIssue().catch(console.error);
