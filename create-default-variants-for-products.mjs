#!/usr/bin/env node

/**
 * Create Default Variants for Products Without Variants
 * 
 * This script finds all products that have 0 variants and creates
 * a default "Default" variant for each one.
 * 
 * Usage:
 *   node create-default-variants-for-products.mjs [--dry-run]
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
 * Find products without variants
 */
async function findProductsWithoutVariants() {
  console.log('📦 Finding products without variants...');
  
  if (USE_SUPABASE) {
    // Get all products
    const { data: products, error: productsError } = await supabase
      .from('lats_products')
      .select('id, name, sku, cost_price, selling_price, unit_price, stock_quantity, min_stock_level, branch_id, is_active')
      .eq('is_active', true);
    
    if (productsError) {
      throw new Error(`Failed to fetch products: ${productsError.message}`);
    }
    
    // Get all variant product IDs
    const { data: variants, error: variantsError } = await supabase
      .from('lats_product_variants')
      .select('product_id');
    
    if (variantsError) {
      throw new Error(`Failed to fetch variants: ${variantsError.message}`);
    }
    
    const productsWithVariants = new Set((variants || []).map(v => v.product_id));
    const productsWithoutVariants = (products || []).filter(p => !productsWithVariants.has(p.id));
    
    return productsWithoutVariants;
  } else {
    const query = `
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.cost_price,
        p.selling_price,
        p.unit_price,
        p.stock_quantity,
        p.min_stock_level,
        p.branch_id,
        p.is_active
      FROM lats_products p
      LEFT JOIN lats_product_variants v ON p.id = v.product_id
      WHERE p.is_active = true
        AND v.id IS NULL
      ORDER BY p.name
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }
}

/**
 * Create default variant for a product
 */
async function createDefaultVariant(product) {
  const variantSku = product.sku 
    ? `${product.sku}-DEFAULT`
    : `SKU-${product.id.substring(0, 8)}-DEFAULT`;
  
  const variantData = {
    product_id: product.id,
    name: 'Default',
    variant_name: 'Default',
    sku: variantSku,
    cost_price: product.cost_price || 0,
    selling_price: product.selling_price || product.unit_price || 0,
    unit_price: product.selling_price || product.unit_price || 0,
    quantity: product.stock_quantity || 0,
    min_quantity: product.min_stock_level || 0,
    branch_id: product.branch_id || null,
    is_active: product.is_active !== false,
    is_parent: true,
    parent_variant_id: null,
    variant_type: 'standard',
    variant_attributes: {
      auto_created: true,
      created_at: new Date().toISOString(),
      created_from: 'default_variant_script'
    },
    attributes: {}
  };
  
  if (DRY_RUN) {
    console.log(`   [DRY RUN] Would create variant: ${variantSku} for "${product.name}"`);
    return { success: true, variantId: 'dry-run-id' };
  }
  
  if (USE_SUPABASE) {
    const { data, error } = await supabase
      .from('lats_product_variants')
      .insert(variantData)
      .select('id')
      .single();
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, variantId: data.id };
  } else {
    const query = `
      INSERT INTO lats_product_variants (
        id,
        product_id,
        name,
        variant_name,
        sku,
        cost_price,
        unit_price,
        selling_price,
        quantity,
        min_quantity,
        branch_id,
        is_active,
        is_parent,
        parent_variant_id,
        variant_type,
        variant_attributes,
        attributes,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        $1::uuid,
        $2,
        $3,
        $4,
        $5::numeric,
        $6::numeric,
        $7::numeric,
        $8::integer,
        $9::integer,
        $10::uuid,
        $11::boolean,
        $12::boolean,
        NULL,
        $13,
        $14::jsonb,
        $15::jsonb,
        NOW(),
        NOW()
      )
      RETURNING id
    `;
    
    const result = await pool.query(query, [
      product.id,
      variantData.name,
      variantData.variant_name,
      variantData.sku,
      variantData.cost_price,
      variantData.unit_price,
      variantData.selling_price,
      variantData.quantity,
      variantData.min_quantity,
      variantData.branch_id,
      variantData.is_active,
      variantData.is_parent,
      variantData.variant_type,
      JSON.stringify(variantData.variant_attributes),
      JSON.stringify(variantData.attributes)
    ]);
    
    return { success: true, variantId: result.rows[0].id };
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Starting default variant creation for products without variants...\n');
    
    if (DRY_RUN) {
      console.log('⚠️  DRY RUN MODE - No changes will be made\n');
    }
    
    const productsWithoutVariants = await findProductsWithoutVariants();
    console.log(`✅ Found ${productsWithoutVariants.length} products without variants\n`);
    
    if (productsWithoutVariants.length === 0) {
      console.log('✅ All products already have variants!');
      return;
    }
    
    // Show first 10 products
    console.log('📋 Products that will get default variants:');
    productsWithoutVariants.slice(0, 10).forEach((product, idx) => {
      console.log(`   ${idx + 1}. ${product.name} (SKU: ${product.sku || 'N/A'})`);
    });
    if (productsWithoutVariants.length > 10) {
      console.log(`   ... and ${productsWithoutVariants.length - 10} more\n`);
    } else {
      console.log('');
    }
    
    if (!DRY_RUN) {
      console.log(`⚠️  About to create ${productsWithoutVariants.length} default variants`);
      console.log('   Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // Create variants
    let created = 0;
    let errors = 0;
    const errorList = [];
    
    console.log('\n🔧 Creating default variants...\n');
    
    for (const product of productsWithoutVariants) {
      try {
        const result = await createDefaultVariant(product);
        
        if (result.success) {
          created++;
          if (created % 10 === 0) {
            console.log(`   ✅ Created ${created}/${productsWithoutVariants.length} variants...`);
          }
        } else {
          errors++;
          errorList.push({ product: product.name, error: result.error });
          console.log(`   ❌ Failed to create variant for "${product.name}": ${result.error}`);
        }
      } catch (error) {
        errors++;
        errorList.push({ product: product.name, error: error.message });
        console.log(`   ❌ Exception creating variant for "${product.name}": ${error.message}`);
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 CREATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Variants created: ${created}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📋 Total products processed: ${productsWithoutVariants.length}`);
    
    if (DRY_RUN) {
      console.log('\n⚠️  This was a DRY RUN - no actual changes were made');
      console.log('   Run without --dry-run to create variants');
    }
    
    if (errorList.length > 0) {
      console.log('\n❌ Errors encountered:');
      errorList.slice(0, 10).forEach((err, i) => {
        console.log(`   ${i + 1}. ${err.product}: ${err.error}`);
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
