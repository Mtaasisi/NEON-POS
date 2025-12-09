#!/usr/bin/env node

/**
 * Check Products Without Variants by Branch
 * 
 * This script checks which products don't have variants for each branch.
 * This is important because variants are branch-specific.
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

async function checkProductsWithoutVariantsByBranch() {
  try {
    console.log('🔍 Checking Products Without Variants by Branch');
    console.log('='.repeat(60));
    console.log('');

    // 1. Get all branches
    const branchesResult = await pool.query(`
      SELECT id, name, code
      FROM store_locations
      ORDER BY name
    `);
    
    const branches = branchesResult.rows;
    console.log(`📦 Found ${branches.length} branches`);
    console.log('');

    // 2. Get all products
    const productsResult = await pool.query(`
      SELECT id, name, sku, branch_id
      FROM lats_products
      WHERE is_active = true
      ORDER BY name
    `);
    
    const allProducts = productsResult.rows;
    console.log(`📦 Total active products: ${allProducts.length}`);
    console.log('');

    // 3. For each branch, find products without variants
    for (const branch of branches) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📍 Branch: ${branch.name} (${branch.code || 'No code'})`);
      console.log(`${'='.repeat(60)}`);

      // Get products visible to this branch
      const productsForBranchResult = await pool.query(`
        SELECT 
          p.id,
          p.name,
          p.sku,
          p.branch_id as product_branch_id,
          COUNT(v.id) as variant_count
        FROM lats_products p
        LEFT JOIN lats_product_variants v ON p.id = v.product_id 
          AND v.branch_id = $1
          AND v.is_active = true
        WHERE p.is_active = true
          AND (
            p.branch_id = $1 
            OR p.is_shared = true 
            OR p.branch_id IS NULL
            OR $1 = ANY(p.visible_to_branches)
          )
        GROUP BY p.id, p.name, p.sku, p.branch_id
        HAVING COUNT(v.id) = 0
        ORDER BY p.name
      `, [branch.id]);

      const productsWithoutVariants = productsForBranchResult.rows;
      
      console.log(`⚠️  Products WITHOUT variants in this branch: ${productsWithoutVariants.length}`);
      
      if (productsWithoutVariants.length > 0) {
        console.log('\n📋 Products without variants:');
        productsWithoutVariants.forEach((product, idx) => {
          console.log(`   ${idx + 1}. ${product.name}`);
          console.log(`      SKU: ${product.sku || 'No SKU'}`);
          console.log(`      Product Branch ID: ${product.product_branch_id || 'NULL'}`);
        });
      } else {
        console.log('   ✅ All visible products have variants in this branch');
      }

      // Also check if these products have variants in OTHER branches
      if (productsWithoutVariants.length > 0) {
        console.log('\n🔍 Checking if these products have variants in other branches...');
        for (const product of productsWithoutVariants.slice(0, 10)) { // Limit to first 10 for readability
          const variantsInOtherBranches = await pool.query(`
            SELECT 
              v.id,
              v.name,
              v.branch_id,
              b.name as branch_name
            FROM lats_product_variants v
            LEFT JOIN store_locations b ON v.branch_id = b.id
            WHERE v.product_id = $1
              AND v.is_active = true
            ORDER BY b.name
          `, [product.id]);

          if (variantsInOtherBranches.rows.length > 0) {
            console.log(`   📦 ${product.name}:`);
            console.log(`      Has ${variantsInOtherBranches.rows.length} variant(s) in other branches:`);
            variantsInOtherBranches.rows.forEach(v => {
              console.log(`         - ${v.name} (Branch: ${v.branch_name || v.branch_id})`);
            });
          } else {
            console.log(`   📦 ${product.name}: No variants in ANY branch`);
          }
        }
      }
    }

    // 4. Summary: Products that have NO variants in ANY branch
    console.log(`\n${'='.repeat(60)}`);
    console.log('🔍 Products with NO variants in ANY branch:');
    console.log(`${'='.repeat(60)}`);
    
    const productsWithNoVariantsAnywhere = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.branch_id as product_branch_id
      FROM lats_products p
      LEFT JOIN lats_product_variants v ON p.id = v.product_id 
        AND v.is_active = true
      WHERE p.is_active = true
      GROUP BY p.id, p.name, p.sku, p.branch_id
      HAVING COUNT(v.id) = 0
      ORDER BY p.name
    `);

    if (productsWithNoVariantsAnywhere.rows.length > 0) {
      console.log(`⚠️  Found ${productsWithNoVariantsAnywhere.rows.length} products with NO variants in ANY branch:`);
      productsWithNoVariantsAnywhere.rows.forEach((product, idx) => {
        console.log(`   ${idx + 1}. ${product.name}`);
        console.log(`      SKU: ${product.sku || 'No SKU'}`);
        console.log(`      Product Branch ID: ${product.product_branch_id || 'NULL'}`);
      });
    } else {
      console.log('✅ All products have at least one variant in some branch');
    }

    // 5. Check specific products mentioned by user
    console.log(`\n${'='.repeat(60)}`);
    console.log('🔍 Checking specific products mentioned:');
    console.log(`${'='.repeat(60)}`);
    
    const specificProducts = [
      'Samsung HW-Q800T',
      'Onn 5.1.2 Atmos',
      'Vizio S3821-C0',
      'Vizio SB2021-J6',
      'Samsung HW-B63C',
      'Samsung HW-K551/2N',
      'Samsung Ps-WK450'
    ];

    for (const productName of specificProducts) {
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

      if (productResult.rows.length > 0) {
        const product = productResult.rows[0];
        console.log(`\n📦 ${product.name}:`);
        console.log(`   SKU: ${product.sku || 'No SKU'}`);
        console.log(`   Product Branch ID: ${product.product_branch_id || 'NULL'}`);
        console.log(`   Is Shared: ${product.is_shared || false}`);
        
        // Check variants per branch
        const variantsPerBranch = await pool.query(`
          SELECT 
            v.id,
            v.name,
            v.branch_id,
            b.name as branch_name,
            v.quantity,
            v.is_active
          FROM lats_product_variants v
          LEFT JOIN store_locations b ON v.branch_id = b.id
          WHERE v.product_id = $1
          ORDER BY b.name, v.name
        `, [product.id]);

        if (variantsPerBranch.rows.length > 0) {
          console.log(`   Variants (${variantsPerBranch.rows.length} total):`);
          variantsPerBranch.rows.forEach(v => {
            console.log(`      - ${v.name} (Branch: ${v.branch_name || v.branch_id}, Qty: ${v.quantity}, Active: ${v.is_active})`);
          });
        } else {
          console.log(`   ⚠️  NO VARIANTS in ANY branch`);
        }
      } else {
        console.log(`\n❌ Product "${productName}" not found`);
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ Check complete!');
    console.log(`${'='.repeat(60)}`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the check
checkProductsWithoutVariantsByBranch();
