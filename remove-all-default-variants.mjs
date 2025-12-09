#!/usr/bin/env node

/**
 * Remove All Default Variants
 * 
 * Removes ALL variants with "Default" or "Default Variant" names from all products.
 * 
 * Usage:
 *   node remove-all-default-variants.mjs [--dry-run]
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
 * Fetch all default variants
 */
async function fetchDefaultVariants() {
  if (USE_SUPABASE) {
    const { data: variants, error } = await supabase
      .from('lats_product_variants')
      .select('id, product_id, variant_name, name, lats_products!product_id(name)')
      .or('variant_name.ilike.default,name.ilike.default')
      .order('product_id');
    
    if (error) {
      throw new Error(`Failed to fetch variants: ${error.message}`);
    }
    
    // Filter to only exact matches
    const defaultVariants = (variants || []).filter(v => isDefaultVariant(v));
    
    return defaultVariants;
  } else {
    const query = `
      SELECT 
        v.id,
        v.product_id,
        v.variant_name,
        v.name,
        p.name as product_name
      FROM lats_product_variants v
      JOIN lats_products p ON v.product_id = p.id
      WHERE LOWER(COALESCE(v.variant_name, '')) IN ('default', 'default variant')
         OR LOWER(COALESCE(v.name, '')) IN ('default', 'default variant')
      ORDER BY v.product_id
    `;
    
    const result = await pool.query(query);
    return result.rows.map(row => ({
      id: row.id,
      product_id: row.product_id,
      variant_name: row.variant_name,
      name: row.name,
      lats_products: { name: row.product_name }
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
    console.log('🚀 Starting removal of ALL default variants...\n');
    
    if (DRY_RUN) {
      console.log('⚠️  DRY RUN MODE - No changes will be made\n');
    }
    
    // Fetch all default variants
    console.log('📦 Fetching all default variants...');
    const defaultVariants = await fetchDefaultVariants();
    console.log(`✅ Found ${defaultVariants.length} default variants\n`);
    
    if (defaultVariants.length === 0) {
      console.log('✨ No default variants found!');
      return;
    }
    
    // Show some examples
    console.log('📋 Examples of variants to be removed:');
    defaultVariants.slice(0, 10).forEach((v, i) => {
      const productName = v.lats_products?.name || 'Unknown';
      const variantName = v.variant_name || v.name || 'N/A';
      console.log(`   ${i + 1}. "${productName}" - Variant: "${variantName}"`);
    });
    if (defaultVariants.length > 10) {
      console.log(`   ... and ${defaultVariants.length - 10} more\n`);
    } else {
      console.log('');
    }
    
    // Check for references
    console.log('🔍 Checking for references in other tables...');
    const variantIds = defaultVariants.map(v => v.id);
    const referencedIds = await getVariantsWithReferences(variantIds);
    
    const variantsToDelete = defaultVariants.filter(v => !referencedIds.has(v.id));
    const variantsWithRefs = defaultVariants.filter(v => referencedIds.has(v.id));
    
    console.log(`✅ Found ${variantsToDelete.length} variants safe to delete`);
    if (variantsWithRefs.length > 0) {
      console.log(`⚠️  Found ${variantsWithRefs.length} variants with references (will be skipped)\n`);
      
      console.log('⚠️  Variants with references (will NOT be deleted):');
      variantsWithRefs.slice(0, 5).forEach((v, i) => {
        const productName = v.lats_products?.name || 'Unknown';
        const variantName = v.variant_name || v.name || 'N/A';
        console.log(`   ${i + 1}. "${productName}" - Variant: "${variantName}"`);
      });
      if (variantsWithRefs.length > 5) {
        console.log(`   ... and ${variantsWithRefs.length - 5} more\n`);
      } else {
        console.log('');
      }
    } else {
      console.log('');
    }
    
    if (variantsToDelete.length === 0) {
      console.log('⚠️  No variants can be safely deleted (all have references)');
      return;
    }
    
    // Check which products will be left without variants
    const productIdsWithDefaults = new Set(variantsToDelete.map(v => v.product_id));
    console.log(`📊 Products affected: ${productIdsWithDefaults.size}`);
    
    if (!DRY_RUN) {
      console.log(`⚠️  About to delete ${variantsToDelete.length} default variants`);
      console.log('   Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // Delete variants in batches
    console.log('🗑️  Deleting variants...\n');
    const BATCH_SIZE = 50;
    let deleted = 0;
    let errors = 0;
    const errorList = [];
    
    for (let i = 0; i < variantsToDelete.length; i += BATCH_SIZE) {
      const batch = variantsToDelete.slice(i, i + BATCH_SIZE);
      
      for (const variant of batch) {
        try {
          const success = await deleteVariant(variant.id);
          
          if (success) {
            deleted++;
            if (deleted % 10 === 0) {
              console.log(`   ✅ Deleted ${deleted}/${variantsToDelete.length} variants...`);
            }
          } else {
            errors++;
            const productName = variant.lats_products?.name || 'Unknown';
            const variantName = variant.variant_name || variant.name || 'N/A';
            errorList.push({ product: productName, variant: variantName, error: 'Delete failed' });
          }
        } catch (error) {
          errors++;
          const productName = variant.lats_products?.name || 'Unknown';
          const variantName = variant.variant_name || variant.name || 'N/A';
          errorList.push({ product: productName, variant: variantName, error: error.message });
          console.log(`   ❌ Error deleting variant "${variantName}": ${error.message}`);
        }
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 DELETION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Variants deleted: ${deleted}`);
    console.log(`⚠️  Variants with references (skipped): ${variantsWithRefs.length}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📋 Total default variants found: ${defaultVariants.length}`);
    console.log(`📊 Products affected: ${productIdsWithDefaults.size}`);
    
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
