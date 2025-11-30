#!/usr/bin/env node
/**
 * Check for Variant Duplicate Issues
 * Analyzes products that look like duplicates but might be variants
 * 
 * Usage: node check-variant-duplicates.mjs
 */

import { Pool } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';
neonConfig.webSocketConstructor = ws;

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL not found');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function analyzeVariantDuplicates() {
  try {
    console.log('🔍 Analyzing Variant Products...\n');
    
    // 1. Check for products with variant-like SKU patterns
    console.log('📊 VARIANT PATTERN ANALYSIS');
    console.log('='.repeat(80));
    
    const variantQuery = `
      SELECT 
        name,
        COUNT(*) as total_entries,
        COUNT(*) FILTER (WHERE sku LIKE '%-DEFAULT%') as default_variants,
        COUNT(*) FILTER (WHERE sku LIKE '%-V01%' OR sku LIKE '%-V02%' OR sku LIKE '%-V03%') as numbered_variants,
        STRING_AGG(DISTINCT 
          CASE 
            WHEN sku LIKE '%-DEFAULT%' THEN 'DEFAULT'
            WHEN sku LIKE '%-V01%' THEN 'V01'
            WHEN sku LIKE '%-V02%' THEN 'V02'
            WHEN sku LIKE '%-V03%' THEN 'V03'
            ELSE 'OTHER'
          END, ', '
        ) as variant_types,
        STRING_AGG(sku, ' | ') as all_skus,
        STRING_AGG(id::text, ', ') as all_ids
      FROM lats_products
      WHERE name IS NOT NULL
      GROUP BY name
      HAVING COUNT(*) > 1
      ORDER BY total_entries DESC, name;
    `;
    
    const variantResult = await pool.query(variantQuery);
    
    if (variantResult.rows.length === 0) {
      console.log('✅ No products with multiple entries found');
      return;
    }
    
    console.log(`Found ${variantResult.rows.length} products with multiple entries:\n`);
    
    variantResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.name}`);
      console.log(`   Total Entries: ${row.total_entries}`);
      console.log(`   DEFAULT variants: ${row.default_variants}`);
      console.log(`   Numbered variants (V01, V02): ${row.numbered_variants}`);
      console.log(`   Variant Types: ${row.variant_types}`);
      console.log(`   SKUs: ${row.all_skus.substring(0, 150)}${row.all_skus.length > 150 ? '...' : ''}`);
      console.log('');
    });
    
    // 2. Check parent-child relationships
    console.log('\n📋 PARENT-CHILD VARIANT RELATIONSHIPS');
    console.log('='.repeat(80));
    
    const parentChildQuery = `
      SELECT 
        p.name,
        p.id,
        p.sku,
        p.is_parent_variant,
        p.parent_variant_id,
        COUNT(c.id) as child_count
      FROM lats_products p
      LEFT JOIN lats_products c ON c.parent_variant_id = p.id
      WHERE p.name IN (
        SELECT name 
        FROM lats_products 
        GROUP BY name 
        HAVING COUNT(*) > 1
      )
      GROUP BY p.id, p.name, p.sku, p.is_parent_variant, p.parent_variant_id
      ORDER BY p.name, p.is_parent_variant DESC NULLS LAST, p.created_at;
    `;
    
    const parentChildResult = await pool.query(parentChildQuery);
    
    if (parentChildResult.rows.length > 0) {
      let currentName = '';
      parentChildResult.rows.forEach((row) => {
        if (row.name !== currentName) {
          console.log(`\n📦 ${row.name}`);
          currentName = row.name;
        }
        
        const isParent = row.is_parent_variant === true;
        const hasParent = row.parent_variant_id !== null;
        const childCount = parseInt(row.child_count) || 0;
        
        let status = '';
        if (isParent) {
          status = `🔹 PARENT (${childCount} children)`;
        } else if (hasParent) {
          status = `   └─ CHILD (parent: ${row.parent_variant_id.substring(0, 8)}...)`;
        } else {
          status = `⚠️  ORPHAN (no parent/child relationship)`;
        }
        
        console.log(`   ${status}`);
        console.log(`      ID: ${row.id.substring(0, 16)}...`);
        console.log(`      SKU: ${row.sku}`);
      });
    }
    
    // 3. Identify the problem
    console.log('\n\n🎯 PROBLEM IDENTIFICATION');
    console.log('='.repeat(80));
    
    const orphanQuery = `
      SELECT 
        COUNT(*) as orphan_count
      FROM lats_products
      WHERE (sku LIKE '%-V01%' OR sku LIKE '%-V02%' OR sku LIKE '%-DEFAULT%')
        AND parent_variant_id IS NULL
        AND is_parent_variant IS NOT TRUE;
    `;
    
    const orphanResult = await pool.query(orphanQuery);
    const orphanCount = orphanResult.rows[0]?.orphan_count || 0;
    
    console.log(`\n🔍 Analysis Results:`);
    console.log(`   Products with multiple entries: ${variantResult.rows.length}`);
    console.log(`   Orphan variants (no parent link): ${orphanCount}`);
    
    if (orphanCount > 0) {
      console.log(`\n⚠️  ISSUE IDENTIFIED:`);
      console.log(`   You have ${orphanCount} variant products that are not properly linked to parents.`);
      console.log(`   This causes them to appear as separate products instead of variants.`);
      console.log(`\n   These products have variant-style SKUs (V01, V02, DEFAULT) but:`);
      console.log(`   ❌ parent_variant_id is NULL`);
      console.log(`   ❌ is_parent_variant is not TRUE`);
      console.log(`   ❌ They show as duplicate entries in the UI`);
    }
    
    // 4. Show example fix
    console.log('\n\n💡 SOLUTION');
    console.log('='.repeat(80));
    console.log(`\nOption 1: Fix Parent-Child Relationships`);
    console.log(`   This will group variants under their parent product.`);
    console.log(`   Run: node fix-variant-relationships.mjs`);
    console.log(`\nOption 2: Delete Unnecessary Variants`);
    console.log(`   Remove DEFAULT variants that have no stock and no variants.`);
    console.log(`   Run: node cleanup-empty-variants.mjs`);
    console.log(`\nOption 3: Merge Duplicates`);
    console.log(`   Combine truly duplicate entries into one product.`);
    console.log(`   This is more complex - requires manual review.`);
    
    // 5. Show specific products to fix
    console.log('\n\n🔧 PRODUCTS THAT NEED FIXING');
    console.log('='.repeat(80));
    
    const fixQuery = `
      SELECT 
        p1.name,
        COUNT(*) as entry_count,
        STRING_AGG(
          p1.sku || ' (stock: ' || COALESCE(p1.stock_quantity::text, '0') || ')',
          ' | '
        ) as entries
      FROM lats_products p1
      WHERE p1.name IN (
        SELECT name 
        FROM lats_products 
        GROUP BY name 
        HAVING COUNT(*) > 1
      )
      GROUP BY p1.name
      HAVING COUNT(*) > 1
      ORDER BY entry_count DESC
      LIMIT 10;
    `;
    
    const fixResult = await pool.query(fixQuery);
    
    console.log(`\nTop 10 products with multiple entries:\n`);
    fixResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.name} (${row.entry_count} entries)`);
      console.log(`   ${row.entries.substring(0, 200)}${row.entries.length > 200 ? '...' : ''}`);
      console.log('');
    });
    
    console.log('\n✅ Analysis complete!');
    console.log('See recommendations above for next steps.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

analyzeVariantDuplicates().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});








