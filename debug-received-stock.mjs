#!/usr/bin/env node

/**
 * Debug Received Stock Issue
 */

import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

async function debugStock() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('🔍 DEBUGGING RECEIVED STOCK ISSUE');
    console.log('═'.repeat(60));
    console.log('');

    // Find the iPhone 6 product
    const { rows: products } = await client.query(`
      SELECT id, name, sku, stock_quantity
      FROM lats_products
      WHERE name ILIKE '%iPhone 6%'
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (products.length === 0) {
      console.log('❌ iPhone 6 product not found');
      return;
    }

    const product = products[0];
    console.log('📱 Product Found:');
    console.log(`   Name: ${product.name}`);
    console.log(`   SKU: ${product.sku}`);
    console.log(`   Stock: ${product.stock_quantity}`);
    console.log('');

    // Get all variants for this product
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
        parent_variant_id,
        cost_price,
        selling_price,
        variant_attributes,
        created_at
      FROM lats_product_variants
      WHERE product_id = $1
      ORDER BY created_at ASC
    `, [product.id]);

    console.log(`📊 Found ${variants.length} variants:`);
    console.log('');

    variants.forEach((v, i) => {
      console.log(`Variant ${i + 1}:`);
      console.log(`   ID: ${v.id}`);
      console.log(`   Name: ${v.name || v.variant_name}`);
      console.log(`   SKU: ${v.sku}`);
      console.log(`   Quantity: ${v.quantity}`);
      console.log(`   Is Active: ${v.is_active}`);
      console.log(`   Is Parent: ${v.is_parent}`);
      console.log(`   Type: ${v.variant_type || 'NULL'}`);
      console.log(`   Parent ID: ${v.parent_variant_id || 'NULL'}`);
      console.log(`   Cost: ${v.cost_price}`);
      console.log(`   Price: ${v.selling_price}`);
      if (v.variant_attributes && v.variant_attributes.imei) {
        console.log(`   IMEI: ${v.variant_attributes.imei}`);
      }
      console.log('');
    });

    // Check for IMEI children
    const parentIds = variants.filter(v => v.is_parent || v.variant_type === 'parent').map(v => v.id);
    
    if (parentIds.length > 0) {
      console.log('🔍 Checking for IMEI children...');
      console.log('');

      for (const parentId of parentIds) {
        const { rows: children } = await client.query(`
          SELECT 
            id,
            variant_name,
            quantity,
            is_active,
            variant_attributes->>'imei' as imei
          FROM lats_product_variants
          WHERE parent_variant_id = $1
            AND variant_type = 'imei_child'
        `, [parentId]);

        console.log(`   Parent ${parentId}: ${children.length} children`);
        children.forEach((child, i) => {
          console.log(`      Child ${i + 1}: IMEI=${child.imei}, Qty=${child.quantity}, Active=${child.is_active}`);
        });
      }
      console.log('');
    }

    // Check stock movements
    console.log('📦 Recent Stock Movements:');
    const { rows: movements } = await client.query(`
      SELECT 
        sm.movement_type,
        sm.quantity,
        sm.reference_type,
        sm.notes,
        sm.created_at,
        v.variant_name,
        v.variant_attributes->>'imei' as imei
      FROM lats_stock_movements sm
      LEFT JOIN lats_product_variants v ON v.id = sm.variant_id
      WHERE sm.product_id = $1
      ORDER BY sm.created_at DESC
      LIMIT 10
    `, [product.id]);

    movements.forEach((m, i) => {
      console.log(`   ${i + 1}. ${m.movement_type}: ${m.quantity} (${m.reference_type})`);
      console.log(`      Variant: ${m.variant_name}`);
      if (m.imei) console.log(`      IMEI: ${m.imei}`);
      console.log(`      Notes: ${m.notes || 'N/A'}`);
      console.log(`      Date: ${m.created_at}`);
    });
    console.log('');

    // Check for recent POs
    console.log('📋 Recent Purchase Orders:');
    const { rows: pos } = await client.query(`
      SELECT 
        po.id,
        po.order_number,
        po.status,
        poi.quantity as ordered_qty,
        poi.quantity_received,
        v.variant_name
      FROM lats_purchase_orders po
      JOIN lats_purchase_order_items poi ON poi.purchase_order_id = po.id
      LEFT JOIN lats_product_variants v ON v.id = poi.variant_id
      WHERE poi.product_id = $1
      ORDER BY po.created_at DESC
      LIMIT 5
    `, [product.id]);

    pos.forEach((po, i) => {
      console.log(`   ${i + 1}. PO #${po.order_number} (${po.status})`);
      console.log(`      Variant: ${po.variant_name}`);
      console.log(`      Ordered: ${po.ordered_qty}, Received: ${po.quantity_received || 0}`);
    });
    console.log('');

    // Diagnosis
    console.log('═'.repeat(60));
    console.log('🔍 DIAGNOSIS:');
    console.log('═'.repeat(60));
    
    const hasParents = variants.some(v => v.is_parent || v.variant_type === 'parent');
    const hasChildren = variants.some(v => v.variant_type === 'imei_child');
    const activeVariants = variants.filter(v => v.is_active);
    const variantsWithStock = variants.filter(v => v.quantity > 0);

    console.log(`Parents exist: ${hasParents ? 'YES' : 'NO'}`);
    console.log(`Children exist: ${hasChildren ? 'YES' : 'NO'}`);
    console.log(`Active variants: ${activeVariants.length}/${variants.length}`);
    console.log(`Variants with stock: ${variantsWithStock.length}/${variants.length}`);
    console.log('');

    if (variants.every(v => !v.is_active)) {
      console.log('❌ PROBLEM: All variants are INACTIVE (is_active = FALSE)');
      console.log('   This is why they show as SOLD');
      console.log('');
      console.log('💡 SOLUTION: Check receiving process - variants should be is_active=TRUE');
    }

    if (variants.every(v => v.quantity === 0)) {
      console.log('❌ PROBLEM: All variants have quantity = 0');
      console.log('   This is why stock shows as 0');
      console.log('');
      console.log('💡 SOLUTION: Check if IMEIs were actually added as children');
    }

    if (!hasChildren && hasParents) {
      console.log('⚠️  ISSUE: Parent exists but no children found');
      console.log('   IMEIs may not have been added during receiving');
      console.log('');
      console.log('💡 SOLUTION: Check receiving modal - ensure IMEIs are being passed');
    }

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

debugStock();

