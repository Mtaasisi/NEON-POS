#!/usr/bin/env node
import { Pool } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config();

import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';
neonConfig.webSocketConstructor = ws;

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString: DATABASE_URL });

async function analyzeVariantIssue() {
  try {
    console.log('🔍 ANALYZING PRODUCT VARIANTS ISSUE\n');
    console.log('='.repeat(80));
    
    // 1. Check lats_product_variants structure
    console.log('\n1. PRODUCT VARIANTS TABLE STRUCTURE\n');
    const variantSchema = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'lats_product_variants' 
      ORDER BY ordinal_position;
    `);
    
    console.log('Columns in lats_product_variants:');
    variantSchema.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type})`);
    });
    
    // 2. Count variants vs products
    console.log('\n\n2. PRODUCTS VS VARIANTS COUNT\n');
    
    const counts = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM lats_products) as total_products,
        (SELECT COUNT(*) FROM lats_product_variants) as total_variants,
        (SELECT COUNT(DISTINCT product_id) FROM lats_product_variants) as products_with_variants;
    `);
    
    const stats = counts.rows[0];
    console.log(`   Total Products: ${stats.total_products}`);
    console.log(`   Total Variants: ${stats.total_variants}`);
    console.log(`   Products with Variants: ${stats.products_with_variants || 0}`);
    
    // 3. Check products that have multiple entries (same name)
    console.log('\n\n3. PRODUCTS WITH DUPLICATE NAMES\n');
    
    const duplicateProducts = await pool.query(`
      SELECT 
        name,
        COUNT(*) as entry_count,
        STRING_AGG(id::text, ', ') as product_ids,
        STRING_AGG(sku, ' | ') as skus
      FROM lats_products
      WHERE name IS NOT NULL
      GROUP BY name
      HAVING COUNT(*) > 1
      ORDER BY entry_count DESC
      LIMIT 15;
    `);
    
    if (duplicateProducts.rows.length > 0) {
      console.log(`Found ${duplicateProducts.rows.length} product names with multiple entries:\n`);
      
      duplicateProducts.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.name} (${row.entry_count} entries)`);
        console.log(`   SKUs: ${row.skus.substring(0, 120)}${row.skus.length > 120 ? '...' : ''}`);
        console.log('');
      });
    } else {
      console.log('✅ No duplicate product names found!');
    }
    
    // 4. Analyze the relationship between duplicate products and their variants
    console.log('\n4. VARIANT ANALYSIS FOR DUPLICATE PRODUCTS\n');
    
    const variantAnalysis = await pool.query(`
      WITH duplicate_products AS (
        SELECT name, id, sku, branch_id
        FROM lats_products
        WHERE name IN (
          SELECT name 
          FROM lats_products 
          GROUP BY name 
          HAVING COUNT(*) > 1
        )
      )
      SELECT 
        dp.name as product_name,
        dp.id as product_id,
        dp.sku as product_sku,
        dp.branch_id,
        COUNT(v.id) as variant_count,
        STRING_AGG(v.variant_name, ', ') as variant_names
      FROM duplicate_products dp
      LEFT JOIN lats_product_variants v ON v.product_id = dp.id
      GROUP BY dp.name, dp.id, dp.sku, dp.branch_id
      ORDER BY dp.name, dp.branch_id;
    `);
    
    if (variantAnalysis.rows.length > 0) {
      let currentProduct = '';
      variantAnalysis.rows.forEach(row => {
        if (row.product_name !== currentProduct) {
          console.log(`\n📦 ${row.product_name}`);
          currentProduct = row.product_name;
        }
        
        console.log(`   Product ID: ${row.product_id.substring(0, 16)}...`);
        console.log(`   SKU: ${row.sku}`);
        console.log(`   Branch: ${row.branch_id ? row.branch_id.substring(0, 16) + '...' : 'N/A'}`);
        console.log(`   Variants: ${row.variant_count} ${row.variant_names ? `(${row.variant_names})` : ''}`);
      });
    }
    
    // 5. THE REAL ISSUE
    console.log('\n\n🎯 THE REAL ISSUE\n');
    console.log('='.repeat(80));
    
    const issue = await pool.query(`
      SELECT 
        p.name,
        p.sku,
        COUNT(DISTINCT p.id) as duplicate_products,
        COUNT(v.id) as total_variants
      FROM lats_products p
      LEFT JOIN lats_product_variants v ON v.product_id = p.id
      GROUP BY p.name, p.sku
      HAVING COUNT(DISTINCT p.id) > 1
      ORDER BY duplicate_products DESC
      LIMIT 10;
    `);
    
    if (issue.rows.length > 0) {
      console.log('⚠️  PROBLEM IDENTIFIED:\n');
      console.log('You have products that appear multiple times in the lats_products table.');
      console.log('These are TRUE DUPLICATES, not variants.\n');
      console.log('Affected products:');
      issue.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.name} - ${row.duplicate_products} duplicate entries`);
      });
    }
    
    // 6. Check if variants are properly linked
    console.log('\n\n6. VARIANT LINKAGE STATUS\n');
    
    const orphanVariants = await pool.query(`
      SELECT COUNT(*) as orphan_count
      FROM lats_product_variants
      WHERE product_id NOT IN (SELECT id FROM lats_products);
    `);
    
    const orphanCount = orphanVariants.rows[0]?.orphan_count || 0;
    console.log(`   Orphan variants (no matching product): ${orphanCount}`);
    
    if (orphanCount > 0) {
      console.log('   ⚠️  WARNING: Some variants reference non-existent products');
    } else {
      console.log('   ✅ All variants are properly linked to products');
    }
    
    // 7. Solution
    console.log('\n\n💡 SOLUTION\n');
    console.log('='.repeat(80));
    console.log('\nYour issue is NOT with variants, but with DUPLICATE PRODUCT ENTRIES.\n');
    console.log('The same product (e.g., "iPhone 12 Pro") exists multiple times in');
    console.log('the lats_products table with different IDs and SKUs.\n');
    console.log('This happens when:');
    console.log('   1. Products are created in different branches');
    console.log('   2. Products are imported/synced multiple times');
    console.log('   3. Branch isolation creates separate product entries\n');
    
    console.log('Recommended Actions:');
    console.log('   1. Keep cross-branch duplicates (if intentional for branch isolation)');
    console.log('   2. Add unique constraint: UNIQUE(name, branch_id)');
    console.log('   3. Merge true duplicates (same product in same branch)');
    
    console.log('\n✅ Analysis complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

analyzeVariantIssue();








