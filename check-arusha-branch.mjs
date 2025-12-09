#!/usr/bin/env node

/**
 * Check and fix Arusha branch product visibility
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
    console.log('🔍 Checking Arusha Branch Visibility');
    console.log('='.repeat(60));

    await pool.query('SELECT 1');
    console.log('✅ Database connection successful\n');

    // Find Arusha branch
    const arushaBranchResult = await pool.query(`
      SELECT id, name, is_active
      FROM lats_branches
      WHERE name ILIKE '%arusha%' OR name ILIKE '%arusha%'
      ORDER BY name
    `);
    
    if (arushaBranchResult.rows.length === 0) {
      // Try store_locations
      const storeLocResult = await pool.query(`
        SELECT id, name, is_active
        FROM store_locations
        WHERE name ILIKE '%arusha%'
        ORDER BY name
      `);
      
      if (storeLocResult.rows.length > 0) {
        arushaBranchResult.rows = storeLocResult.rows;
      }
    }

    if (arushaBranchResult.rows.length === 0) {
      console.log('❌ Arusha branch not found!');
      console.log('\n📋 Available branches:');
      const allBranches = await pool.query(`
        SELECT id, name, is_active FROM lats_branches ORDER BY name
      `);
      allBranches.rows.forEach(b => {
        console.log(`   - ${b.name} (${b.id})`);
      });
      process.exit(1);
    }

    const arushaBranch = arushaBranchResult.rows[0];
    console.log(`📍 Arusha Branch: ${arushaBranch.name} (${arushaBranch.id})\n`);

    // Get branch settings
    let branchSettings = {
      data_isolation_mode: 'hybrid',
      share_products: false,
      share_inventory: false
    };
    
    try {
      const settingsResult = await pool.query(`
        SELECT data_isolation_mode, share_products, share_inventory
        FROM store_locations
        WHERE id = $1
      `, [arushaBranch.id]);
      
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

    console.log('📊 Current Branch Settings:');
    console.log(`   Isolation Mode: ${branchSettings.data_isolation_mode}`);
    console.log(`   Share Products: ${branchSettings.share_products}`);
    console.log(`   Share Inventory: ${branchSettings.share_inventory}\n`);

    // Count products visible to Arusha
    let productsQuery;
    if (branchSettings.data_isolation_mode === 'isolated') {
      productsQuery = `
        SELECT COUNT(*) as count
        FROM lats_products
        WHERE is_active = true
          AND branch_id = $1
      `;
    } else if (branchSettings.data_isolation_mode === 'shared') {
      productsQuery = `
        SELECT COUNT(*) as count
        FROM lats_products
        WHERE is_active = true
      `;
    } else {
      // HYBRID
      if (branchSettings.share_products) {
        productsQuery = `
          SELECT COUNT(*) as count
          FROM lats_products
          WHERE is_active = true
        `;
      } else {
        productsQuery = `
          SELECT COUNT(*) as count
          FROM lats_products
          WHERE is_active = true
            AND branch_id = $1
        `;
      }
    }

    const visibleProductsResult = await pool.query(productsQuery, [arushaBranch.id]);
    const visibleProducts = parseInt(visibleProductsResult.rows[0].count);

    // Count products assigned to Arusha
    const arushaProductsResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM lats_products
      WHERE is_active = true
        AND branch_id = $1
    `, [arushaBranch.id]);
    const arushaProducts = parseInt(arushaProductsResult.rows[0].count);

    // Count total products
    const totalProductsResult = await pool.query(`
      SELECT COUNT(*) as count FROM lats_products WHERE is_active = true
    `);
    const totalProducts = parseInt(totalProductsResult.rows[0].count);

    console.log('='.repeat(60));
    console.log('📊 PRODUCT VISIBILITY FOR ARUSHA');
    console.log('='.repeat(60));
    console.log(`Total products in database: ${totalProducts}`);
    console.log(`Products assigned to Arusha: ${arushaProducts}`);
    console.log(`Products visible to Arusha: ${visibleProducts}`);
    console.log(`Products hidden: ${totalProducts - visibleProducts}\n`);

    // Check variants
    const arushaVariantsResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM lats_product_variants
      WHERE is_active = true
        AND parent_variant_id IS NULL
        AND branch_id = $1
    `, [arushaBranch.id]);
    const arushaVariants = parseInt(arushaVariantsResult.rows[0].count);

    const totalVariantsResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM lats_product_variants
      WHERE is_active = true
        AND parent_variant_id IS NULL
    `);
    const totalVariants = parseInt(totalVariantsResult.rows[0].count);

    console.log(`Variants assigned to Arusha: ${arushaVariants}`);
    console.log(`Total variants in database: ${totalVariants}\n`);

    // Fix: Update Arusha branch settings
    console.log('='.repeat(60));
    console.log('🔧 FIXING ARUSHA BRANCH SETTINGS');
    console.log('='.repeat(60));

    try {
      const tableCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'store_locations'
      `);
      
      const hasIsolationMode = tableCheck.rows.some(r => r.column_name === 'data_isolation_mode');
      const hasShareProducts = tableCheck.rows.some(r => r.column_name === 'share_products');
      const hasShareInventory = tableCheck.rows.some(r => r.column_name === 'share_inventory');
      
      if (hasIsolationMode && hasShareProducts && hasShareInventory) {
        const updateResult = await pool.query(`
          UPDATE store_locations
          SET 
            data_isolation_mode = 'hybrid',
            share_products = true,
            share_inventory = true,
            updated_at = NOW()
          WHERE id = $1
        `, [arushaBranch.id]);
        
        if (updateResult.rowCount > 0) {
          console.log(`✅ Updated Arusha branch settings:`);
          console.log(`   - data_isolation_mode: hybrid`);
          console.log(`   - share_products: true`);
          console.log(`   - share_inventory: true\n`);
        } else {
          // Try to insert if doesn't exist
          console.log('⚠️  Branch not in store_locations, trying to add...');
          try {
            await pool.query(`
              INSERT INTO store_locations (id, name, code, address, city, country, is_active, data_isolation_mode, share_products, share_inventory)
              VALUES ($1, $2, 'ARUSHA', 'Arusha', 'Arusha', 'Tanzania', true, 'hybrid', true, true)
              ON CONFLICT (id) DO UPDATE SET
                data_isolation_mode = 'hybrid',
                share_products = true,
                share_inventory = true,
                updated_at = NOW()
            `, [arushaBranch.id, arushaBranch.name]);
            console.log('✅ Added/updated Arusha branch in store_locations\n');
          } catch (insertError) {
            console.log(`⚠️  Could not insert: ${insertError.message}\n`);
          }
        }
      } else {
        console.log('⚠️  store_locations table missing required columns\n');
      }
    } catch (error) {
      console.log(`⚠️  Could not update branch settings: ${error.message}\n`);
    }

    // Also check if we need to reassign products to Arusha
    if (arushaProducts < totalProducts && !branchSettings.share_products) {
      console.log('='.repeat(60));
      console.log('🔄 REASSIGNING PRODUCTS TO ARUSHA');
      console.log('='.repeat(60));
      console.log(`About to reassign ${totalProducts - arushaProducts} products to Arusha branch...\n`);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const reassignResult = await pool.query(`
        UPDATE lats_products
        SET 
          branch_id = $1,
          updated_at = NOW()
        WHERE is_active = true
          AND (branch_id IS NULL OR branch_id != $1)
      `, [arushaBranch.id]);
      
      console.log(`✅ Reassigned ${reassignResult.rowCount} products to Arusha\n`);
      
      // Reassign variants too
      const variantReassignResult = await pool.query(`
        UPDATE lats_product_variants
        SET 
          branch_id = $1,
          updated_at = NOW()
        WHERE is_active = true
          AND (branch_id IS NULL OR branch_id != $1)
      `, [arushaBranch.id]);
      
      console.log(`✅ Reassigned ${variantReassignResult.rowCount} variants to Arusha\n`);
    }

    // Final verification
    console.log('='.repeat(60));
    console.log('🔍 FINAL VERIFICATION');
    console.log('='.repeat(60));
    
    const finalProductsResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM lats_products
      WHERE is_active = true
    `);
    const finalVisible = parseInt(finalProductsResult.rows[0].count);
    
    console.log(`Products that should be visible: ${finalVisible}`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)`);
    console.log(`   2. Make sure you're logged in to Arusha branch`);
    console.log(`   3. You should now see all ${finalVisible} products`);
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
