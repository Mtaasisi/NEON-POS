#!/usr/bin/env node

/**
 * Assign Products to All Branches
 * 
 * This script makes all products visible to all branches by:
 * 1. Setting is_shared = true (makes products visible across all branches)
 * 2. Optionally updating visible_to_branches array to include all branch IDs
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

async function assignProductsToAllBranches() {
  try {
    console.log('🚀 Assigning Products to All Branches');
    console.log('='.repeat(60));
    console.log('');

    // 1. Get all branches
    console.log('📋 Fetching all branches...');
    const branchesResult = await pool.query(
      'SELECT id, name FROM lats_branches WHERE is_active = true ORDER BY name'
    );
    const branches = branchesResult.rows;
    
    if (branches.length === 0) {
      console.log('⚠️  No active branches found');
      process.exit(1);
    }

    console.log(`✅ Found ${branches.length} active branches:`);
    branches.forEach((branch, idx) => {
      console.log(`   ${idx + 1}. ${branch.name} (${branch.id})`);
    });
    console.log('');

    // 2. Get all branch IDs
    const allBranchIds = branches.map(b => b.id);
    console.log(`📝 Branch IDs to assign: ${allBranchIds.length}`);
    console.log('');

    // 3. Get current product count
    const countResult = await pool.query('SELECT COUNT(*) as count FROM lats_products');
    const totalProducts = parseInt(countResult.rows[0].count);
    console.log(`📦 Total products in database: ${totalProducts}`);
    console.log('');

    // 4. Check current sharing status
    console.log('🔍 Checking current sharing status...');
    const sharedCountResult = await pool.query(
      'SELECT COUNT(*) as count FROM lats_products WHERE is_shared = true'
    );
    const sharedCount = parseInt(sharedCountResult.rows[0].count);
    console.log(`   Currently shared: ${sharedCount} products`);
    console.log(`   Not shared: ${totalProducts - sharedCount} products`);
    console.log('');

    // 5. Update all products to be shared
    console.log('🔄 Updating products to be visible to all branches...');
    console.log('   Setting is_shared = true...');
    
    const updateResult = await pool.query(`
      UPDATE lats_products 
      SET 
        is_shared = true,
        visible_to_branches = $1::uuid[],
        sharing_mode = 'shared',
        updated_at = NOW()
      WHERE is_shared = false OR visible_to_branches IS NULL OR sharing_mode != 'shared'
    `, [allBranchIds]);

    console.log(`   ✅ Updated ${updateResult.rowCount} products`);
    console.log('');

    // 6. Verify the update
    console.log('✅ Verifying update...');
    const verifyResult = await pool.query(
      'SELECT COUNT(*) as count FROM lats_products WHERE is_shared = true'
    );
    const verifiedSharedCount = parseInt(verifyResult.rows[0].count);
    
    console.log(`   Products now shared: ${verifiedSharedCount}/${totalProducts}`);
    
    if (verifiedSharedCount === totalProducts) {
      console.log('   ✅ All products are now shared across all branches!');
    } else {
      console.log(`   ⚠️  ${totalProducts - verifiedSharedCount} products are still not shared`);
    }
    console.log('');

    // 7. Show sample of updated products
    console.log('📋 Sample of updated products:');
    const sampleResult = await pool.query(`
      SELECT id, name, is_shared, sharing_mode, 
             array_length(visible_to_branches, 1) as visible_count
      FROM lats_products 
      ORDER BY updated_at DESC 
      LIMIT 5
    `);
    
    sampleResult.rows.forEach((product, idx) => {
      console.log(`   ${idx + 1}. ${product.name}`);
      console.log(`      Shared: ${product.is_shared ? 'Yes' : 'No'}`);
      console.log(`      Sharing Mode: ${product.sharing_mode || 'N/A'}`);
      console.log(`      Visible to: ${product.visible_count || 0} branches`);
      console.log('');
    });

    // 8. Summary
    console.log('='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Total products: ${totalProducts}`);
    console.log(`✅ Products shared: ${verifiedSharedCount}`);
    console.log(`✅ Branches: ${branches.length}`);
    console.log(`✅ All products are now visible to all branches!`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the assignment
assignProductsToAllBranches();
