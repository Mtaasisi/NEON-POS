#!/usr/bin/env node

/**
 * Purchase Order Products Status Checker
 * 
 * This script queries the database to show:
 * - All purchase orders and their status
 * - Purchase order items with quantities
 * - Related inventory items status
 */

import pg from 'pg';
import fs from 'fs';

const { Pool } = pg;

// Read database config
const configPath = './database-config.json';
let dbConfig;

try {
  const configData = fs.readFileSync(configPath, 'utf8');
  dbConfig = JSON.parse(configData);
} catch (error) {
  console.error('❌ Error reading database config:', error.message);
  process.exit(1);
}

// Create database connection
const pool = new Pool({
  connectionString: dbConfig.url,
  ssl: { rejectUnauthorized: false }
});

async function checkPurchaseOrderStatus() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking Purchase Order Products Status...\n');
    console.log('='.repeat(80));
    
    // 1. Get all purchase orders with their status
    console.log('\n📦 PURCHASE ORDERS OVERVIEW\n');
    const poQuery = `
      SELECT 
        po.id,
        po.po_number,
        po.status,
        po.order_date,
        po.expected_delivery_date,
        po.total_amount,
        s.name as supplier_name,
        b.name as branch_name,
        COUNT(poi.id) as total_items,
        SUM(poi.quantity_ordered) as total_quantity_ordered,
        SUM(poi.quantity_received) as total_quantity_received,
        po.created_at,
        po.updated_at
      FROM lats_purchase_orders po
      LEFT JOIN lats_suppliers s ON po.supplier_id = s.id
      LEFT JOIN lats_branches b ON po.branch_id = b.id
      LEFT JOIN lats_purchase_order_items poi ON po.id = poi.purchase_order_id
      GROUP BY po.id, po.po_number, po.status, po.order_date, 
               po.expected_delivery_date, po.total_amount, 
               s.name, b.name, po.created_at, po.updated_at
      ORDER BY po.created_at DESC
      LIMIT 50;
    `;
    
    const poResult = await client.query(poQuery);
    
    if (poResult.rows.length === 0) {
      console.log('⚠️  No purchase orders found in database');
    } else {
      console.log(`Found ${poResult.rows.length} purchase order(s):\n`);
      
      for (const po of poResult.rows) {
        const completionPercent = po.total_quantity_ordered > 0 
          ? ((po.total_quantity_received / po.total_quantity_ordered) * 100).toFixed(1)
          : 0;
        
        console.log(`PO Number: ${po.po_number}`);
        console.log(`  ID: ${po.id}`);
        console.log(`  Status: ${po.status}`);
        console.log(`  Supplier: ${po.supplier_name || 'N/A'}`);
        console.log(`  Branch: ${po.branch_name || 'N/A'}`);
        console.log(`  Order Date: ${po.order_date}`);
        console.log(`  Expected Delivery: ${po.expected_delivery_date || 'N/A'}`);
        console.log(`  Total Amount: ${po.total_amount}`);
        console.log(`  Items: ${po.total_items}`);
        console.log(`  Quantities: ${po.total_quantity_received}/${po.total_quantity_ordered} received (${completionPercent}%)`);
        console.log(`  Created: ${po.created_at}`);
        console.log(`  Updated: ${po.updated_at}`);
        console.log('-'.repeat(80));
      }
    }
    
    // 2. Get detailed purchase order items
    console.log('\n📋 PURCHASE ORDER ITEMS DETAILS\n');
    const itemsQuery = `
      SELECT 
        poi.id,
        po.po_number,
        po.status as po_status,
        p.name as product_name,
        p.sku as product_sku,
        pv.name as variant_name,
        pv.sku as variant_sku,
        poi.quantity_ordered,
        poi.quantity_received,
        poi.unit_cost,
        poi.subtotal as total_cost,
        (poi.quantity_ordered - poi.quantity_received) as quantity_pending
      FROM lats_purchase_order_items poi
      JOIN lats_purchase_orders po ON poi.purchase_order_id = po.id
      LEFT JOIN lats_products p ON poi.product_id = p.id
      LEFT JOIN lats_product_variants pv ON poi.variant_id = pv.id
      ORDER BY po.created_at DESC, p.name
      LIMIT 100;
    `;
    
    const itemsResult = await client.query(itemsQuery);
    
    if (itemsResult.rows.length === 0) {
      console.log('⚠️  No purchase order items found');
    } else {
      console.log(`Found ${itemsResult.rows.length} purchase order item(s):\n`);
      
      for (const item of itemsResult.rows) {
        console.log(`PO: ${item.po_number} (${item.po_status})`);
        console.log(`  Product: ${item.product_name || 'Unknown'} (SKU: ${item.product_sku || 'N/A'})`);
        console.log(`  Variant: ${item.variant_name || 'N/A'} (SKU: ${item.variant_sku || 'N/A'})`);
        console.log(`  Ordered: ${item.quantity_ordered}`);
        console.log(`  Received: ${item.received_quantity}`);
        console.log(`  Pending: ${item.quantity_pending}`);
        console.log(`  Unit Cost: ${item.unit_cost}`);
        console.log(`  Total Cost: ${item.total_cost}`);
        console.log('-'.repeat(80));
      }
    }
    
    // 3. Check inventory items linked to purchase orders
    console.log('\n📦 INVENTORY ITEMS FROM PURCHASE ORDERS\n');
    const inventoryQuery = `
      SELECT 
        ii.id,
        po.po_number,
        p.name as product_name,
        pv.name as variant_name,
        ii.status as inventory_status,
        ii.serial_number,
        ii.imei,
        ii.cost_price,
        ii.selling_price,
        ii.created_at
      FROM inventory_items ii
      LEFT JOIN lats_purchase_orders po ON ii.purchase_order_id = po.id
      LEFT JOIN lats_products p ON ii.product_id = p.id
      LEFT JOIN lats_product_variants pv ON ii.variant_id = pv.id
      WHERE ii.purchase_order_id IS NOT NULL
      ORDER BY ii.created_at DESC
      LIMIT 100;
    `;
    
    const inventoryResult = await client.query(inventoryQuery);
    
    if (inventoryResult.rows.length === 0) {
      console.log('⚠️  No inventory items linked to purchase orders');
    } else {
      console.log(`Found ${inventoryResult.rows.length} inventory item(s) from POs:\n`);
      
      // Group by status
      const byStatus = {};
      for (const item of inventoryResult.rows) {
        const status = item.inventory_status || 'unknown';
        if (!byStatus[status]) {
          byStatus[status] = [];
        }
        byStatus[status].push(item);
      }
      
      // Show stats
      console.log('Inventory Status Summary:');
      for (const [status, items] of Object.entries(byStatus)) {
        console.log(`  ${status}: ${items.length} item(s)`);
      }
      console.log('\n' + '-'.repeat(80) + '\n');
      
      // Show details
      for (const item of inventoryResult.rows) {
        console.log(`PO: ${item.po_number || 'N/A'}`);
        console.log(`  Product: ${item.product_name || 'Unknown'}`);
        console.log(`  Variant: ${item.variant_name || 'N/A'}`);
        console.log(`  Status: ${item.inventory_status || 'unknown'}`);
        console.log(`  Serial Number: ${item.serial_number || 'N/A'}`);
        console.log(`  IMEI: ${item.imei || 'N/A'}`);
        console.log(`  Cost Price: ${item.cost_price}`);
        console.log(`  Selling Price: ${item.selling_price}`);
        console.log(`  Created: ${item.created_at}`);
        console.log('-'.repeat(80));
      }
    }
    
    // 4. Check for quality checks
    console.log('\n✅ QUALITY CHECKS\n');
    const qualityQuery = `
      SELECT 
        qc.id,
        po.po_number,
        p.name as product_name,
        qc.passed,
        qc.notes,
        qc.checked_by,
        qc.timestamp
      FROM purchase_order_quality_checks qc
      JOIN lats_purchase_orders po ON qc.purchase_order_id = po.id
      LEFT JOIN lats_purchase_order_items poi ON qc.item_id = poi.id
      LEFT JOIN lats_products p ON poi.product_id = p.id
      ORDER BY qc.timestamp DESC
      LIMIT 50;
    `;
    
    try {
      const qualityResult = await client.query(qualityQuery);
      
      if (qualityResult.rows.length === 0) {
        console.log('⚠️  No quality checks recorded');
      } else {
        console.log(`Found ${qualityResult.rows.length} quality check(s):\n`);
        
        const passed = qualityResult.rows.filter(q => q.passed).length;
        const failed = qualityResult.rows.filter(q => !q.passed).length;
        
        console.log(`Summary: ${passed} passed, ${failed} failed\n`);
        console.log('-'.repeat(80));
        
        for (const qc of qualityResult.rows) {
          console.log(`PO: ${qc.po_number}`);
          console.log(`  Product: ${qc.product_name || 'N/A'}`);
          console.log(`  Result: ${qc.passed ? '✅ PASSED' : '❌ FAILED'}`);
          console.log(`  Notes: ${qc.notes || 'N/A'}`);
          console.log(`  Checked By: ${qc.checked_by}`);
          console.log(`  Timestamp: ${qc.timestamp}`);
          console.log('-'.repeat(80));
        }
      }
    } catch (error) {
      console.log('⚠️  Quality checks table may not exist:', error.message);
    }
    
    // 5. Status statistics
    console.log('\n📊 PURCHASE ORDER STATUS STATISTICS\n');
    const statsQuery = `
      SELECT 
        status,
        COUNT(*) as count,
        SUM(total_amount) as total_value
      FROM lats_purchase_orders
      GROUP BY status
      ORDER BY count DESC;
    `;
    
    const statsResult = await client.query(statsQuery);
    
    if (statsResult.rows.length > 0) {
      console.log('Status Breakdown:');
      for (const stat of statsResult.rows) {
        console.log(`  ${stat.status}: ${stat.count} PO(s), Total Value: ${stat.total_value || 0}`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Purchase Order Status Check Complete!\n');
    
  } catch (error) {
    console.error('❌ Error checking purchase order status:', error);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the check
checkPurchaseOrderStatus().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

