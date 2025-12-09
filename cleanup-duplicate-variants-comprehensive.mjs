#!/usr/bin/env node

/**
 * Comprehensive Duplicate Variant Cleanup
 * 
 * This script cleans up duplicate and redundant variants:
 * 1. Removes auto-created "Default" variants when manual variants exist
 * 2. Removes redundant "Variant 1" when "Default" exists (if identical)
 * 3. Removes duplicate variants with identical attributes
 * 4. Keeps the oldest/manually created variant when duplicates exist
 * 
 * Usage:
 *   node cleanup-duplicate-variants-comprehensive.mjs [--dry-run]
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
 * Check if variant is auto-created
 */
function isAutoCreated(variant) {
  const attrs = variant.variant_attributes || {};
  return attrs.auto_created === true || attrs.created_from === 'missing_variants_script';
}

/**
 * Check if variant is manually created
 */
function isManuallyCreated(variant) {
  const attrs = variant.variant_attributes || {};
  return attrs.data_source === 'manual' || (!isAutoCreated(variant) && !attrs.auto_created);
}

/**
 * Check if two variants are essentially the same (for cleanup purposes)
 * Only considers them identical if they have the same name AND same attributes
 */
function areVariantsIdentical(v1, v2) {
  // If they have different names, they're different variants (even if attributes match)
  const name1 = (v1.name || v1.variant_name || '').trim();
  const name2 = (v2.name || v2.variant_name || '').trim();
  
  // Special case: "Default" and "Variant 1" can be considered the same if everything else matches
  const isDefaultOrVariant1 = (name) => 
    name.toLowerCase() === 'default' || 
    name.toLowerCase() === 'variant 1' ||
    name.toLowerCase().includes('default') ||
    name.toLowerCase().includes('variant 1');
  
  // If both are "Default" or "Variant 1" variants, compare attributes
  if (isDefaultOrVariant1(name1) && isDefaultOrVariant1(name2)) {
    return (
      v1.cost_price === v2.cost_price &&
      v1.selling_price === v2.selling_price &&
      v1.quantity === v2.quantity &&
      v1.min_quantity === v2.min_quantity &&
      v1.variant_type === v2.variant_type &&
      v1.is_parent === v2.is_parent &&
      (!v1.parent_variant_id && !v2.parent_variant_id)
    );
  }
  
  // For other variants, they must have the exact same name AND attributes
  if (name1 === name2 && name1 !== '') {
    return (
      v1.cost_price === v2.cost_price &&
      v1.selling_price === v2.selling_price &&
      v1.quantity === v2.quantity &&
      v1.min_quantity === v2.min_quantity &&
      v1.variant_type === v2.variant_type &&
      v1.is_parent === v2.is_parent &&
      (!v1.parent_variant_id && !v2.parent_variant_id)
    );
  }
  
  return false;
}

/**
 * Fetch all variants with product info
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
 * Check if variant has references in other tables
 */
