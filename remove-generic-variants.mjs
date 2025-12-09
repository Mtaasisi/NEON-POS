#!/usr/bin/env node

/**
 * Remove Generic Variants
 * 
 * Removes all variants with generic names:
 * - "variant" (case-insensitive)
 * - "default variant" (case-insensitive)
 * - "default" (case-insensitive)
 * 
 * Usage:
 *   node remove-generic-variants.mjs [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';
import { Pool } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.production') });

// Database configuration
const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || 
  'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 
  'https://jxhzveborezjhsmzsgbc.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aHp2ZWJvcmV6amhzbXpzZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MTE1MjQsImV4cCI6MjA2ODI4NzUyNH0.pIug4PlJ3Q14GxcYilW-u0blByYoyeOfN3q9RNIjgfw';

const USE_SUPABASE = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
const USE_DIRECT_POSTGRES = !!(DATABASE_URL && (DATABASE_URL.includes('neon.tech') || DATABASE_URL.includes('postgresql://')));

const DRY_RUN = process.argv.includes('--dry-run') || process.argv.includes('-n');

let supabase;
let pool;

// Initialize database connection
if (USE_SUPABASE) {
  console.log('🔗 Using Supabase REST API');
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else if (USE_DIRECT_POSTGRES) {
  console.log('🔗 Using direct PostgreSQL connection');
  pool = new Pool({ connectionString: DATABASE_URL });
} else {
  console.error('❌ No database connection configured');
  process.exit(1);
}

/**
 * Check if variant name matches generic patterns
 */
function isGenericVariantName(variant) {
  const name = (variant.name || variant.variant_name || '').trim().toLowerCase();
  
  return (
    name === 'variant' ||
    name === 'default variant' ||
    name === 'default' ||
    name.startsWith('variant ') ||
    name.startsWith('default ') ||
    name.includes('variant') && name.match(/^variant\s*\d*$/i) ||
    name.includes('default') && name.match(/^default\s*(variant)?$/i)
  );
}

/**
 * Check which variants have references in other tables (batch check)
 */
async function getVariantsWithReferences(variantIds) {
  if (variantIds.length === 0) return new Set();
  
  if (USE_SUPABASE) {
    const tables = [
      'lats_trade_in_prices',
      'lats_stock_transfers',
      'lats_stock_movements',
      'lats_purchase_order_items',
      'lats_inventory_items',
      'lats_inventory_adjustments'
    ];
    
    const referencedIds = new Set();
    
    // Check all tables in parallel
    const checks = await Promise.all(
      tables.map(async (table) => {
        const { data, error } = await supabase
          .from(table)
          .select('variant_id')
          .in('variant_id', variantIds);
        
        if (!error && data) {
          return data.map(row => row.variant_id);
        }
        return [];
      })
    );
    
    checks.flat().forEach(id => referencedIds.add(id));
    return referencedIds;
  } else {
    const query = `
      SELECT DISTINCT variant_id
      FROM (
        SELECT variant_id FROM lats_trade_in_prices WHERE variant_id = ANY($1::uuid[])
        UNION
        SELECT variant_id FROM lats_stock_transfers WHERE variant_id = ANY($1::uuid[])
        UNION
        SELECT variant_id FROM lats_stock_movements WHERE variant_id = ANY($1::uuid[])
        UNION
        SELECT variant_id FROM lats_purchase_order_items WHERE variant_id = ANY($1::uuid[])
        UNION
        SELECT variant_id FROM lats_inventory_items WHERE variant_id = ANY($1::uuid[])
        UNION
        SELECT variant_id FROM lats_inventory_adjustments WHERE variant_id = ANY($1::uuid[])
      ) refs
    `;
    
    const result = await pool.query(query, [variantIds]);
    return new Set(result.rows.map(row => row.variant_id));
  }
}

/**
 * Delete variant
 */
async function deleteVariant(variantId) {
  if (DRY_RUN) {
    console.log(`   [DRY RUN] Would delete variant: ${variantId}`);
    return true;
  }
  
  if (USE_SUPABASE) {
    const { error } = await supabase
      .from('lats_product_variants')
      .delete()
      .eq('id', variantId);
    
    return !error;
  } else {
    const result = await pool.query(
      'DELETE FROM lats_product_variants WHERE id = $1',
      [variantId]
    );
    return result.rowCount > 0;
  }
}

/**
 * Fetch all variants
 */
