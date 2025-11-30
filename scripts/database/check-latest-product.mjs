#!/usr/bin/env node
import { Pool } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import ws from 'ws';

dotenv.config();

if (typeof WebSocket === 'undefined') {
  global.WebSocket = ws;
}

const pool = new Pool({ connectionString: process.env.VITE_DATABASE_URL || process.env.DATABASE_URL });

async function checkLatestProduct() {
  try {
    console.log('\n🔍 Checking the most recently created product...\n');
    console.log('='.repeat(80));
    
    // Get the latest product
    const { rows: products } = await pool.query(`
      SELECT id, name, sku, created_at
      FROM lats_products
      ORDER BY created_at DESC
      LIMIT 1
    `);
    
    if (products.length === 0) {
      console.log('No products found.');
      return;
    }
    
    const product = products[0];
    console.log(`\n📱 Latest Product: ${product.name}`);
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
      console.log('      ⚠️ No variants found! (Database trigger might still be running - wait 1 second and check again)');
    } else {
      variants.forEach((variant, index) => {
        const isAutoCreated = variant.variant_attributes?.auto_created;
        const autoFlag = isAutoCreated ? '🤖 AUTO-CREATED' : '✅ USER-CREATED';
        console.log(`\n      Variant ${index + 1}: ${variant.name || variant.variant_name}`);
        console.log(`         Status: ${autoFlag}`);
        console.log(`         SKU: ${variant.sku}`);
        console.log(`         Created: ${new Date(variant.created_at).toLocaleString()}`);
      });
      
      // Analysis
      console.log('\n' + '='.repeat(80));
      console.log('\n📊 Analysis:');
      
      const userCreated = variants.filter(v => !v.variant_attributes?.auto_created).length;
      const autoCreated = variants.filter(v => v.variant_attributes?.auto_created).length;
      
      console.log(`   • User-created variants: ${userCreated}`);
      console.log(`   • Auto-created variants: ${autoCreated}`);
      console.log(`   • Total variants: ${variants.length}`);
      
      if (userCreated === 2 && autoCreated === 0) {
        console.log('\n   ✅ ✅ ✅ PERFECT! Fix is working correctly!');
        console.log('   You created 2 custom variants and got exactly 2 variants (no Default).');
      } else if (userCreated === 0 && autoCreated === 1) {
        console.log('\n   ✅ CORRECT! You created no variants, so 1 Default variant was auto-created.');
      } else if (userCreated > 0 && autoCreated === 1) {
        console.log('\n   ❌ ISSUE DETECTED! You created custom variants but still got a Default variant.');
        console.log('   This means the fix is not working yet. The frontend changes may need a server restart.');
      } else {
        console.log('\n   ℹ️ Custom scenario detected.');
      }
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkLatestProduct();

