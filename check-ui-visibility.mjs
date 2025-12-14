#!/usr/bin/env node

/**
 * Check why only 55 products are visible in UI when there are 387 in database
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
    console.log('🔍 Checking UI Visibility Issues');
    console.log('='.repeat(60));

    // Test database connection
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful\n');

    // Get current branch (first active branch as default)
    const branchResult = await pool.query(`
      SELECT id, name FROM lats_branches WHERE is_active = true LIMIT 1
    `);
    const currentBranchId = branchResult.rows[0]?.id;
    const currentBranchName = branchResult.rows[0]?.name || 'Unknown';
    
    console.log(`📍 Current Branch: ${currentBranchName} (${currentBranchId})\n`);

    // Get branch settings
    let branchSettings = {
      data_isolation_mode: 'hybrid', // default
      share_products: false, // default
      share_inventory: false // default
    };
    
    try {
      const settingsResult = await pool.query(`
        SELECT data_isolation_mode, share_products, share_inventory
        FROM store_locations
        WHERE id = $1
      `, [currentBranchId]);
      
      if (settingsResult.rows.length > 0) {
        branchSettings = {
          data_isolation_mode: settingsResult.rows[0].data_isolation_mode || 'hybrid',
          share_products: settingsResult.rows[0].share_products !== null ? settingsResult.rows[0].share_products : false,
          share_inventory: settingsResult.rows[0].share_inventory !== null ? settingsResult.rows[0].share_inventory : false
        };
      }
    } catch (error) {
      console.log('⚠️  Using default branch settings\n');
    }

    console.log('📊 Branch Settings:');
    console.log(`   Isolation Mode: ${branchSettings.data_isolation_mode}`);
    console.log(`   Share Products: ${branchSettings.share_products}`);
    console.log(`   Share Inventory: ${branchSettings.share_inventory}\n`);

    // Count total products
    const totalProductsResult = await pool.query(`
      SELECT COUNT(*) as count FROM lats_products WHERE is_active = true
    `);
    const totalProducts = parseInt(totalProductsResult.rows[0].count);

    // Count products visible based on branch settings
    let productsQuery;
    if (branchSettings.data_isolation_mode === 'isolated') {
      // ISOLATED: Only branch products
      productsQuery = `
        SELECT COUNT(*) as count
        FROM lats_products
        WHERE is_active = true
          AND branch_id = $1
      `;
    } else if (branchSettings.data_isolation_mode === 'shared') {
      // SHARED: All products
      productsQuery = `
        SELECT COUNT(*) as count
        FROM lats_products
        WHERE is_active = true
      `;
    } else {
      // HYBRID: Based on share_products flag
      if (branchSettings.share_products) {
        // Products are shared - show all
        productsQuery = `
          SELECT COUNT(*) as count
          FROM lats_products
          WHERE is_active = true
        `;
      } else {
        // Products are NOT shared - only branch products
        productsQuery = `
          SELECT COUNT(*) as count
          FROM lats_products
          WHERE is_active = true
            AND branch_id = $1
        `;
      }
    }

    const visibleProductsResult = await pool.query(productsQuery, currentBranchId ? [currentBranchId] : []);
    const visibleProducts = parseInt(visibleProductsResult.rows[0].count);

    console.log('='.repeat(60));
    console.log('📊 PRODUCT VISIBILITY');
    console.log('='.repeat(60));
    console.log(`Total products in database: ${totalProducts}`);
    console.log(`Products visible to current branch: ${visibleProducts}`);
    console.log(`Products hidden: ${totalProducts - visibleProducts}\n`);

    // Check variants visibility
    const productIdsResult = await pool.query(`
      SELECT id FROM lats_products WHERE is_active = true LIMIT 100
    `);
    const productIds = productIdsResult.rows.map(r => r.id);

    // Count total variants
    const totalVariantsResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM lats_product_variants
      WHERE product_id = ANY($1::uuid[])
        AND is_active = true
        AND parent_variant_id IS NULL
    `, [productIds]);
    const totalVariants = parseInt(totalVariantsResult.rows[0].count);

    // Count variants visible based on branch settings
    let variantsQuery;
    if (branchSettings.data_isolation_mode === 'isolated') {
      variantsQuery = `
        SELECT COUNT(*) as count
        FROM lats_product_variants
        WHERE product_id = ANY($1::uuid[])
          AND is_active = true
          AND parent_variant_id IS NULL
          AND branch_id = $2
      `;
    } else if (branchSettings.data_isolation_mode === 'shared') {
      variantsQuery = `
        SELECT COUNT(*) as count
        FROM lats_product_variants
        WHERE product_id = ANY($1::uuid[])
          AND is_active = true
          AND parent_variant_id IS NULL
      `;
    } else {
      // HYBRID: Based on share_inventory flag
      if (branchSettings.share_inventory) {
        variantsQuery = `
          SELECT COUNT(*) as count
          FROM lats_product_variants
          WHERE product_id = ANY($1::uuid[])
            AND is_active = true
            AND parent_variant_id IS NULL
            AND (branch_id = $2 OR is_shared = true OR branch_id IS NULL)
        `;
      } else {
        variantsQuery = `
          SELECT COUNT(*) as count
          FROM lats_product_variants
          WHERE product_id = ANY($1::uuid[])
            AND is_active = true
            AND parent_variant_id IS NULL
            AND branch_id = $2
        `;
      }
    }

    const visibleVariantsResult = await pool.query(
      variantsQuery, 
      currentBranchId ? [productIds, currentBranchId] : [productIds]
    );
    const visibleVariants = parseInt(visibleVariantsResult.rows[0].count);

    console.log('='.repeat(60));
    console.log('📊 VARIANT VISIBILITY');
    console.log('='.repeat(60));
    console.log(`Total variants in database: ${totalVariants}`);
    console.log(`Variants visible to current branch: ${visibleVariants}`);
    console.log(`Variants hidden: ${totalVariants - visibleVariants}\n`);

    // Check specific products mentioned in UI
    const uiProducts = [
      'Macbook Pro 2019',
      'Wking T8',
      'Macbook Pro Air A1465',
      'Macbook Pro 2018 A1990',
      'Macbook Air 2020 A2337',
      'Macbook Pro A1708',
      'T8 W king',
      'JBL Partybox On The Go Essential',
      'JBL Soundbar 2.1 Deep Bass MK2'
    ];

    console.log('='.repeat(60));
    console.log('🔍 CHECKING UI PRODUCTS');
    console.log('='.repeat(60));
    
    for (const productName of uiProducts) {
      const productResult = await pool.query(`
        SELECT 
          p.id,
          p.name,
          p.branch_id,
          p.is_shared,
          COUNT(v.id) as variant_count
        FROM lats_products p
        LEFT JOIN lats_product_variants v ON v.product_id = p.id 
          AND v.is_active = true 
          AND v.parent_variant_id IS NULL
          ${currentBranchId && !branchSettings.share_inventory ? `AND v.branch_id = '${currentBranchId}'` : ''}
        WHERE p.name ILIKE $1
          AND p.is_active = true
        GROUP BY p.id, p.name, p.branch_id, p.is_shared
        LIMIT 1
      `, [`%${productName}%`]);
      
      if (productResult.rows.length > 0) {
        const product = productResult.rows[0];
        console.log(`\n${product.name}:`);
        console.log(`   Branch ID: ${product.branch_id}`);
        console.log(`   Is Shared: ${product.is_shared}`);
        console.log(`   Variants (visible): ${product.variant_count}`);
        
        // Check if product should be visible
        let shouldBeVisible = false;
        if (branchSettings.data_isolation_mode === 'shared') {
          shouldBeVisible = true;
        } else if (branchSettings.data_isolation_mode === 'isolated') {
          shouldBeVisible = product.branch_id === currentBranchId;
        } else {
          if (branchSettings.share_products) {
            shouldBeVisible = true;
          } else {
            shouldBeVisible = product.branch_id === currentBranchId;
          }
        }
        console.log(`   Should be visible: ${shouldBeVisible ? '✅' : '❌'}`);
      }
    }

    // Check variant branch_id distribution
    const variantBranchResult = await pool.query(`
      SELECT 
        branch_id,
        COUNT(*) as count
      FROM lats_product_variants
      WHERE is_active = true
        AND parent_variant_id IS NULL
      GROUP BY branch_id
      ORDER BY count DESC
      LIMIT 10
    `);

    console.log('\n' + '='.repeat(60));
    console.log('📊 VARIANT BRANCH DISTRIBUTION');
    console.log('='.repeat(60));
    variantBranchResult.rows.forEach(row => {
      console.log(`Branch ${row.branch_id || 'NULL'}: ${row.count} variants`);
    });

    // Summary and recommendations
    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY & RECOMMENDATIONS');
    console.log('='.repeat(60));
    
    if (visibleProducts < totalProducts) {
      console.log(`\n⚠️  ISSUE: Only ${visibleProducts} of ${totalProducts} products are visible`);
      console.log(`   Reason: Branch isolation is filtering products`);
      if (branchSettings.data_isolation_mode === 'hybrid' && !branchSettings.share_products) {
        console.log(`   Solution: Set share_products = true in branch settings`);
      } else if (branchSettings.data_isolation_mode === 'isolated') {
        console.log(`   Solution: Change data_isolation_mode to 'shared' or 'hybrid'`);
      }
    }

    if (visibleVariants < totalVariants) {
      console.log(`\n⚠️  ISSUE: Only ${visibleVariants} of ${totalVariants} variants are visible`);
      console.log(`   Reason: Branch isolation is filtering variants`);
      if (branchSettings.data_isolation_mode === 'hybrid' && !branchSettings.share_inventory) {
        console.log(`   Solution: Set share_inventory = true in branch settings`);
      } else if (branchSettings.data_isolation_mode === 'isolated') {
        console.log(`   Solution: Change data_isolation_mode to 'shared' or 'hybrid'`);
      }
    }

    if (visibleProducts === totalProducts && visibleVariants === totalVariants) {
      console.log(`\n✅ All products and variants should be visible!`);
      console.log(`   If you're still seeing only 55 products, check:`);
      console.log(`   1. Browser cache - try hard refresh (Ctrl+Shift+R)`);
      console.log(`   2. Check if there's a search/filter applied in the UI`);
      console.log(`   3. Check browser console for errors`);
    }

    console.log('='.repeat(60));

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
