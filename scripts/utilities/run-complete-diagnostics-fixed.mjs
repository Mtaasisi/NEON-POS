#!/usr/bin/env node

/**
 * Complete Database Diagnostics - Fixed for actual schema
 * Run all diagnostic queries to check system health
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || 
  'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║         COMPLETE DATABASE DIAGNOSTICS REPORT                   ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

async function query1_CheckProducts() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1️⃣  CHECK ALL PRODUCTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const products = await sql`
      SELECT id, name, sku, stock_quantity 
      FROM lats_products 
      ORDER BY created_at DESC
    `;

    console.log(`📦 Total Products: ${products.length}\n`);

    if (products.length > 0) {
      console.log('Recent Products:');
      console.log('─────────────────────────────────────────────────────────────────');
      products.slice(0, 10).forEach((p, idx) => {
        console.log(`${idx + 1}. ${p.name}`);
        console.log(`   ID: ${p.id.substring(0, 20)}...`);
        console.log(`   SKU: ${p.sku || 'N/A'}`);
        console.log(`   Stock: ${p.stock_quantity || 0}`);
        console.log('');
      });
      if (products.length > 10) {
        console.log(`   ... and ${products.length - 10} more products\n`);
      }
    } else {
      console.log('⚠️  No products found in database\n');
    }
  } catch (error) {
    console.error('❌ Error querying products:', error.message, '\n');
  }
}

async function query2_CheckVariants() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('2️⃣  CHECK ALL PRODUCT VARIANTS (Parents & IMEI Children)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const variants = await sql`
      SELECT 
        id, 
        product_id, 
        variant_name, 
        variant_type, 
        is_parent, 
        quantity as stock_quantity,
        variant_attributes->>'imei' AS imei
      FROM lats_product_variants
      ORDER BY created_at DESC
    `;

    console.log(`📦 Total Variants: ${variants.length}\n`);

    const parents = variants.filter(v => v.is_parent === true);
    const children = variants.filter(v => v.is_parent === false);
    const withIMEI = variants.filter(v => v.imei);

    console.log('📊 Summary:');
    console.log(`   • Parent Variants: ${parents.length}`);
    console.log(`   • Child Variants: ${children.length}`);
    console.log(`   • Variants with IMEI: ${withIMEI.length}\n`);

    if (variants.length > 0) {
      console.log('Recent Variants:');
      console.log('─────────────────────────────────────────────────────────────────');
      variants.slice(0, 10).forEach((v, idx) => {
        console.log(`${idx + 1}. ${v.variant_name}`);
        console.log(`   Type: ${v.variant_type} | Parent: ${v.is_parent ? 'Yes' : 'No'}`);
        console.log(`   Stock: ${v.stock_quantity || 0}`);
        if (v.imei) console.log(`   IMEI: ${v.imei}`);
        console.log('');
      });
      if (variants.length > 10) {
        console.log(`   ... and ${variants.length - 10} more variants\n`);
      }
    } else {
      console.log('⚠️  No variants found in database\n');
    }
  } catch (error) {
    console.error('❌ Error querying variants:', error.message, '\n');
  }
}

async function query3_CheckPurchaseOrders() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('3️⃣  CHECK PURCHASE ORDERS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const pos = await sql`
      SELECT 
        id, 
        po_number, 
        status, 
        order_date, 
        branch_id 
      FROM lats_purchase_orders 
      ORDER BY order_date DESC
    `;

    console.log(`📦 Total Purchase Orders: ${pos.length}\n`);

    const byStatus = {};
    pos.forEach(po => {
      byStatus[po.status] = (byStatus[po.status] || 0) + 1;
    });

    console.log('📊 By Status:');
    Object.entries(byStatus).forEach(([status, count]) => {
      console.log(`   • ${status}: ${count}`);
    });
    console.log('');

    if (pos.length > 0) {
      console.log('Recent Purchase Orders:');
      console.log('─────────────────────────────────────────────────────────────────');
      pos.slice(0, 10).forEach((po, idx) => {
        console.log(`${idx + 1}. PO #${po.po_number}`);
        console.log(`   Status: ${po.status}`);
        console.log(`   Date: ${new Date(po.order_date).toLocaleDateString()}`);
        console.log('');
      });
      if (pos.length > 10) {
        console.log(`   ... and ${pos.length - 10} more POs\n`);
      }
    } else {
      console.log('⚠️  No purchase orders found\n');
    }
  } catch (error) {
    console.error('❌ Error querying purchase orders:', error.message, '\n');
  }
}

async function query4_CheckPOItems() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('4️⃣  CHECK PURCHASE ORDER ITEMS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const items = await sql`
      SELECT 
        id, 
        purchase_order_id, 
        product_id, 
        variant_id, 
        ordered_quantity as quantity,
        received_quantity, 
        unit_cost, 
        total_cost
      FROM lats_purchase_order_items
      ORDER BY purchase_order_id DESC
    `;

    console.log(`📦 Total PO Items: ${items.length}\n`);

    const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalReceived = items.reduce((sum, item) => sum + (item.received_quantity || 0), 0);
    const totalCost = items.reduce((sum, item) => sum + parseFloat(item.total_cost || 0), 0);

    console.log('📊 Summary:');
    console.log(`   • Total Ordered: ${totalQuantity} units`);
    console.log(`   • Total Received: ${totalReceived} units`);
    console.log(`   • Total Value: $${totalCost.toFixed(2)}\n`);

    if (items.length > 0) {
      console.log('Recent PO Items (Top 10):');
      console.log('─────────────────────────────────────────────────────────────────');
      items.slice(0, 10).forEach((item, idx) => {
        console.log(`${idx + 1}. Qty: ${item.quantity} | Received: ${item.received_quantity || 0}`);
        console.log(`   Unit Cost: $${item.unit_cost || 0} | Total: $${item.total_cost || 0}`);
        console.log('');
      });
      if (items.length > 10) {
        console.log(`   ... and ${items.length - 10} more items\n`);
      }
    } else {
      console.log('⚠️  No PO items found\n');
    }
  } catch (error) {
    console.error('❌ Error querying PO items:', error.message, '\n');
  }
}

async function query5_CheckStockMovements() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('5️⃣  CHECK STOCK MOVEMENTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const movements = await sql`
      SELECT 
        id, 
        variant_id, 
        movement_type, 
        quantity, 
        reference_type, 
        reference_id, 
        created_at
      FROM lats_stock_movements
      ORDER BY created_at DESC
    `;

    console.log(`📦 Total Stock Movements: ${movements.length}\n`);

    const byType = {};
    movements.forEach(m => {
      byType[m.movement_type] = (byType[m.movement_type] || 0) + 1;
    });

    console.log('📊 By Movement Type:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`   • ${type}: ${count}`);
    });
    console.log('');

    if (movements.length > 0) {
      console.log('Recent Stock Movements (Top 10):');
      console.log('─────────────────────────────────────────────────────────────────');
      movements.slice(0, 10).forEach((m, idx) => {
        console.log(`${idx + 1}. ${m.movement_type} | Qty: ${m.quantity}`);
        console.log(`   Reference: ${m.reference_type}`);
        console.log(`   Date: ${new Date(m.created_at).toLocaleString()}`);
        console.log('');
      });
      if (movements.length > 10) {
        console.log(`   ... and ${movements.length - 10} more movements\n`);
      }
    } else {
      console.log('⚠️  No stock movements found\n');
    }
  } catch (error) {
    console.error('❌ Error querying stock movements:', error.message, '\n');
  }
}

async function query6_CheckIMEIValidation() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('6️⃣  CHECK IMEI VALIDATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const validations = await sql`
      SELECT * 
      FROM imei_validation 
      ORDER BY created_at DESC
    `;

    console.log(`📦 Total IMEI Validation Records: ${validations.length}\n`);

    if (validations.length > 0) {
      const valid = validations.filter(v => v.is_valid).length;
      const invalid = validations.filter(v => !v.is_valid).length;
      
      console.log('📊 Summary:');
      console.log(`   • Valid IMEIs: ${valid}`);
      console.log(`   • Invalid IMEIs: ${invalid}\n`);

      console.log('Recent IMEI Validations (Top 10):');
      console.log('─────────────────────────────────────────────────────────────────');
      validations.slice(0, 10).forEach((v, idx) => {
        console.log(`${idx + 1}. IMEI: ${v.imei}`);
        console.log(`   Valid: ${v.is_valid ? '✅ Yes' : '❌ No'}`);
        if (v.validation_message) console.log(`   Message: ${v.validation_message}`);
        console.log('');
      });
      if (validations.length > 10) {
        console.log(`   ... and ${validations.length - 10} more records\n`);
      }
    } else {
      console.log('⚠️  No IMEI validation records found\n');
    }
  } catch (error) {
    console.error('❌ Error querying IMEI validation:', error.message, '\n');
  }
}

async function query7_CheckDuplicateIMEIs() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('7️⃣  CHECK DUPLICATE IMEIs');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const duplicates = await sql`
      WITH duplicate_imeis AS (
        SELECT 
          variant_attributes->>'imei' AS imei, 
          COUNT(*) AS count
        FROM lats_product_variants
        WHERE variant_attributes->>'imei' IS NOT NULL
        GROUP BY variant_attributes->>'imei'
        HAVING COUNT(*) > 1
      )
      SELECT * FROM duplicate_imeis
    `;

    console.log(`📦 Duplicate IMEIs Found: ${duplicates.length}\n`);

    if (duplicates.length > 0) {
      console.log('⚠️  WARNING: Duplicate IMEIs detected!');
      console.log('─────────────────────────────────────────────────────────────────');
      duplicates.forEach((d, idx) => {
        console.log(`${idx + 1}. IMEI: ${d.imei}`);
        console.log(`   Appears: ${d.count} times`);
        console.log('');
      });
      
      // Get details for each duplicate
      for (const dup of duplicates) {
        const details = await sql`
          SELECT id, variant_name, variant_type, quantity
          FROM lats_product_variants
          WHERE variant_attributes->>'imei' = ${dup.imei}
        `;
        console.log(`   Details for IMEI ${dup.imei}:`);
        details.forEach((d, i) => {
          console.log(`     ${i + 1}. ${d.variant_name} (${d.variant_type}) - Stock: ${d.quantity}`);
        });
        console.log('');
      }
    } else {
      console.log('✅ No duplicate IMEIs found - All IMEIs are unique!\n');
    }
  } catch (error) {
    console.error('❌ Error checking duplicate IMEIs:', error.message, '\n');
  }
}

async function query8_CheckParentVariantStock() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('8️⃣  CHECK PARENT VARIANT STOCK CORRECTNESS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const parentStocks = await sql`
      SELECT 
        p.id AS parent_id, 
        p.variant_name, 
        p.quantity as parent_stock,
        COUNT(c.id) AS imei_children_count, 
        COALESCE(SUM(c.quantity), 0) AS total_child_stock
      FROM lats_product_variants p
      LEFT JOIN lats_product_variants c ON c.parent_variant_id = p.id
      WHERE p.variant_type = 'parent'
      GROUP BY p.id, p.variant_name, p.quantity
      ORDER BY p.created_at DESC
    `;

    console.log(`📦 Total Parent Variants: ${parentStocks.length}\n`);

    if (parentStocks.length > 0) {
      const mismatches = parentStocks.filter(p => 
        parseInt(p.parent_stock || 0) !== parseInt(p.total_child_stock || 0)
      );

      if (mismatches.length > 0) {
        console.log(`⚠️  WARNING: ${mismatches.length} parents have mismatched stock!\n`);
        console.log('Stock Mismatches:');
        console.log('─────────────────────────────────────────────────────────────────');
        mismatches.forEach((p, idx) => {
          console.log(`${idx + 1}. ${p.variant_name}`);
          console.log(`   Parent Stock: ${p.parent_stock || 0}`);
          console.log(`   Children Stock: ${p.total_child_stock || 0}`);
          console.log(`   Children Count: ${p.imei_children_count}`);
          console.log(`   Difference: ${(parseInt(p.parent_stock || 0) - parseInt(p.total_child_stock || 0))}`);
          console.log('');
        });
      } else {
        console.log('✅ All parent variant stocks match their children!\n');
      }

      console.log('Parent Variant Summary (All Parents):');
      console.log('─────────────────────────────────────────────────────────────────');
      parentStocks.forEach((p, idx) => {
        console.log(`${idx + 1}. ${p.variant_name}`);
        console.log(`   Stock: ${p.parent_stock || 0} | Children: ${p.imei_children_count} | Total Child Stock: ${p.total_child_stock || 0}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No parent variants found\n');
    }
  } catch (error) {
    console.error('❌ Error checking parent variant stock:', error.message, '\n');
  }
}

async function query9_InventorySummary() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('9️⃣  QUICK INVENTORY SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const summary = await sql`
      SELECT
        SUM(CASE WHEN variant_type = 'parent' THEN quantity ELSE 0 END) AS parent_stock_total,
        SUM(CASE WHEN variant_type = 'imei_child' THEN quantity ELSE 0 END) AS imei_stock_total,
        COUNT(*) FILTER (WHERE variant_attributes->>'imei' IS NOT NULL) AS total_imeis,
        COUNT(*) FILTER (WHERE variant_attributes->>'imei' IS NULL) AS items_no_imei
      FROM lats_product_variants
    `;

    if (summary.length > 0) {
      const s = summary[0];
      console.log('📊 Inventory Summary:');
      console.log('─────────────────────────────────────────────────────────────────');
      console.log(`   • Parent Stock Total: ${s.parent_stock_total || 0}`);
      console.log(`   • IMEI Child Stock Total: ${s.imei_stock_total || 0}`);
      console.log(`   • Total Items with IMEI: ${s.total_imeis || 0}`);
      console.log(`   • Items without IMEI: ${s.items_no_imei || 0}`);
      console.log('');
    }
  } catch (error) {
    console.error('❌ Error generating inventory summary:', error.message, '\n');
  }
}

async function generateFinalReport() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    FINAL DIAGNOSTIC REPORT                     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // Get counts
    const productCount = await sql`SELECT COUNT(*) as count FROM lats_products`;
    const variantCount = await sql`SELECT COUNT(*) as count FROM lats_product_variants`;
    const poCount = await sql`SELECT COUNT(*) as count FROM lats_purchase_orders`;
    const movementCount = await sql`SELECT COUNT(*) as count FROM lats_stock_movements`;

    console.log('📊 Database Health Check:');
    console.log('─────────────────────────────────────────────────────────────────');
    console.log(`   ✓ Products: ${productCount[0].count}`);
    console.log(`   ✓ Variants: ${variantCount[0].count}`);
    console.log(`   ✓ Purchase Orders: ${poCount[0].count}`);
    console.log(`   ✓ Stock Movements: ${movementCount[0].count}`);
    console.log('');

    // Check for issues
    const duplicateIMEIs = await sql`
      SELECT COUNT(*) as count
      FROM (
        SELECT variant_attributes->>'imei' AS imei, COUNT(*) AS cnt
        FROM lats_product_variants
        WHERE variant_attributes->>'imei' IS NOT NULL
        GROUP BY variant_attributes->>'imei'
        HAVING COUNT(*) > 1
      ) as duplicates
    `;

    const stockMismatches = await sql`
      SELECT COUNT(*) as count
      FROM (
        SELECT 
          p.id,
          p.quantity as parent_stock,
          COALESCE(SUM(c.quantity), 0) AS total_child_stock
        FROM lats_product_variants p
        LEFT JOIN lats_product_variants c ON c.parent_variant_id = p.id
        WHERE p.variant_type = 'parent'
        GROUP BY p.id, p.quantity
        HAVING p.quantity != COALESCE(SUM(c.quantity), 0)
      ) as mismatches
    `;

    console.log('🔍 Issues Detected:');
    console.log('─────────────────────────────────────────────────────────────────');
    
    const issues = [];
    
    if (duplicateIMEIs[0].count > 0) {
      console.log(`   ⚠️  Duplicate IMEIs: ${duplicateIMEIs[0].count}`);
      issues.push('duplicate_imeis');
    } else {
      console.log('   ✅ No duplicate IMEIs');
    }

    if (stockMismatches[0].count > 0) {
      console.log(`   ⚠️  Stock Mismatches: ${stockMismatches[0].count}`);
      issues.push('stock_mismatches');
    } else {
      console.log('   ✅ All stock quantities match');
    }

    console.log('');

    if (issues.length === 0) {
      console.log('🎉 EXCELLENT! No critical issues detected.\n');
    } else {
      console.log(`⚠️  ${issues.length} issue(s) require attention.\n`);
    }

  } catch (error) {
    console.error('❌ Error generating final report:', error.message, '\n');
  }
}

async function main() {
  try {
    console.log('Starting comprehensive database diagnostics...\n');
    
    await query1_CheckProducts();
    await query2_CheckVariants();
    await query3_CheckPurchaseOrders();
    await query4_CheckPOItems();
    await query5_CheckStockMovements();
    await query6_CheckIMEIValidation();
    await query7_CheckDuplicateIMEIs();
    await query8_CheckParentVariantStock();
    await query9_InventorySummary();
    await generateFinalReport();
    
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║         ✅ DIAGNOSTICS COMPLETE - ALL QUERIES EXECUTED         ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    
  } catch (error) {
    console.error('\n❌ Fatal Error:', error);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

main();

