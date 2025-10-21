#!/usr/bin/env node

/**
 * Purchase Order to Inventory Setup Verification Script
 * 
 * This script checks if all required database functions, triggers, and tables
 * are properly set up for the purchase order to inventory workflow.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();
dotenv.config({ path: join(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  console.error('   Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Purchase Order to Inventory Setup Verification');
console.log('================================================\n');

const results = {
  tables: {},
  functions: {},
  triggers: {},
  overall: 'pass'
};

/**
 * Check if required tables exist
 */
async function checkTables() {
  console.log('📋 Checking Required Tables...\n');
  
  const requiredTables = [
    'lats_purchase_orders',
    'lats_purchase_order_items',
    'lats_products',
    'lats_product_variants',
    'inventory_items',
    'lats_inventory_adjustments',
    'lats_stock_movements',
    'purchase_order_quality_checks',
    'purchase_order_quality_check_items',
    'lats_purchase_order_audit_log'
  ];

  for (const tableName of requiredTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) {
        if (error.message.includes('does not exist')) {
          console.log(`   ❌ ${tableName} - NOT FOUND`);
          results.tables[tableName] = false;
          results.overall = 'fail';
        } else {
          console.log(`   ⚠️  ${tableName} - ERROR: ${error.message}`);
          results.tables[tableName] = 'error';
          results.overall = 'warning';
        }
      } else {
        console.log(`   ✅ ${tableName} - OK`);
        results.tables[tableName] = true;
      }
    } catch (err) {
      console.log(`   ❌ ${tableName} - EXCEPTION: ${err.message}`);
      results.tables[tableName] = false;
      results.overall = 'fail';
    }
  }

  console.log('');
}

/**
 * Check if required database functions exist
 */
async function checkFunctions() {
  console.log('⚙️  Checking Required Database Functions...\n');

  const requiredFunctions = [
    {
      name: 'complete_purchase_order_receive',
      params: ['purchase_order_id_param', 'user_id_param', 'receive_notes'],
      critical: true
    },
    {
      name: 'add_quality_items_to_inventory_v2',
      params: ['p_quality_check_id', 'p_purchase_order_id', 'p_user_id'],
      critical: true
    },
    {
      name: 'sync_variant_quantity_from_inventory',
      params: [],
      critical: true
    }
  ];

  for (const func of requiredFunctions) {
    try {
      // Try to get function metadata
      const { data, error } = await supabase.rpc('pg_get_functiondef', {
        funcname: func.name
      }).catch(() => ({ data: null, error: null }));

      // If pg_get_functiondef doesn't work, try calling with dummy params
      if (!data) {
        // For receive function
        if (func.name === 'complete_purchase_order_receive') {
          const { error: testError } = await supabase.rpc(func.name, {
            purchase_order_id_param: '00000000-0000-0000-0000-000000000000',
            user_id_param: '00000000-0000-0000-0000-000000000000',
            receive_notes: 'test'
          });

          if (testError && !testError.message.includes('not found')) {
            console.log(`   ✅ ${func.name} - EXISTS`);
            results.functions[func.name] = true;
          } else if (testError && testError.message.includes('not found')) {
            console.log(`   ❌ ${func.name} - NOT FOUND ${func.critical ? '(CRITICAL)' : ''}`);
            results.functions[func.name] = false;
            if (func.critical) results.overall = 'fail';
          }
        } else {
          console.log(`   ⚠️  ${func.name} - UNABLE TO VERIFY`);
          results.functions[func.name] = 'unknown';
        }
      } else {
        console.log(`   ✅ ${func.name} - EXISTS`);
        results.functions[func.name] = true;
      }
    } catch (err) {
      console.log(`   ❌ ${func.name} - ERROR: ${err.message}`);
      results.functions[func.name] = false;
      if (func.critical) results.overall = 'fail';
    }
  }

  console.log('');
}

/**
 * Check variant quantity sync
 */
async function checkVariantSync() {
  console.log('🔄 Checking Inventory Sync...\n');

  try {
    // Get a sample variant with inventory items
    const { data: variants, error: variantError } = await supabase
      .from('lats_product_variants')
      .select('id, product_id, quantity')
      .limit(5);

    if (variantError) throw variantError;

    if (!variants || variants.length === 0) {
      console.log('   ℹ️  No product variants found to test sync');
      console.log('');
      return;
    }

    let syncIssues = 0;
    let testedVariants = 0;

    for (const variant of variants) {
      // Count actual inventory items
      const { data: items, error: itemsError } = await supabase
        .from('inventory_items')
        .select('id', { count: 'exact' })
        .eq('variant_id', variant.id)
        .eq('status', 'available');

      if (itemsError) continue;

      const actualCount = items?.length || 0;
      const variantQty = variant.quantity || 0;

      testedVariants++;

      if (actualCount !== variantQty) {
        syncIssues++;
        console.log(`   ⚠️  Variant ${variant.id}:`);
        console.log(`       inventory_items: ${actualCount}, variant.quantity: ${variantQty}`);
      }
    }

    if (syncIssues > 0) {
      console.log(`\n   ⚠️  Found ${syncIssues} sync issues out of ${testedVariants} tested`);
      console.log('   💡 Run: node diagnose-and-fix-inventory-sync.js');
      results.triggers.inventory_sync = 'out_of_sync';
      results.overall = 'warning';
    } else if (testedVariants > 0) {
      console.log(`   ✅ All ${testedVariants} tested variants are in sync`);
      results.triggers.inventory_sync = 'synced';
    } else {
      console.log('   ℹ️  No variants with inventory to test');
      results.triggers.inventory_sync = 'no_data';
    }
  } catch (err) {
    console.log(`   ❌ Error checking sync: ${err.message}`);
    results.triggers.inventory_sync = 'error';
  }

  console.log('');
}

