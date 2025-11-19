#!/usr/bin/env node
import { Pool } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import ws from 'ws';

dotenv.config();

if (typeof WebSocket === 'undefined') {
  global.WebSocket = ws;
}

const pool = new Pool({ connectionString: process.env.VITE_DATABASE_URL || process.env.DATABASE_URL });

async function checkVariants() {
  try {
    console.log('\n🔍 Checking iPhone products and their variants...\n');
    console.log('='.repeat(80));
    
    // Get all iPhone products
    const { rows: products } = await pool.query(`
      SELECT id, name, sku, created_at
      FROM lats_products
      WHERE name ILIKE '%iphone%'
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    if (products.length === 0) {
      console.log('No iPhone products found.');
      return;
    }
    
    for (const product of products) {
      console.log(`\n📱 Product: ${product.name}`);
      console.log(`   ID: ${product.id}`);
      console.log(`   SKU: ${product.sku}`);
      console.log(`   Created: ${new Date(product.created_at).toLocaleString()}`);
      
      // Get variants for this product
      const { rows: variants } = await pool.query(`
        SELECT 
          id, 
          name, 
          variant_name,
          sku,
          variant_attributes,
          created_at
        FROM lats_product_variants
        WHERE product_id = $1
        AND parent_variant_id IS NULL
        ORDER BY created_at ASC
      `, [product.id]);
      
      console.log(`\n   📦 Variants (${variants.length} total):`);
      
      if (variants.length === 0) {
        console.log('      ❌ No variants found! This should not happen.');
      } else {
        variants.forEach((variant, index) => {
          const isAutoCreated = variant.variant_attributes?.auto_created;
          const autoFlag = isAutoCreated ? '🤖 (Auto-created by trigger)' : '👤 (User-created)';
          console.log(`      ${index + 1}. ${variant.name || variant.variant_name} ${autoFlag}`);
          console.log(`         SKU: ${variant.sku}`);
          console.log(`         Created: ${new Date(variant.created_at).toLocaleString()}`);
        });
      }
      
      console.log('\n' + '-'.repeat(80));
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ Check complete!\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkVariants();

