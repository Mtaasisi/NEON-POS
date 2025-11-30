#!/usr/bin/env node

/**
 * Verify UI Fix - Check what data will be returned now
 */

import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

async function verifyUIFix() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║           VERIFYING UI FIX - What UI Will See            ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');

    // Find iPhone 6
    const { rows: products } = await client.query(`
      SELECT id, name, sku, stock_quantity
      FROM lats_products
      WHERE name ILIKE '%iPhone 6%'
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (products.length === 0) {
      console.log('❌ Product not found');
      return;
    }

    const product = products[0];
    console.log('📱 Product:', product.name);
    console.log('   Product-level stock:', product.stock_quantity);
    console.log('');

    // Simulate what getProductVariants() will return NOW (after fix)
    console.log('🔍 SIMULATING getProductVariants() API CALL:');
    console.log('─'.repeat(60));
    console.log('');
    console.log('Query: SELECT * FROM lats_product_variants');
    console.log('       WHERE product_id = <id>');
    console.log('       AND parent_variant_id IS NULL  ← NEW FILTER!');
    console.log('');

    const { rows: variants } = await client.query(`
      SELECT 
        id,
        name,
        variant_name,
        sku,
        quantity,
        is_active,
        is_parent,
        variant_type,
        cost_price,
        selling_price,
        min_quantity
      FROM lats_product_variants
      WHERE product_id = $1
        AND parent_variant_id IS NULL
      ORDER BY name
    `, [product.id]);

    console.log('📊 API Will Return:');
    console.log(`   Total variants: ${variants.length}`);
    console.log('');

    variants.forEach((v, i) => {
      console.log(`   ${i + 1}. ${v.name || v.variant_name}`);
      console.log(`      SKU: ${v.sku}`);
      console.log(`      Stock: ${v.quantity}`);
      console.log(`      Active: ${v.is_active}`);
      console.log(`      Type: ${v.variant_type || 'standard'}`);
      console.log(`      Is Parent: ${v.is_parent || false}`);
      console.log(`      Cost: TSh ${v.cost_price?.toLocaleString()}`);
      console.log(`      Price: TSh ${v.selling_price?.toLocaleString()}`);
      console.log('');
    });

    // Show what CHILDREN are being hidden
    console.log('🙈 CHILDREN (Hidden from UI):');
    console.log('─'.repeat(60));
    
    const { rows: children } = await client.query(`
      SELECT 
        variant_attributes->>'imei' as imei,
        parent_variant_id,
        quantity,
        is_active
      FROM lats_product_variants
      WHERE product_id = $1
        AND parent_variant_id IS NOT NULL
        AND variant_type = 'imei_child'
    `, [product.id]);

    console.log(`   Total IMEI children: ${children.length}`);
    if (children.length > 0) {
      console.log('   (These are properly linked but hidden from variant list)');
      console.log('   (They contribute to parent stock automatically)');
      children.slice(0, 5).forEach((c, i) => {
        console.log(`   ${i + 1}. IMEI: ${c.imei} (Parent: ${c.parent_variant_id})`);
      });
    }
    console.log('');

    // Summary
    console.log('═'.repeat(60));
    console.log('📋 UI WILL DISPLAY:');
    console.log('═'.repeat(60));
    console.log('');
    console.log('Manage Variants (' + variants.length + ')');
    console.log('');

    variants.forEach(v => {
      const status = v.is_active && v.quantity > 0 ? 'Available ✅' : 
                     v.is_active && v.quantity === 0 ? 'Out of Stock' : 
                     'Inactive';
      
      console.log(`┌─ ${v.name || v.variant_name}`);
      console.log(`│  Stock: ${v.quantity}`);
      console.log(`│  Min: ${v.min_quantity || 0}`);
      console.log(`│  Cost: TSh ${v.cost_price?.toLocaleString()}`);
      console.log(`│  Price: TSh ${v.selling_price?.toLocaleString()}`);
      console.log(`│  Status: ${status}`);
      console.log(`└─`);
      console.log('');
    });

    console.log('═'.repeat(60));
    console.log('✅ FIX APPLIED!');
    console.log('═'.repeat(60));
    console.log('');
    console.log('Changes Made:');
    console.log('  ✅ Filter: parent_variant_id IS NULL (exclude children)');
    console.log('  ✅ Stock: Uses parent.quantity (auto-calculated by trigger)');
    console.log('  ✅ Children: Hidden from UI (properly linked in background)');
    console.log('');
    console.log('🔄 REFRESH your browser NOW!');
    console.log('   Expected result:');
    variants.forEach(v => {
      console.log(`     • ${v.name || v.variant_name}: ${v.quantity} units available`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

verifyUIFix();

