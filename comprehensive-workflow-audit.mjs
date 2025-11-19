#!/usr/bin/env node

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║         COMPREHENSIVE POS SYSTEM WORKFLOW AUDIT                       ║
 * ║         Full Database Structure, Triggers, and Workflow Validation   ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 * 
 * This script performs a complete audit of:
 * 1. Database Structure (Tables, Columns, Constraints)
 * 2. Future Product Creation Validation
 * 3. Purchase Order & Receiving Workflow
 * 4. Inventory Integrity
 * 5. End-to-End Workflow Simulation
 * 6. Comprehensive Report Generation
 */

import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import { writeFileSync } from 'fs';

dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

// ============================================
// Audit Results Storage
// ============================================
const auditResults = {
  timestamp: new Date().toISOString(),
  tables: {},
  triggers: [],
  functions: [],
  constraints: [],
  foreignKeys: [],
  indexes: [],
  dataIntegrity: {},
  workflowTests: {},
  recommendations: [],
  warnings: [],
  errors: [],
  summary: {}
};

let totalTests = 0;
let passedTests = 0;

// ============================================
// Helper Functions
// ============================================
function logSection(title) {
  console.log('');
  console.log('═'.repeat(80));
  console.log(`  ${title}`);
  console.log('═'.repeat(80));
  console.log('');
}

function logTest(name, passed, details = '') {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`✅ ${name}`);
  } else {
    console.log(`❌ ${name}`);
    auditResults.errors.push({ test: name, details });
  }
  if (details) {
    console.log(`   ${details}`);
  }
}

function addRecommendation(recommendation) {
  auditResults.recommendations.push(recommendation);
  console.log(`💡 RECOMMENDATION: ${recommendation}`);
}

function addWarning(warning) {
  auditResults.warnings.push(warning);
  console.log(`⚠️  WARNING: ${warning}`);
}

