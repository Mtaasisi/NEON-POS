#!/usr/bin/env node

/**
 * Check if variants exist for products
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
    console.log('🔍 Checking Product Variants');
    console.log('='.repeat(60));

    // Test database connection
    console.log('🔌 Testing database connection...');
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful\n');

    // Product IDs from the error
    const productIds = [
      '9eb24941-b6b4-4bac-a55f-158700a673c4',
      'e43ef658-edf5-4c9a-917f-2848ae733908',
      '0dbb6034-abc6-4f39-959f-7d49d1160e97',
      'f233d9de-c35b-4996-9c63-8ed84f342a44',
      '684020ce-4481-46fb-83f7-192d7a6a91e9',
      '7fa83441-0979-401f-8a16-f7f38570b5b4',
      'aabdbd42-9a07-4e99-99fd-2d92e68fed5a',
      'd82be616-cedd-4a68-984a-c016d3a556b7',
      '64d3acd9-3f23-4437-a7ea-75161f073c76',
      'e517f615-82bd-4fd4-beec-d2721f62efe9'
    ];

    console.log(`📊 Checking ${productIds.length} products...\n`);

    // Get product info
    const productsResult = await pool.query(`
      SELECT 
        id, 
        name, 
        sku,
        metadata->>'variantCount' as variant_count,
        metadata->>'useVariants' as use_variants
      FROM lats_products 
      WHERE id = ANY($1::uuid[])
      ORDER BY name
    `, [productIds]);

    console.log('='.repeat(60));
    console.log('📦 PRODUCTS INFO');
    console.log('='.repeat(60));
    productsResult.rows.forEach((product, idx) => {
      console.log(`\n${idx + 1}. ${product.name}`);
      console.log(`   ID: ${product.id}`);
      console.log(`   SKU: ${product.sku || 'N/A'}`);
      console.log(`   Use Variants: ${product.use_variants || 'N/A'}`);
      console.log(`   Variant Count (metadata): ${product.variant_count || '0'}`);
    });

    // Check variants for these products
    console.log('\n' + '='.repeat(60));
    console.log('🔍 CHECKING VARIANTS');
    console.log('='.repeat(60));

    const variantsResult = await pool.query(`
      SELECT 
        v.id,
        v.product_id,
        v.name,
        v.variant_name,
        v.sku,
        v.quantity,
        v.is_active,
        v.is_parent,
        v.parent_variant_id,
        v.branch_id,
        p.name as product_name
      FROM lats_product_variants v
      JOIN lats_products p ON v.product_id = p.id
      WHERE v.product_id = ANY($1::uuid[])
      ORDER BY p.name, v.name
    `, [productIds]);

    console.log(`\n📊 Found ${variantsResult.rows.length} variants for these products\n`);

    if (variantsResult.rows.length === 0) {
      console.log('❌ NO VARIANTS FOUND!\n');
      console.log('This explains why the app is showing warnings.\n');
    } else {
      variantsResult.rows.forEach((variant, idx) => {
        console.log(`${idx + 1}. ${variant.product_name} - ${variant.name || variant.variant_name || 'N/A'}`);
        console.log(`   Variant ID: ${variant.id}`);
        console.log(`   SKU: ${variant.sku || 'N/A'}`);
        console.log(`   Quantity: ${variant.quantity || 0}`);
        console.log(`   Active: ${variant.is_active}`);
        console.log(`   Is Parent: ${variant.is_parent}`);
        console.log(`   Parent Variant ID: ${variant.parent_variant_id || 'N/A'}`);
        console.log(`   Branch ID: ${variant.branch_id || 'N/A'}`);
        console.log('');
      });
    }

    // Check variants with branch filtering (as the app does)
    console.log('='.repeat(60));
    console.log('🔍 CHECKING VARIANTS WITH BRANCH FILTER');
    console.log('='.repeat(60));

    // Get current branch (first active branch)
    const branchResult = await pool.query(`
      SELECT id FROM lats_branches WHERE is_active = true LIMIT 1
    `);
    const currentBranchId = branchResult.rows[0]?.id;

    if (currentBranchId) {
      console.log(`\nUsing branch: ${currentBranchId}\n`);

      const variantsWithBranchFilter = await pool.query(`
        SELECT 
          v.id,
          v.product_id,
          v.name,
          v.variant_name,
          p.name as product_name
        FROM lats_product_variants v
        JOIN lats_products p ON v.product_id = p.id
        WHERE v.product_id = ANY($1::uuid[])
          AND v.is_active = true
          AND v.parent_variant_id IS NULL
          AND (v.branch_id = $2 OR v.is_shared = true OR v.branch_id IS NULL)
        ORDER BY p.name, v.name
      `, [productIds, currentBranchId]);

      console.log(`📊 Found ${variantsWithBranchFilter.rows.length} variants with branch filter\n`);

      if (variantsWithBranchFilter.rows.length === 0) {
        console.log('❌ NO VARIANTS FOUND WITH BRANCH FILTER!\n');
        console.log('This might be why variants aren\'t showing in the app.\n');
      }
    }

    // Check total variants in database
    const totalVariantsResult = await pool.query(`
      SELECT COUNT(*) as count FROM lats_product_variants
    `);
    console.log(`📊 Total variants in database: ${totalVariantsResult.rows[0].count}\n`);

    // Check variants by branch
    const variantsByBranchResult = await pool.query(`
      SELECT 
        branch_id,
        COUNT(*) as count
      FROM lats_product_variants
      WHERE branch_id IS NOT NULL
      GROUP BY branch_id
      UNION ALL
      SELECT 
        'NULL'::text as branch_id,
        COUNT(*) as count
      FROM lats_product_variants
      WHERE branch_id IS NULL
      ORDER BY branch_id
    `);

    if (variantsByBranchResult.rows.length > 0) {
      console.log('='.repeat(60));
      console.log('📊 VARIANTS BY BRANCH');
      console.log('='.repeat(60));
      variantsByBranchResult.rows.forEach((row) => {
        console.log(`Branch ${row.branch_id}: ${row.count} variants`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY');
    console.log('='.repeat(60));
    if (variantsResult.rows.length === 0) {
      console.log('❌ PROBLEM: No variants found for these products!');
      console.log('   The products have metadata indicating they should have variants,');
      console.log('   but no variants exist in the database.');
      console.log('   Solution: Import variants from backup or create them manually.');
    } else {
      console.log(`✅ Found ${variantsResult.rows.length} variants`);
      if (variantsWithBranchFilter && variantsWithBranchFilter.rows.length < variantsResult.rows.length) {
        console.log(`⚠️  But only ${variantsWithBranchFilter.rows.length} pass branch filter`);
        console.log('   This might be a branch isolation issue.');
      }
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
