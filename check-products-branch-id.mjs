#!/usr/bin/env node

/**
 * Check if all products have branch_id
 */

import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env.production') });

const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL || 
  'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
  try {
    console.log('🔍 Checking Products Branch ID Status');
    console.log('='.repeat(60));

    // Test database connection
    console.log('🔌 Testing database connection...');
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful\n');

    // Get total products count
    const totalResult = await pool.query('SELECT COUNT(*) as count FROM lats_products');
    const totalProducts = parseInt(totalResult.rows[0].count);
    console.log(`📊 Total products: ${totalProducts}\n`);

    // Get products with branch_id
    const withBranchResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM lats_products 
      WHERE branch_id IS NOT NULL
    `);
    const withBranchId = parseInt(withBranchResult.rows[0].count);

    // Get products without branch_id
    const withoutBranchResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM lats_products 
      WHERE branch_id IS NULL
    `);
    const withoutBranchId = parseInt(withoutBranchResult.rows[0].count);

    // Get branch_id distribution
    const branchDistributionResult = await pool.query(`
      SELECT 
        branch_id,
        COUNT(*) as count
      FROM lats_products 
      WHERE branch_id IS NOT NULL
      GROUP BY branch_id
      ORDER BY count DESC
    `);
    
    // Get sample products for each branch
    const branchSamples = {};
    if (branchDistributionResult.rows.length > 0) {
      for (const row of branchDistributionResult.rows) {
        const sampleResult = await pool.query(`
          SELECT name
          FROM lats_products 
          WHERE branch_id = $1
          ORDER BY name
          LIMIT 5
        `, [row.branch_id]);
        branchSamples[row.branch_id] = sampleResult.rows.map(r => r.name).join(', ') || 'N/A';
      }
    }

    // Get sample products without branch_id
    const productsWithoutBranchResult = await pool.query(`
      SELECT id, name, sku, created_at
      FROM lats_products 
      WHERE branch_id IS NULL
      LIMIT 10
    `);

    console.log('='.repeat(60));
    console.log('📊 BRANCH ID STATUS');
    console.log('='.repeat(60));
    console.log(`✅ Products WITH branch_id: ${withBranchId}`);
    console.log(`❌ Products WITHOUT branch_id: ${withoutBranchId}`);
    console.log(`📦 Total products: ${totalProducts}`);
    
    if (withoutBranchId > 0) {
      const percentage = ((withoutBranchId / totalProducts) * 100).toFixed(2);
      console.log(`⚠️  ${percentage}% of products are missing branch_id\n`);
    } else {
      console.log(`✅ All products have branch_id!\n`);
    }

    if (branchDistributionResult.rows.length > 0) {
      console.log('='.repeat(60));
      console.log('📊 BRANCH DISTRIBUTION');
      console.log('='.repeat(60));
      branchDistributionResult.rows.forEach((row, idx) => {
        console.log(`\n${idx + 1}. Branch ID: ${row.branch_id}`);
        console.log(`   Products: ${row.count}`);
        console.log(`   Sample: ${branchSamples[row.branch_id] || 'N/A'}`);
      });
      console.log('\n');
    }

    if (productsWithoutBranchResult.rows.length > 0) {
      console.log('='.repeat(60));
      console.log('❌ PRODUCTS WITHOUT BRANCH_ID (Sample)');
      console.log('='.repeat(60));
      productsWithoutBranchResult.rows.forEach((row, idx) => {
        console.log(`${idx + 1}. ${row.name} (${row.sku || 'No SKU'}) - ID: ${row.id}`);
      });
      console.log('\n');
    }

    // Summary
    console.log('='.repeat(60));
    console.log('📋 SUMMARY');
    console.log('='.repeat(60));
    if (withoutBranchId === 0) {
      console.log('✅ SUCCESS: All products have branch_id assigned!');
    } else {
      console.log(`⚠️  WARNING: ${withoutBranchId} products are missing branch_id`);
      console.log('   Consider running a script to assign branch_id to these products.');
    }
    console.log('='.repeat(60));

    process.exit(withoutBranchId === 0 ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
