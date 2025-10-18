#!/usr/bin/env node

/**
 * Check Stock Transfers Received at Arusha Branch
 * This script queries the database to show all completed stock transfers
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync, existsSync } from 'fs';

console.log('\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║   📦 ARUSHA BRANCH - STOCK TRANSFER REPORT                   ║');
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

async function checkArushaTranfers() {
  try {
    // First, check if Arusha branch exists
    console.log('🔍 Looking for Arusha branch...\n');
    
    const branches = await sql`
      SELECT id, name, code, city, is_active
      FROM store_locations
      WHERE UPPER(name) LIKE '%ARUSHA%' OR UPPER(code) LIKE '%ARUSHA%'
    `;
    
    if (branches.length === 0) {
      console.log('❌ Arusha branch not found in the database!\n');
      console.log('Available branches:');
      const allBranches = await sql`
        SELECT name, code, city
        FROM store_locations
        WHERE is_active = true
        ORDER BY name
      `;
      allBranches.forEach(b => console.log(`   - ${b.name} (${b.code}) - ${b.city}`));
      return;
    }
    
    const arushaBranch = branches[0];
    console.log('✅ Found Arusha branch:');
    console.log(`   ID: ${arushaBranch.id}`);
    console.log(`   Name: ${arushaBranch.name}`);
    console.log(`   Code: ${arushaBranch.code}`);
    console.log(`   City: ${arushaBranch.city}\n`);
    
    console.log('─'.repeat(80));
    console.log('\n📊 COMPLETED STOCK TRANSFERS TO ARUSHA:\n');
    
    // Get completed transfers TO Arusha
    const completedTransfers = await sql`
      SELECT 
        bt.id as transfer_id,
        bt.status,
        bt.quantity,
        bt.completed_at,
        bt.created_at,
        from_branch.name as from_branch,
        to_branch.name as to_branch,
        p.name as product_name,
        pv.variant_name,
        pv.sku
      FROM branch_transfers bt
      JOIN store_locations from_branch ON from_branch.id = bt.from_branch_id
      JOIN store_locations to_branch ON to_branch.id = bt.to_branch_id
      LEFT JOIN lats_product_variants pv ON pv.id = bt.entity_id
      LEFT JOIN lats_products p ON p.id = pv.product_id
      WHERE bt.to_branch_id = ${arushaBranch.id}
        AND bt.status = 'completed'
      ORDER BY bt.completed_at DESC
    `;
    
    if (completedTransfers.length === 0) {
      console.log('📭 No completed stock transfers found for Arusha branch.\n');
    } else {
      console.log(`✅ Found ${completedTransfers.length} completed transfer(s):\n`);
      
      let totalProductsReceived = 0;
      
      completedTransfers.forEach((transfer, index) => {
        console.log(`${index + 1}. Transfer ID: ${transfer.transfer_id.substring(0, 8)}...`);
        console.log(`   📦 Product: ${transfer.product_name || 'N/A'}`);
        console.log(`   🔖 Variant: ${transfer.variant_name || 'N/A'}`);
        console.log(`   📊 SKU: ${transfer.sku || 'N/A'}`);
        console.log(`   📈 Quantity: ${transfer.quantity} units`);
        console.log(`   🏢 From: ${transfer.from_branch}`);
        console.log(`   📅 Completed: ${new Date(transfer.completed_at).toLocaleString()}`);
        console.log('');
        
        totalProductsReceived += parseInt(transfer.quantity);
      });
      
      console.log('─'.repeat(80));
      console.log(`\n🎯 TOTAL PRODUCTS RECEIVED: ${totalProductsReceived} units`);
      console.log(`📦 Number of Transfers: ${completedTransfers.length}`);
    }
    
    console.log('\n─'.repeat(80));
    console.log('\n📊 ALL STOCK TRANSFERS TO ARUSHA (Any Status):\n');
    
    // Get all transfers TO Arusha (any status)
    const allTransfers = await sql`
      SELECT 
        bt.id as transfer_id,
        bt.status,
        bt.quantity,
        bt.completed_at,
        bt.created_at,
        from_branch.name as from_branch,
        p.name as product_name,
        pv.variant_name
      FROM branch_transfers bt
      JOIN store_locations from_branch ON from_branch.id = bt.from_branch_id
      JOIN store_locations to_branch ON to_branch.id = bt.to_branch_id
      LEFT JOIN lats_product_variants pv ON pv.id = bt.entity_id
      LEFT JOIN lats_products p ON p.id = pv.product_id
      WHERE bt.to_branch_id = ${arushaBranch.id}
      ORDER BY bt.created_at DESC
    `;
    
    if (allTransfers.length === 0) {
      console.log('📭 No transfers found at all for Arusha branch.\n');
    } else {
      const statusSummary = {};
      allTransfers.forEach(t => {
        statusSummary[t.status] = (statusSummary[t.status] || 0) + 1;
      });
      
      console.log('Status Summary:');
      Object.entries(statusSummary).forEach(([status, count]) => {
        const icon = status === 'completed' ? '✅' : 
                     status === 'pending' ? '⏳' :
                     status === 'approved' ? '👍' :
                     status === 'in_transit' ? '🚚' : '❓';
        console.log(`   ${icon} ${status}: ${count} transfer(s)`);
      });
      console.log('');
      
      console.log('Recent Transfers:');
      allTransfers.slice(0, 5).forEach((transfer, index) => {
        const statusIcon = transfer.status === 'completed' ? '✅' : 
                          transfer.status === 'pending' ? '⏳' :
                          transfer.status === 'approved' ? '👍' :
                          transfer.status === 'in_transit' ? '🚚' : '❓';
        console.log(`   ${index + 1}. ${statusIcon} ${transfer.product_name || 'N/A'} - ${transfer.quantity} units - ${transfer.status}`);
        console.log(`      From: ${transfer.from_branch} | Created: ${new Date(transfer.created_at).toLocaleDateString()}`);
      });
    }
    
    console.log('\n─'.repeat(80));
    console.log('\n📦 CURRENT INVENTORY AT ARUSHA:\n');
    
    // Check current inventory at Arusha
    const inventory = await sql`
      SELECT 
        p.name as product_name,
        pv.variant_name,
        pv.sku,
        pv.quantity as stock_quantity,
        pv.reserved_quantity
      FROM lats_product_variants pv
      JOIN lats_products p ON p.id = pv.product_id
      WHERE pv.branch_id = ${arushaBranch.id}
        AND pv.quantity > 0
      ORDER BY pv.quantity DESC
    `;
    
    if (inventory.length === 0) {
      console.log('📭 No products with stock found at Arusha branch.\n');
    } else {
      console.log(`✅ Found ${inventory.length} product(s) with stock:\n`);
      
      let totalStock = 0;
      inventory.forEach((item, index) => {
        console.log(`${index + 1}. ${item.product_name}`);
        console.log(`   Variant: ${item.variant_name || 'N/A'}`);
        console.log(`   SKU: ${item.sku || 'N/A'}`);
        console.log(`   Stock: ${item.stock_quantity} units (Reserved: ${item.reserved_quantity || 0})`);
        console.log('');
        
        totalStock += parseInt(item.stock_quantity);
      });
      
      console.log('─'.repeat(80));
      console.log(`\n🎯 TOTAL INVENTORY AT ARUSHA: ${totalStock} units across ${inventory.length} product(s)`);
    }
    
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ REPORT COMPLETE                                          ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    
  } catch (error) {
    console.error('\n❌ Error querying database:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

checkArushaTranfers();

