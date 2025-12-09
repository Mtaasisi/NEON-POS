#!/usr/bin/env node

/**
 * Rename iPad Products to Shorter Format
 * 
 * Converts iPad product names from:
 *   "iPad (8th generation) (A2270)" → "iPad 8 A2270"
 *   "iPad (7th generation) (A2197)" → "iPad 7 A2197"
 *   etc.
 * 
 * Usage:
 *   node rename-ipad-products.mjs [--dry-run]
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
 * Convert iPad name to shorter format
 * Examples:
 *   "iPad (8th generation) (A2270)" → "iPad 8 A2270"
 *   "iPad (7th generation) (A2197)" → "iPad 7 A2197"
 *   "iPad (11th generation)" → "iPad 11"
 *   "iPad Pro (12.9-inch, 5th gen) (A2377)" → "iPad Pro 12.9 5 A2377"
 */
function convertIpadName(name) {
  // Pattern 1: iPad (Xth generation) (A####)
  const pattern1 = /^iPad\s+\((\d+)(?:st|nd|rd|th)\s+generation\)\s+\(([A-Z]\d+)\)$/i;
  const match1 = name.match(pattern1);
  if (match1) {
    const gen = match1[1];
    const model = match1[2];
    return `iPad ${gen} ${model}`;
  }
  
  // Pattern 2: iPad (Xth generation) - no model number
  const pattern2 = /^iPad\s+\((\d+)(?:st|nd|rd|th)\s+generation\)$/i;
  const match2 = name.match(pattern2);
  if (match2) {
    const gen = match2[1];
    return `iPad ${gen}`;
  }
  
  // Pattern 3: iPad Pro (size, Xth gen) (A####)
  const pattern3 = /^iPad\s+Pro\s+\(([^,]+),\s+(\d+)(?:st|nd|rd|th)\s+gen\)\s+\(([A-Z]\d+)\)$/i;
  const match3 = name.match(pattern3);
  if (match3) {
    const size = match3[1].trim();
    const gen = match3[2];
    const model = match3[3];
    return `iPad Pro ${size} ${gen} ${model}`;
  }
  
  // Pattern 4: iPad Pro (size, Xth gen) - no model
  const pattern4 = /^iPad\s+Pro\s+\(([^,]+),\s+(\d+)(?:st|nd|rd|th)\s+gen\)$/i;
  const match4 = name.match(pattern4);
  if (match4) {
    const size = match4[1].trim();
    const gen = match4[2];
    return `iPad Pro ${size} ${gen}`;
  }
  
  // Pattern 5: iPad Air (Xth generation) (A####)
  const pattern5 = /^iPad\s+Air\s+\((\d+)(?:st|nd|rd|th)\s+generation\)\s+\(([A-Z]\d+)\)$/i;
  const match5 = name.match(pattern5);
  if (match5) {
    const gen = match5[1];
    const model = match5[2];
    return `iPad Air ${gen} ${model}`;
  }
  
  // Pattern 6: iPad Air (Xth generation) - no model
  const pattern6 = /^iPad\s+Air\s+\((\d+)(?:st|nd|rd|th)\s+generation\)$/i;
  const match6 = name.match(pattern6);
  if (match6) {
    const gen = match6[1];
    return `iPad Air ${gen}`;
  }
  
  // Pattern 7: iPad Pro (size) (A####) - no generation
  const pattern7 = /^iPad\s+Pro\s+\(([^)]+)\)\s+\(([A-Z]\d+)\)$/i;
  const match7 = name.match(pattern7);
  if (match7) {
    const size = match7[1].trim();
    const model = match7[2];
    return `iPad Pro ${size} ${model}`;
  }
  
  // Pattern 8: iPad Pro (size) - no generation, no model
  const pattern8 = /^iPad\s+Pro\s+\(([^)]+)\)$/i;
  const match8 = name.match(pattern8);
  if (match8) {
    const size = match8[1].trim();
    return `iPad Pro ${size}`;
  }
  
  // No match - return original name
  return null;
}

/**
 * Fetch all iPad products
 */
async function fetchIpadProducts() {
  console.log('📦 Fetching iPad products from database...');
  
  if (USE_SUPABASE) {
    const { data: products, error } = await supabase
      .from('lats_products')
      .select('id, name, sku')
      .ilike('name', 'iPad%')
      .order('name');
    
    if (error) {
      throw new Error(`Failed to fetch products: ${error.message}`);
    }
    
    return products || [];
  } else {
    const query = `
      SELECT id, name, sku
      FROM lats_products
      WHERE name ILIKE 'iPad%'
      ORDER BY name
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }
}

/**
 * Update product name
 */
async function updateProductName(productId, newName) {
  if (DRY_RUN) {
    console.log(`   [DRY RUN] Would update product ${productId} to "${newName}"`);
    return true;
  }
  
  if (USE_SUPABASE) {
    const { error } = await supabase
      .from('lats_products')
      .update({ name: newName, updated_at: new Date().toISOString() })
      .eq('id', productId);
    
    return !error;
  } else {
    const result = await pool.query(
      'UPDATE lats_products SET name = $1, updated_at = NOW() WHERE id = $2',
      [newName, productId]
    );
    return result.rowCount > 0;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Starting iPad product name conversion...\n');
    console.log('📝 Converting format: "iPad (Xth generation) (A####)" → "iPad X A####"\n');
    
    if (DRY_RUN) {
      console.log('⚠️  DRY RUN MODE - No changes will be made\n');
    }
    
    const products = await fetchIpadProducts();
    console.log(`✅ Fetched ${products.length} iPad products\n`);
    
    const productsToUpdate = [];
    
    // Find products that need renaming
    for (const product of products) {
      const newName = convertIpadName(product.name);
      if (newName && newName !== product.name) {
        productsToUpdate.push({
          ...product,
          newName
        });
      }
    }
    
    console.log(`📊 Found ${productsToUpdate.length} products to rename\n`);
    
    if (productsToUpdate.length === 0) {
      console.log('✅ No iPad products need renaming!');
      return;
    }
    
    // Show first 10 products
    console.log('📋 Products that will be renamed:');
    productsToUpdate.slice(0, 10).forEach((product, idx) => {
      console.log(`   ${idx + 1}. "${product.name}" → "${product.newName}"`);
    });
    if (productsToUpdate.length > 10) {
      console.log(`   ... and ${productsToUpdate.length - 10} more\n`);
    } else {
      console.log('');
    }
    
    if (!DRY_RUN) {
      console.log(`⚠️  About to rename ${productsToUpdate.length} products`);
      console.log('   Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // Update products
    let updated = 0;
    let errors = 0;
    const errorList = [];
    
    console.log('\n🔧 Updating product names...\n');
    
    for (const product of productsToUpdate) {
      try {
        const success = await updateProductName(product.id, product.newName);
        
        if (success) {
          updated++;
          if (updated % 10 === 0) {
            console.log(`   ✅ Updated ${updated}/${productsToUpdate.length} products...`);
          }
        } else {
          errors++;
          errorList.push({ product: product.name, error: 'Update failed' });
          console.log(`   ❌ Failed to update "${product.name}"`);
        }
      } catch (error) {
        errors++;
        errorList.push({ product: product.name, error: error.message });
        console.log(`   ❌ Exception updating "${product.name}": ${error.message}`);
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 RENAME SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Products renamed: ${updated}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📋 Total products processed: ${productsToUpdate.length}`);
    
    if (DRY_RUN) {
      console.log('\n⚠️  This was a DRY RUN - no actual changes were made');
      console.log('   Run without --dry-run to apply changes');
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
