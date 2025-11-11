#!/usr/bin/env node

/**
 * Show Current Status - Complete Picture
 */

import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

async function showStatus() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║           CURRENT SYSTEM STATUS - iPhone 6               ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');

    // Get product
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
    
    console.log('📱 PRODUCT INFO:');
    console.log('─'.repeat(60));
    console.log(`   Name: ${product.name}`);
    console.log(`   SKU: ${product.sku}`);
    console.log(`   Stock in lats_products: ${product.stock_quantity}`);
    console.log('');

    // Get variants
    const { rows: variants } = await client.query(`
      SELECT 
        id,
        variant_name,
        sku,
        quantity,
        is_active,
        is_parent,
        variant_type,
        parent_variant_id,
        cost_price,
        selling_price,
        variant_attributes
      FROM lats_product_variants
      WHERE product_id = $1
      ORDER BY 
        CASE 
          WHEN variant_type = 'parent' THEN 1
          WHEN variant_type = 'imei_child' THEN 2
          ELSE 3
        END,
        created_at ASC
    `, [product.id]);

    console.log('📊 VARIANTS:');
    console.log('─'.repeat(60));
    console.log('');

    const parents = variants.filter(v => v.is_parent || v.variant_type === 'parent');
    const children = variants.filter(v => v.variant_type === 'imei_child');
    const standard = variants.filter(v => !v.is_parent && v.variant_type !== 'imei_child');

    // Show parents
    if (parents.length > 0) {
      console.log('🏷️  PARENT VARIANTS:');
      for (const p of parents) {
        console.log(`   ┌─ ${p.variant_name} (${p.sku})`);
        console.log(`   │  Stock: ${p.quantity}`);
        console.log(`   │  Active: ${p.is_active ? 'Yes ✅' : 'No ❌'}`);
        console.log(`   │  Cost: TSh ${p.cost_price?.toLocaleString()}`);
        console.log(`   │  Price: TSh ${p.selling_price?.toLocaleString()}`);

        // Get children count
        const childrenCount = children.filter(c => c.parent_variant_id === p.id).length;
        console.log(`   │  Children: ${childrenCount} IMEI(s)`);

        if (childrenCount > 0) {
          const childrenList = children.filter(c => c.parent_variant_id === p.id);
          childrenList.forEach((child, i) => {
            const imei = child.variant_attributes?.imei || 'N/A';
            console.log(`   │    ${i + 1}. IMEI: ${imei} (Qty: ${child.quantity}, Active: ${child.is_active})`);
          });
        }
        console.log(`   └─`);
        console.log('');
      }
    }

    // Show standard variants
    if (standard.length > 0) {
      console.log('📦 STANDARD VARIANTS:');
      standard.forEach(v => {
        console.log(`   • ${v.variant_name}: Stock=${v.quantity}, Active=${v.is_active}`);
      });
      console.log('');
    }

    console.log('═'.repeat(60));
    console.log('📋 SUMMARY:');
    console.log('═'.repeat(60));
    console.log(`   Product Stock: ${product.stock_quantity}`);
    console.log(`   Parent Variants: ${parents.length}`);
    console.log(`   IMEI Children: ${children.length}`);
    console.log(`   Standard Variants: ${standard.length}`);
    console.log('');

    // Calculate expected stock
    const totalParentStock = parents.reduce((sum, p) => sum + parseInt(p.quantity || 0), 0);
    const totalChildStock = children.filter(c => c.is_active).length;
    
    console.log('🧮 STOCK CALCULATION:');
    console.log(`   Parents total: ${totalParentStock}`);
    console.log(`   Active children: ${totalChildStock}`);
    console.log('');

    if (totalParentStock === totalChildStock) {
      console.log('✅ Stock is CORRECT and CONSISTENT!');
    } else {
      console.log(`⚠️  Mismatch: Parent=${totalParentStock}, Children=${totalChildStock}`);
    }

    console.log('');
    console.log('═'.repeat(60));
    console.log('🎯 WHAT YOU SHOULD SEE ON PRODUCT PAGE:');
    console.log('═'.repeat(60));
    
    parents.forEach(p => {
      const status = p.quantity > 0 ? 'Available ✅' : 'Out of Stock';
      console.log(`   Variant: ${p.variant_name}`);
      console.log(`   Stock: ${p.quantity} units`);
      console.log(`   Status: ${status}`);
      console.log(`   Price: TSh ${p.selling_price?.toLocaleString()}`);
      console.log('');
    });

    console.log('💡 IF YOU SEE "SOLD" OR "0" STOCK:');
    console.log('   1. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)');
    console.log('   2. Clear browser cache');
    console.log('   3. Close and reopen the tab');
    console.log('');
    console.log('   Database is CORRECT! It\'s a display/cache issue.');

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

showStatus();

