#!/usr/bin/env node

/**
 * Check Products Branch ID
 * 
 * This script checks:
 * 1. Which branches exist in the database
 * 2. Which branch was assigned to imported products
 * 3. If all products have a branch_id
 */

import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.production') });

// Database configuration
const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || 
  'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const pool = new Pool({ connectionString: DATABASE_URL });

async function checkBranchesAndProducts() {
  let branches = [];
  
  try {
    console.log('🔍 Checking branches and products...\n');

    // 1. Get all branches
    console.log('📋 Fetching all branches...');
    try {
      const branchesResult = await pool.query('SELECT id, name, is_active, created_at FROM lats_branches ORDER BY created_at');
      branches = branchesResult.rows;
      
      console.log(`✅ Found ${branches.length} branches:\n`);
      branches.forEach((branch, idx) => {
        console.log(`   ${idx + 1}. ${branch.name || 'Unnamed'}`);
        console.log(`      ID: ${branch.id}`);
        console.log(`      Active: ${branch.is_active ? 'Yes' : 'No'}`);
        console.log(`      Created: ${branch.created_at ? new Date(branch.created_at).toLocaleString() : 'Unknown'}`);
        console.log('');
      });
    } catch (error) {
      console.log('⚠️  Could not fetch from lats_branches, trying store_locations...');
      const branchesResult = await pool.query('SELECT id, name, is_active, created_at FROM store_locations ORDER BY created_at');
      branches = branchesResult.rows;
      
      console.log(`✅ Found ${branches.length} branches (from store_locations):\n`);
      branches.forEach((branch, idx) => {
        console.log(`   ${idx + 1}. ${branch.name || 'Unnamed'}`);
        console.log(`      ID: ${branch.id}`);
        console.log(`      Active: ${branch.is_active ? 'Yes' : 'No'}`);
        console.log(`      Created: ${branch.created_at ? new Date(branch.created_at).toLocaleString() : 'Unknown'}`);
        console.log('');
      });
    }

    // 2. Check products by branch
    console.log('📦 Checking products by branch...\n');
    
    for (const branch of branches) {
      const productsResult = await pool.query(
        'SELECT COUNT(*) as count FROM lats_products WHERE branch_id = $1',
        [branch.id]
      );
      const count = parseInt(productsResult.rows[0].count);
      console.log(`   ${branch.name}: ${count} products`);
    }

    // 3. Check products without branch_id
    console.log('\n🔍 Checking products without branch_id...');
    const noBranchResult = await pool.query(
      'SELECT COUNT(*) as count FROM lats_products WHERE branch_id IS NULL'
    );
    const noBranchCount = parseInt(noBranchResult.rows[0].count);
    
    if (noBranchCount > 0) {
      console.log(`   ⚠️  Found ${noBranchCount} products without branch_id\n`);
      
      // Get sample products without branch_id
      const sampleResult = await pool.query(
        'SELECT id, name, sku FROM lats_products WHERE branch_id IS NULL LIMIT 10'
      );
      console.log('   Sample products without branch_id:');
      sampleResult.rows.forEach((product, idx) => {
        console.log(`      ${idx + 1}. ${product.name} (${product.sku || 'No SKU'}) - ID: ${product.id}`);
      });
      if (noBranchCount > 10) {
        console.log(`      ... and ${noBranchCount - 10} more`);
      }
    } else {
      console.log(`   ✅ All products have a branch_id assigned\n`);
    }

    // 4. Total products count
    const totalResult = await pool.query('SELECT COUNT(*) as count FROM lats_products');
    const totalCount = parseInt(totalResult.rows[0].count);
    console.log(`📊 Total products in database: ${totalCount}`);

    // 5. Summary by branch
    console.log('\n📊 Summary by branch:');
    console.log('='.repeat(60));
    for (const branch of branches) {
      const productsResult = await pool.query(
        'SELECT COUNT(*) as count FROM lats_products WHERE branch_id = $1',
        [branch.id]
      );
      const count = parseInt(productsResult.rows[0].count);
      const percentage = totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) : 0;
      console.log(`   ${branch.name}: ${count} products (${percentage}%)`);
    }
    if (noBranchCount > 0) {
      const percentage = totalCount > 0 ? ((noBranchCount / totalCount) * 100).toFixed(1) : 0;
      console.log(`   No Branch: ${noBranchCount} products (${percentage}%)`);
    }
    console.log('='.repeat(60));

    // 6. Check which branch was used for recent imports
    console.log('\n🕐 Recent product imports (last 10):');
    const recentResult = await pool.query(
      `SELECT p.id, p.name, p.branch_id, b.name as branch_name, p.created_at 
       FROM lats_products p 
       LEFT JOIN lats_branches b ON p.branch_id = b.id 
       ORDER BY p.created_at DESC 
       LIMIT 10`
    );
    
    recentResult.rows.forEach((product, idx) => {
      console.log(`   ${idx + 1}. ${product.name}`);
      console.log(`      Branch: ${product.branch_name || 'No branch'} (${product.branch_id || 'NULL'})`);
      console.log(`      Created: ${product.created_at ? new Date(product.created_at).toLocaleString() : 'Unknown'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the check
checkBranchesAndProducts();
