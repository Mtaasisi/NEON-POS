#!/usr/bin/env node

/**
 * 🔍 VERIFICATION: Check IMEI Numbers in Children Variants
 * =========================================================
 * 
 * This script verifies that IMEI numbers are properly stored
 * in children variants after receiving a purchase order.
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

// Parse Neon connection string for Supabase client
// Format: postgresql://user:pass@host/db
const url = new URL(DATABASE_URL);
const projectRef = url.hostname.split('.')[0].split('-').pop();

// For Neon, we need to use direct SQL approach
import postgres from 'postgres';
const sql = postgres(DATABASE_URL);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

async function main() {
  log('\n' + '═'.repeat(80), 'cyan');
  log('🔍 VERIFICATION: IMEI NUMBERS IN CHILDREN VARIANTS', 'cyan');
  log('═'.repeat(80) + '\n', 'cyan');
  
  try {
    // Check 1: Recent IMEI Variants
    log('📋 Check 1: Recently Created IMEI Variants\n', 'blue');
    
    const recentIMEIs = await sql`
      SELECT 
        pv.id,
        pv.name,
        pv.sku,
        pv.quantity,
        pv.parent_variant_id,
        pv.is_parent,
        pv.variant_attributes->>'imei' as imei,
        pv.variant_attributes->>'condition' as condition,
        pv.variant_attributes->>'source' as source,
        p.name as product_name,
        pv.created_at
      FROM lats_product_variants pv
      LEFT JOIN lats_products p ON p.id = pv.product_id
      WHERE pv.variant_attributes->>'imei' IS NOT NULL
        AND pv.created_at > NOW() - INTERVAL '24 hours'
      ORDER BY pv.created_at DESC
      LIMIT 20
    `;
    
    if (recentIMEIs.length === 0) {
      log('⚠️  No IMEI variants found in last 24 hours', 'yellow');
      log('   This might mean:\n', 'yellow');
      log('   - Purchase order not received yet', 'yellow');
      log('   - IMEI numbers not entered during receive', 'yellow');
      log('   - Database function not working\n', 'yellow');
    } else {
      log(`✅ Found ${recentIMEIs.length} IMEI variant(s):\n`, 'green');
      
      recentIMEIs.forEach((variant, idx) => {
        log(`${idx + 1}. ${variant.product_name} - ${variant.name}`, 'cyan');
        log(`   IMEI: ${variant.imei}`, 'green');
        log(`   SKU: ${variant.sku || 'N/A'}`);
        log(`   Quantity: ${variant.quantity}`);
        log(`   Condition: ${variant.condition || 'N/A'}`);
        log(`   Source: ${variant.source || 'N/A'}`);
        log(`   Is Parent: ${variant.is_parent ? 'Yes' : 'No'}`);
        log(`   Parent ID: ${variant.parent_variant_id || 'N/A'}`);
        log(`   Created: ${variant.created_at}\n`);
      });
    }
    
    // Check 2: Parent-Child Relationships
    log('📋 Check 2: Parent-Child Variant Relationships\n', 'blue');
    
    const parentChildPairs = await sql`
      SELECT 
        parent.id as parent_id,
        parent.name as parent_name,
        parent.quantity as parent_quantity,
        parent.is_parent,
        child.id as child_id,
        child.name as child_name,
        child.variant_attributes->>'imei' as child_imei,
        child.quantity as child_quantity,
        p.name as product_name
      FROM lats_product_variants parent
      LEFT JOIN lats_product_variants child ON child.parent_variant_id = parent.id
      LEFT JOIN lats_products p ON p.id = parent.product_id
      WHERE parent.is_parent = true
        AND child.variant_attributes->>'imei' IS NOT NULL
        AND parent.created_at > NOW() - INTERVAL '7 days'
      ORDER BY parent.created_at DESC
      LIMIT 50
    `;
    
    if (parentChildPairs.length === 0) {
      log('⚠️  No parent-child IMEI relationships found', 'yellow');
    } else {
      // Group by parent
      const grouped = parentChildPairs.reduce((acc, row) => {
        if (!acc[row.parent_id]) {
          acc[row.parent_id] = {
            parent: row,
            children: []
          };
        }
        acc[row.parent_id].children.push(row);
        return acc;
      }, {});
      
      log(`✅ Found ${Object.keys(grouped).length} parent variant(s) with IMEI children:\n`, 'green');
      
      Object.values(grouped).forEach((group, idx) => {
        const parent = group.parent;
        const children = group.children;
        
        log(`${idx + 1}. ${parent.product_name} - ${parent.parent_name}`, 'cyan');
        log(`   Parent ID: ${parent.parent_id}`);
        log(`   Parent Stock: ${parent.parent_quantity}`);
        log(`   Children with IMEI: ${children.length}\n`);
        
        children.forEach((child, cidx) => {
          log(`   └─ Child ${cidx + 1}: ${child.child_name}`);
          log(`      IMEI: ${child.child_imei}`, 'green');
          log(`      Quantity: ${child.child_quantity}\n`);
        });
      });
    }
    
    // Check 3: Stock Movement Records
    log('📋 Check 3: Recent Stock Movements for IMEI Variants\n', 'blue');
    
    const stockMovements = await sql`
      SELECT 
        sm.id,
        sm.movement_type,
        sm.quantity,
        sm.reference_type,
        sm.reference_id,
        sm.notes,
        sm.created_at,
        pv.variant_attributes->>'imei' as imei,
        p.name as product_name,
        pv.name as variant_name
      FROM lats_stock_movements sm
      LEFT JOIN lats_product_variants pv ON pv.id = sm.variant_id
      LEFT JOIN lats_products p ON p.id = sm.product_id
      WHERE pv.variant_attributes->>'imei' IS NOT NULL
        AND sm.created_at > NOW() - INTERVAL '24 hours'
      ORDER BY sm.created_at DESC
      LIMIT 20
    `;
    
    if (stockMovements.length === 0) {
      log('⚠️  No stock movements for IMEI variants found', 'yellow');
    } else {
      log(`✅ Found ${stockMovements.length} stock movement(s):\n`, 'green');
      
      stockMovements.forEach((movement, idx) => {
        log(`${idx + 1}. ${movement.product_name} - ${movement.variant_name}`, 'cyan');
        log(`   IMEI: ${movement.imei}`, 'green');
        log(`   Type: ${movement.movement_type}`);
        log(`   Quantity: ${movement.quantity > 0 ? '+' : ''}${movement.quantity}`);
        log(`   Reference: ${movement.reference_type || 'N/A'}`);
        log(`   Notes: ${movement.notes || 'N/A'}`);
        log(`   Created: ${movement.created_at}\n`);
      });
    }
    
    // Check 4: Database Function Exists
    log('📋 Check 4: Database Function Status\n', 'blue');
    
    const functions = await sql`
      SELECT routine_name, routine_type
      FROM information_schema.routines 
      WHERE routine_name LIKE '%imei%'
        OR routine_name LIKE '%variant%'
      ORDER BY routine_name
    `;
    
    if (functions.length === 0) {
      log('❌ No IMEI-related functions found', 'red');
      log('   Run: CRITICAL_FIX_RECEIVING_PO_IMEI.sql\n', 'yellow');
    } else {
      log(`✅ Found ${functions.length} related function(s):\n`, 'green');
      
      functions.forEach((func, idx) => {
        log(`${idx + 1}. ${func.routine_name} (${func.routine_type})`);
      });
      
      // Check for the key function
      const keyFunc = functions.find(f => f.routine_name === 'add_imei_to_parent_variant');
      if (keyFunc) {
        log(`\n✅ Key function 'add_imei_to_parent_variant' exists`, 'green');
      } else {
        log(`\n❌ Key function 'add_imei_to_parent_variant' is missing`, 'red');
        log('   Run: CRITICAL_FIX_RECEIVING_PO_IMEI.sql\n', 'yellow');
      }
    }
    
    // Summary
    log('\n' + '═'.repeat(80), 'cyan');
    log('📊 VERIFICATION SUMMARY', 'cyan');
    log('═'.repeat(80) + '\n', 'cyan');
    
    const summary = {
      imeiVariants: recentIMEIs.length,
      parentChildRelationships: Object.keys(
        parentChildPairs.reduce((acc, row) => ({ ...acc, [row.parent_id]: true }), {})
      ).length,
      stockMovements: stockMovements.length,
      databaseFunctions: functions.length,
      keyFunctionExists: functions.some(f => f.routine_name === 'add_imei_to_parent_variant')
    };
    
    log('Results:', 'blue');
    log(`  IMEI Variants (24h): ${summary.imeiVariants}`, 
      summary.imeiVariants > 0 ? 'green' : 'yellow');
    log(`  Parent-Child Pairs: ${summary.parentChildRelationships}`, 
      summary.parentChildRelationships > 0 ? 'green' : 'yellow');
    log(`  Stock Movements (24h): ${summary.stockMovements}`, 
      summary.stockMovements > 0 ? 'green' : 'yellow');
    log(`  Database Functions: ${summary.databaseFunctions}`, 
      summary.databaseFunctions > 0 ? 'green' : 'red');
    log(`  Key Function: ${summary.keyFunctionExists ? 'EXISTS' : 'MISSING'}`, 
      summary.keyFunctionExists ? 'green' : 'red');
    
    log('');
    
    if (summary.imeiVariants > 0 && summary.keyFunctionExists) {
      log('✅ SYSTEM IS WORKING CORRECTLY!', 'green');
      log('   IMEI variants are being created and stored properly.\n', 'green');
    } else if (summary.keyFunctionExists && summary.imeiVariants === 0) {
      log('⚠️  SYSTEM IS READY BUT NO RECENT DATA', 'yellow');
      log('   Database functions exist but no PO received yet.', 'yellow');
      log('   Action: Receive a purchase order with IMEI numbers.\n', 'yellow');
    } else if (!summary.keyFunctionExists) {
      log('❌ SYSTEM NOT READY', 'red');
      log('   Database function is missing.', 'red');
      log('   Action: Run CRITICAL_FIX_RECEIVING_PO_IMEI.sql\n', 'red');
    } else {
      log('⚠️  CHECK REQUIRED', 'yellow');
      log('   Review the details above.\n', 'yellow');
    }
    
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    console.error(error);
  } finally {
    await sql.end();
  }
  
  log('═'.repeat(80) + '\n', 'cyan');
}

main();

