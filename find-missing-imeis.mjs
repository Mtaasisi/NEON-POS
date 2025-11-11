#!/usr/bin/env node

/**
 * Find where the IMEIs went after receiving
 */

import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

async function findIMEIs() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('🔍 SEARCHING FOR MISSING IMEIs');
    console.log('═'.repeat(60));
    console.log('');

    // Find iPhone 6 product
    const { rows: products } = await client.query(`
      SELECT id, name, sku
      FROM lats_products
      WHERE name ILIKE '%iPhone 6%'
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (products.length === 0) {
      console.log('❌ iPhone 6 not found');
      return;
    }

    const product = products[0];
    console.log(`📱 Product: ${product.name} (${product.sku})`);
    console.log('');

    // 1. Check lats_product_variants (new system)
    console.log('📊 1. Checking lats_product_variants (New System):');
    console.log('─'.repeat(60));
    const { rows: variants } = await client.query(`
      SELECT 
        id,
        variant_name,
        variant_type,
        parent_variant_id,
        quantity,
        is_active,
        variant_attributes->>'imei' as imei,
        variant_attributes->>'serial_number' as serial_number
      FROM lats_product_variants
      WHERE product_id = $1
      ORDER BY created_at DESC
    `, [product.id]);

    console.log(`   Total variants: ${variants.length}`);
    
    const withIMEI = variants.filter(v => v.imei);
    const children = variants.filter(v => v.variant_type === 'imei_child');
    const standalone = variants.filter(v => v.imei && v.variant_type !== 'imei_child');
    
    console.log(`   With IMEI: ${withIMEI.length}`);
    console.log(`   As Children: ${children.length}`);
    console.log(`   Standalone IMEI: ${standalone.length}`);
    console.log('');

    if (withIMEI.length > 0) {
      console.log('   IMEI Variants Found:');
      withIMEI.forEach((v, i) => {
        console.log(`   ${i + 1}. ${v.variant_name || 'Unnamed'}`);
        console.log(`      Type: ${v.variant_type || 'NULL'}`);
        console.log(`      Parent: ${v.parent_variant_id || 'NULL'}`);
        console.log(`      IMEI: ${v.imei}`);
        console.log(`      Qty: ${v.quantity}, Active: ${v.is_active}`);
      });
    }
    console.log('');

    // 2. Check inventory_items (old system)
    console.log('📦 2. Checking inventory_items (Old System):');
    console.log('─'.repeat(60));
    const { rows: invItems } = await client.query(`
      SELECT 
        id,
        serial_number,
        imei,
        status,
        cost_price,
        selling_price,
        created_at
      FROM inventory_items
      WHERE product_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `, [product.id]);

    console.log(`   Total inventory_items: ${invItems.length}`);
    
    const withIMEIinv = invItems.filter(i => i.imei);
    console.log(`   With IMEI: ${withIMEIinv.length}`);
    console.log('');

    if (withIMEIinv.length > 0) {
      console.log('   Inventory Items with IMEI:');
      withIMEIinv.forEach((item, i) => {
        console.log(`   ${i + 1}. Serial: ${item.serial_number || 'NULL'}`);
        console.log(`      IMEI: ${item.imei}`);
        console.log(`      Status: ${item.status}`);
        console.log(`      Cost: ${item.cost_price}`);
        console.log(`      Date: ${item.created_at}`);
      });
    }
    console.log('');

    // 3. Check recent purchase orders
    console.log('📋 3. Recent Purchase Orders:');
    console.log('─'.repeat(60));
    const { rows: recentPOs } = await client.query(`
      SELECT 
        po.id,
        po.order_number,
        po.status,
        poi.quantity_ordered,
        poi.quantity_received,
        po.created_at,
        po.updated_at
      FROM lats_purchase_orders po
      JOIN lats_purchase_order_items poi ON poi.purchase_order_id = po.id
      WHERE poi.product_id = $1
      ORDER BY po.created_at DESC
      LIMIT 5
    `, [product.id]);

    recentPOs.forEach((po, i) => {
      console.log(`   ${i + 1}. PO #${po.order_number} (${po.status})`);
      console.log(`      Ordered: ${po.quantity_ordered}, Received: ${po.quantity_received || 0}`);
      console.log(`      Created: ${po.created_at}`);
      console.log(`      Updated: ${po.updated_at}`);
    });
    console.log('');

    // 4. Check stock movements (last 24 hours)
    console.log('📈 4. Recent Stock Movements (last 24h):');
    console.log('─'.repeat(60));
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
        AND sm.created_at > NOW() - INTERVAL '24 hours'
      ORDER BY sm.created_at DESC
    `, [product.id]);

    console.log(`   Total movements (24h): ${movements.length}`);
    movements.forEach((m, i) => {
      console.log(`   ${i + 1}. ${m.movement_type}: ${m.quantity}`);
      console.log(`      Type: ${m.reference_type}`);
      console.log(`      Variant: ${m.variant_name || 'NULL'}`);
      if (m.imei) console.log(`      IMEI: ${m.imei}`);
      console.log(`      Notes: ${m.notes || 'N/A'}`);
      console.log(`      Time: ${m.created_at}`);
    });
    console.log('');

    // DIAGNOSIS
    console.log('═'.repeat(60));
    console.log('🔍 DIAGNOSIS:');
    console.log('═'.repeat(60));
    console.log('');

    if (withIMEIinv.length > 0 && children.length === 0) {
      console.log('❌ PROBLEM FOUND: IMEIs went to OLD SYSTEM!');
      console.log('');
      console.log('   IMEIs are in "inventory_items" table (old system)');
      console.log('   They should be in "lats_product_variants" as children');
      console.log('');
      console.log('💡 ROOT CAUSE:');
      console.log('   The receiving process is still using the OLD code path');
      console.log('   Need to check PurchaseOrderService.processSerialNumbers()');
    } else if (standalone.length > 0) {
      console.log('⚠️  PROBLEM: IMEIs created as STANDALONE variants');
      console.log('');
      console.log('   IMEIs exist in lats_product_variants');
      console.log('   BUT they are NOT linked to parent (parent_variant_id = NULL)');
      console.log('');
      console.log('💡 ROOT CAUSE:');
      console.log('   Code is creating IMEI variants but not linking to parent');
      console.log('   Check addIMEIsToParentVariant() is being called correctly');
    } else if (children.length > 0) {
      console.log('✅ SYSTEM WORKING: IMEIs are properly linked as children!');
      console.log('');
      console.log(`   Found ${children.length} IMEI children properly linked to parents`);
    } else {
      console.log('❓ NO IMEIs FOUND: Data may not have been saved');
      console.log('');
      console.log('   Check if receiving process completed successfully');
      console.log('   Check browser console for errors');
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

findIMEIs();

