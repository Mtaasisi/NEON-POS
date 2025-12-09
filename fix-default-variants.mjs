#!/usr/bin/env node

/**
 * Fix Default Variants
 * 
 * Ensures:
 * 1. Each product has only ONE "Default" variant
 * 2. Removes "Default" variants from products that have other variants
 * 
 * Usage:
 *   node fix-default-variants.mjs [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';
import { Pool } from '@neondatabase/serverless';
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
 * Check if variant is a "Default" variant
 */
function isDefaultVariant(variant) {
  const name = (variant.name || variant.variant_name || '').trim().toLowerCase();
  return name === 'default' || name === 'default variant';
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
 * Fetch all products with their variants
 */
async function fetchProductsWithVariants() {
  if (USE_SUPABASE) {
    // Fetch all products
    const { data: products, error: productsError } = await supabase
      .from('lats_products')
      .select('id, name')
      .order('name');
    
    if (productsError) {
      throw new Error(`Failed to fetch products: ${productsError.message}`);
    }
    
    // Fetch all variants
    const { data: variants, error: variantsError } = await supabase
      .from('lats_product_variants')
      .select('id, product_id, variant_name, name, created_at')
      .order('product_id, created_at');
    
    if (variantsError) {
      throw new Error(`Failed to fetch variants: ${variantsError.message}`);
    }
    
    // Group variants by product
    const productsMap = new Map();
    for (const product of products || []) {
      productsMap.set(product.id, {
        ...product,
        variants: []
      });
    }
    
    for (const variant of variants || []) {
      const product = productsMap.get(variant.product_id);
      if (product) {
        product.variants.push(variant);
      }
    }
    
    return Array.from(productsMap.values());
  } else {
    const query = `
      SELECT 
        p.id,
        p.name,
        json_agg(
          json_build_object(
            'id', v.id,
            'product_id', v.product_id,
            'variant_name', v.variant_name,
            'name', v.name,
            'created_at', v.created_at
          ) ORDER BY v.created_at
        ) as variants
      FROM lats_products p
      LEFT JOIN lats_product_variants v ON p.id = v.product_id
      GROUP BY p.id, p.name
      ORDER BY p.name
    `;
    
    const result = await pool.query(query);
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      variants: row.variants.filter(v => v.id !== null)
    }));
  }
}

/**
 * Delete variant
 */
