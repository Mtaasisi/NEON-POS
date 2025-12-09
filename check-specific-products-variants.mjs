#!/usr/bin/env node

/**
 * Check Specific Products Variants by Branch
 * Focuses on the products mentioned by the user
 */

import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env.production') });

const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || 
  'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const pool = new Pool({ connectionString: DATABASE_URL });

async function checkSpecificProducts() {
  try {
    // Get all branches
    const branchesResult = await pool.query(`
      SELECT id, name, code FROM store_locations ORDER BY name
    `);
    const branches = branchesResult.rows;
    
    console.log('📦 Available Branches:');
    branches.forEach(b => {
      console.log(`   - ${b.name} (${b.code || 'No code'}) - ID: ${b.id}`);
    });
    console.log('');

    // Products to check
    const productsToCheck = [
      'Samsung HW-Q800T',
      'Onn 5.1.2 Atmos',
      'Vizio S3821-C0',
      'Vizio SB2021-J6',
      'Samsung HW-B63C',
      'Samsung HW-K551/2N',
      'Samsung Ps-WK450'
    ];

    console.log('='.repeat(80));
    console.log('🔍 Checking Products Without Variants by Branch');
    console.log('='.repeat(80));
    console.log('');

    for (const productName of productsToCheck) {
      console.log(`\n${'─'.repeat(80)}`);
      console.log(`📦 Product: ${productName}`);
      console.log(`${'─'.repeat(80)}`);

      // Find the product
      const productResult = await pool.query(`
        SELECT 
          p.id,
          p.name,
          p.sku,
          p.branch_id as product_branch_id,
          p.is_shared,
          p.visible_to_branches
        FROM lats_products p
        WHERE p.name ILIKE $1
          AND p.is_active = true
        LIMIT 1
      `, [`%${productName}%`]);

      if (productResult.rows.length === 0) {
        console.log(`   ❌ Product not found`);
        continue;
      }

      const product = productResult.rows[0];
      console.log(`   SKU: ${product.sku || 'No SKU'}`);
      console.log(`   Product Branch ID: ${product.product_branch_id || 'NULL'}`);
      console.log(`   Is Shared: ${product.is_shared || false}`);
      console.log(`   Visible to Branches: ${product.visible_to_branches || 'NULL'}`);

      // Check variants per branch
      const variantsResult = await pool.query(`
        SELECT 
          v.id,
          v.name,
          v.branch_id,
          b.name as branch_name,
          b.code as branch_code,
          v.quantity,
          v.is_active,
          v.is_shared
        FROM lats_product_variants v
        LEFT JOIN store_locations b ON v.branch_id = b.id
        WHERE v.product_id = $1
        ORDER BY b.name, v.name
      `, [product.id]);

      if (variantsResult.rows.length === 0) {
        console.log(`   ⚠️  NO VARIANTS in ANY branch`);
      } else {
        console.log(`   ✅ Variants (${variantsResult.rows.length} total):`);
        
        // Group by branch
        const variantsByBranch = {};
        variantsResult.rows.forEach(v => {
          const branchKey = v.branch_name || v.branch_id || 'Unknown';
          if (!variantsByBranch[branchKey]) {
            variantsByBranch[branchKey] = [];
          }
          variantsByBranch[branchKey].push(v);
        });

        Object.keys(variantsByBranch).forEach(branchName => {
          const branchVariants = variantsByBranch[branchName];
          console.log(`      📍 ${branchName}: ${branchVariants.length} variant(s)`);
          branchVariants.forEach(v => {
            console.log(`         - ${v.name} (Qty: ${v.quantity}, Active: ${v.is_active}, Shared: ${v.is_shared})`);
          });
        });

        // Check which branches DON'T have variants
        console.log(`\n   🔍 Branches WITHOUT variants for this product:`);
        const branchesWithoutVariants = branches.filter(b => {
          return !variantsResult.rows.some(v => v.branch_id === b.id);
        });

        if (branchesWithoutVariants.length > 0) {
          branchesWithoutVariants.forEach(b => {
            console.log(`      ⚠️  ${b.name} (${b.code || 'No code'})`);
          });
        } else {
          console.log(`      ✅ All branches have variants`);
        }
      }
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log('📊 Summary');
    console.log(`${'='.repeat(80)}`);
    console.log('\n💡 Note: Products may show 0 variants when viewing from a branch');
    console.log('   that doesn\'t have variants assigned to it, even if variants');
    console.log('   exist in other branches. This is due to branch-specific variant filtering.\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkSpecificProducts();