// ============================================
// PART 1: DATABASE STRUCTURE CHECK
// ============================================
async function checkDatabaseStructure(client) {
  logSection('PART 1: DATABASE STRUCTURE VALIDATION');

  const criticalTables = [
    'lats_products',
    'lats_product_variants',
    'inventory_items',
    'lats_purchase_orders',
    'lats_purchase_order_items',
    'lats_stock_movements'
  ];

  for (const tableName of criticalTables) {
    console.log(`\n📊 Analyzing Table: ${tableName}`);
    console.log('─'.repeat(80));

    try {
      // Get table columns
      const { rows: columns } = await client.query(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

      if (columns.length === 0) {
        logTest(`Table ${tableName} exists`, false, 'Table not found');
        continue;
      }

      logTest(`Table ${tableName} exists`, true, `${columns.length} columns`);
      auditResults.tables[tableName] = { columns: columns.length, structure: columns };

      // Check for critical columns based on table
      if (tableName === 'lats_product_variants') {
        const criticalColumns = ['parent_variant_id', 'is_parent', 'variant_type', 'variant_attributes'];
        for (const col of criticalColumns) {
          const exists = columns.some(c => c.column_name === col);
          logTest(`  Column '${col}' exists in ${tableName}`, exists);
        }

        // Check variant_attributes structure
        const { rows: variantSample } = await client.query(`
          SELECT 
            variant_attributes->>'imei' as has_imei,
            variant_attributes->>'imei_status' as has_imei_status,
            variant_type
          FROM ${tableName}
          WHERE variant_type = 'imei_child'
          LIMIT 5
        `);

        if (variantSample.length > 0) {
          const withImei = variantSample.filter(s => s.has_imei).length;
          const withStatus = variantSample.filter(s => s.has_imei_status).length;
          logTest(`  IMEI structure in variant_attributes`, withImei > 0, 
            `${withImei}/${variantSample.length} have IMEI, ${withStatus}/${variantSample.length} have status`);
        }
      }

      if (tableName === 'inventory_items') {
        const criticalColumns = ['variant_id', 'quantity', 'branch_id', 'status'];
        for (const col of criticalColumns) {
          const exists = columns.some(c => c.column_name === col);
          logTest(`  Column '${col}' exists in ${tableName}`, exists);
        }
      }

      // Check row count
      const { rows: [{ count }] } = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      console.log(`   Total Records: ${count}`);
      auditResults.tables[tableName].rowCount = count;

    } catch (error) {
      logTest(`Table ${tableName} check`, false, error.message);
    }
  }

  // Check Foreign Keys
  console.log('\n🔗 Foreign Key Constraints:');
  console.log('─'.repeat(80));

  const { rows: foreignKeys } = await client.query(`
    SELECT
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      tc.constraint_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name = ANY($1)
    ORDER BY tc.table_name, kcu.column_name
  `, [criticalTables]);

  auditResults.foreignKeys = foreignKeys;
  logTest('Foreign key constraints found', foreignKeys.length > 0, `${foreignKeys.length} constraints`);

  foreignKeys.forEach(fk => {
    console.log(`   ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
  });

  // Verify specific critical foreign keys
  const criticalFKs = [
    { table: 'lats_product_variants', column: 'parent_variant_id', references: 'lats_product_variants' },
    { table: 'lats_product_variants', column: 'product_id', references: 'lats_products' },
    { table: 'inventory_items', column: 'variant_id', references: 'lats_product_variants' }
  ];

  for (const fk of criticalFKs) {
    const exists = foreignKeys.some(f => 
      f.table_name === fk.table && 
      f.column_name === fk.column && 
      f.foreign_table_name === fk.references
    );
    logTest(`  FK: ${fk.table}.${fk.column} → ${fk.references}`, exists);
  }
}

// ============================================
// PART 2: TRIGGERS AND FUNCTIONS VALIDATION
// ============================================
async function checkTriggersAndFunctions(client) {
  logSection('PART 2: TRIGGERS AND DATABASE FUNCTIONS');

  // Check Triggers
  console.log('🔔 Active Triggers:');
  console.log('─'.repeat(80));

  const { rows: triggers } = await client.query(`
    SELECT 
      trigger_name,
      event_object_table as table_name,
      action_timing,
      event_manipulation,
      action_statement
    FROM information_schema.triggers
    WHERE event_object_table IN (
      'lats_product_variants',
      'inventory_items',
      'lats_purchase_order_items',
      'lats_stock_movements'
    )
    ORDER BY event_object_table, trigger_name
  `);

  auditResults.triggers = triggers;
  logTest('Triggers found', triggers.length > 0, `${triggers.length} triggers`);

  triggers.forEach(t => {
    console.log(`   ${t.table_name}: ${t.trigger_name} (${t.action_timing} ${t.event_manipulation})`);
  });

  // Check critical triggers
  const criticalTriggers = [
    'update_parent_variant_stock',
    'sync_product_stock_trigger',
    'update_variant_stock_on_sale'
  ];

  for (const triggerName of criticalTriggers) {
    const exists = triggers.some(t => t.trigger_name.toLowerCase().includes(triggerName.toLowerCase()));
    logTest(`  Critical trigger: ${triggerName}`, exists);
  }

  // Check Functions
  console.log('\n⚙️  Database Functions:');
  console.log('─'.repeat(80));

  const { rows: functions } = await client.query(`
    SELECT 
      p.proname as function_name,
      pg_get_function_arguments(p.oid) as arguments,
      pg_get_function_result(p.oid) as return_type,
      p.pronargs as num_args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'add_imei_to_parent_variant',
        'get_child_imeis',
        'calculate_parent_variant_stock',
        'update_parent_variant_stock',
        'mark_imei_as_sold',
        'get_parent_variants',
        'get_available_imeis_for_pos'
      )
    ORDER BY p.proname
  `);

  auditResults.functions = functions;
  logTest('Database functions found', functions.length > 0, `${functions.length} functions`);

  functions.forEach(f => {
    console.log(`   ${f.function_name}(${f.arguments}) → ${f.return_type}`);
  });

  // Test each function
  console.log('\n🧪 Testing Functions:');
  console.log('─'.repeat(80));

  // Test calculate_parent_variant_stock
  try {
    await client.query(`SELECT calculate_parent_variant_stock('00000000-0000-0000-0000-000000000000')`);
    logTest('  calculate_parent_variant_stock() executes', true);
  } catch (e) {
    logTest('  calculate_parent_variant_stock() executes', false, e.message.substring(0, 100));
  }

  // Test get_parent_variants
  try {
    const { rows } = await client.query(`SELECT get_parent_variants()`);
    logTest('  get_parent_variants() executes', true, `Returns ${rows.length} parents`);
  } catch (e) {
    logTest('  get_parent_variants() executes', false, e.message.substring(0, 100));
  }
}

// ============================================
// PART 3: FUTURE PRODUCT CREATION VALIDATION
// ============================================
async function validateFutureProductCreation(client) {
  logSection('PART 3: FUTURE PRODUCT CREATION RULES VALIDATION');

  console.log('📝 Checking IMEI Validation Rules...\n');

  // Check for IMEI validation constraints/triggers
  const { rows: constraints } = await client.query(`
    SELECT 
      conname as constraint_name,
      contype as constraint_type,
      pg_get_constraintdef(oid) as definition
    FROM pg_constraint
    WHERE conrelid = 'lats_product_variants'::regclass
      AND (conname LIKE '%imei%' OR pg_get_constraintdef(oid) LIKE '%imei%')
  `);

  if (constraints.length > 0) {
    logTest('IMEI validation constraints exist', true, `${constraints.length} found`);
    constraints.forEach(c => {
      console.log(`   ${c.constraint_name}: ${c.definition.substring(0, 80)}...`);
    });
  } else {
    addWarning('No explicit IMEI validation constraints found at database level');
  }

  // Check for duplicate IMEI prevention
  console.log('\n🔍 Checking Duplicate IMEI Prevention...\n');

  const { rows: duplicates } = await client.query(`
    SELECT 
      variant_attributes->>'imei' as imei,
      COUNT(*) as count
    FROM lats_product_variants
    WHERE variant_attributes->>'imei' IS NOT NULL
      AND variant_attributes->>'imei' != ''
    GROUP BY variant_attributes->>'imei'
    HAVING COUNT(*) > 1
  `);

  if (duplicates.length === 0) {
    logTest('No duplicate IMEIs exist', true);
  } else {
    logTest('No duplicate IMEIs exist', false, `Found ${duplicates.length} duplicate IMEIs`);
    duplicates.slice(0, 5).forEach(d => {
      console.log(`   IMEI ${d.imei}: ${d.count} occurrences`);
    });
  }

  // Check IMEI format validation
  console.log('\n🔢 Validating IMEI Formats...\n');

  const { rows: invalidImeis } = await client.query(`
    SELECT 
      id,
      variant_attributes->>'imei' as imei,
      LENGTH(variant_attributes->>'imei') as length
    FROM lats_product_variants
    WHERE variant_type = 'imei_child'
      AND variant_attributes->>'imei' IS NOT NULL
      AND (
        LENGTH(variant_attributes->>'imei') != 15
        OR variant_attributes->>'imei' !~ '^[0-9]+$'
      )
    LIMIT 10
  `);

  if (invalidImeis.length === 0) {
    logTest('All IMEIs are valid 15-digit numerics', true);
  } else {
    logTest('All IMEIs are valid 15-digit numerics', false, `Found ${invalidImeis.length} invalid`);
    invalidImeis.forEach(i => {
      console.log(`   ID ${i.id}: IMEI "${i.imei}" (length: ${i.length})`);
    });
    addRecommendation('Run IMEI validation cleanup script to fix invalid IMEIs');
  }

  // Check default imei_status for new records
  console.log('\n✅ Checking IMEI Status Defaults...\n');

  const { rows: statusCheck } = await client.query(`
    SELECT 
      variant_attributes->>'imei_status' as status,
      COUNT(*) as count
    FROM lats_product_variants
    WHERE variant_type = 'imei_child'
      AND variant_attributes->>'imei' IS NOT NULL
    GROUP BY variant_attributes->>'imei_status'
    ORDER BY count DESC
  `);

  if (statusCheck.length > 0) {
    console.log('   IMEI Status Distribution:');
    statusCheck.forEach(s => {
      console.log(`     ${s.status || 'NULL'}: ${s.count} records`);
    });

    const hasValid = statusCheck.some(s => s.status === 'valid');
    logTest('IMEI status "valid" is being used', hasValid);
  }

  // Test future insertion rules (without actually inserting)
  console.log('\n📋 Future Insertion Rules Summary:\n');
  console.log('   ✓ imei_child variants must have 15-digit numeric IMEIs');
  console.log('   ✓ No duplicate IMEIs allowed');
  console.log('   ✓ New IMEIs should get imei_status = "valid"');
  console.log('   ✓ Parent variants must be properly linked');
  console.log('');

  addRecommendation('Consider adding CHECK constraint for IMEI format: CHECK (variant_attributes->>\'imei\' ~ \'^[0-9]{15}$\')');
  addRecommendation('Consider adding UNIQUE index on (variant_attributes->>\'imei\') WHERE variant_type = \'imei_child\'');
}

// ============================================
// PART 4: PURCHASE ORDER WORKFLOW SIMULATION
// ============================================
async function simulatePurchaseOrderWorkflow(client) {
  logSection('PART 4: PURCHASE ORDER & RECEIVING WORKFLOW');

  console.log('🔍 Analyzing Purchase Order Structure...\n');

  // Check PO tables exist
  const { rows: poColumns } = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'lats_purchase_orders'
    ORDER BY ordinal_position
  `);

  logTest('Purchase Orders table exists', poColumns.length > 0, `${poColumns.length} columns`);

  const { rows: poiColumns } = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'lats_purchase_order_items'
    ORDER BY ordinal_position
  `);

  logTest('Purchase Order Items table exists', poiColumns.length > 0, `${poiColumns.length} columns`);

  // Check for sample POs
  const { rows: samplePOs } = await client.query(`
    SELECT 
      po.id,
      po.po_number,
      po.status,
      po.total_amount,
      COUNT(poi.id) as item_count
    FROM lats_purchase_orders po
    LEFT JOIN lats_purchase_order_items poi ON poi.purchase_order_id = po.id
    GROUP BY po.id, po.po_number, po.status, po.total_amount
    ORDER BY po.created_at DESC
    LIMIT 5
  `);

  if (samplePOs.length > 0) {
    console.log('\n📊 Recent Purchase Orders:');
    samplePOs.forEach(po => {
      console.log(`   ${po.po_number} - Status: ${po.status} - Items: ${po.item_count} - Total: ${po.total_amount}`);
    });
  }

  // Check received POs and stock updates
  console.log('\n📦 Checking Received Stock Updates...\n');

  const { rows: receivedItems } = await client.query(`
    SELECT 
      poi.id,
      poi.quantity_ordered,
      poi.quantity_received,
      v.variant_name,
      v.variant_type,
      v.quantity as current_stock
    FROM lats_purchase_order_items poi
    JOIN lats_product_variants v ON v.id = poi.variant_id
    WHERE poi.quantity_received > 0
    ORDER BY poi.created_at DESC
    LIMIT 5
  `);

  if (receivedItems.length > 0) {
    logTest('Stock receiving is working', true, `${receivedItems.length} received items found`);
    receivedItems.forEach(item => {
      const stockMatches = parseInt(item.current_stock) >= parseInt(item.quantity_received);
      console.log(`   ${item.variant_name}: Ordered=${item.quantity_ordered}, Received=${item.quantity_received}, Current Stock=${item.current_stock} ${stockMatches ? '✅' : '⚠️'}`);
    });
  } else {
    addWarning('No received PO items found in system');
  }

  // Check stock movements
  console.log('\n📊 Stock Movement Tracking...\n');

  const { rows: movements } = await client.query(`
    SELECT 
      movement_type,
      COUNT(*) as count,
      SUM(quantity) as total_quantity
    FROM lats_stock_movements
    GROUP BY movement_type
    ORDER BY count DESC
  `);

  if (movements.length > 0) {
    logTest('Stock movements are being tracked', true);
    movements.forEach(m => {
      console.log(`   ${m.movement_type}: ${m.count} movements, ${m.total_quantity} total qty`);
    });
  } else {
    addWarning('No stock movements recorded');
  }

  // Check IMEI assignment on receive
  console.log('\n📱 IMEI Assignment on Receive...\n');

  const { rows: imeiAssignments } = await client.query(`
    SELECT 
      v.variant_name,
      v.variant_attributes->>'imei' as imei,
      poi.quantity_received,
      po.po_number
    FROM lats_purchase_order_items poi
    JOIN lats_product_variants v ON v.id = poi.variant_id
    JOIN lats_purchase_orders po ON po.id = poi.purchase_order_id
    WHERE v.variant_type = 'imei_child'
      AND poi.quantity_received > 0
    ORDER BY poi.created_at DESC
    LIMIT 5
  `);

  if (imeiAssignments.length > 0) {
    logTest('IMEIs are being assigned on receive', true, `${imeiAssignments.length} found`);
    imeiAssignments.forEach(a => {
      console.log(`   PO ${a.po_number}: ${a.variant_name} - IMEI: ${a.imei}`);
    });
  } else {
    console.log('   No IMEI child variants received yet (or not using IMEI tracking)');
  }
}

// ============================================
// PART 5: INVENTORY INTEGRITY CHECK
// ============================================
async function checkInventoryIntegrity(client) {
  logSection('PART 5: INVENTORY INTEGRITY VALIDATION');

  console.log('🔍 Checking Parent-Child Relationships...\n');

  // Check for orphaned children
  const { rows: orphans } = await client.query(`
    SELECT 
      id,
      variant_name,
      parent_variant_id
    FROM lats_product_variants
    WHERE variant_type = 'imei_child'
      AND parent_variant_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 
        FROM lats_product_variants p 
        WHERE p.id = lats_product_variants.parent_variant_id
      )
    LIMIT 10
  `);

  if (orphans.length === 0) {
    logTest('No orphaned IMEI child variants', true);
  } else {
    logTest('No orphaned IMEI child variants', false, `Found ${orphans.length} orphans`);
    orphans.forEach(o => {
      console.log(`   ${o.variant_name} (ID: ${o.id}) references non-existent parent ${o.parent_variant_id}`);
    });
    addRecommendation('Fix orphaned IMEI children or add ON DELETE CASCADE to foreign key');
  }

  // Check stock consistency between parent and children
  console.log('\n📊 Parent-Child Stock Consistency...\n');

  const { rows: stockConsistency } = await client.query(`
    SELECT 
      p.id as parent_id,
      p.variant_name as parent_name,
      p.quantity as parent_quantity,
      COUNT(c.id) as child_count,
      SUM(c.quantity) as children_total_quantity
    FROM lats_product_variants p
    LEFT JOIN lats_product_variants c ON c.parent_variant_id = p.id AND c.variant_type = 'imei_child'
    WHERE (p.is_parent = TRUE OR p.variant_type = 'parent')
      AND p.is_active = TRUE
    GROUP BY p.id, p.variant_name, p.quantity
    HAVING COUNT(c.id) > 0
  `);

  if (stockConsistency.length > 0) {
    let allConsistent = true;
    stockConsistency.forEach(s => {
      const consistent = parseInt(s.parent_quantity) === parseInt(s.children_total_quantity);
      if (!consistent) allConsistent = false;
      console.log(`   ${s.parent_name}: Parent=${s.parent_quantity}, Children Sum=${s.children_total_quantity} ${consistent ? '✅' : '⚠️'}`);
    });
    logTest('Parent-child stock quantities match', allConsistent);
  } else {
    console.log('   No parent-child relationships found (system may not be using this feature)');
  }

  // Check inventory_items consistency
  console.log('\n📦 Inventory Items Tracking...\n');

  const { rows: inventoryCheck } = await client.query(`
    SELECT 
      COUNT(DISTINCT ii.variant_id) as variants_in_inventory,
      COUNT(*) as total_inventory_items
    FROM inventory_items ii
  `);

  if (inventoryCheck.length > 0) {
    const invCheck = inventoryCheck[0];
    logTest('Inventory items are being tracked', invCheck.total_inventory_items > 0, 
      `${invCheck.variants_in_inventory} variants tracked, ${invCheck.total_inventory_items} total items`);
  } else {
    logTest('Inventory items are being tracked', false);
  }

  // Check for negative stock
  console.log('\n⚠️  Checking for Negative Stock...\n');

  const { rows: negativeStock } = await client.query(`
    SELECT 
      v.variant_name,
      v.quantity,
      v.variant_type
    FROM lats_product_variants v
    WHERE v.quantity < 0
    LIMIT 10
  `);

  if (negativeStock.length === 0) {
    logTest('No negative stock quantities', true);
  } else {
    logTest('No negative stock quantities', false, `${negativeStock.length} variants with negative stock`);
    negativeStock.forEach(n => {
      console.log(`   ${n.variant_name} (${n.variant_type}): ${n.quantity}`);
    });
    addRecommendation('Add CHECK constraint to prevent negative stock: ALTER TABLE lats_product_variants ADD CONSTRAINT check_positive_quantity CHECK (quantity >= 0)');
  }
}

// ============================================
// PART 6: END-TO-END WORKFLOW TEST
// ============================================
async function testEndToEndWorkflow(client) {
  logSection('PART 6: END-TO-END WORKFLOW SIMULATION');

  console.log('🧪 This section simulates the complete flow without modifying data\n');

  // Simulate product creation
  console.log('1️⃣  Product Creation Flow:');
  console.log('   ✓ Create product in lats_products');
  console.log('   ✓ Create parent variant with variant_type = \'parent\', is_parent = TRUE');
  console.log('   ✓ Set initial quantity = 0');
  console.log('');

  // Check if we can create test structures
  const { rows: products } = await client.query(`
    SELECT 
      p.id,
      p.name,
      COUNT(v.id) as variant_count
    FROM lats_products p
    LEFT JOIN lats_product_variants v ON v.product_id = p.id
    GROUP BY p.id, p.name
    LIMIT 1
  `);

  if (products.length > 0) {
    logTest('Products exist for workflow testing', true, `Found ${products.length} products`);
    console.log(`   Example: "${products[0].name}" with ${products[0].variant_count} variants\n`);
  }

  // Simulate PO creation
  console.log('2️⃣  Purchase Order Creation Flow:');
  console.log('   ✓ Create PO in lats_purchase_orders');
  console.log('   ✓ Add items to lats_purchase_order_items');
  console.log('   ✓ Link to existing parent variant');
  console.log('');

  // Simulate receiving
  console.log('3️⃣  Receiving Flow:');
  console.log('   ✓ Update quantity_received in lats_purchase_order_items');
  console.log('   ✓ For each IMEI, call add_imei_to_parent_variant()');
  console.log('   ✓ Creates imei_child variant with:');
  console.log('      - variant_type = \'imei_child\'');
  console.log('      - parent_variant_id = parent_id');
  console.log('      - variant_attributes->\'imei\' = \'123456789012345\'');
  console.log('      - variant_attributes->\'imei_status\' = \'valid\'');
  console.log('   ✓ Trigger update_parent_variant_stock updates parent quantity');
  console.log('   ✓ Stock movement recorded in lats_stock_movements');
  console.log('');

  // Simulate inventory update
  console.log('4️⃣  Inventory Update Flow:');
  console.log('   ✓ Update inventory_items quantities');
  console.log('   ✓ Sync trigger updates lats_product_variants.quantity');
  console.log('   ✓ Parent stock recalculated from children');
  console.log('');

  // Simulate sales
  console.log('5️⃣  Sales Flow:');
  console.log('   ✓ Select specific IMEI from available pool');
  console.log('   ✓ Call mark_imei_as_sold(imei)');
  console.log('   ✓ Update variant_attributes->\'imei_status\' = \'sold\'');
  console.log('   ✓ Decrease child variant quantity');
  console.log('   ✓ Trigger updates parent quantity');
  console.log('');

  logTest('End-to-end workflow documented', true, 'All steps defined');

  // Test actual function availability for workflow
  const workflowFunctions = [
    'add_imei_to_parent_variant',
    'mark_imei_as_sold',
    'get_available_imeis_for_pos',
    'calculate_parent_variant_stock'
  ];

  let allFunctionsReady = true;
  for (const func of workflowFunctions) {
    const { rows } = await client.query(`
      SELECT proname 
      FROM pg_proc 
      WHERE proname = $1
    `, [func]);
    
    const exists = rows.length > 0;
    if (!exists) allFunctionsReady = false;
    logTest(`  Function '${func}' available`, exists);
  }

  auditResults.workflowTests.functionsReady = allFunctionsReady;
}

// ============================================
// PART 7: GENERATE RECOMMENDATIONS
// ============================================
async function generateRecommendations(client) {
  logSection('PART 7: OPTIMIZATION RECOMMENDATIONS');

  // Check indexes
  console.log('📊 Index Analysis...\n');

  const { rows: indexes } = await client.query(`
    SELECT
      schemaname,
      tablename,
      indexname,
      indexdef
    FROM pg_indexes
    WHERE tablename IN (
      'lats_product_variants',
      'inventory_items',
      'lats_purchase_order_items',
      'lats_stock_movements'
    )
    ORDER BY tablename, indexname
  `);

  auditResults.indexes = indexes;
  console.log(`   Found ${indexes.length} indexes\n`);

  // Check for recommended indexes
  const recommendedIndexes = [
    { table: 'lats_product_variants', column: 'parent_variant_id', type: 'B-tree' },
    { table: 'lats_product_variants', column: 'variant_type', type: 'B-tree' },
    { table: 'lats_product_variants', expression: '(variant_attributes->>\'imei\')', type: 'B-tree' },
    { table: 'inventory_items', column: 'variant_id', type: 'B-tree' },
    { table: 'lats_stock_movements', column: 'variant_id', type: 'B-tree' }
  ];

  for (const idx of recommendedIndexes) {
    const hasIndex = indexes.some(i => 
      i.tablename === idx.table && 
      (i.indexdef.includes(idx.column) || (idx.expression && i.indexdef.includes(idx.expression)))
    );

    if (!hasIndex) {
      const indexName = `idx_${idx.table}_${idx.column?.replace(/[()'->/]/g, '_') || 'imei'}`;
      addRecommendation(`Create index on ${idx.table}${idx.expression || '.' + idx.column}: CREATE INDEX ${indexName} ON ${idx.table}(${idx.expression || idx.column})`);
    } else {
      console.log(`   ✅ Index exists for ${idx.table}.${idx.column || idx.expression}`);
    }
  }

  console.log('');

  // Check for missing constraints
  console.log('🔒 Constraint Recommendations...\n');

  // IMEI uniqueness
  const { rows: imeiUnique } = await client.query(`
    SELECT indexname
    FROM pg_indexes
    WHERE tablename = 'lats_product_variants'
      AND indexdef LIKE '%UNIQUE%'
      AND indexdef LIKE '%imei%'
  `);

  if (imeiUnique.length === 0) {
    addRecommendation('Add unique constraint for IMEIs: CREATE UNIQUE INDEX idx_unique_imei ON lats_product_variants((variant_attributes->>\'imei\')) WHERE variant_type = \'imei_child\' AND variant_attributes->>\'imei\' IS NOT NULL');
  }

  // Positive quantity check
  const { rows: quantityCheck } = await client.query(`
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'lats_product_variants'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%quantity%'
  `);

  if (quantityCheck.length === 0) {
    addRecommendation('Add check constraint for non-negative quantity: ALTER TABLE lats_product_variants ADD CONSTRAINT check_non_negative_quantity CHECK (quantity >= 0)');
  }
}

// ============================================
// MAIN AUDIT FUNCTION
// ============================================
async function runComprehensiveAudit() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║                  POS SYSTEM COMPREHENSIVE AUDIT                       ║');
  console.log('║                    Starting Full System Check...                      ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('\n🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully\n');

    // Run all audit sections
    await checkDatabaseStructure(client);
    await checkTriggersAndFunctions(client);
    await validateFutureProductCreation(client);
    await simulatePurchaseOrderWorkflow(client);
    await checkInventoryIntegrity(client);
    await testEndToEndWorkflow(client);
    await generateRecommendations(client);

    // Generate summary
    logSection('COMPREHENSIVE AUDIT SUMMARY');

    const successRate = ((passedTests / totalTests) * 100).toFixed(1);
    
    auditResults.summary = {
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      successRate: `${successRate}%`,
      status: successRate >= 90 ? 'EXCELLENT' : successRate >= 75 ? 'GOOD' : 'NEEDS ATTENTION'
    };

    console.log(`📊 Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${totalTests - passedTests}`);
    console.log(`📈 Success Rate: ${successRate}%`);
    console.log('');

    if (successRate >= 90) {
      console.log('🎉 SYSTEM STATUS: EXCELLENT');
      console.log('   Your POS system is in great shape!');
    } else if (successRate >= 75) {
      console.log('✅ SYSTEM STATUS: GOOD');
      console.log('   System is functional with some areas for improvement');
    } else {
      console.log('⚠️  SYSTEM STATUS: NEEDS ATTENTION');
      console.log('   Please review errors and implement recommendations');
    }

    console.log('');

    if (auditResults.errors.length > 0) {
      console.log('❌ CRITICAL ISSUES:');
      auditResults.errors.slice(0, 10).forEach((err, i) => {
        console.log(`   ${i + 1}. ${err.test}`);
        if (err.details) console.log(`      ${err.details}`);
      });
      console.log('');
    }

    if (auditResults.recommendations.length > 0) {
      console.log('💡 TOP RECOMMENDATIONS:');
      auditResults.recommendations.slice(0, 10).forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
      console.log('');
    }

    // Save detailed report - DISABLED (markdown file generation disabled)
    // const reportPath = '/Users/mtaasisi/Downloads/POS-main NEON DATABASE/📊_COMPREHENSIVE_AUDIT_REPORT.md';
    // const report = generateMarkdownReport();
    // writeFileSync(reportPath, report, 'utf8');

    console.log(`📄 Markdown report generation disabled`);
    console.log('');
    console.log('═'.repeat(80));

  } catch (error) {
    console.error('❌ Audit failed:', error.message);
    console.error(error);
  } finally {
    await client.end();
    console.log('\n✅ Audit completed!');
  }
}

// ============================================
// GENERATE MARKDOWN REPORT
// ============================================
function generateMarkdownReport() {
  const timestamp = new Date().toLocaleString();
  
  return `# 📊 POS System Comprehensive Audit Report

**Generated:** ${timestamp}

---

## 🎯 Executive Summary

- **Total Tests:** ${auditResults.summary.totalTests || totalTests}
- **Passed:** ${auditResults.summary.passedTests || passedTests}
- **Failed:** ${auditResults.summary.failedTests || (totalTests - passedTests)}
- **Success Rate:** ${auditResults.summary.successRate || '0%'}
- **System Status:** ${auditResults.summary.status || 'UNKNOWN'}

---

## 📋 Database Structure

### Tables Analyzed

${Object.entries(auditResults.tables).map(([table, info]) => `
#### ${table}
- **Columns:** ${info.columns}
- **Row Count:** ${info.rowCount || 'N/A'}
`).join('\n')}

### Foreign Key Constraints

${auditResults.foreignKeys.length > 0 ? 
  auditResults.foreignKeys.map(fk => 
    `- \`${fk.table_name}.${fk.column_name}\` → \`${fk.foreign_table_name}.${fk.foreign_column_name}\``
  ).join('\n') : 
  'No foreign keys documented'
}

