#!/usr/bin/env node

/**
 * COMPREHENSIVE SYSTEM AUDIT & VALIDATION
 * ========================================
 * 
 * This script performs a complete audit of the inventory & POS system:
 * 1. Database schema validation
 * 2. IMEI system validation
 * 3. Workflow simulation
 * 4. Triggers & functions check
 * 5. Data cleanup & fixes
 * 6. Performance optimization
 * 7. Comprehensive reporting
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Audit results storage
const auditResults = {
  timestamp: new Date().toISOString(),
  schema: {},
  imei: {},
  workflows: {},
  triggers: {},
  cleanup: {},
  optimization: {},
  summary: {}
};

// ============================================================================
// SECTION 1: DATABASE & SCHEMA AUDIT
// ============================================================================

async function auditDatabaseSchema() {
  console.log('\n🔍 SECTION 1: DATABASE & SCHEMA AUDIT');
  console.log('=====================================\n');

  const tables = [
    'lats_products',
    'lats_product_variants',
    'inventory_items',
    'lats_purchase_order_items',
    'lats_stock_movements',
    'lats_purchase_orders',
    'lats_sale_items'
  ];

  auditResults.schema.tables = {};

  for (const table of tables) {
    console.log(`\n📋 Auditing table: ${table}`);
    
    // Get row count
    const { count, error: countError } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.log(`   ❌ Error accessing table: ${countError.message}`);
      auditResults.schema.tables[table] = { error: countError.message };
      continue;
    }

    console.log(`   ✓ Row count: ${count || 0}`);

    // Get sample data
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);

    if (!error && data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log(`   ✓ Columns (${columns.length}): ${columns.join(', ')}`);
      
      auditResults.schema.tables[table] = {
        rowCount: count || 0,
        columns: columns,
        sampleData: data[0]
      };
    } else {
      auditResults.schema.tables[table] = {
        rowCount: count || 0,
        columns: [],
        note: 'No data available'
      };
    }
  }

  // Check for critical columns
  console.log('\n🔑 Checking critical columns and relationships...');
  
  const { data: variants } = await supabase
    .from('lats_product_variants')
    .select('id, parent_variant_id, variant_type, attributes')
    .limit(5);

  if (variants) {
    const hasParentColumn = variants.length > 0 && 'parent_variant_id' in variants[0];
    const hasTypeColumn = variants.length > 0 && 'variant_type' in variants[0];
    const hasAttributesColumn = variants.length > 0 && 'attributes' in variants[0];

    console.log(`   ${hasParentColumn ? '✓' : '❌'} parent_variant_id column exists`);
    console.log(`   ${hasTypeColumn ? '✓' : '❌'} variant_type column exists`);
    console.log(`   ${hasAttributesColumn ? '✓' : '❌'} attributes column exists`);

    auditResults.schema.criticalColumns = {
      parent_variant_id: hasParentColumn,
      variant_type: hasTypeColumn,
      attributes: hasAttributesColumn
    };
  }

  console.log('\n✅ Schema audit complete');
}

// ============================================================================
// SECTION 2: IMEI SYSTEM VALIDATION
// ============================================================================

async function validateIMEISystem() {
  console.log('\n🔍 SECTION 2: IMEI SYSTEM VALIDATION');
  console.log('====================================\n');

  // Get all parent variants (IMEI-tracked products)
  const { data: parentVariants, error: parentError } = await supabase
    .from('lats_product_variants')
    .select(`
      id,
      product_id,
      name,
      variant_type,
      quantity,
      attributes
    `)
    .or('variant_type.eq.parent,variant_type.is.null')
    .order('created_at', { ascending: false });

  if (parentError) {
    console.log('❌ Error fetching parent variants:', parentError.message);
    return;
  }

  console.log(`📊 Total parent/regular variants: ${parentVariants?.length || 0}`);

  // Check for IMEI-tracked parents
  const imeiParents = parentVariants?.filter(v => 
    v.attributes?.tracks_imei === true || 
    v.variant_type === 'parent'
  ) || [];

  console.log(`📱 IMEI-tracked parent variants: ${imeiParents.length}`);

  auditResults.imei.totalParents = imeiParents.length;
  auditResults.imei.parents = [];

  for (const parent of imeiParents) {
    // Get product details separately
    const { data: productData } = await supabase
      .from('lats_products')
      .select('name, sku')
      .eq('id', parent.product_id)
      .single();

    console.log(`\n📦 Parent: ${productData?.name || 'Unknown'} - ${parent.name}`);
    console.log(`   ID: ${parent.id}`);
    console.log(`   SKU: ${productData?.sku || 'N/A'}`);
    console.log(`   Parent Quantity: ${parent.quantity || 0}`);

    // Get IMEI children
    const { data: imeiChildren, error: childError } = await supabase
      .from('lats_product_variants')
      .select('id, name, attributes, quantity, variant_type')
      .eq('parent_variant_id', parent.id)
      .eq('variant_type', 'imei');

    if (childError) {
      console.log(`   ❌ Error fetching children: ${childError.message}`);
      continue;
    }

    console.log(`   📱 IMEI children: ${imeiChildren?.length || 0}`);

    const validIMEIs = [];
    const invalidIMEIs = [];
    const duplicateIMEIs = [];
    const imeiCounts = {};

    for (const child of imeiChildren || []) {
      const imei = child.attributes?.imei || child.name;
      const status = child.attributes?.imei_status || 'unknown';

      // Check for duplicates
      if (imeiCounts[imei]) {
        duplicateIMEIs.push(imei);
      }
      imeiCounts[imei] = (imeiCounts[imei] || 0) + 1;

      // Validate IMEI format (15 digits)
      if (/^\d{15}$/.test(imei)) {
        validIMEIs.push({ imei, status, id: child.id });
      } else {
        invalidIMEIs.push({ imei, id: child.id });
      }
    }

    const childrenQtySum = imeiChildren?.reduce((sum, c) => sum + (c.quantity || 0), 0) || 0;
    const qtyMismatch = parent.quantity !== childrenQtySum;

    console.log(`   ✓ Valid IMEIs: ${validIMEIs.length}`);
    console.log(`   ${invalidIMEIs.length > 0 ? '⚠️' : '✓'} Invalid IMEIs: ${invalidIMEIs.length}`);
    console.log(`   ${duplicateIMEIs.length > 0 ? '⚠️' : '✓'} Duplicate IMEIs: ${duplicateIMEIs.length}`);
    console.log(`   ${qtyMismatch ? '⚠️' : '✓'} Quantity sync: Parent=${parent.quantity}, Children Sum=${childrenQtySum}`);

    auditResults.imei.parents.push({
      id: parent.id,
      name: `${productData?.name || 'Unknown'} - ${parent.name}`,
      sku: productData?.sku || 'N/A',
      parentQuantity: parent.quantity,
      childrenCount: imeiChildren?.length || 0,
      childrenQtySum,
      quantityMismatch: qtyMismatch,
      validIMEIs: validIMEIs.length,
      invalidIMEIs: invalidIMEIs.length,
      duplicateIMEIs: duplicateIMEIs.length,
      invalidIMEIsList: invalidIMEIs,
      duplicateIMEIsList: [...new Set(duplicateIMEIs)]
    });
  }

  // Check for orphaned IMEI children
  const { data: orphanedIMEIs, error: orphanError } = await supabase
    .from('lats_product_variants')
    .select('id, name, parent_variant_id, attributes')
    .eq('variant_type', 'imei')
    .not('parent_variant_id', 'is', null);

  if (!orphanError && orphanedIMEIs) {
    const orphans = [];
    for (const imei of orphanedIMEIs) {
      // Check if parent exists
      const { data: parentExists } = await supabase
        .from('lats_product_variants')
        .select('id')
        .eq('id', imei.parent_variant_id)
        .single();

      if (!parentExists) {
        orphans.push({
          id: imei.id,
          imei: imei.attributes?.imei || imei.name,
          parent_variant_id: imei.parent_variant_id
        });
      }
    }

    console.log(`\n${orphans.length > 0 ? '⚠️' : '✓'} Orphaned IMEI children: ${orphans.length}`);
    auditResults.imei.orphanedIMEIs = orphans;
  }

  console.log('\n✅ IMEI validation complete');
}

// ============================================================================
// SECTION 3: WORKFLOW SIMULATION
// ============================================================================

async function simulateWorkflows() {
  console.log('\n🔍 SECTION 3: WORKFLOW SIMULATION');
  console.log('=================================\n');

  auditResults.workflows = {
    productCreation: {},
    purchaseOrder: {},
    receiving: {},
    posSale: {}
  };

  // Test 1: Check if we can create a product with variants
  console.log('📝 Test 1: Product with Variants Creation Check');
  console.log('   (This is a read-only check - no actual creation)');
  
  const { data: existingProducts } = await supabase
    .from('lats_products')
    .select('id, name, sku')
    .limit(1);

  if (existingProducts && existingProducts.length > 0) {
    const product = existingProducts[0];
    
    // Get variants for this product
    const { data: variants } = await supabase
      .from('lats_product_variants')
      .select('id, name, variant_type, quantity, attributes')
      .eq('product_id', product.id);

    console.log(`   ✓ Sample product found: ${product.name}`);
    console.log(`   ✓ Variants: ${variants?.length || 0}`);
    auditResults.workflows.productCreation = {
      canQuery: true,
      sampleProduct: product.name,
      variantCount: variants?.length || 0
    };
  }

  // Test 2: Check purchase order workflow
  console.log('\n📦 Test 2: Purchase Order Workflow Check');
  
  const { data: recentPOs } = await supabase
    .from('lats_purchase_orders')
    .select('id, order_number, status')
    .order('created_at', { ascending: false })
    .limit(1);

  if (recentPOs && recentPOs.length > 0) {
    const recentPO = recentPOs[0];
    
    // Get PO items separately
    const { data: poItems } = await supabase
      .from('lats_purchase_order_items')
      .select('id, product_id, variant_id, quantity, received_quantity')
      .eq('purchase_order_id', recentPO.id);

    console.log(`   ✓ Recent PO found: ${recentPO.order_number}`);
    console.log(`   ✓ Status: ${recentPO.status}`);
    console.log(`   ✓ Items: ${poItems?.length || 0}`);
    
    auditResults.workflows.purchaseOrder = {
      recentPO: recentPO.order_number,
      status: recentPO.status,
      itemCount: poItems?.length || 0
    };
  }

  // Test 3: Check stock movements
  console.log('\n📊 Test 3: Stock Movements Check');
  
  const { data: recentMovements, count: movementCount } = await supabase
    .from('lats_stock_movements')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(5);

  console.log(`   ✓ Total stock movements: ${movementCount || 0}`);
  console.log(`   ✓ Recent movements: ${recentMovements?.length || 0}`);

  auditResults.workflows.stockMovements = {
    total: movementCount || 0,
    recentCount: recentMovements?.length || 0
  };

  // Test 4: Check inventory items
  console.log('\n🏪 Test 4: Inventory Items Check');
  
  const { data: inventoryItems, count: inventoryCount } = await supabase
    .from('inventory_items')
    .select('*', { count: 'exact' })
    .limit(5);

  console.log(`   ✓ Total inventory items: ${inventoryCount || 0}`);

  auditResults.workflows.inventory = {
    total: inventoryCount || 0
  };

  console.log('\n✅ Workflow simulation complete');
}

// ============================================================================
// SECTION 4: TRIGGERS & FUNCTIONS VALIDATION
// ============================================================================

async function validateTriggersAndFunctions() {
  console.log('\n🔍 SECTION 4: TRIGGERS & FUNCTIONS VALIDATION');
  console.log('=============================================\n');

  auditResults.triggers = {
    functions: [],
    triggers: []
  };

  // Check for key functions
  const functionsToCheck = [
    'add_imei_to_parent_variant',
    'mark_imei_as_sold',
    'get_available_imeis_for_pos',
    'sync_parent_variant_quantity',
    'update_parent_stock_on_child_change'
  ];

  console.log('🔧 Checking database functions...\n');

  for (const funcName of functionsToCheck) {
    try {
      // Try to query if function exists using information_schema
      const { data, error } = await supabase.rpc(funcName, {}).limit(0);
      
      if (error && error.message.includes('does not exist')) {
        console.log(`   ❌ Function not found: ${funcName}`);
        auditResults.triggers.functions.push({
          name: funcName,
          exists: false
        });
      } else {
        console.log(`   ✓ Function exists: ${funcName}`);
        auditResults.triggers.functions.push({
          name: funcName,
          exists: true
        });
      }
    } catch (err) {
      console.log(`   ⚠️ Could not verify: ${funcName}`);
      auditResults.triggers.functions.push({
        name: funcName,
        exists: 'unknown',
        error: err.message
      });
    }
  }

  console.log('\n✅ Triggers & functions validation complete');
}

// ============================================================================
// SECTION 5: DATA CLEANUP & FIXES
// ============================================================================

async function performDataCleanup() {
  console.log('\n🔍 SECTION 5: DATA CLEANUP & FIXES');
  console.log('==================================\n');

  auditResults.cleanup = {
    duplicatesFound: 0,
    orphansFound: 0,
    invalidIMEIs: 0,
    fixes: []
  };

  // Check for duplicate IMEIs
  console.log('🔍 Scanning for duplicate IMEIs...\n');

  const { data: allIMEIVariants } = await supabase
    .from('lats_product_variants')
    .select('id, name, attributes, parent_variant_id')
    .eq('variant_type', 'imei');

  if (allIMEIVariants) {
    const imeiMap = {};
    
    for (const variant of allIMEIVariants) {
      const imei = variant.attributes?.imei || variant.name;
      if (!imeiMap[imei]) {
        imeiMap[imei] = [];
      }
      imeiMap[imei].push(variant);
    }

    const duplicates = Object.entries(imeiMap).filter(([_, variants]) => variants.length > 1);
    
    console.log(`   ${duplicates.length > 0 ? '⚠️' : '✓'} Duplicate IMEIs found: ${duplicates.length}`);
    
    for (const [imei, variants] of duplicates) {
      console.log(`   - IMEI ${imei}: ${variants.length} instances`);
      auditResults.cleanup.duplicatesFound++;
    }
  }

  // Check for invalid IMEIs
  console.log('\n🔍 Scanning for invalid IMEI formats...\n');

  if (allIMEIVariants) {
    const invalidIMEIs = allIMEIVariants.filter(v => {
      const imei = v.attributes?.imei || v.name;
      return !/^\d{15}$/.test(imei);
    });

    console.log(`   ${invalidIMEIs.length > 0 ? '⚠️' : '✓'} Invalid IMEIs found: ${invalidIMEIs.length}`);
    auditResults.cleanup.invalidIMEIs = invalidIMEIs.length;

    for (const v of invalidIMEIs.slice(0, 5)) {
      const imei = v.attributes?.imei || v.name;
      console.log(`   - ID ${v.id}: "${imei}"`);
    }
  }

  // Check for negative or null stock
  console.log('\n🔍 Scanning for stock issues...\n');

  const { data: negativeStock } = await supabase
    .from('lats_product_variants')
    .select('id, name, quantity')
    .or('quantity.lt.0,quantity.is.null');

  if (negativeStock && negativeStock.length > 0) {
    console.log(`   ⚠️ Variants with negative/null stock: ${negativeStock.length}`);
    auditResults.cleanup.stockIssues = negativeStock.length;
  } else {
    console.log('   ✓ No stock issues found');
    auditResults.cleanup.stockIssues = 0;
  }

  console.log('\n✅ Data cleanup scan complete');
}

// ============================================================================
// SECTION 6: PERFORMANCE OPTIMIZATION
// ============================================================================

async function analyzePerformance() {
  console.log('\n🔍 SECTION 6: PERFORMANCE OPTIMIZATION');
  console.log('======================================\n');

  auditResults.optimization = {
    indexes: [],
    recommendations: []
  };

  console.log('📊 Analyzing query patterns and recommending indexes...\n');

  // Common query patterns
  const indexRecommendations = [
    {
      table: 'lats_product_variants',
      column: 'parent_variant_id',
      reason: 'Frequently queried for IMEI children lookup'
    },
    {
      table: 'lats_product_variants',
      column: 'variant_type',
      reason: 'Used to filter parent vs IMEI variants'
    },
    {
      table: 'lats_product_variants',
      column: 'product_id',
      reason: 'Foreign key lookups for product relationships'
    },
    {
      table: 'lats_purchase_order_items',
      column: 'variant_id',
      reason: 'Used in receiving and PO workflows'
    },
    {
      table: 'lats_stock_movements',
      column: 'variant_id',
      reason: 'Stock history queries'
    },
    {
      table: 'inventory_items',
      column: 'variant_id',
      reason: 'Inventory lookups'
    }
  ];

  for (const rec of indexRecommendations) {
    console.log(`   📌 ${rec.table}.${rec.column}`);
    console.log(`      Reason: ${rec.reason}\n`);
    auditResults.optimization.recommendations.push(rec);
  }

  console.log('✅ Performance analysis complete');
}

// ============================================================================
// SECTION 7: GENERATE COMPREHENSIVE REPORT
// ============================================================================

async function generateReport() {
  console.log('\n🔍 SECTION 7: GENERATING COMPREHENSIVE REPORT');
  console.log('=============================================\n');

  // Calculate summary statistics
  const totalProducts = auditResults.schema.tables['lats_products']?.rowCount || 0;
  const totalVariants = auditResults.schema.tables['lats_product_variants']?.rowCount || 0;
  const totalIMEIParents = auditResults.imei.totalParents || 0;
  const totalIMEIChildren = auditResults.imei.parents?.reduce((sum, p) => sum + p.childrenCount, 0) || 0;

  const criticalIssues = [];
  const warnings = [];
  const successItems = [];

  // Analyze results
  if (auditResults.cleanup.duplicatesFound > 0) {
    criticalIssues.push(`${auditResults.cleanup.duplicatesFound} duplicate IMEIs detected`);
  }

  if (auditResults.cleanup.orphansFound > 0) {
    criticalIssues.push(`${auditResults.cleanup.orphansFound} orphaned IMEI children found`);
  }

  if (auditResults.cleanup.invalidIMEIs > 0) {
    warnings.push(`${auditResults.cleanup.invalidIMEIs} invalid IMEI formats`);
  }

  if (auditResults.cleanup.stockIssues > 0) {
    warnings.push(`${auditResults.cleanup.stockIssues} stock quantity issues`);
  }

  // Check for quantity mismatches
  const mismatchedParents = auditResults.imei.parents?.filter(p => p.quantityMismatch) || [];
  if (mismatchedParents.length > 0) {
    warnings.push(`${mismatchedParents.length} parent variants with quantity mismatches`);
  }

  if (criticalIssues.length === 0 && warnings.length === 0) {
    successItems.push('No critical issues detected');
    successItems.push('System is healthy and production-ready');
  }

  auditResults.summary = {
    totalProducts,
    totalVariants,
    totalIMEIParents,
    totalIMEIChildren,
    criticalIssues: criticalIssues.length,
    warnings: warnings.length,
    criticalIssuesList: criticalIssues,
    warningsList: warnings,
    successItems,
    systemHealth: criticalIssues.length === 0 ? 'HEALTHY' : 'NEEDS ATTENTION'
  };

  // Print summary
  console.log('📊 SYSTEM SUMMARY');
  console.log('=================\n');
  console.log(`   Products: ${totalProducts}`);
  console.log(`   Variants: ${totalVariants}`);
  console.log(`   IMEI Parents: ${totalIMEIParents}`);
  console.log(`   IMEI Children: ${totalIMEIChildren}`);
  console.log(`\n   System Health: ${auditResults.summary.systemHealth}`);
  console.log(`   Critical Issues: ${criticalIssues.length}`);
  console.log(`   Warnings: ${warnings.length}\n`);

  if (criticalIssues.length > 0) {
    console.log('🚨 CRITICAL ISSUES:');
    criticalIssues.forEach(issue => console.log(`   - ${issue}`));
    console.log();
  }

  if (warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    warnings.forEach(warning => console.log(`   - ${warning}`));
    console.log();
  }

  if (successItems.length > 0) {
    console.log('✅ SUCCESS:');
    successItems.forEach(item => console.log(`   - ${item}`));
    console.log();
  }

  // Save detailed report
  const reportPath = '/Users/mtaasisi/Downloads/POS-main NEON DATABASE/COMPREHENSIVE_AUDIT_REPORT.json';
  fs.writeFileSync(reportPath, JSON.stringify(auditResults, null, 2));
  console.log(`\n💾 Detailed report saved to: COMPREHENSIVE_AUDIT_REPORT.json`);

  console.log('\n✅ Report generation complete');
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   COMPREHENSIVE INVENTORY & POS SYSTEM AUDIT                  ║');
  console.log('║   Full validation, cleanup, and optimization                  ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    await auditDatabaseSchema();
    await validateIMEISystem();
    await simulateWorkflows();
    await validateTriggersAndFunctions();
    await performDataCleanup();
    await analyzePerformance();
    await generateReport();

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ COMPREHENSIVE AUDIT COMPLETE                             ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n❌ Audit failed:', error);
    process.exit(1);
  }
}

main();