async function hasReferences(variantId) {
  if (USE_SUPABASE) {
    // Check multiple tables
    const tables = [
      'lats_trade_in_prices',
      'lats_stock_transfers',
      'lats_stock_movements',
      'lats_purchase_order_items',
      'lats_inventory_items',
      'lats_inventory_adjustments'
    ];
    
    for (const table of tables) {
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('variant_id', variantId);
      
      if (count && count > 0) {
        return true;
      }
    }
    return false;
  } else {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM lats_trade_in_prices WHERE variant_id = $1) +
        (SELECT COUNT(*) FROM lats_stock_transfers WHERE variant_id = $1) +
        (SELECT COUNT(*) FROM lats_stock_movements WHERE variant_id = $1) +
        (SELECT COUNT(*) FROM lats_purchase_order_items WHERE variant_id = $1) +
        (SELECT COUNT(*) FROM lats_inventory_items WHERE variant_id = $1) +
        (SELECT COUNT(*) FROM lats_inventory_adjustments WHERE variant_id = $1) as total_refs
    `;
    
    const result = await pool.query(query, [variantId]);
    return parseInt(result.rows[0].total_refs) > 0;
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
 * Main cleanup function
 */
async function cleanupDuplicates() {
  console.log('🚀 Starting comprehensive duplicate variant cleanup...\n');
  
  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }
  
  const variants = await fetchAllVariants();
  console.log(`✅ Fetched ${variants.length} variants\n`);
  
  // Group variants by product
  const variantsByProduct = new Map();
  for (const variant of variants) {
    const productId = variant.product_id;
    if (!variantsByProduct.has(productId)) {
      variantsByProduct.set(productId, []);
    }
    variantsByProduct.get(productId).push(variant);
  }
  
  console.log(`📊 Found ${variantsByProduct.size} products with variants\n`);
  
  let totalDeleted = 0;
  let totalSkipped = 0;
  const deletions = [];
  
  // Process each product
  for (const [productId, productVariants] of variantsByProduct) {
    if (productVariants.length <= 1) {
      continue; // Skip products with only one variant
    }
    
    const product = productVariants[0].product;
    const productName = product?.name || 'Unknown';
    
    // Separate auto-created and manual variants
    const autoCreated = productVariants.filter(isAutoCreated);
    const manualCreated = productVariants.filter(isManuallyCreated);
    
    // Strategy 1: If product has manual variants, remove auto-created ones that are redundant
    if (manualCreated.length > 0 && autoCreated.length > 0) {
      console.log(`\n🔍 Product: ${productName} (${productVariants.length} variants)`);
      console.log(`   Manual: ${manualCreated.length}, Auto-created: ${autoCreated.length}`);
      
      for (const autoVariant of autoCreated) {
        const autoName = (autoVariant.name || autoVariant.variant_name || '').trim().toLowerCase();
        const isDefaultOrVariant1 = autoName === 'default' || autoName === 'variant 1' || 
                                   autoName.includes('default') || autoName.includes('variant 1');
        
        // Check if this auto-created variant is redundant with any manual variant
        let isRedundant = false;
        let matchingManual = null;
        
        for (const manual of manualCreated) {
          const manualName = (manual.name || manual.variant_name || '').trim().toLowerCase();
          const manualIsDefaultOrVariant1 = manualName === 'default' || manualName === 'variant 1' ||
                                          manualName.includes('default') || manualName.includes('variant 1');
          
          // If both are default/variant1 types, check if attributes match
          if (isDefaultOrVariant1 && manualIsDefaultOrVariant1) {
            if (areVariantsIdentical(autoVariant, manual)) {
              isRedundant = true;
              matchingManual = manual;
              break;
            }
          } else if (areVariantsIdentical(autoVariant, manual)) {
            // Exact match
            isRedundant = true;
            matchingManual = manual;
            break;
          }
        }
        
        if (isRedundant) {
          const hasRefs = await hasReferences(autoVariant.id);
          if (hasRefs) {
            console.log(`   ⚠️  Skipping ${autoVariant.name || autoVariant.variant_name} (has references)`);
            totalSkipped++;
          } else {
            console.log(`   🗑️  Removing redundant auto-created: ${autoVariant.name || autoVariant.variant_name} (matches ${matchingManual?.name || matchingManual?.variant_name})`);
            const deleted = await deleteVariant(autoVariant.id);
            if (deleted) {
              totalDeleted++;
              deletions.push({
                product: productName,
                variant: autoVariant.name || autoVariant.variant_name,
                reason: 'Redundant auto-created variant'
              });
            }
          }
        } else {
          // Even if not identical, if product has manual variants and this is a generic auto-created one, remove it
          const autoName = (autoVariant.name || autoVariant.variant_name || '').trim().toLowerCase();
          const isGenericAuto = autoName === 'default' || autoName === 'variant 1' || 
                               autoName.includes('default') || autoName.includes('variant 1') ||
                               autoName.startsWith('variant ');
          
          if (isGenericAuto && manualCreated.length > 0) {
            const hasRefs = await hasReferences(autoVariant.id);
            if (!hasRefs && autoVariant.quantity === 0 && autoVariant.cost_price === 0 && autoVariant.selling_price === 0) {
              // Only remove if it has no data (empty variant)
              console.log(`   🗑️  Removing empty auto-created: ${autoVariant.name || autoVariant.variant_name} (product has manual variants)`);
              const deleted = await deleteVariant(autoVariant.id);
              if (deleted) {
                totalDeleted++;
                deletions.push({
                  product: productName,
                  variant: autoVariant.name || autoVariant.variant_name,
                  reason: 'Empty auto-created variant (product has manual variants)'
                });
              }
            }
          }
        }
      }
    }
    
    // Strategy 2: Remove duplicate variants with same name and identical attributes
    const remainingVariants = productVariants.filter(v => 
      !deletions.some(d => d.variant === (v.name || v.variant_name))
    );
    
    if (remainingVariants.length > 1) {
      // Group by variant name (case-insensitive)
      const variantGroups = new Map();
      for (const variant of remainingVariants) {
        const variantName = (variant.name || variant.variant_name || '').trim().toLowerCase();
        if (!variantGroups.has(variantName)) {
          variantGroups.set(variantName, []);
        }
        variantGroups.get(variantName).push(variant);
      }
      
      // For each group with same name, check if they're truly duplicates
      for (const [variantName, group] of variantGroups) {
        if (group.length > 1) {
          // Check if all variants in this group are identical
          const firstVariant = group[0];
          const allIdentical = group.every(v => areVariantsIdentical(v, firstVariant));
          
          if (allIdentical) {
            // Sort by created_at, keep the oldest (prefer manual over auto-created)
            group.sort((a, b) => {
              const aManual = isManuallyCreated(a);
              const bManual = isManuallyCreated(b);
              if (aManual !== bManual) {
                return aManual ? -1 : 1; // Manual first
              }
              return new Date(a.created_at) - new Date(b.created_at);
            });
            
            const toKeep = group[0];
            const toDelete = group.slice(1);
            
            console.log(`\n🔍 Product: ${productName} - Found ${group.length} identical "${variantName}" variants`);
            console.log(`   Keeping: ${toKeep.name || toKeep.variant_name} (${isManuallyCreated(toKeep) ? 'manual' : 'oldest'})`);
            
            for (const variant of toDelete) {
              const hasRefs = await hasReferences(variant.id);
              if (hasRefs) {
                console.log(`   ⚠️  Skipping ${variant.name || variant.variant_name} (has references)`);
                totalSkipped++;
              } else {
                console.log(`   🗑️  Removing duplicate: ${variant.name || variant.variant_name}`);
                const deleted = await deleteVariant(variant.id);
                if (deleted) {
                  totalDeleted++;
                  deletions.push({
                    product: productName,
                    variant: variant.name || variant.variant_name,
                    reason: `Duplicate "${variantName}" variant`
                  });
                }
              }
            }
          }
        }
      }
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 CLEANUP SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Variants deleted: ${totalDeleted}`);
  console.log(`⚠️  Variants skipped (has references): ${totalSkipped}`);
  console.log(`📋 Total products processed: ${variantsByProduct.size}`);
  
  if (DRY_RUN) {
    console.log('\n⚠️  This was a DRY RUN - no actual changes were made');
    console.log('   Run without --dry-run to apply changes');
  }
  
  if (deletions.length > 0) {
    console.log('\n📝 Deletions made:');
    deletions.slice(0, 20).forEach((d, i) => {
      console.log(`   ${i + 1}. ${d.product} - ${d.variant} (${d.reason})`);
    });
    if (deletions.length > 20) {
      console.log(`   ... and ${deletions.length - 20} more`);
    }
  }
  
  console.log('\n✨ Cleanup completed!\n');
}

/**
 * Main function
 */
async function main() {
  try {
    await cleanupDuplicates();
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
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