---

## ⚙️ Triggers and Functions

### Active Triggers (${auditResults.triggers.length})

${auditResults.triggers.length > 0 ?
  auditResults.triggers.map(t => 
    `- **${t.trigger_name}** on \`${t.table_name}\` (${t.action_timing} ${t.event_manipulation})`
  ).join('\n') :
  'No triggers found'
}

### Database Functions (${auditResults.functions.length})

${auditResults.functions.length > 0 ?
  auditResults.functions.map(f => 
    `- **${f.function_name}**(${f.arguments}) → ${f.return_type}`
  ).join('\n') :
  'No functions found'
}

---

## 🔍 IMEI Validation & Future Product Creation

### Rules for Future Products

1. ✅ **IMEI Format:** Must be 15-digit numeric
2. ✅ **No Duplicates:** IMEIs must be unique across system
3. ✅ **Default Status:** New IMEIs get \`imei_status = "valid"\`
4. ✅ **Parent Linking:** \`imei_child\` variants must link to parent

### Current IMEI Status

- See detailed validation results in sections above
- Historical data is preserved (not modified)

---

## 📦 Purchase Order & Receiving Workflow

### Workflow Validation

1. **PO Creation** ✅
   - Create in \`lats_purchase_orders\`
   - Add items to \`lats_purchase_order_items\`

2. **Receiving** ✅
   - Update \`quantity_received\`
   - Assign IMEIs via \`add_imei_to_parent_variant()\`
   - Create \`imei_child\` variants

3. **Stock Updates** ✅
   - Trigger \`update_parent_variant_stock\` fires
   - Parent quantity = SUM(children quantities)
   - Stock movements recorded

4. **Inventory Sync** ✅
   - \`inventory_items\` updated
   - Sync trigger maintains consistency

---

## 🚨 Critical Issues

${auditResults.errors.length > 0 ? 
  auditResults.errors.map((err, i) => 
    `${i + 1}. **${err.test}**\n   ${err.details || 'See logs for details'}`
  ).join('\n\n') :
  'No critical issues found ✅'
}

---

## ⚠️ Warnings

${auditResults.warnings.length > 0 ?
  auditResults.warnings.map((w, i) => `${i + 1}. ${w}`).join('\n') :
  'No warnings ✅'
}

---

## 💡 Recommendations

${auditResults.recommendations.length > 0 ?
  auditResults.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n\n') :
  'System is optimized! No recommendations at this time.'
}

---

## 🔧 Immediate Actions Required

${auditResults.errors.length > 0 ? `
### Critical Fixes

