#!/usr/bin/env node

/**
 * Check 256GB Variant Source
 * Find if there's a purchase order or other source for the 256GB variant
 */

import dotenv from 'dotenv';
import { Pool } from '@neondatabase/serverless';

dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env file');
  process.exit(1);
}

const VARIANT_SKU = 'SKU-1762822402801-8IC-V02'; // 256GB variant

async function checkVariantSource() {
  console.log('🔍 Checking 256GB Variant Source\n');
  console.log(`Variant SKU: ${VARIANT_SKU}\n`);
  
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    // Get variant info
    const { rows: variantRows } = await pool.query(
      `SELECT id, product_id, variant_name, sku, cost_price, selling_price, quantity, created_at
       FROM lats_product_variants
       WHERE sku = $1`,
      [VARIANT_SKU]
    );
    
    if (variantRows.length === 0) {
      console.log('❌ 256GB variant not found');
      await pool.end();
      return;
    }
    
    const variant = variantRows[0];
    console.log('📦 VARIANT INFO:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`ID:            ${variant.id}`);
    console.log(`Name:          ${variant.variant_name}`);
    console.log(`SKU:           ${variant.sku}`);
    console.log(`Cost Price:    TSh ${variant.cost_price}`);
    console.log(`Selling Price: TSh ${variant.selling_price}`);
    console.log(`Quantity:      ${variant.quantity}`);
    console.log(`Created:       ${new Date(variant.created_at).toLocaleString()}`);
    
    // Check for purchase orders with this variant
    console.log('\n🔍 Checking Purchase Orders...');
    const { rows: poItems } = await pool.query(
      `SELECT 
        poi.id,
        poi.quantity_ordered,
        poi.quantity_received,
        poi.unit_cost,
        poi.subtotal,
        po.po_number,
        po.currency,
        po.exchange_rate,
        po.status,
        po.created_at
       FROM lats_purchase_order_items poi
       JOIN lats_purchase_orders po ON poi.purchase_order_id = po.id
       WHERE poi.variant_id = $1
       ORDER BY po.created_at DESC`,
      [variant.id]
    );
    
    if (poItems.length > 0) {
      console.log(`✅ Found ${poItems.length} purchase order(s):\n`);
      
      poItems.forEach((po, i) => {
        console.log(`${i + 1}. PO: ${po.po_number}`);
        console.log(`   Status: ${po.status}`);
        console.log(`   Ordered: ${po.quantity_ordered} units`);
        console.log(`   Received: ${po.quantity_received || 0} units`);
        console.log(`   Unit Cost: ${po.unit_cost} ${po.currency || 'TZS'}`);
        
        if (po.currency && po.currency !== 'TZS' && po.exchange_rate) {
          console.log(`   Cost (TZS): ${(po.unit_cost * po.exchange_rate).toFixed(2)} TZS`);
        }
        
        console.log(`   Date: ${new Date(po.created_at).toLocaleString()}\n`);
      });
    } else {
      console.log('❌ No purchase orders found for this variant');
      console.log('\n⚠️  This means the 256GB variant was:');
      console.log('   - Created manually without a purchase order');
      console.log('   - OR the current data is placeholder/sample data');
    }
    
    // Check inventory adjustments
    console.log('\n🔍 Checking Inventory Adjustments...');
    const { rows: adjustments } = await pool.query(
      `SELECT 
        adjustment_type,
        quantity_change,
        reason,
        created_at
       FROM lats_inventory_adjustments
       WHERE variant_id = $1
       ORDER BY created_at DESC`,
      [variant.id]
    );
    
    if (adjustments.length > 0) {
      console.log(`✅ Found ${adjustments.length} adjustment(s):\n`);
      
      adjustments.forEach((adj, i) => {
        console.log(`${i + 1}. Type: ${adj.adjustment_type}`);
        console.log(`   Quantity Change: ${adj.quantity_change}`);
        console.log(`   Reason: ${adj.reason || 'N/A'}`);
        console.log(`   Date: ${new Date(adj.created_at).toLocaleString()}\n`);
      });
    } else {
      console.log('❌ No inventory adjustments found');
    }
    
    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SUMMARY:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (poItems.length === 0 && adjustments.length === 0) {
      console.log('⚠️  NO SOURCE DATA FOUND');
      console.log('\nThe current data (TSh 120,000 cost, TSh 95,000, 3 units)');
      console.log('was likely added manually or is placeholder data.');
      console.log('\n💡 RECOMMENDATION:');
      console.log('Please provide the actual:');
      console.log('  • Cost price (what you paid)');
      console.log('  • Selling price (what you charge)');
      console.log('  • Quantity in stock');
      console.log('  • Or create a purchase order for this variant\n');
    } else {
      console.log('✅ Source data found in purchase orders/adjustments');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

// Run the script
checkVariantSource().catch(console.error);

