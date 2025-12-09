#!/usr/bin/env node

/**
 * Delete Unrecognized Variants
 * 
 * This script finds and deletes product variants that are:
 * 1. Orphaned (product_id doesn't exist)
 * 2. Have invalid references
 * 3. Don't have required data
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.production') });

// Supabase configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://jxhzveborezjhsmzsgbc.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
  console.error('❌ Error: SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY not found in environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Find unrecognized variants
 */
async function findUnrecognizedVariants() {
  console.log('🔍 Finding unrecognized variants...\n');
  
  try {
    // Get all variants
    const { data: variants, error: variantsError } = await supabase
      .from('lats_product_variants')
      .select('*');
    
    if (variantsError) {
      console.error('❌ Error fetching variants:', variantsError);
      process.exit(1);
    }
    
    console.log(`📦 Found ${variants.length} total variants\n`);
    
    // Get all products
    const { data: products, error: productsError } = await supabase
      .from('lats_products')
      .select('id');
    
    if (productsError) {
      console.error('❌ Error fetching products:', productsError);
      process.exit(1);
    }
    
    const productIds = new Set(products.map(p => p.id));
    console.log(`📦 Found ${products.length} products\n`);
    
    // Find orphaned variants (product_id doesn't exist)
    const orphaned = variants.filter(v => v.product_id && !productIds.has(v.product_id));
    
    // Find variants with missing product_id
    const missingProductId = variants.filter(v => !v.product_id);
    
    // Find variants with invalid data
    const invalidData = variants.filter(v => {
      // Check for variants with no name, no SKU, and no meaningful data
      const hasNoName = !v.name || v.name.trim() === '' || v.name === 'Default Variant';
      const hasNoSku = !v.sku || v.sku.trim() === '';
      const hasNoData = hasNoName && hasNoSku && !v.barcode && (!v.attributes || Object.keys(v.attributes).length === 0);
      return hasNoData;
    });
    
    // Find variants with duplicate SKUs (potential duplicates)
    const skuMap = new Map();
    variants.forEach(v => {
      if (v.sku && v.sku.trim()) {
        if (!skuMap.has(v.sku)) {
          skuMap.set(v.sku, []);
        }
        skuMap.get(v.sku).push(v);
      }
    });
    const duplicateSkus = Array.from(skuMap.values())
      .filter(skus => skus.length > 1)
      .flat()
      .slice(1); // Keep first, delete rest
    
    // Find variants with invalid parent_variant_id
    const variantIds = new Set(variants.map(v => v.id));
    const invalidParent = variants.filter(v => 
      v.parent_variant_id && !variantIds.has(v.parent_variant_id)
    );
    
    // Find variants with status issues
    const invalidStatus = variants.filter(v => 
      v.status && !['active', 'inactive', 'discontinued', 'pending', 'draft'].includes(v.status)
    );
    
    // Combine all unrecognized variants
    const unrecognized = [
      ...orphaned,
      ...missingProductId,
      ...invalidData.filter(v => !orphaned.includes(v) && !missingProductId.includes(v)),
      ...duplicateSkus.filter(v => !orphaned.includes(v) && !missingProductId.includes(v)),
      ...invalidParent.filter(v => !orphaned.includes(v) && !missingProductId.includes(v)),
      ...invalidStatus.filter(v => !orphaned.includes(v) && !missingProductId.includes(v))
    ];
    
    // Remove duplicates
    const uniqueUnrecognized = Array.from(
      new Map(unrecognized.map(v => [v.id, v])).values()
    );
    
    console.log('📊 Analysis Results:\n');
    console.log(`  - Orphaned variants (product_id doesn't exist): ${orphaned.length}`);
    console.log(`  - Variants with missing product_id: ${missingProductId.length}`);
    console.log(`  - Variants with invalid/missing data: ${invalidData.length}`);
    console.log(`  - Duplicate SKU variants (keeping first): ${duplicateSkus.length}`);
    console.log(`  - Variants with invalid parent_variant_id: ${invalidParent.length}`);
    console.log(`  - Variants with invalid status: ${invalidStatus.length}`);
    console.log(`  - Total unrecognized variants: ${uniqueUnrecognized.length}\n`);
    
    if (uniqueUnrecognized.length === 0) {
      console.log('✅ No unrecognized variants found!');
      return [];
    }
    
    // Show examples
    console.log('📋 Examples of unrecognized variants (first 10):\n');
    uniqueUnrecognized.slice(0, 10).forEach((variant, idx) => {
      let reason = 'Unknown';
      if (orphaned.includes(variant)) reason = 'Orphaned (product not found)';
      else if (missingProductId.includes(variant)) reason = 'Missing product_id';
      else if (invalidData.includes(variant)) reason = 'Invalid/missing data';
      else if (duplicateSkus.includes(variant)) reason = 'Duplicate SKU';
      else if (invalidParent.includes(variant)) reason = 'Invalid parent_variant_id';
      else if (invalidStatus.includes(variant)) reason = 'Invalid status';
      
      console.log(`  ${idx + 1}. ID: ${variant.id}`);
      console.log(`     Name: ${variant.name || 'N/A'}`);
      console.log(`     SKU: ${variant.sku || 'N/A'}`);
      console.log(`     Product ID: ${variant.product_id || 'N/A'}`);
      console.log(`     Status: ${variant.status || 'N/A'}`);
      console.log(`     Reason: ${reason}`);
      console.log('');
    });
    
    if (uniqueUnrecognized.length > 10) {
      console.log(`  ... and ${uniqueUnrecognized.length - 10} more\n`);
    }
    
    return uniqueUnrecognized;
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

/**
 * Delete unrecognized variants
 */
async function deleteUnrecognizedVariants(dryRun = true) {
  const unrecognized = await findUnrecognizedVariants();
  
  if (unrecognized.length === 0) {
    return;
  }
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No variants will be deleted');
    console.log(`\nTo actually delete these ${unrecognized.length} variants, run:`);
    console.log(`  node delete-unrecognized-variants.mjs --delete\n`);
    return;
  }
  
  console.log(`\n🗑️  Deleting ${unrecognized.length} unrecognized variants...\n`);
  
  let deleted = 0;
  let errors = 0;
  const batchSize = 50;
  
  for (let i = 0; i < unrecognized.length; i += batchSize) {
    const batch = unrecognized.slice(i, i + batchSize);
    const variantIds = batch.map(v => v.id);
    
    const { error } = await supabase
      .from('lats_product_variants')
      .delete()
      .in('id', variantIds);
    
    if (error) {
      console.error(`  ❌ Error deleting batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      errors += batch.length;
    } else {
      deleted += batch.length;
      process.stdout.write(`  ✓ Deleted ${deleted}/${unrecognized.length} variants...\r`);
    }
  }
  
  console.log(`\n\n✅ Deletion completed!`);
  console.log(`   - Deleted: ${deleted} variants`);
  console.log(`   - Errors: ${errors} variants`);
  
  // Verify deletion
  console.log('\n🔍 Verifying deletion...');
  const remaining = await findUnrecognizedVariants();
  if (remaining.length === 0) {
    console.log('✅ All unrecognized variants have been deleted!');
  } else {
    console.log(`⚠️  Warning: ${remaining.length} unrecognized variants still remain`);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const shouldDelete = args.includes('--delete') || args.includes('-d');

// Run the script
deleteUnrecognizedVariants(!shouldDelete)
  .then(() => {
    console.log('\n✅ Script completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
