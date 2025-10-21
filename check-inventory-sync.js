#!/usr/bin/env node

/**
 * Inventory Sync Check
 * Compares product variants quantity with actual inventory_items count
 */

import pkg from 'pg';
const { Pool } = pkg;
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.VITE_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkInventorySync() {
  console.log('🔍 Checking Inventory Sync Status...\n');
  console.log('='.repeat(100));

  const client = await pool.connect();
  
  try {
    // Check if inventory_items table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'inventory_items'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('\n⚠️  inventory_items table does not exist in database');
      console.log('   This system may not be using the inventory_items tracking.');
      return;
    }

    // Get all variants with their quantities
    const variantsQuery = `
      SELECT 
        v.id,
        v.product_id,
        v.name,
        v.sku,
        v.quantity as variant_quantity,
        v.reserved_quantity,
        v.is_active,
        p.name as product_name
      FROM lats_product_variants v
      JOIN lats_products p ON v.product_id = p.id
      ORDER BY p.name, v.name
    `;
    
    const variantsResult = await client.query(variantsQuery);
    const variants = variantsResult.rows;

    console.log(`\n📦 Total Variants: ${variants.length}\n`);

    // Get inventory items count per variant
    const inventoryQuery = `
      SELECT 
        variant_id,
        status,
        COUNT(*) as count
      FROM inventory_items
      GROUP BY variant_id, status
      ORDER BY variant_id, status
    `;
    
    const inventoryResult = await client.query(inventoryQuery);
    const inventoryCounts = inventoryResult.rows;

    // Build a map of inventory counts by variant
    const inventoryMap = {};
    inventoryCounts.forEach(item => {
      if (!inventoryMap[item.variant_id]) {
        inventoryMap[item.variant_id] = {
          available: 0,
          sold: 0,
          defective: 0,
          reserved: 0,
          total: 0
        };
      }
      inventoryMap[item.variant_id][item.status] = parseInt(item.count);
      inventoryMap[item.variant_id].total += parseInt(item.count);
    });

    console.log('='.repeat(100));
    console.log('VARIANT vs INVENTORY COMPARISON');
    console.log('='.repeat(100));

    let syncedCount = 0;
    let mismatchCount = 0;
    let missingInventoryCount = 0;
    const mismatches = [];

    for (const variant of variants) {
      const inventory = inventoryMap[variant.id] || {
        available: 0,
        sold: 0,
        defective: 0,
        reserved: 0,
        total: 0
      };

      const variantQty = parseInt(variant.variant_quantity || 0);
      const inventoryAvailable = inventory.available;
      const isSynced = variantQty === inventoryAvailable;

      if (isSynced) {
        syncedCount++;
      } else {
        mismatchCount++;
        mismatches.push({
          product: variant.product_name,
          variant: variant.name,
          sku: variant.sku,
          variantQty,
          inventoryQty: inventoryAvailable,
          difference: variantQty - inventoryAvailable
        });
      }

      if (inventory.total === 0) {
        missingInventoryCount++;
      }

      const syncIcon = isSynced ? '✅' : '❌';
      const statusIcon = variant.is_active ? '🟢' : '⚪';

      console.log(`\n${syncIcon} ${statusIcon} ${variant.product_name} - ${variant.name}`);
      console.log(`   SKU: ${variant.sku}`);
      console.log(`   Variant Quantity: ${variantQty}`);
      console.log(`   Inventory Available: ${inventoryAvailable}`);
      console.log(`   Inventory Sold: ${inventory.sold}`);
      console.log(`   Inventory Defective: ${inventory.defective}`);
      console.log(`   Inventory Reserved: ${inventory.reserved}`);
      console.log(`   Total Inventory Items: ${inventory.total}`);
      
      if (!isSynced) {
        console.log(`   ⚠️  MISMATCH: ${variantQty - inventoryAvailable > 0 ? '+' : ''}${variantQty - inventoryAvailable} difference`);
      }
    }

    // Summary
    console.log('\n\n' + '='.repeat(100));
    console.log('📊 SYNC SUMMARY');
    console.log('='.repeat(100));
    console.log(`\n✅ Synced: ${syncedCount} variants`);
    console.log(`❌ Mismatched: ${mismatchCount} variants`);
    console.log(`⚠️  No Inventory Items: ${missingInventoryCount} variants`);

    if (mismatches.length > 0) {
      console.log('\n\n🚨 MISMATCHES DETECTED:');
      console.log('='.repeat(100));
      mismatches.forEach(m => {
        console.log(`\n   Product: ${m.product} - ${m.variant}`);
        console.log(`   SKU: ${m.sku}`);
        console.log(`   Variant Qty: ${m.variantQty} | Inventory Qty: ${m.inventoryQty}`);
        console.log(`   Difference: ${m.difference > 0 ? '+' : ''}${m.difference}`);
      });

      console.log('\n\n💡 RECOMMENDED ACTIONS:');
      console.log('='.repeat(100));
      console.log('\n1. Run the inventory sync trigger to fix discrepancies:');
      console.log('   node run-inventory-sync-fix.sh');
      console.log('\n2. Or manually update variant quantities to match inventory:');
      console.log('   UPDATE lats_product_variants SET quantity = (');
      console.log('     SELECT COUNT(*) FROM inventory_items ');
      console.log('     WHERE variant_id = lats_product_variants.id AND status = \'available\'');
      console.log('   );');
    }

    // Check for orphaned inventory items (no matching variant)
    const orphanedQuery = `
      SELECT 
        i.id,
        i.variant_id,
        i.status,
        i.created_at
      FROM inventory_items i
      LEFT JOIN lats_product_variants v ON i.variant_id = v.id
      WHERE v.id IS NULL
    `;
    
    const orphanedResult = await client.query(orphanedQuery);
    
    if (orphanedResult.rows.length > 0) {
      console.log('\n\n⚠️  ORPHANED INVENTORY ITEMS:');
      console.log('='.repeat(100));
      console.log(`\nFound ${orphanedResult.rows.length} inventory items with no matching variant:`);
      orphanedResult.rows.forEach(item => {
        console.log(`   ID: ${item.id} | Variant ID: ${item.variant_id} | Status: ${item.status}`);
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

checkInventorySync();

