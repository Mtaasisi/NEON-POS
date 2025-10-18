#!/usr/bin/env node

/**
 * Verify Arusha Inventory Against Completed Transfers
 * This script compares completed transfers with actual inventory
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync, existsSync } from 'fs';

console.log('\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║   🔍 ARUSHA INVENTORY VERIFICATION                           ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

// Get database URL
let DATABASE_URL;
try {
  if (existsSync('database-config.json')) {
    const config = JSON.parse(readFileSync('database-config.json', 'utf-8'));
    DATABASE_URL = config.url;
    console.log('✅ Connected to database\n');
  } else {
    console.error('❌ database-config.json not found');
    process.exit(1);
  }
} catch (e) {
  console.error('❌ Error reading database config:', e.message);
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function verifyInventory() {
  try {
    // Get Arusha branch
    const branches = await sql`
      SELECT id, name, code
      FROM store_locations
      WHERE UPPER(name) LIKE '%ARUSHA%' OR UPPER(code) LIKE '%ARUSHA%'
    `;
    
    if (branches.length === 0) {
      console.log('❌ Arusha branch not found!\n');
      return;
    }
    
    const arushaBranch = branches[0];
    console.log(`📍 Branch: ${arushaBranch.name} (${arushaBranch.code})\n`);
    console.log('─'.repeat(80));
    
    // Get completed transfers with detailed product info
    console.log('\n📦 COMPLETED TRANSFERS TO ARUSHA:\n');
    
    const completedTransfers = await sql`
      SELECT 
        bt.id as transfer_id,
        bt.quantity as transferred_qty,
        bt.completed_at,
        bt.entity_id as variant_id,
        p.id as product_id,
        p.name as product_name,
        pv.variant_name,
        pv.sku as original_sku
      FROM branch_transfers bt
      JOIN store_locations to_branch ON to_branch.id = bt.to_branch_id
      LEFT JOIN lats_product_variants pv ON pv.id = bt.entity_id
      LEFT JOIN lats_products p ON p.id = pv.product_id
      WHERE bt.to_branch_id = ${arushaBranch.id}
        AND bt.status = 'completed'
      ORDER BY p.name, bt.completed_at DESC
    `;
    
    console.log(`Found ${completedTransfers.length} completed transfers\n`);
    
    // Group by product to see total transferred per product
    const productTransferSummary = {};
    
    completedTransfers.forEach(transfer => {
      const key = transfer.product_name || 'Unknown Product';
      if (!productTransferSummary[key]) {
        productTransferSummary[key] = {
          product_id: transfer.product_id,
          product_name: transfer.product_name,
          total_transferred: 0,
          transfers: []
        };
      }
      productTransferSummary[key].total_transferred += parseInt(transfer.transferred_qty);
      productTransferSummary[key].transfers.push({
        transfer_id: transfer.transfer_id,
        quantity: transfer.transferred_qty,
        completed_at: transfer.completed_at
      });
    });
    
    console.log('Transfer Summary by Product:');
    Object.values(productTransferSummary).forEach((summary, index) => {
      console.log(`${index + 1}. ${summary.product_name}`);
      console.log(`   Total Transferred: ${summary.total_transferred} units in ${summary.transfers.length} transfer(s)`);
    });
    
    console.log('\n─'.repeat(80));
    console.log('\n📊 CURRENT INVENTORY AT ARUSHA:\n');
    
    // Get current inventory at Arusha
    const inventory = await sql`
      SELECT 
        p.id as product_id,
        p.name as product_name,
        pv.id as variant_id,
        pv.variant_name,
        pv.sku,
        pv.quantity as current_stock,
        pv.reserved_quantity
      FROM lats_product_variants pv
      JOIN lats_products p ON p.id = pv.product_id
      WHERE pv.branch_id = ${arushaBranch.id}
      ORDER BY p.name
    `;
    
    console.log(`Found ${inventory.length} product variants in inventory\n`);
    
    // Group by product
    const productInventorySummary = {};
    
    inventory.forEach(item => {
      const key = item.product_name || 'Unknown Product';
      if (!productInventorySummary[key]) {
        productInventorySummary[key] = {
          product_id: item.product_id,
          product_name: item.product_name,
          total_stock: 0,
          variants: []
        };
      }
      productInventorySummary[key].total_stock += parseInt(item.current_stock);
      productInventorySummary[key].variants.push({
        variant_id: item.variant_id,
        variant_name: item.variant_name,
        sku: item.sku,
        stock: item.current_stock,
        reserved: item.reserved_quantity
      });
    });
    
    console.log('Inventory Summary by Product:');
    Object.values(productInventorySummary).forEach((summary, index) => {
      console.log(`${index + 1}. ${summary.product_name}`);
      console.log(`   Current Stock: ${summary.total_stock} units`);
      if (summary.variants.length > 1) {
        console.log(`   Variants: ${summary.variants.length}`);
      }
    });
    
    console.log('\n─'.repeat(80));
    console.log('\n🔍 VERIFICATION - COMPARING TRANSFERS VS INVENTORY:\n');
    
    // Compare transfers vs inventory
    const allProducts = new Set([
      ...Object.keys(productTransferSummary),
      ...Object.keys(productInventorySummary)
    ]);
    
    let matchCount = 0;
    let mismatchCount = 0;
    let missingInInventory = [];
    let extraInInventory = [];
    
    allProducts.forEach(productName => {
      const transferred = productTransferSummary[productName]?.total_transferred || 0;
      const inStock = productInventorySummary[productName]?.total_stock || 0;
      
      if (transferred === inStock && transferred > 0) {
        console.log(`✅ ${productName}`);
        console.log(`   Transferred: ${transferred} units | In Stock: ${inStock} units | Status: MATCH`);
        matchCount++;
      } else if (transferred > inStock) {
        console.log(`⚠️  ${productName}`);
        console.log(`   Transferred: ${transferred} units | In Stock: ${inStock} units | Status: MISSING ${transferred - inStock} units`);
        mismatchCount++;
        missingInInventory.push({
          product: productName,
          transferred,
          inStock,
          missing: transferred - inStock
        });
      } else if (inStock > transferred) {
        console.log(`ℹ️  ${productName}`);
        console.log(`   Transferred: ${transferred} units | In Stock: ${inStock} units | Status: EXTRA ${inStock - transferred} units`);
        if (transferred > 0) {
          mismatchCount++;
        }
        extraInInventory.push({
          product: productName,
          transferred,
          inStock,
          extra: inStock - transferred
        });
      } else if (transferred === 0 && inStock > 0) {
        console.log(`🆕 ${productName}`);
        console.log(`   Transferred: ${transferred} units | In Stock: ${inStock} units | Status: Added directly (not via transfer)`);
        extraInInventory.push({
          product: productName,
          transferred,
          inStock,
          extra: inStock
        });
      }
      console.log('');
    });
    
    console.log('─'.repeat(80));
    console.log('\n📈 SUMMARY:\n');
    
    const totalTransferred = Object.values(productTransferSummary).reduce((sum, p) => sum + p.total_transferred, 0);
    const totalInStock = Object.values(productInventorySummary).reduce((sum, p) => sum + p.total_stock, 0);
    
    console.log(`Total Units Transferred: ${totalTransferred}`);
    console.log(`Total Units in Inventory: ${totalInStock}`);
    console.log(`Difference: ${totalInStock - totalTransferred} units`);
    console.log('');
    console.log(`✅ Matching Products: ${matchCount}`);
    console.log(`⚠️  Mismatches: ${mismatchCount}`);
    console.log('');
    
    if (missingInInventory.length > 0) {
      console.log('🔴 PRODUCTS WITH MISSING INVENTORY:');
      missingInInventory.forEach(item => {
        console.log(`   - ${item.product}: Missing ${item.missing} units (Transferred ${item.transferred}, Found ${item.inStock})`);
      });
      console.log('');
    }
    
    if (extraInInventory.length > 0) {
      console.log('🟡 PRODUCTS WITH EXTRA INVENTORY (not from transfers):');
      extraInInventory.forEach(item => {
        if (item.transferred === 0) {
          console.log(`   - ${item.product}: ${item.extra} units (Added directly, no transfers)`);
        } else {
          console.log(`   - ${item.product}: ${item.extra} extra units (Transferred ${item.transferred}, Found ${item.inStock})`);
        }
      });
      console.log('');
    }
    
    // Overall status
    console.log('─'.repeat(80));
    if (mismatchCount === 0 && totalTransferred === totalInStock) {
      console.log('\n✅ PERFECT MATCH! All transferred items are in inventory.\n');
    } else if (totalInStock >= totalTransferred) {
      console.log('\n✅ INVENTORY OK! All transferred items are accounted for.');
      if (totalInStock > totalTransferred) {
        console.log(`   Note: ${totalInStock - totalTransferred} extra units found (may be from direct additions)\n`);
      }
    } else {
      console.log('\n⚠️  INVENTORY ISSUE! Some transferred items are missing from inventory.');
      console.log(`   Missing: ${totalTransferred - totalInStock} units\n`);
    }
    
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ VERIFICATION COMPLETE                                    ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

verifyInventory();

