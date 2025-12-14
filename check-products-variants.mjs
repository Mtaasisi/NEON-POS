#!/usr/bin/env node

/**
 * Check Products Variants
 * 
 * This script checks:
 * 1. Which products have variants
 * 2. Which products don't have variants
 * 3. Variant count per product
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

async function checkProductsVariants() {
  try {
    console.log('🔍 Checking Products Variants');
    console.log('='.repeat(60));
    console.log('');

    // 1. Get total products count
    const totalResult = await pool.query('SELECT COUNT(*) as count FROM lats_products');
    const totalProducts = parseInt(totalResult.rows[0].count);
    console.log(`📦 Total products: ${totalProducts}`);
    console.log('');

    // 2. Check products with variants
    console.log('📋 Checking products with variants...');
    const withVariantsResult = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.sku,
        COUNT(v.id) as variant_count,
        p.metadata->>'useVariants' as use_variants,
        p.metadata->>'variantCount' as metadata_variant_count
      FROM lats_products p
      LEFT JOIN lats_product_variants v ON p.id = v.product_id
      GROUP BY p.id, p.name, p.sku, p.metadata
      HAVING COUNT(v.id) > 0
      ORDER BY variant_count DESC, p.name
    `);
    
    const productsWithVariants = withVariantsResult.rows;
    console.log(`✅ Products WITH variants: ${productsWithVariants.length}`);
    console.log('');

    // 3. Check products without variants
    console.log('📋 Checking products without variants...');
    const withoutVariantsResult = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.metadata->>'useVariants' as use_variants,
        p.metadata->>'variantCount' as metadata_variant_count
      FROM lats_products p
      LEFT JOIN lats_product_variants v ON p.id = v.product_id
      GROUP BY p.id, p.name, p.sku, p.metadata
      HAVING COUNT(v.id) = 0
      ORDER BY p.name
    `);
    
    const productsWithoutVariants = withoutVariantsResult.rows;
    console.log(`⚠️  Products WITHOUT variants: ${productsWithoutVariants.length}`);
    console.log('');

    // 4. Summary statistics
    console.log('📊 Summary Statistics:');
    console.log('='.repeat(60));
    console.log(`   Total Products: ${totalProducts}`);
    console.log(`   With Variants: ${productsWithVariants.length} (${((productsWithVariants.length / totalProducts) * 100).toFixed(1)}%)`);
    console.log(`   Without Variants: ${productsWithoutVariants.length} (${((productsWithoutVariants.length / totalProducts) * 100).toFixed(1)}%)`);
    console.log('='.repeat(60));
    console.log('');

    // 5. Variant count distribution
    if (productsWithVariants.length > 0) {
      console.log('📊 Variant Count Distribution:');
      const variantCounts = {};
      productsWithVariants.forEach(p => {
        const count = parseInt(p.variant_count);
        variantCounts[count] = (variantCounts[count] || 0) + 1;
      });
      
      Object.keys(variantCounts).sort((a, b) => parseInt(a) - parseInt(b)).forEach(count => {
        console.log(`   ${count} variant(s): ${variantCounts[count]} products`);
      });
      console.log('');
    }

    // 6. Sample products with variants
    if (productsWithVariants.length > 0) {
      console.log('📋 Sample products WITH variants (first 10):');
      productsWithVariants.slice(0, 10).forEach((product, idx) => {
        console.log(`   ${idx + 1}. ${product.name}`);
        console.log(`      SKU: ${product.sku || 'No SKU'}`);
        console.log(`      Variants: ${product.variant_count}`);
        console.log(`      Metadata useVariants: ${product.use_variants || 'N/A'}`);
        console.log(`      Metadata variantCount: ${product.metadata_variant_count || 'N/A'}`);
        console.log('');
      });
      if (productsWithVariants.length > 10) {
        console.log(`   ... and ${productsWithVariants.length - 10} more products with variants`);
        console.log('');
      }
    }

    // 7. Sample products without variants
    if (productsWithoutVariants.length > 0) {
      console.log('⚠️  Sample products WITHOUT variants (first 10):');
      productsWithoutVariants.slice(0, 10).forEach((product, idx) => {
        console.log(`   ${idx + 1}. ${product.name}`);
        console.log(`      SKU: ${product.sku || 'No SKU'}`);
        console.log(`      Metadata useVariants: ${product.use_variants || 'N/A'}`);
        console.log(`      Metadata variantCount: ${product.metadata_variant_count || 'N/A'}`);
        console.log('');
      });
      if (productsWithoutVariants.length > 10) {
        console.log(`   ... and ${productsWithoutVariants.length - 10} more products without variants`);
        console.log('');
      }
    }

    // 8. Products with metadata indicating variants but no actual variants
    console.log('🔍 Products with metadata indicating variants but no actual variants:');
    const metadataMismatchResult = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.metadata->>'useVariants' as use_variants,
        p.metadata->>'variantCount' as metadata_variant_count,
        COUNT(v.id) as actual_variant_count
      FROM lats_products p
      LEFT JOIN lats_product_variants v ON p.id = v.product_id
      WHERE (p.metadata->>'useVariants')::boolean = true
         OR (p.metadata->>'variantCount')::int > 0
      GROUP BY p.id, p.name, p.sku, p.metadata
      HAVING COUNT(v.id) = 0
      ORDER BY p.name
    `);
    
    if (metadataMismatchResult.rows.length > 0) {
      console.log(`   ⚠️  Found ${metadataMismatchResult.rows.length} products with metadata mismatch:`);
      metadataMismatchResult.rows.slice(0, 5).forEach((product, idx) => {
        console.log(`      ${idx + 1}. ${product.name} - Metadata says ${product.metadata_variant_count || 'variants'} but has 0`);
      });
      if (metadataMismatchResult.rows.length > 5) {
        console.log(`      ... and ${metadataMismatchResult.rows.length - 5} more`);
      }
    } else {
      console.log('   ✅ No metadata mismatches found');
    }
    console.log('');

    // 9. Final summary
    console.log('='.repeat(60));
    console.log('📊 FINAL SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Total Products: ${totalProducts}`);
    console.log(`✅ With Variants: ${productsWithVariants.length}`);
    console.log(`⚠️  Without Variants: ${productsWithoutVariants.length}`);
    
    if (productsWithoutVariants.length === 0) {
      console.log('\n🎉 All products have variants!');
    } else {
      console.log(`\n⚠️  ${productsWithoutVariants.length} products need variants`);
    }
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the check
checkProductsVariants();