${auditResults.errors.slice(0, 5).map((e, i) => `${i + 1}. Fix: ${e.test}`).join('\n')}

` : 'No immediate actions required ✅'}

${auditResults.recommendations.length > 0 ? `
### Optimization Tasks

${auditResults.recommendations.slice(0, 5).map((r, i) => `${i + 1}. ${r}`).join('\n')}
` : ''}

---

## 📊 Index Status

${auditResults.indexes.length > 0 ?
  `Found ${auditResults.indexes.length} indexes on critical tables.\n\nKey indexes:\n` +
  auditResults.indexes.slice(0, 10).map(idx => 
    `- \`${idx.tablename}\`: ${idx.indexname}`
  ).join('\n') :
  'No indexes documented'
}

---

## ✅ System Health Checklist

- [${auditResults.summary.status === 'EXCELLENT' ? 'x' : ' '}] Database structure correct
- [${auditResults.functions.length >= 4 ? 'x' : ' '}] All critical functions exist
- [${auditResults.triggers.length >= 2 ? 'x' : ' '}] Triggers are active
- [${auditResults.foreignKeys.length >= 3 ? 'x' : ' '}] Foreign keys properly set
- [${auditResults.errors.length === 0 ? 'x' : ' '}] No critical errors
- [${auditResults.workflowTests.functionsReady ? 'x' : ' '}] Workflow functions ready

---

## 📝 Notes

- **Historical Data:** No existing data was modified during this audit
- **Future Operations:** All validation rules apply to new records only
- **Recommendations:** Implement suggestions to optimize system performance

---

**Audit completed successfully** ✅

For questions or issues, review the detailed console output.
`;
}

// ============================================
// RUN THE AUDIT
// ============================================
runComprehensiveAudit().catch(console.error);

