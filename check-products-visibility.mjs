#!/usr/bin/env node

/**
 * Check if all products are visible in the database
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
    console.log('🔍 Checking Products Visibility in Database');
    console.log('='.repeat(60));

    // Test database connection
    console.log('🔌 Testing database connection...');
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful\n');

    // Get all branches - check both lats_branches and store_locations
    let branchesResult;
    try {
      branchesResult = await pool.query(`
        SELECT id, name, is_active
        FROM lats_branches
        WHERE is_active = true
        ORDER BY name
      `);
    } catch (error) {
      // Try store_locations if lats_branches doesn't exist
      branchesResult = await pool.query(`
        SELECT id, name, is_active
        FROM store_locations
        WHERE is_active = true
        ORDER BY name
      `);
    }
    
    // Get branch settings from store_locations if available
    let branchSettings = {};
    try {
      // First check if store_locations table exists and has the columns
      const tableCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'store_locations'
      `);
      
      const hasIsolationMode = tableCheck.rows.some(r => r.column_name === 'data_isolation_mode');
      const hasShareProducts = tableCheck.rows.some(r => r.column_name === 'share_products');
      
      if (hasIsolationMode && hasShareProducts) {
        const settingsResult = await pool.query(`
          SELECT id, data_isolation_mode, share_products
          FROM store_locations
          WHERE is_active = true
        `);
        settingsResult.rows.forEach(row => {
          branchSettings[row.id] = {
            data_isolation_mode: row.data_isolation_mode,
            share_products: row.share_products
          };
        });
      } else {
        console.log('⚠️  store_locations table does not have isolation columns');
      }
    } catch (error) {
      console.log('⚠️  Could not fetch branch settings:', error.message);
    }
    
    const branches = branchesResult.rows.map(branch => ({
      ...branch,
      data_isolation_mode: branchSettings[branch.id]?.data_isolation_mode || null,
      share_products: branchSettings[branch.id]?.share_products || null
    }));
    console.log(`📊 Found ${branches.length} active branches\n`);

    // Get total products count
    const totalProductsResult = await pool.query(`
      SELECT COUNT(*) as count FROM lats_products WHERE is_active = true
    `);
    const totalProducts = parseInt(totalProductsResult.rows[0].count);
    console.log(`📦 Total active products: ${totalProducts}\n`);

    // Check products by branch
    console.log('='.repeat(60));
    console.log('📊 PRODUCTS BY BRANCH');
    console.log('='.repeat(60));
    
    for (const branch of branches) {
      // Count products for this branch
      const branchProductsResult = await pool.query(`
        SELECT COUNT(*) as count
        FROM lats_products
        WHERE is_active = true
          AND branch_id = $1
      `, [branch.id]);
      
      const branchCount = parseInt(branchProductsResult.rows[0].count);
      
      // Count shared products visible to this branch
      const sharedProductsResult = await pool.query(`
        SELECT COUNT(*) as count
        FROM lats_products
        WHERE is_active = true
          AND (
            is_shared = true
            OR (visible_to_branches IS NOT NULL AND $1 = ANY(visible_to_branches))
          )
      `, [branch.id]);
      
      const sharedCount = parseInt(sharedProductsResult.rows[0].count);
      
      // Count products visible in different modes
      // ISOLATED MODE: Only branch products
      const isolatedCount = branchCount;
      
      // SHARED MODE: All products
      const sharedModeCount = totalProducts;
      
      // HYBRID MODE: Branch products + shared products
      const hybridCount = branchCount + sharedCount;
      
      console.log(`\n📍 ${branch.name || 'Unnamed Branch'}`);
      console.log(`   ID: ${branch.id}`);
      console.log(`   Isolation Mode: ${branch.data_isolation_mode || 'NOT SET'}`);
      console.log(`   Share Products: ${branch.share_products !== null ? branch.share_products : 'NOT SET'}`);
      console.log(`   Products in branch: ${branchCount}`);
      console.log(`   Shared products visible: ${sharedCount}`);
      
      // Calculate what should be visible based on mode
      let expectedVisible = 0;
      if (branch.data_isolation_mode === 'isolated') {
        expectedVisible = isolatedCount;
        console.log(`   🔒 ISOLATED MODE: Should see ${expectedVisible} products`);
      } else if (branch.data_isolation_mode === 'shared') {
        expectedVisible = sharedModeCount;
        console.log(`   📊 SHARED MODE: Should see ${expectedVisible} products`);
      } else if (branch.data_isolation_mode === 'hybrid') {
        const shareProducts = branch.share_products === true;
        if (shareProducts) {
          expectedVisible = sharedModeCount;
          console.log(`   ⚖️  HYBRID MODE (shared): Should see ${expectedVisible} products`);
        } else {
          expectedVisible = branchCount;
          console.log(`   ⚖️  HYBRID MODE (not shared): Should see ${expectedVisible} products`);
        }
      } else {
        // Default fallback
        expectedVisible = branchCount;
        console.log(`   ⚠️  DEFAULT MODE: Should see ${expectedVisible} products`);
      }
    }

    // Check products without branch_id
    const noBranchResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM lats_products
      WHERE is_active = true AND branch_id IS NULL
    `);
    const noBranchCount = parseInt(noBranchResult.rows[0].count);
    
    if (noBranchCount > 0) {
      console.log(`\n⚠️  Products without branch_id: ${noBranchCount}`);
    }

    // Check products with variants
    const productsWithVariantsResult = await pool.query(`
      SELECT COUNT(DISTINCT p.id) as count
      FROM lats_products p
      INNER JOIN lats_product_variants v ON v.product_id = p.id
      WHERE p.is_active = true
        AND v.is_active = true
        AND v.parent_variant_id IS NULL
    `);
    const productsWithVariants = parseInt(productsWithVariantsResult.rows[0].count);
    
    console.log(`\n📊 Products with variants: ${productsWithVariants} / ${totalProducts}`);

    // Check sharing status
    const sharingStatusResult = await pool.query(`
      SELECT 
        is_shared,
        sharing_mode,
        COUNT(*) as count
      FROM lats_products
      WHERE is_active = true
      GROUP BY is_shared, sharing_mode
      ORDER BY count DESC
    `);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 SHARING STATUS');
    console.log('='.repeat(60));
    sharingStatusResult.rows.forEach(row => {
      console.log(`   is_shared: ${row.is_shared}, sharing_mode: ${row.sharing_mode || 'NULL'} → ${row.count} products`);
    });

    // Sample products from each branch
    console.log('\n' + '='.repeat(60));
    console.log('📋 SAMPLE PRODUCTS BY BRANCH');
    console.log('='.repeat(60));
    
    for (const branch of branches) {
      const sampleResult = await pool.query(`
        SELECT id, name, sku, branch_id, is_shared, sharing_mode
        FROM lats_products
        WHERE is_active = true
          AND branch_id = $1
        ORDER BY name
        LIMIT 5
      `, [branch.id]);
      
      if (sampleResult.rows.length > 0) {
        console.log(`\n📍 ${branch.name || 'Unnamed Branch'}:`);
        sampleResult.rows.forEach((product, idx) => {
          console.log(`   ${idx + 1}. ${product.name} (${product.sku || 'No SKU'})`);
          console.log(`      Shared: ${product.is_shared}, Mode: ${product.sharing_mode || 'NULL'}`);
        });
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Total active products: ${totalProducts}`);
    console.log(`✅ Products with variants: ${productsWithVariants}`);
    console.log(`✅ Active branches: ${branches.length}`);
    
    if (noBranchCount > 0) {
      console.log(`⚠️  Products without branch_id: ${noBranchCount}`);
    } else {
      console.log(`✅ All products have branch_id assigned`);
    }
    
    console.log('='.repeat(60));
    console.log('\n💡 TIP: Products visibility depends on:');
    console.log('   1. Branch isolation mode (isolated/shared/hybrid)');
    console.log('   2. Product sharing settings (is_shared, sharing_mode)');
    console.log('   3. Branch-specific share_products flag (in hybrid mode)');
    console.log('\n🎉 Check complete!');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
