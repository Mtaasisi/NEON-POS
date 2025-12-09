#!/usr/bin/env node

/**
 * Fix product visibility by updating branch settings or reassigning products/variants
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
    console.log('🔧 Fixing Product Visibility');
    console.log('='.repeat(60));

    await pool.query('SELECT 1');
    console.log('✅ Database connection successful\n');

    // Get main branch
    const branchResult = await pool.query(`
      SELECT id, name FROM lats_branches 
      WHERE id = '00000000-0000-0000-0000-000000000001' OR is_active = true
      ORDER BY CASE WHEN id = '00000000-0000-0000-0000-000000000001' THEN 0 ELSE 1 END
      LIMIT 1
    `);
    const mainBranchId = branchResult.rows[0]?.id;
    const mainBranchName = branchResult.rows[0]?.name || 'Main Branch';
    
    console.log(`📍 Main Branch: ${mainBranchName} (${mainBranchId})\n`);

    // Option 1: Update branch settings to share products and inventory
    console.log('='.repeat(60));
    console.log('OPTION 1: Update Branch Settings (Recommended)');
    console.log('='.repeat(60));
    console.log('This will make all products and variants visible across branches.\n');

    try {
      // Check if store_locations table exists and has the columns
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
        `, [mainBranchId]);
        
        console.log(`✅ Updated branch settings for ${mainBranchName}`);
        console.log(`   - data_isolation_mode: hybrid`);
        console.log(`   - share_products: true`);
        console.log(`   - share_inventory: true\n`);
      } else {
        console.log('⚠️  store_locations table does not have isolation columns');
        console.log('   Will use Option 2 instead\n');
      }
    } catch (error) {
      console.log(`⚠️  Could not update branch settings: ${error.message}`);
      console.log('   Will use Option 2 instead\n');
    }

    // Option 2: Reassign products and variants to main branch
    console.log('='.repeat(60));
    console.log('OPTION 2: Reassign Products & Variants to Main Branch');
    console.log('='.repeat(60));
    
    // Count products to reassign
    const productsToReassignResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM lats_products
      WHERE is_active = true
        AND branch_id != $1
        AND branch_id IS NOT NULL
    `, [mainBranchId]);
    const productsToReassign = parseInt(productsToReassignResult.rows[0].count);

    // Count variants to reassign
    const variantsToReassignResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM lats_product_variants
      WHERE is_active = true
        AND branch_id != $1
        AND branch_id IS NOT NULL
    `, [mainBranchId]);
    const variantsToReassign = parseInt(variantsToReassignResult.rows[0].count);

    console.log(`Products to reassign: ${productsToReassign}`);
    console.log(`Variants to reassign: ${variantsToReassign}\n`);

    if (productsToReassign > 0 || variantsToReassign > 0) {
      console.log('⚠️  About to reassign products and variants to main branch');
      console.log('   Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Reassign products
      if (productsToReassign > 0) {
        const productUpdateResult = await pool.query(`
          UPDATE lats_products
          SET 
            branch_id = $1,
            updated_at = NOW()
          WHERE is_active = true
            AND branch_id != $1
            AND branch_id IS NOT NULL
        `, [mainBranchId]);
        
        console.log(`✅ Reassigned ${productUpdateResult.rowCount} products to ${mainBranchName}`);
      }

      // Reassign variants
      if (variantsToReassign > 0) {
        const variantUpdateResult = await pool.query(`
          UPDATE lats_product_variants
          SET 
            branch_id = $1,
            updated_at = NOW()
          WHERE is_active = true
            AND branch_id != $1
            AND branch_id IS NOT NULL
        `, [mainBranchId]);
        
        console.log(`✅ Reassigned ${variantUpdateResult.rowCount} variants to ${mainBranchName}`);
      }
    } else {
      console.log('✅ All products and variants are already assigned to main branch');
    }

    // Verify
    console.log('\n' + '='.repeat(60));
    console.log('🔍 VERIFICATION');
    console.log('='.repeat(60));
    
    const finalProductsResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM lats_products
      WHERE is_active = true
        AND branch_id = $1
    `, [mainBranchId]);
    const finalProducts = parseInt(finalProductsResult.rows[0].count);

    const finalVariantsResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM lats_product_variants
      WHERE is_active = true
        AND parent_variant_id IS NULL
        AND branch_id = $1
    `, [mainBranchId]);
    const finalVariants = parseInt(finalVariantsResult.rows[0].count);

    console.log(`Products in ${mainBranchName}: ${finalProducts}`);
    console.log(`Variants in ${mainBranchName}: ${finalVariants}\n`);

    console.log('='.repeat(60));
    console.log('📋 SUMMARY');
    console.log('='.repeat(60));
    console.log('✅ Fix applied!');
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Refresh your browser (hard refresh: Ctrl+Shift+R)`);
    console.log(`   2. You should now see all ${finalProducts} products`);
    console.log(`   3. All products should show their variants`);
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