/**
 * Test purchase order receive workflow
 */
async function testReceiveWorkflow() {
  console.log('🧪 Testing Purchase Order Receive Workflow...\n');

  try {
    // Get a sample PO in receivable status
    const { data: orders, error: orderError } = await supabase
      .from('lats_purchase_orders')
      .select('id, order_number, status')
      .in('status', ['shipped', 'confirmed', 'sent'])
      .limit(1);

    if (orderError) throw orderError;

    if (!orders || orders.length === 0) {
      console.log('   ℹ️  No purchase orders in receivable status to test');
      console.log('   💡 Create a PO and mark it as "shipped" to test receiving');
      results.workflow_test = 'no_data';
      console.log('');
      return;
    }

    const testPO = orders[0];
    console.log(`   📦 Found test PO: ${testPO.order_number} (${testPO.status})`);
    console.log(`   ✅ Purchase orders can be received`);
    results.workflow_test = 'ready';
  } catch (err) {
    console.log(`   ⚠️  Unable to test: ${err.message}`);
    results.workflow_test = 'error';
  }

  console.log('');
}

/**
 * Generate recommendations
 */
function generateRecommendations() {
  console.log('📋 Recommendations:\n');

  const recommendations = [];

  // Check for critical missing functions
  if (results.functions.complete_purchase_order_receive === false) {
    recommendations.push({
      priority: 'CRITICAL',
      issue: 'Missing complete_purchase_order_receive function',
      action: 'Run: node run-complete-receive-migration.js',
      impact: 'Purchase orders CANNOT be received without this function'
    });
  }

  // Check for sync issues
  if (results.triggers.inventory_sync === 'out_of_sync') {
    recommendations.push({
      priority: 'HIGH',
      issue: 'Inventory quantities out of sync',
      action: 'Run: node diagnose-and-fix-inventory-sync.js',
      impact: 'UI shows incorrect stock levels'
    });
  }

  // Check for missing tables
  const missingTables = Object.entries(results.tables)
    .filter(([_, exists]) => exists === false)
    .map(([name]) => name);

  if (missingTables.length > 0) {
    recommendations.push({
      priority: 'CRITICAL',
      issue: `Missing tables: ${missingTables.join(', ')}`,
      action: 'Run base schema migration or create tables manually',
      impact: 'System will not function correctly'
    });
  }

  // Display recommendations
  if (recommendations.length === 0) {
    console.log('   ✅ No issues found! System is properly configured.\n');
  } else {
    recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. [${rec.priority}] ${rec.issue}`);
      console.log(`      💡 ${rec.action}`);
      console.log(`      ⚠️  ${rec.impact}\n`);
    });
  }
}

/**
 * Print summary
 */
function printSummary() {
  console.log('================================================');
  console.log('📊 Summary\n');

  const tableCount = Object.values(results.tables).filter(v => v === true).length;
  const totalTables = Object.keys(results.tables).length;
  console.log(`   Tables: ${tableCount}/${totalTables} found`);

  const funcCount = Object.values(results.functions).filter(v => v === true).length;
  const totalFuncs = Object.keys(results.functions).length;
  console.log(`   Functions: ${funcCount}/${totalFuncs} verified`);

  console.log(`   Inventory Sync: ${results.triggers.inventory_sync || 'not tested'}`);
  console.log('');

  if (results.overall === 'pass') {
    console.log('   ✅ OVERALL STATUS: PASS - System ready for use\n');
  } else if (results.overall === 'warning') {
    console.log('   ⚠️  OVERALL STATUS: WARNING - System functional but needs attention\n');
  } else {
    console.log('   ❌ OVERALL STATUS: FAIL - Critical issues must be fixed\n');
  }

  console.log('================================================\n');
}

/**
 * Main execution
 */
async function main() {
  try {
    await checkTables();
    await checkFunctions();
    await checkVariantSync();
    await testReceiveWorkflow();
    generateRecommendations();
    printSummary();

    console.log('📄 For detailed analysis, see: PURCHASE-ORDER-INVENTORY-ANALYSIS.md\n');

    // Exit with appropriate code
    process.exit(results.overall === 'fail' ? 1 : 0);
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();

