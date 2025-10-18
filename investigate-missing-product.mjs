#!/usr/bin/env node

/**
 * Investigate the missing product "11111"
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync, existsSync } from 'fs';

console.log('\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║   🔍 INVESTIGATING MISSING PRODUCT: "11111"                  ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

// Get database URL
let DATABASE_URL;
try {
  if (existsSync('database-config.json')) {
    const config = JSON.parse(readFileSync('database-config.json', 'utf-8'));
    DATABASE_URL = config.url;
  } else {
    console.error('❌ database-config.json not found');
    process.exit(1);
  }
} catch (e) {
  console.error('❌ Error reading database config:', e.message);
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function investigate() {
  try {
    // Get Arusha branch
    const branches = await sql`
      SELECT id FROM store_locations
      WHERE UPPER(name) LIKE '%ARUSHA%' OR UPPER(code) LIKE '%ARUSHA%'
    `;
    const arushaBranchId = branches[0].id;
    
    console.log('🔎 Step 1: Find the product "11111"\n');
    
    // Find the product
    const products = await sql`
      SELECT id, name, sku, is_shared, branch_id
      FROM lats_products
      WHERE name = '11111'
    `;
    
    if (products.length === 0) {
      console.log('❌ Product "11111" not found in database!\n');
      return;
    }
    
    const product = products[0];
    console.log('✅ Found product:');
    console.log(`   ID: ${product.id}`);
    console.log(`   Name: ${product.name}`);
    console.log(`   SKU: ${product.sku}`);
    console.log(`   Is Shared: ${product.is_shared}`);
    console.log(`   Branch ID: ${product.branch_id || 'NULL'}\n`);
    
    console.log('─'.repeat(80));
    console.log('\n🔎 Step 2: Check all variants of this product\n');
    
    const allVariants = await sql`
      SELECT 
        pv.id,
        pv.variant_name,
        pv.sku,
        pv.quantity,
        pv.reserved_quantity,
        pv.branch_id,
        b.name as branch_name
      FROM lats_product_variants pv
      LEFT JOIN store_locations b ON b.id = pv.branch_id
      WHERE pv.product_id = ${product.id}
      ORDER BY pv.created_at DESC
    `;
    
    console.log(`Found ${allVariants.length} variant(s):\n`);
    
    allVariants.forEach((variant, index) => {
      console.log(`${index + 1}. Variant ID: ${variant.id}`);
      console.log(`   Name: ${variant.variant_name || 'N/A'}`);
      console.log(`   SKU: ${variant.sku}`);
      console.log(`   Branch: ${variant.branch_name || 'N/A'}`);
      console.log(`   Quantity: ${variant.quantity}`);
      console.log(`   Reserved: ${variant.reserved_quantity || 0}`);
      console.log('');
    });
    
    const arushaVariant = allVariants.find(v => v.branch_id === arushaBranchId);
    
    if (!arushaVariant) {
      console.log('⚠️  No variant exists at Arusha branch!\n');
    } else if (arushaVariant.quantity === 0) {
      console.log('⚠️  Variant exists at Arusha but has 0 quantity!\n');
    }
    
    console.log('─'.repeat(80));
    console.log('\n🔎 Step 3: Check the transfer record\n');
    
    const transfers = await sql`
      SELECT 
        bt.id,
        bt.status,
        bt.quantity,
        bt.entity_id,
        bt.completed_at,
        bt.created_at,
        fb.name as from_branch,
        tb.name as to_branch
      FROM branch_transfers bt
      JOIN store_locations fb ON fb.id = bt.from_branch_id
      JOIN store_locations tb ON tb.id = bt.to_branch_id
      WHERE bt.to_branch_id = ${arushaBranchId}
        AND bt.entity_id IN (
          SELECT id FROM lats_product_variants WHERE product_id = ${product.id}
        )
      ORDER BY bt.created_at DESC
    `;
    
    console.log(`Found ${transfers.length} transfer(s):\n`);
    
    transfers.forEach((transfer, index) => {
      console.log(`${index + 1}. Transfer ID: ${transfer.id}`);
      console.log(`   Status: ${transfer.status}`);
      console.log(`   Quantity: ${transfer.quantity}`);
      console.log(`   From: ${transfer.from_branch} → To: ${transfer.to_branch}`);
      console.log(`   Variant ID: ${transfer.entity_id}`);
      console.log(`   Created: ${new Date(transfer.created_at).toLocaleString()}`);
      console.log(`   Completed: ${transfer.completed_at ? new Date(transfer.completed_at).toLocaleString() : 'N/A'}`);
      console.log('');
    });
    
    console.log('─'.repeat(80));
    console.log('\n🔎 Step 4: Check if product was sold from Arusha\n');
    
    // Check for sales
    const sales = await sql`
      SELECT 
        s.id as sale_id,
        s.created_at as sale_date,
        si.quantity,
        si.subtotal
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      WHERE si.product_variant_id IN (
        SELECT id FROM lats_product_variants 
        WHERE product_id = ${product.id} AND branch_id = ${arushaBranchId}
      )
      ORDER BY s.created_at DESC
    `;
    
    if (sales.length === 0) {
      console.log('📭 No sales found for this product at Arusha\n');
    } else {
      console.log(`Found ${sales.length} sale(s):\n`);
      
      let totalSold = 0;
      sales.forEach((sale, index) => {
        console.log(`${index + 1}. Sale ID: ${sale.sale_id.substring(0, 8)}...`);
        console.log(`   Quantity: ${sale.quantity}`);
        console.log(`   Date: ${new Date(sale.sale_date).toLocaleString()}`);
        console.log('');
        totalSold += parseInt(sale.quantity);
      });
      
      console.log(`📊 Total sold: ${totalSold} units\n`);
    }
    
    console.log('─'.repeat(80));
    console.log('\n🎯 DIAGNOSIS:\n');
    
    if (!arushaVariant) {
      console.log('🔴 PROBLEM: Variant was never created at Arusha branch!');
      console.log('   The transfer completed but the variant wasn\'t created.');
      console.log('   This suggests the complete_stock_transfer_transaction function may have failed.\n');
    } else if (arushaVariant.quantity === 0 && sales.length > 0) {
      console.log('✅ SOLVED: Product was transferred and then sold!');
      console.log('   The inventory is correct - it was received and then sold out.\n');
    } else if (arushaVariant.quantity === 0 && sales.length === 0) {
      console.log('⚠️  PROBLEM: Variant exists but has 0 quantity with no sales!');
      console.log('   The product was transferred but quantity wasn\'t increased.');
      console.log('   This suggests a bug in the transfer completion logic.\n');
    }
    
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ INVESTIGATION COMPLETE                                   ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

investigate();

