#!/usr/bin/env node

import pkg from 'pg';
const { Pool } = pkg;
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.VITE_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkAllPOs() {
  const client = await pool.connect();
  
  try {
    console.log('\n📋 ALL Purchase Orders for Product "22222"\n');
    console.log('='.repeat(100));

    // Get variant ID for product 22222
    const variantQuery = `
      SELECT v.id, v.sku, v.quantity as current_qty
      FROM lats_product_variants v
      JOIN lats_products p ON v.product_id = p.id
      WHERE p.name = '22222'
    `;
    const variantResult = await client.query(variantQuery);
    
    if (variantResult.rows.length === 0) {
      console.log('Product not found');
      return;
    }
    
    const variant = variantResult.rows[0];
    console.log(`\nVariant ID: ${variant.id}`);
    console.log(`SKU: ${variant.sku}`);
    console.log(`Current Quantity in System: ${variant.current_qty}\n`);
    console.log('='.repeat(100));

    // Get ALL POs containing this variant
    const posQuery = `
      SELECT 
        po.po_number,
        po.status,
        po.order_date,
        po.created_at,
        po.updated_at,
        poi.quantity_ordered,
        poi.quantity_received,
        poi.unit_cost,
        poi.subtotal,
        s.name as supplier_name
      FROM lats_purchase_order_items poi
      JOIN lats_purchase_orders po ON poi.purchase_order_id = po.id
      LEFT JOIN lats_suppliers s ON po.supplier_id = s.id
      WHERE poi.variant_id = $1
      ORDER BY po.created_at DESC
    `;
    
    const posResult = await client.query(posQuery, [variant.id]);
    
    if (posResult.rows.length === 0) {
      console.log('\n⚠️  No purchase orders found for this product!');
    } else {
      console.log(`\n📦 Found ${posResult.rows.length} Purchase Order(s):\n`);
      
      let totalOrdered = 0;
      let totalReceived = 0;
      
      posResult.rows.forEach((po, i) => {
        console.log(`\n${i + 1}. PO: ${po.po_number}`);
        console.log(`   Status: ${po.status}`);
        console.log(`   Supplier: ${po.supplier_name || 'N/A'}`);
        console.log(`   Order Date: ${po.order_date}`);
        console.log(`   Quantity Ordered: ${po.quantity_ordered}`);
        console.log(`   Quantity Received: ${po.quantity_received}`);
        console.log(`   Unit Cost: $${po.unit_cost}`);
        console.log(`   Subtotal: $${po.subtotal}`);
        console.log(`   Created: ${po.created_at}`);
        console.log(`   Updated: ${po.updated_at}`);
        
        totalOrdered += parseInt(po.quantity_ordered || 0);
        totalReceived += parseInt(po.quantity_received || 0);
      });
      
      console.log('\n' + '='.repeat(100));
      console.log('📊 TOTALS:');
      console.log(`   Total Ordered: ${totalOrdered}`);
      console.log(`   Total Received: ${totalReceived}`);
      console.log(`   Current Stock: ${variant.current_qty}`);
      console.log('='.repeat(100));
      
      // Check if numbers match
      if (totalReceived !== parseInt(variant.current_qty)) {
        console.log(`\n⚠️  DISCREPANCY DETECTED!`);
        console.log(`   Received from POs: ${totalReceived}`);
        console.log(`   Current Stock: ${variant.current_qty}`);
        console.log(`   Difference: ${parseInt(variant.current_qty) - totalReceived}`);
        console.log(`\n   Possible reasons:`);
        console.log(`   - Stock adjustments made outside of PO system`);
        console.log(`   - Direct inventory additions`);
        console.log(`   - Manual quantity updates`);
      }
    }

    console.log('\n✅ Check Complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkAllPOs();

