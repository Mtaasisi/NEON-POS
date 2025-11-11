#!/usr/bin/env node

/**
 * Check Purchase Order Data
 * Fetches PO details and related product information
 */

import dotenv from 'dotenv';
import { Pool } from '@neondatabase/serverless';

dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env file');
  process.exit(1);
}

const PO_NUMBER = 'PO-1762823424318';

async function checkPurchaseOrder() {
  console.log('🔍 Checking Purchase Order Details\n');
  console.log(`📦 PO Number: ${PO_NUMBER}\n`);
  
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    // 1. Find the purchase order
    console.log('1️⃣ Fetching Purchase Order...');
    const { rows: poRows } = await pool.query(
      `SELECT 
        id,
        po_number,
        supplier_id,
        status,
        currency,
        total_amount,
        exchange_rate,
        notes,
        expected_delivery_date,
        created_at,
        updated_at
      FROM lats_purchase_orders
      WHERE po_number = $1`,
      [PO_NUMBER]
    );
    
    if (poRows.length === 0) {
      console.log('❌ Purchase Order not found');
      await pool.end();
      return;
    }
    
    const po = poRows[0];
    console.log('✅ Purchase Order found!\n');
    console.log('📄 PURCHASE ORDER DETAILS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`ID:               ${po.id}`);
    console.log(`PO Number:        ${po.po_number}`);
    console.log(`Status:           ${po.status}`);
    console.log(`Currency:         ${po.currency || 'N/A'}`);
    console.log(`Total Amount:     ${po.total_amount} ${po.currency || ''}`);
    console.log(`Exchange Rate:    1 ${po.currency || 'CNY'} = ${po.exchange_rate || 'N/A'} TZS`);
    console.log(`TZS Equivalent:   TZS ${po.total_amount * (po.exchange_rate || 1)}`);
    console.log(`Expected Delivery: ${po.expected_delivery_date || 'Not set'}`);
    console.log(`Created:          ${new Date(po.created_at).toLocaleString()}`);
    console.log(`Updated:          ${new Date(po.updated_at).toLocaleString()}`);
    console.log(`Notes:            ${po.notes || 'No notes'}`);
    
    // 2. Get supplier info
    if (po.supplier_id) {
      console.log('\n2️⃣ Fetching Supplier Information...');
      const { rows: supplierRows } = await pool.query(
        `SELECT id, name, contact_person, email, phone, address
         FROM lats_suppliers
         WHERE id = $1`,
        [po.supplier_id]
      );
      
      if (supplierRows.length > 0) {
        const supplier = supplierRows[0];
        console.log('✅ Supplier found:');
        console.log(`   Name:    ${supplier.name}`);
        console.log(`   Contact: ${supplier.contact_person || 'N/A'}`);
        console.log(`   Email:   ${supplier.email || 'N/A'}`);
        console.log(`   Phone:   ${supplier.phone || 'N/A'}`);
      }
    }
    
    // 3. Get PO items
    console.log('\n3️⃣ Fetching Purchase Order Items...');
    const { rows: items } = await pool.query(
      `SELECT 
        poi.id,
        poi.product_id,
        poi.variant_id,
        poi.quantity_ordered,
        poi.quantity_received,
        poi.unit_cost,
        poi.subtotal,
        poi.notes,
        p.name as product_name,
        p.sku as product_sku,
        pv.variant_name,
        pv.sku as variant_sku,
        pv.cost_price as current_cost_price,
        pv.selling_price as current_selling_price
      FROM lats_purchase_order_items poi
      LEFT JOIN lats_products p ON poi.product_id = p.id
      LEFT JOIN lats_product_variants pv ON poi.variant_id = pv.id
      WHERE poi.purchase_order_id = $1
      ORDER BY poi.created_at`,
      [po.id]
    );
    
    console.log(`\n📦 Found ${items.length} item(s):\n`);
    
    if (items.length === 0) {
      console.log('⚠️ No items found for this PO');
    } else {
      let totalOrdered = 0;
      let totalReceived = 0;
      let totalCost = 0;
      
      items.forEach((item, index) => {
        console.log(`\n🔹 ITEM ${index + 1}:`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Product:           ${item.product_name || 'N/A'}`);
        console.log(`Product SKU:       ${item.product_sku || 'N/A'}`);
        console.log(`Variant:           ${item.variant_name || 'N/A'}`);
        console.log(`Variant SKU:       ${item.variant_sku || 'N/A'}`);
        console.log(`Quantity Ordered:  ${item.quantity_ordered}`);
        console.log(`Quantity Received: ${item.quantity_received || 0}`);
        console.log(`Unit Cost (PO):    ${item.unit_cost} ${po.currency || ''}`);
        console.log(`Subtotal (PO):     ${item.subtotal} ${po.currency || ''}`);
        
        // Convert to TZS if currency is different
        if (po.currency && po.currency !== 'TZS' && po.exchange_rate) {
          const unitCostTZS = item.unit_cost * po.exchange_rate;
          const subtotalTZS = item.subtotal * po.exchange_rate;
          console.log(`Unit Cost (TZS):   ${unitCostTZS.toFixed(2)} TZS (at rate ${po.exchange_rate})`);
          console.log(`Subtotal (TZS):    ${subtotalTZS.toFixed(2)} TZS`);
        }
        
        if (item.notes) console.log(`Notes:             ${item.notes}`);
        console.log(`\nCurrent Product Data:`);
        console.log(`  Cost Price:      ${item.current_cost_price || 0} TZS`);
        console.log(`  Selling Price:   ${item.current_selling_price || 0} TZS`);
        
        // Check for discrepancies
        if (po.currency && po.currency !== 'TZS' && po.exchange_rate) {
          const expectedCostTZS = item.unit_cost * po.exchange_rate;
          const actualCost = parseFloat(item.current_cost_price || 0);
          
          if (Math.abs(expectedCostTZS - actualCost) > 0.01) {
            console.log(`\n⚠️  COST MISMATCH DETECTED:`);
            console.log(`   Expected Cost: ${expectedCostTZS.toFixed(2)} TZS (${item.unit_cost} ${po.currency} × ${po.exchange_rate})`);
            console.log(`   Actual Cost:   ${actualCost} TZS`);
            console.log(`   Difference:    ${(actualCost - expectedCostTZS).toFixed(2)} TZS`);
          }
        }
        
        totalOrdered += parseInt(item.quantity_ordered || 0);
        totalReceived += parseInt(item.quantity_received || 0);
        totalCost += parseFloat(item.subtotal || 0);
      });
      
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 SUMMARY:');
      console.log(`Total Items:       ${items.length}`);
      console.log(`Total Ordered:     ${totalOrdered} units`);
      console.log(`Total Received:    ${totalReceived} units`);
      console.log(`Total Cost:        ${totalCost} ${po.currency || ''}`);
      
      if (po.currency && po.currency !== 'TZS' && po.exchange_rate) {
        console.log(`Total Cost (TZS):  ${(totalCost * po.exchange_rate).toFixed(2)} TZS`);
      }
      
      console.log(`Fulfillment:       ${((totalReceived / totalOrdered) * 100).toFixed(1)}%`);
    }
    
    // 4. Check inventory adjustments
    console.log('\n4️⃣ Checking Related Inventory Adjustments...');
    const { rows: inventoryItems } = await pool.query(
      `SELECT 
        ii.id,
        ii.product_id,
        ii.variant_id,
        ii.quantity,
        ii.unit_cost,
        ii.status,
        ii.imei,
        ii.serial_number,
        ii.created_at,
        p.name as product_name,
        pv.variant_name
      FROM lats_inventory_items ii
      LEFT JOIN lats_products p ON ii.product_id = p.id
      LEFT JOIN lats_product_variants pv ON ii.variant_id = pv.id
      WHERE ii.purchase_order_id = $1
      ORDER BY ii.created_at`,
      [po.id]
    );
    
    if (inventoryItems.length > 0) {
      console.log(`✅ Found ${inventoryItems.length} inventory item(s):\n`);
      
      inventoryItems.forEach((item, i) => {
        console.log(`${i + 1}. ${item.product_name} - ${item.variant_name}`);
        console.log(`   Quantity: ${item.quantity}`);
        console.log(`   Unit Cost: ${item.unit_cost} TZS`);
        console.log(`   Status: ${item.status}`);
        if (item.imei) console.log(`   IMEI: ${item.imei}`);
        if (item.serial_number) console.log(`   S/N: ${item.serial_number}`);
        console.log(`   Added: ${new Date(item.created_at).toLocaleString()}\n`);
      });
    } else {
      console.log('⚠️ No inventory items found for this PO');
    }
    
    console.log('✅ Purchase Order check complete!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

// Run the script
checkPurchaseOrder().catch(console.error);

