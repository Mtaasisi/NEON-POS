#!/usr/bin/env node

import pkg from 'pg';
const { Pool } = pkg;
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.VITE_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkPO() {
  const client = await pool.connect();
  
  try {
    console.log('\n📋 Checking Purchase Order: PO-1760984114920\n');
    console.log('='.repeat(100));

    // Get PO details
    const poQuery = `
      SELECT 
        po.*,
        s.name as supplier_name
      FROM lats_purchase_orders po
      LEFT JOIN lats_suppliers s ON po.supplier_id = s.id
      WHERE po.po_number = 'PO-1760984114920'
    `;
    
    const poResult = await client.query(poQuery);
    
    if (poResult.rows.length === 0) {
      console.log('\n❌ Purchase Order not found!');
      return;
    }

    const po = poResult.rows[0];
    
    console.log('\n📦 PURCHASE ORDER DETAILS:');
    console.log('-'.repeat(100));
    console.log(`PO Number: ${po.po_number}`);
    console.log(`Status: ${po.status}`);
    console.log(`Supplier: ${po.supplier_name || 'N/A'}`);
    console.log(`Order Date: ${po.order_date}`);
    console.log(`Expected Delivery: ${po.expected_delivery_date || 'N/A'}`);
    console.log(`Subtotal: $${po.subtotal}`);
    console.log(`Tax: $${po.tax_amount}`);
    console.log(`Shipping: $${po.shipping_cost}`);
    console.log(`Total: $${po.total_amount}`);
    console.log(`Notes: ${po.notes || 'N/A'}`);
    console.log(`Created: ${po.created_at}`);
    console.log(`Updated: ${po.updated_at}`);

    // Get PO items
    const itemsQuery = `
      SELECT 
        poi.*,
        p.name as product_name,
        p.sku as product_sku,
        v.name as variant_name,
        v.sku as variant_sku,
        v.quantity as current_variant_qty
      FROM lats_purchase_order_items poi
      LEFT JOIN lats_products p ON poi.product_id = p.id
      LEFT JOIN lats_product_variants v ON poi.variant_id = v.id
      WHERE poi.purchase_order_id = $1
      ORDER BY poi.created_at
    `;
    
    const itemsResult = await client.query(itemsQuery, [po.id]);
    
    console.log('\n\n📦 PURCHASE ORDER ITEMS:');
    console.log('='.repeat(100));
    
    if (itemsResult.rows.length === 0) {
      console.log('\n   No items found for this PO');
    } else {
      let totalOrdered = 0;
      let totalReceived = 0;
      
      itemsResult.rows.forEach((item, i) => {
        console.log(`\n${i + 1}. ${item.product_name}`);
        console.log(`   Product SKU: ${item.product_sku}`);
        console.log(`   Variant: ${item.variant_name || 'Default'}`);
        console.log(`   Variant SKU: ${item.variant_sku}`);
        console.log(`   Variant ID: ${item.variant_id}`);
        console.log(`   Ordered Quantity: ${item.ordered_quantity || item.quantity || 'N/A'}`);
        console.log(`   Received Quantity: ${item.received_quantity || 0}`);
        console.log(`   Unit Cost: $${item.unit_cost}`);
        console.log(`   Total Cost: $${item.total_cost}`);
        console.log(`   Current Stock in System: ${item.current_variant_qty}`);
        
        totalOrdered += parseInt(item.ordered_quantity || item.quantity || 0);
        totalReceived += parseInt(item.received_quantity || 0);
      });
      
      console.log('\n' + '-'.repeat(100));
      console.log(`TOTALS - Ordered: ${totalOrdered} | Received: ${totalReceived}`);
    }

    // Check quality checks for this PO
    const qcQuery = `
      SELECT 
        qc.*,
        p.name as product_name
      FROM quality_checks qc
      LEFT JOIN lats_products p ON qc.product_id = p.id
      WHERE qc.purchase_order_id = $1
      ORDER BY qc.created_at DESC
    `;
    
    const qcResult = await client.query(qcQuery, [po.id]);
    
    if (qcResult.rows.length > 0) {
      console.log('\n\n🔍 QUALITY CHECKS:');
      console.log('='.repeat(100));
      
      qcResult.rows.forEach((qc, i) => {
        console.log(`\n${i + 1}. ${qc.product_name}`);
        console.log(`   Status: ${qc.status}`);
        console.log(`   Passed: ${qc.passed_quantity || 0}`);
        console.log(`   Failed: ${qc.failed_quantity || 0}`);
        console.log(`   Notes: ${qc.notes || 'N/A'}`);
        console.log(`   Created: ${qc.created_at}`);
      });
    }

    // Check if this PO affected product 22222
    const affected22222 = itemsResult.rows.filter(item => 
      item.product_name === '22222' || item.product_sku?.includes('22222')
    );
    
    if (affected22222.length > 0) {
      console.log('\n\n⚠️  THIS PO CONTAINS PRODUCT "22222"!');
      console.log('='.repeat(100));
      affected22222.forEach(item => {
        console.log(`\n   Ordered: ${item.ordered_quantity || item.quantity}`);
        console.log(`   Received: ${item.received_quantity || 0}`);
        console.log(`   Current Stock: ${item.current_variant_qty}`);
      });
    }

    console.log('\n' + '='.repeat(100));
    console.log('✅ Check Complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

checkPO();

