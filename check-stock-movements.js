#!/usr/bin/env node

import pkg from 'pg';
const { Pool } = pkg;
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.VITE_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkMovements() {
  const client = await pool.connect();
  
  try {
    console.log('\n📊 Checking Stock Movements for Product "22222"...\n');
    console.log('='.repeat(80));

    // Get the variant ID first
    const variantQuery = `
      SELECT v.id, v.sku FROM lats_product_variants v
      JOIN lats_products p ON v.product_id = p.id
      WHERE p.name = '22222'
    `;
    const variantResult = await client.query(variantQuery);
    
    if (variantResult.rows.length === 0) {
      console.log('No variant found');
      return;
    }

    const variantId = variantResult.rows[0].id;
    const sku = variantResult.rows[0].sku;

    console.log(`\nVariant ID: ${variantId}`);
    console.log(`SKU: ${sku}\n`);

    // Check stock movements table
    const movementsQuery = `
      SELECT 
        movement_type,
        quantity,
        reference_type,
        notes,
        created_at
      FROM lats_stock_movements
      WHERE variant_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `;
    
    const movementsResult = await client.query(movementsQuery, [variantId]);
    
    console.log('\n📦 STOCK MOVEMENTS:');
    console.log('='.repeat(80));
    
    if (movementsResult.rows.length === 0) {
      console.log('   No stock movements recorded');
    } else {
      movementsResult.rows.forEach((m, i) => {
        console.log(`\n${i + 1}. ${m.movement_type.toUpperCase()}`);
        console.log(`   Quantity: ${m.quantity}`);
        console.log(`   Reference: ${m.reference_type || 'N/A'}`);
        console.log(`   Notes: ${m.notes || 'N/A'}`);
        console.log(`   Date: ${m.created_at}`);
      });
    }

    // Check purchase order items for this variant
    const poQuery = `
      SELECT 
        po.po_number,
        po.status,
        poi.quantity,
        poi.received_quantity,
        po.created_at,
        po.updated_at
      FROM lats_purchase_order_items poi
      JOIN lats_purchase_orders po ON poi.purchase_order_id = po.id
      WHERE poi.variant_id = $1
      ORDER BY po.created_at DESC
      LIMIT 10
    `;
    
    const poResult = await client.query(poQuery, [variantId]);
    
    console.log('\n\n📋 PURCHASE ORDERS:');
    console.log('='.repeat(80));
    
    if (poResult.rows.length === 0) {
      console.log('   No purchase orders found');
    } else {
      poResult.rows.forEach((po, i) => {
        console.log(`\n${i + 1}. PO: ${po.po_number}`);
        console.log(`   Status: ${po.status}`);
        console.log(`   Ordered: ${po.quantity} | Received: ${po.received_quantity}`);
        console.log(`   Created: ${po.created_at}`);
        console.log(`   Updated: ${po.updated_at}`);
      });
    }

    // Check sales for this variant
    const salesQuery = `
      SELECT 
        s.sale_number,
        si.quantity,
        s.created_at
      FROM lats_sale_items si
      JOIN lats_sales s ON si.sale_id = s.id
      WHERE si.variant_id = $1
      ORDER BY s.created_at DESC
      LIMIT 10
    `;
    
    const salesResult = await client.query(salesQuery, [variantId]);
    
    console.log('\n\n💰 RECENT SALES:');
    console.log('='.repeat(80));
    
    if (salesResult.rows.length === 0) {
      console.log('   No sales recorded');
    } else {
      salesResult.rows.forEach((sale, i) => {
        console.log(`\n${i + 1}. Sale: ${sale.sale_number}`);
        console.log(`   Quantity Sold: ${sale.quantity}`);
        console.log(`   Date: ${sale.created_at}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Check Complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkMovements();