async function fetchAllVariants() {
  console.log('📦 Fetching all variants from database...');
  
  if (USE_SUPABASE) {
    const { data: variants, error } = await supabase
      .from('lats_product_variants')
      .select('*, product:lats_products!product_id(id, name, sku)')
      .order('product_id, created_at');
    
    if (error) {
      throw new Error(`Failed to fetch variants: ${error.message}`);
    }
    
    return variants || [];
  } else {
    const query = `
      SELECT 
        v.*,
        json_build_object(
          'id', p.id,
          'name', p.name,
          'sku', p.sku
        ) as product
      FROM lats_product_variants v
      JOIN lats_products p ON v.product_id = p.id
      ORDER BY v.product_id, v.created_at
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }
}

/**
 * Main cleanup function
 */
async function removeGenericVariants() {
  console.log('🚀 Starting removal of generic variants...\n');
  console.log('🔍 Looking for variants with names: "variant", "default variant", "default"\n');
  
  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }
  
  const variants = await fetchAllVariants();
  console.log(`✅ Fetched ${variants.length} variants\n`);
  
  // Filter generic variants
  const genericVariants = variants.filter(isGenericVariantName);
  console.log(`📊 Found ${genericVariants.length} generic variants to remove\n`);
  
  if (genericVariants.length === 0) {
    console.log('✅ No generic variants found!');
    return;
  }
  
  // Group by product for better reporting
  const variantsByProduct = new Map();
  for (const variant of genericVariants) {
    const productId = variant.product_id;
    const productName = variant.product?.name || 'Unknown';
    if (!variantsByProduct.has(productId)) {
      variantsByProduct.set(productId, { name: productName, variants: [] });
    }
    variantsByProduct.get(productId).variants.push(variant);
  }
  
  console.log(`📋 Affected products: ${variantsByProduct.size}\n`);
  
  // Batch check all variants for references at once (much faster!)
  console.log('\n🔍 Checking for variants with references in other tables...');
  const allVariantIds = genericVariants.map(v => v.id);
  const referencedIds = await getVariantsWithReferences(allVariantIds);
  console.log(`✅ Found ${referencedIds.size} variants with references (will skip)\n`);
  
  let totalDeleted = 0;
  let totalSkipped = 0;
  const deletions = [];
  const variantsToDelete = [];
  
  // Group variants to delete by product
  for (const [productId, productInfo] of variantsByProduct) {
    const variantsToProcess = [];
    
    for (const variant of productInfo.variants) {
      const variantName = variant.name || variant.variant_name || 'Unknown';
      
      if (referencedIds.has(variant.id)) {
        totalSkipped++;
        variantsToProcess.push({ variant, action: 'skip', reason: 'has references' });
      } else {
        variantsToDelete.push(variant);
        variantsToProcess.push({ variant, action: 'delete' });
      }
    }
    
    if (variantsToProcess.length > 0) {
      console.log(`\n🔍 Product: ${productInfo.name} (${productInfo.variants.length} generic variant(s))`);
      variantsToProcess.forEach(({ variant, action, reason }) => {
        const variantName = variant.name || variant.variant_name || 'Unknown';
        if (action === 'skip') {
          console.log(`   ⚠️  Skipping "${variantName}" (${reason})`);
        } else {
          console.log(`   🗑️  Removing "${variantName}"`);
          deletions.push({
            product: productInfo.name,
            variant: variantName,
            sku: variant.sku,
            quantity: variant.quantity,
            cost_price: variant.cost_price,
            selling_price: variant.selling_price
          });
        }
      });
    }
  }
  
  // Batch delete variants (much faster!)
  if (variantsToDelete.length > 0) {
    console.log(`\n🗑️  Deleting ${variantsToDelete.length} variants...`);
    
    if (DRY_RUN) {
      console.log(`   [DRY RUN] Would delete ${variantsToDelete.length} variants`);
      totalDeleted = variantsToDelete.length;
    } else {
      // Delete in batches of 50 for better performance
      const batchSize = 50;
      for (let i = 0; i < variantsToDelete.length; i += batchSize) {
        const batch = variantsToDelete.slice(i, i + batchSize);
        const batchIds = batch.map(v => v.id);
        
        if (USE_SUPABASE) {
          const { error } = await supabase
            .from('lats_product_variants')
            .delete()
            .in('id', batchIds);
          
          if (!error) {
            totalDeleted += batch.length;
            console.log(`   ✅ Deleted batch ${Math.floor(i / batchSize) + 1} (${batch.length} variants)`);
          } else {
            console.log(`   ❌ Error deleting batch: ${error.message}`);
          }
        } else {
          const result = await pool.query(
            'DELETE FROM lats_product_variants WHERE id = ANY($1::uuid[])',
            [batchIds]
          );
          totalDeleted += result.rowCount;
          console.log(`   ✅ Deleted batch ${Math.floor(i / batchSize) + 1} (${result.rowCount} variants)`);
        }
      }
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 REMOVAL SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Variants deleted: ${totalDeleted}`);
  console.log(`⚠️  Variants skipped (has references): ${totalSkipped}`);
  console.log(`📋 Total products affected: ${variantsByProduct.size}`);
  console.log(`📦 Total generic variants found: ${genericVariants.length}`);
  
  if (DRY_RUN) {
    console.log('\n⚠️  This was a DRY RUN - no actual changes were made');
    console.log('   Run without --dry-run to apply changes');
  }
  
  if (deletions.length > 0) {
    console.log('\n📝 Deletions made:');
    deletions.slice(0, 30).forEach((d, i) => {
      console.log(`   ${i + 1}. ${d.product} - "${d.variant}" (SKU: ${d.sku}, Qty: ${d.quantity}, Price: ${d.selling_price || 0})`);
    });
    if (deletions.length > 30) {
      console.log(`   ... and ${deletions.length - 30} more`);
    }
  }
  
  console.log('\n✨ Removal completed!\n');
}

/**
 * Main function
 */
async function main() {
  try {
    await removeGenericVariants();
  } catch (error) {
    console.error('❌ Removal failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

// Run the script
main();