async function deleteVariant(variantId) {
  if (DRY_RUN) {
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
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Starting default variants cleanup...\n');
    console.log('📋 Rules:');
    console.log('   1. Each product should have only ONE "Default" variant');
    console.log('   2. Remove "Default" variants from products that have other variants\n');
    
    if (DRY_RUN) {
      console.log('⚠️  DRY RUN MODE - No changes will be made\n');
    }
    
    // Fetch all products with variants
    console.log('📦 Fetching products and variants...');
    const products = await fetchProductsWithVariants();
    console.log(`✅ Found ${products.length} products\n`);
    
    // Analyze each product
    const variantsToDelete = [];
    const productsWithMultipleDefaults = [];
    const productsWithDefaultsAndOthers = [];
    
    for (const product of products) {
      const defaultVariants = product.variants.filter(isDefaultVariant);
      const otherVariants = product.variants.filter(v => !isDefaultVariant(v));
      
      // Case 1: Multiple default variants - keep only the oldest one
      if (defaultVariants.length > 1) {
        productsWithMultipleDefaults.push({
          product,
          defaultVariants,
          otherVariants
        });
        
        // Sort by created_at, keep the oldest
        defaultVariants.sort((a, b) => {
          const dateA = new Date(a.created_at || 0);
          const dateB = new Date(b.created_at || 0);
          return dateA - dateB;
        });
        
        // Mark all except the first (oldest) for deletion
        for (let i = 1; i < defaultVariants.length; i++) {
          variantsToDelete.push({
            variant: defaultVariants[i],
            product: product.name,
            reason: 'Multiple default variants - keeping oldest'
          });
        }
      }
      
      // Case 2: Has default variants AND other variants - remove all defaults
      if (defaultVariants.length > 0 && otherVariants.length > 0) {
        productsWithDefaultsAndOthers.push({
          product,
          defaultVariants,
          otherVariants
        });
        
        // Mark all default variants for deletion
        for (const defaultVariant of defaultVariants) {
          variantsToDelete.push({
            variant: defaultVariant,
            product: product.name,
            reason: 'Product has other variants - removing default'
          });
        }
      }
    }
    
    console.log('📊 Analysis Results:');
    console.log(`   Products with multiple default variants: ${productsWithMultipleDefaults.length}`);
    console.log(`   Products with defaults AND other variants: ${productsWithDefaultsAndOthers.length}`);
    console.log(`   Total default variants to remove: ${variantsToDelete.length}\n`);
    
    if (variantsToDelete.length === 0) {
      console.log('✅ No default variants need to be removed!');
      return;
    }
    
    // Show examples
    console.log('📋 Examples of variants to be removed:');
    variantsToDelete.slice(0, 10).forEach((item, i) => {
      const variantName = item.variant.variant_name || item.variant.name || 'N/A';
      console.log(`   ${i + 1}. "${item.product}" - "${variantName}" (${item.reason})`);
    });
    if (variantsToDelete.length > 10) {
      console.log(`   ... and ${variantsToDelete.length - 10} more\n`);
    } else {
      console.log('');
    }
    
    // Check for references
    console.log('🔍 Checking for references in other tables...');
    const variantIds = variantsToDelete.map(item => item.variant.id);
    const referencedIds = await getVariantsWithReferences(variantIds);
    
    const safeToDelete = variantsToDelete.filter(item => !referencedIds.has(item.variant.id));
    const withReferences = variantsToDelete.filter(item => referencedIds.has(item.variant.id));
    
    console.log(`✅ Found ${safeToDelete.length} variants safe to delete`);
    if (withReferences.length > 0) {
      console.log(`⚠️  Found ${withReferences.length} variants with references (will be skipped)\n`);
    } else {
      console.log('');
    }
    
    if (safeToDelete.length === 0) {
      console.log('⚠️  No variants can be safely deleted (all have references)');
      return;
    }
    
    if (!DRY_RUN) {
      console.log(`⚠️  About to delete ${safeToDelete.length} default variants`);
      console.log('   Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // Delete variants in batches
    console.log('🗑️  Deleting variants...\n');
    const BATCH_SIZE = 50;
    let deleted = 0;
    let errors = 0;
    const errorList = [];
    
    for (let i = 0; i < safeToDelete.length; i += BATCH_SIZE) {
      const batch = safeToDelete.slice(i, i + BATCH_SIZE);
      
      for (const item of batch) {
        try {
          const success = await deleteVariant(item.variant.id);
          
          if (success) {
            deleted++;
            if (deleted % 10 === 0) {
              console.log(`   ✅ Deleted ${deleted}/${safeToDelete.length} variants...`);
            }
          } else {
            errors++;
            errorList.push({ 
              product: item.product, 
              variant: item.variant.variant_name || item.variant.name,
              error: 'Delete failed' 
            });
          }
        } catch (error) {
          errors++;
          errorList.push({ 
            product: item.product, 
            variant: item.variant.variant_name || item.variant.name,
            error: error.message 
          });
          console.log(`   ❌ Error deleting variant "${item.variant.variant_name || item.variant.name}": ${error.message}`);
        }
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 CLEANUP SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Variants deleted: ${deleted}`);
    console.log(`⚠️  Variants with references (skipped): ${withReferences.length}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📋 Total variants processed: ${variantsToDelete.length}`);
    
    if (DRY_RUN) {
      console.log('\n⚠️  This was a DRY RUN - no actual changes were made');
      console.log('   Run without --dry-run to apply changes');
    }
    
    if (errorList.length > 0) {
      console.log('\n❌ Errors encountered:');
      errorList.slice(0, 10).forEach((err, i) => {
        console.log(`   ${i + 1}. ${err.product} - ${err.variant}: ${err.error}`);
      });
      if (errorList.length > 10) {
        console.log(`   ... and ${errorList.length - 10} more errors`);
      }
    }
    
    console.log('\n✨ Process completed!\n');
    
  } catch (error) {
    console.error('❌ Process failed:', error.message);
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
