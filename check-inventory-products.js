#!/usr/bin/env node

/**
 * Inventory Products Status Checker
 * 
 * This script queries the database to show:
 * - All products and variants
 * - Inventory quantities
 * - Product pricing
 * - Inventory items status
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

async function checkInventory() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking Inventory Products Status...\n');
    console.log('='.repeat(100));
    
    // 1. Get all products with variants and quantities
    console.log('\n📦 PRODUCTS & VARIANTS OVERVIEW\n');
    const productsQuery = `
      SELECT 
        p.id as product_id,
        p.name as product_name,
        p.sku as product_sku,
        p.category_id,
        p.is_active as product_status,
        pv.id as variant_id,
        pv.name as variant_name,
        pv.sku as variant_sku,
        pv.quantity as stock_quantity,
        pv.cost_price,
        pv.selling_price,
        pv.reorder_point,
        b.name as branch_name,
        p.created_at,
        p.updated_at
      FROM lats_products p
      LEFT JOIN lats_product_variants pv ON p.id = pv.product_id
      LEFT JOIN lats_branches b ON p.branch_id = b.id
      ORDER BY p.created_at DESC, pv.name;
    `;
    
    const productsResult = await client.query(productsQuery);
    
    if (productsResult.rows.length === 0) {
      console.log('⚠️  No products found in database');
    } else {
      console.log(`Found ${productsResult.rows.length} product variant(s):\n`);
      
      let currentProductId = null;
      let productCount = 0;
      
      for (const row of productsResult.rows) {
        // Print product header when we encounter a new product
        if (row.product_id !== currentProductId) {
          if (currentProductId !== null) {
            console.log('─'.repeat(100));
          }
          productCount++;
          currentProductId = row.product_id;
          
          console.log(`\n📦 PRODUCT #${productCount}: ${row.product_name}`);
          console.log(`   SKU: ${row.product_sku || 'N/A'}`);
          console.log(`   Category ID: ${row.category_id || 'N/A'}`);
          console.log(`   Active: ${row.product_status ? '✅ Yes' : '❌ No'}`);
          console.log(`   Branch: ${row.branch_name || 'N/A'}`);
          console.log(`   Created: ${row.created_at}`);
          console.log(`   Updated: ${row.updated_at}`);
          console.log('\n   VARIANTS:');
        }
        
        // Print variant info
        const stockStatus = row.stock_quantity <= 0 ? '❌ OUT OF STOCK' : 
                           row.reorder_point && row.stock_quantity <= row.reorder_point ? '⚠️  LOW STOCK' : 
                           '✅ IN STOCK';
        
        const priceStatus = !row.selling_price ? '⚠️  NO SELLING PRICE' : '✅';
        
        console.log(`\n   └─ ${row.variant_name || 'Default Variant'}`);
        console.log(`      • Variant SKU: ${row.variant_sku || 'N/A'}`);
        console.log(`      • Stock: ${row.stock_quantity || 0} units ${stockStatus}`);
        console.log(`      • Cost Price: ${row.cost_price || 0} TZS`);
        console.log(`      • Selling Price: ${row.selling_price || 'NOT SET'} TZS ${priceStatus}`);
        console.log(`      • Reorder Point: ${row.reorder_point || 'Not set'}`);
      }
      console.log('\n' + '─'.repeat(100));
    }
    
    // 2. Inventory summary by status
    console.log('\n\n📊 INVENTORY ITEMS SUMMARY\n');
    const inventoryStatusQuery = `
      SELECT 
        ii.status,
        COUNT(*) as count,
        SUM(ii.cost_price) as total_cost_value,
        SUM(ii.selling_price) as total_selling_value
      FROM inventory_items ii
      GROUP BY ii.status
      ORDER BY count DESC;
    `;
    
    const statusResult = await client.query(inventoryStatusQuery);
    
    if (statusResult.rows.length === 0) {
      console.log('⚠️  No inventory items found');
    } else {
      console.log('Inventory Items by Status:\n');
      for (const stat of statusResult.rows) {
        console.log(`  ${stat.status.toUpperCase()}: ${stat.count} item(s)`);
        console.log(`    • Total Cost Value: ${stat.total_cost_value || 0} TZS`);
        console.log(`    • Total Selling Value: ${stat.total_selling_value || 0} TZS`);
      }
    }
    
    // 3. Low stock alerts
    console.log('\n\n⚠️  LOW STOCK ALERTS\n');
    const lowStockQuery = `
      SELECT 
        p.name as product_name,
        pv.name as variant_name,
        pv.sku,
        pv.quantity as current_stock,
        pv.reorder_point,
        pv.cost_price,
        pv.selling_price
      FROM lats_product_variants pv
      JOIN lats_products p ON pv.product_id = p.id
      WHERE pv.reorder_point IS NOT NULL 
        AND pv.quantity <= pv.reorder_point
      ORDER BY (pv.quantity - pv.reorder_point) ASC;
    `;
    
    const lowStockResult = await client.query(lowStockQuery);
    
    if (lowStockResult.rows.length === 0) {
      console.log('✅ No low stock items');
    } else {
      console.log(`Found ${lowStockResult.rows.length} low stock item(s):\n`);
      for (const item of lowStockResult.rows) {
        console.log(`  • ${item.product_name} - ${item.variant_name}`);
        console.log(`    SKU: ${item.sku || 'N/A'}`);
        console.log(`    Current Stock: ${item.current_stock} (Reorder at: ${item.reorder_point})`);
        console.log(`    Prices: Cost ${item.cost_price} TZS → Sell ${item.selling_price || 'NOT SET'} TZS`);
        console.log('');
      }
    }
    
    // 4. Products without selling price
    console.log('\n💰 PRODUCTS MISSING SELLING PRICE\n');
    const noPriceQuery = `
      SELECT 
        p.name as product_name,
        pv.name as variant_name,
        pv.sku,
        pv.quantity,
        pv.cost_price
      FROM lats_product_variants pv
      JOIN lats_products p ON pv.product_id = p.id
      WHERE pv.selling_price IS NULL OR pv.selling_price = 0
      ORDER BY p.name, pv.name;
    `;
    
    const noPriceResult = await client.query(noPriceQuery);
    
    if (noPriceResult.rows.length === 0) {
      console.log('✅ All products have selling prices');
    } else {
      console.log(`⚠️  Found ${noPriceResult.rows.length} variant(s) without selling price:\n`);
      for (const item of noPriceResult.rows) {
        console.log(`  • ${item.product_name} - ${item.variant_name}`);
        console.log(`    SKU: ${item.sku || 'N/A'}`);
        console.log(`    Stock: ${item.quantity || 0} units`);
        console.log(`    Cost Price: ${item.cost_price || 0} TZS`);
        console.log(`    ⚠️  Selling Price: NOT SET`);
        console.log('');
      }
    }
    
    // 5. Individual inventory items details
    console.log('\n📋 INDIVIDUAL INVENTORY ITEMS\n');
    const itemsQuery = `
      SELECT 
        ii.id,
        p.name as product_name,
        pv.name as variant_name,
        ii.status,
        ii.serial_number,
        ii.imei,
        ii.cost_price,
        ii.selling_price,
        po.po_number,
        ii.created_at
      FROM inventory_items ii
      LEFT JOIN lats_products p ON ii.product_id = p.id
      LEFT JOIN lats_product_variants pv ON ii.variant_id = pv.id
      LEFT JOIN lats_purchase_orders po ON ii.purchase_order_id = po.id
      ORDER BY ii.created_at DESC
      LIMIT 50;
    `;
    
    const itemsResult = await client.query(itemsQuery);
    
    if (itemsResult.rows.length === 0) {
      console.log('⚠️  No individual inventory items found');
    } else {
      console.log(`Showing ${Math.min(itemsResult.rows.length, 50)} most recent inventory item(s):\n`);
      
      for (const item of itemsResult.rows) {
        const statusIcon = item.status === 'available' ? '✅' : 
                          item.status === 'sold' ? '💰' : 
                          item.status === 'reserved' ? '🔒' : 
                          item.status === 'damaged' ? '❌' : '❓';
        
        console.log(`${statusIcon} ${item.product_name} - ${item.variant_name || 'N/A'}`);
        console.log(`   Status: ${item.status}`);
        console.log(`   Serial: ${item.serial_number || 'N/A'} | IMEI: ${item.imei || 'N/A'}`);
        console.log(`   Cost: ${item.cost_price} TZS | Selling: ${item.selling_price || 'NOT SET'} TZS`);
        console.log(`   From PO: ${item.po_number || 'N/A'}`);
        console.log(`   Created: ${item.created_at}`);
        console.log('─'.repeat(100));
      }
    }
    
    // 6. Overall statistics
    console.log('\n\n📊 OVERALL INVENTORY STATISTICS\n');
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT p.id) as total_products,
        COUNT(DISTINCT pv.id) as total_variants,
        COUNT(ii.id) as total_inventory_items,
        SUM(pv.quantity) as total_stock_quantity,
        SUM(ii.cost_price) as total_cost_value,
        SUM(ii.selling_price) as total_potential_value,
        COUNT(CASE WHEN ii.status = 'available' THEN 1 END) as available_items,
        COUNT(CASE WHEN ii.status = 'sold' THEN 1 END) as sold_items,
        COUNT(CASE WHEN ii.status = 'reserved' THEN 1 END) as reserved_items,
        COUNT(CASE WHEN ii.status = 'damaged' THEN 1 END) as damaged_items
      FROM lats_products p
      LEFT JOIN lats_product_variants pv ON p.id = pv.product_id
      LEFT JOIN inventory_items ii ON pv.id = ii.variant_id;
    `;
    
    const statsResult = await client.query(statsQuery);
    const stats = statsResult.rows[0];
    
    console.log(`Total Products: ${stats.total_products}`);
    console.log(`Total Variants: ${stats.total_variants}`);
    console.log(`Total Inventory Items: ${stats.total_inventory_items}`);
    console.log(`Total Stock Quantity: ${stats.total_stock_quantity || 0} units`);
    console.log(`\nInventory Value:`);
    console.log(`  • Total Cost Value: ${stats.total_cost_value || 0} TZS`);
    console.log(`  • Total Potential Selling Value: ${stats.total_potential_value || 0} TZS`);
    console.log(`  • Potential Profit: ${(stats.total_potential_value || 0) - (stats.total_cost_value || 0)} TZS`);
    console.log(`\nItem Status:`);
    console.log(`  • Available: ${stats.available_items || 0}`);
    console.log(`  • Sold: ${stats.sold_items || 0}`);
    console.log(`  • Reserved: ${stats.reserved_items || 0}`);
    console.log(`  • Damaged: ${stats.damaged_items || 0}`);
    
    // 7. Recent stock movements
    console.log('\n\n📈 RECENT STOCK MOVEMENTS\n');
    const movementsQuery = `
      SELECT 
        sm.id,
        sm.movement_type,
        sm.quantity,
        p.name as product_name,
        pv.name as variant_name,
        sm.reference_type,
        sm.reference_id,
        sm.notes,
        sm.created_at
      FROM lats_stock_movements sm
      LEFT JOIN lats_products p ON sm.product_id = p.id
      LEFT JOIN lats_product_variants pv ON sm.variant_id = pv.id
      ORDER BY sm.created_at DESC
      LIMIT 20;
    `;
    
    const movementsResult = await client.query(movementsQuery);
    
    if (movementsResult.rows.length === 0) {
      console.log('⚠️  No stock movements recorded');
    } else {
      console.log(`Last ${movementsResult.rows.length} stock movement(s):\n`);
      
      for (const movement of movementsResult.rows) {
        const typeIcon = movement.movement_type === 'in' ? '📥' : 
                        movement.movement_type === 'out' ? '📤' : 
                        movement.movement_type === 'sale' ? '💰' : 
                        movement.movement_type === 'adjustment' ? '🔧' : '📊';
        
        console.log(`${typeIcon} ${movement.movement_type.toUpperCase()}: ${movement.quantity} units`);
        console.log(`   Product: ${movement.product_name || 'Unknown'} - ${movement.variant_name || 'N/A'}`);
        console.log(`   Reference: ${movement.reference_type || 'N/A'} (${movement.reference_id || 'N/A'})`);
        console.log(`   Notes: ${movement.notes || 'N/A'}`);
        console.log(`   Date: ${movement.created_at}`);
        console.log('─'.repeat(100));
      }
    }
    
    console.log('\n' + '='.repeat(100));
    console.log('✅ Inventory Check Complete!\n');
    
  } catch (error) {
    console.error('❌ Error checking inventory:', error);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the check
checkInventory().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

