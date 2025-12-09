#!/usr/bin/env node

/**
 * Search Product Specifications Online
 * 
 * This script searches online for product specifications and updates the database.
 * It processes products in batches to avoid rate limits.
 * 
 * Usage:
 *   node search-product-specifications.mjs [--limit N] [--dry-run]
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
const LIMIT = parseInt(process.argv.find(arg => arg.startsWith('--limit='))?.split('=')[1] || '0') || 
              parseInt(process.argv[process.argv.indexOf('--limit') + 1]) || 0;

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
 * Extract specifications from search results
 * This is a simplified parser - in production, you'd want more sophisticated parsing
 */
function extractSpecificationsFromText(text, productName) {
  const specs = {};
  const lowerText = text.toLowerCase();
  const lowerName = productName.toLowerCase();
  
  // Common specification patterns
  const patterns = {
    screen_size: /(?:screen|display|screen size)[:\s]+([0-9.]+(?:\s*inches?|"|inch))/i,
    resolution: /(?:resolution|display resolution)[:\s]+([0-9]+(?:\s*x\s*)[0-9]+(?:\s*pixels?)?)/i,
    processor: /(?:processor|cpu|chip)[:\s]+([A-Za-z0-9\s]+(?:Bionic|Snapdragon|MediaTek|Intel|AMD|Apple|M[0-9]|A[0-9]+))/i,
    ram: /(?:ram|memory)[:\s]+([0-9]+\s*GB)/i,
    storage: /(?:storage|capacity)[:\s]+([0-9]+\s*GB(?:\s*\/\s*[0-9]+\s*GB)*)/i,
    camera: /(?:camera|rear camera|main camera)[:\s]+([0-9]+\s*MP[^,]*)/i,
    front_camera: /(?:front camera|selfie camera)[:\s]+([0-9]+\s*MP[^,]*)/i,
    battery: /(?:battery|battery capacity)[:\s]+([0-9]+\s*(?:mAh|hours?|hrs?))/i,
    os: /(?:os|operating system|system)[:\s]+([A-Za-z0-9\s]+(?:iOS|Android|Windows|macOS|iPadOS))/i,
    weight: /(?:weight)[:\s]+([0-9.]+(?:\s*(?:g|kg|grams?|kilograms?)))/i,
    dimensions: /(?:dimensions|size)[:\s]+([0-9.]+(?:\s*x\s*)[0-9.]+(?:\s*x\s*)?[0-9.]*(?:\s*(?:mm|cm|inches?)))/i,
  };
  
  for (const [key, pattern] of Object.entries(patterns)) {
    const match = text.match(pattern);
    if (match && match[1]) {
      specs[key] = match[1].trim();
    }
  }
  
  // Additional boolean features
  if (lowerText.includes('wireless charging') || lowerText.includes('qi charging')) {
    specs.wireless_charging = 'Yes';
  }
  if (lowerText.includes('fast charging') || lowerText.includes('quick charge')) {
    specs.fast_charging = 'Yes';
  }
  if (lowerText.includes('water resistant') || lowerText.includes('ip68') || lowerText.includes('ip67')) {
    const ipMatch = text.match(/IP[0-9]+/i);
    specs.water_resistant = ipMatch ? ipMatch[0] : 'Yes';
  }
  if (lowerText.includes('5g') || lowerText.includes('5g support')) {
    specs['5g_support'] = 'Yes';
  }
  if (lowerText.includes('face id') || lowerText.includes('face unlock')) {
    specs.face_id = 'Yes';
  }
  if (lowerText.includes('fingerprint') || lowerText.includes('touch id')) {
    specs.fingerprint_scanner = 'Yes';
  }
  
  return Object.keys(specs).length > 0 ? specs : null;
}

/**
 * Search for product specifications online
 * Note: This is a placeholder - you would integrate with a real search API
 * For now, this returns null and logs that web search would be performed
 */
async function searchProductSpecifications(productName) {
  // In a real implementation, you would:
  // 1. Call a web search API (Google Custom Search, Bing, etc.)
  // 2. Parse the results
  // 3. Extract specifications
  // 4. Return structured data
  
  console.log(`   🔍 Would search online for: "${productName}"`);
  
  // For demonstration, we'll use a simple approach:
  // Try to extract specs from product name patterns
  // In production, you'd make actual web API calls
  
  // This is a placeholder - actual implementation would use web_search tool
  return null;
}

/**
 * Fetch products missing specifications
 */
async function fetchProductsMissingSpecs(limit = 0) {
  console.log('📦 Fetching products missing specifications...');
  
  if (USE_SUPABASE) {
    let query = supabase
      .from('lats_products')
      .select('id, name, specification')
      .is('specification', null)
      .order('name');
    
    if (limit > 0) {
      query = query.limit(limit);
    }
    
    const { data: products, error } = await query;
    
    if (error) {
      throw new Error(`Failed to fetch products: ${error.message}`);
    }
    
    return products || [];
  } else {
    let query = `
      SELECT id, name, specification
      FROM lats_products
      WHERE specification IS NULL
      ORDER BY name
    `;
    
    if (limit > 0) {
      query += ` LIMIT ${limit}`;
    }
    
    const result = await pool.query(query);
    return result.rows;
  }
}

/**
 * Update product specification
 */
async function updateProductSpecification(productId, specification) {
  if (DRY_RUN) {
    console.log(`   [DRY RUN] Would update product ${productId}`);
    console.log(`     Specification: ${JSON.stringify(specification).substring(0, 150)}...`);
    return true;
  }
  
  if (USE_SUPABASE) {
    const { error } = await supabase
      .from('lats_products')
      .update({ 
        specification: JSON.stringify(specification),
        updated_at: new Date().toISOString()
      })
      .eq('id', productId);
    
    return !error;
  } else {
    const result = await pool.query(
      'UPDATE lats_products SET specification = $1::jsonb, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(specification), productId]
    );
    return result.rowCount > 0;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Starting online product specification search...\n');
    
    if (DRY_RUN) {
      console.log('⚠️  DRY RUN MODE - No changes will be made\n');
    }
    
    if (LIMIT > 0) {
      console.log(`📊 Processing limit: ${LIMIT} products\n`);
    }
    
    // Fetch products missing specifications
    const products = await fetchProductsMissingSpecs(LIMIT);
    console.log(`✅ Found ${products.length} products missing specifications\n`);
    
    if (products.length === 0) {
      console.log('✨ All products have specifications!');
      return;
    }
    
    console.log('⚠️  NOTE: This script requires web search integration.');
    console.log('   For now, it will identify products that need specifications.\n');
    console.log('   To implement web search, you would need to:');
    console.log('   1. Set up a search API (Google Custom Search, Bing, etc.)');
    console.log('   2. Parse search results');
    console.log('   3. Extract specifications using NLP or pattern matching\n');
    
    let updated = 0;
    let skipped = 0;
    const errors = [];
    
    console.log('🔧 Processing products...\n');
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      
      try {
        // Search for specifications
        const specification = await searchProductSpecifications(product.name);
        
        if (specification) {
          const success = await updateProductSpecification(product.id, specification);
          
          if (success) {
            updated++;
            console.log(`   ✅ [${i + 1}/${products.length}] Added specs for "${product.name}"`);
          } else {
            skipped++;
            errors.push({ product: product.name, error: 'Update failed' });
          }
        } else {
          skipped++;
          console.log(`   ⏭️  [${i + 1}/${products.length}] No specs found for "${product.name}"`);
        }
        
        // Rate limiting - wait between requests
        if (i < products.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        }
      } catch (error) {
        skipped++;
        errors.push({ product: product.name, error: error.message });
        console.log(`   ❌ [${i + 1}/${products.length}] Error processing "${product.name}": ${error.message}`);
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SEARCH SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Specifications added: ${updated}`);
    console.log(`⏭️  Products skipped: ${skipped}`);
    console.log(`❌ Errors: ${errors.length}`);
    console.log(`📋 Total products processed: ${products.length}`);
    
    if (DRY_RUN) {
      console.log('\n⚠️  This was a DRY RUN - no actual changes were made');
    }
    
    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.slice(0, 10).forEach((err, i) => {
        console.log(`   ${i + 1}. ${err.product}: ${err.error}`);
      });
      if (errors.length > 10) {
        console.log(`   ... and ${errors.length - 10} more errors`);
      }
    }
    
    console.log('\n✨ Process completed!\n');
    console.log('💡 To add web search functionality, integrate with a search API.');
    console.log('   Example: Google Custom Search API, Bing Search API, or web scraping.\n');
    
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
