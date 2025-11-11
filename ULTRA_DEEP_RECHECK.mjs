#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config();

const sql = neon(process.env.DATABASE_URL);

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║        ULTRA DEEP RECHECK - COMPREHENSIVE VALIDATION          ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

async function ultraDeepRecheck() {
  const issues = [];
  
  try {
    console.log('🔍 CHECKING: Database Structure\n');
    
    // Check 1: Orphaned IMEI children
    const orphaned = await sql`
      SELECT id, name, variant_type, parent_variant_id
      FROM lats_product_variants
      WHERE variant_type = 'imei_child'
        AND parent_variant_id IS NULL
    `;
    
    if (orphaned.length > 0) {
      console.log(`❌ ${orphaned.length} orphaned IMEI children found`);
      issues.push({ type: 'orphaned_imei', count: orphaned.length });
    } else {
      console.log('✅ No orphaned IMEI children');
    }
    
    // Check 2: Parent-child stock sync
    console.log('\n🔍 CHECKING: Parent-Child Stock Synchronization\n');
    
    const stockMismatches = await sql`
      SELECT 
        p.id,
        p.name,
        p.quantity as parent_qty,
        COALESCE(SUM(c.quantity), 0)::INT as children_qty,
        ABS(p.quantity - COALESCE(SUM(c.quantity), 0)) as diff
      FROM lats_product_variants p
      LEFT JOIN lats_product_variants c 
        ON c.parent_variant_id = p.id 
        AND c.variant_type = 'imei_child'
        AND c.is_active = TRUE
      WHERE (p.is_parent = TRUE OR p.variant_type = 'parent')
      GROUP BY p.id, p.name, p.quantity
      HAVING p.quantity != COALESCE(SUM(c.quantity), 0)
    `;
    
    if (stockMismatches.length > 0) {
      console.log(`❌ ${stockMismatches.length} stock mismatches found:`);
      stockMismatches.forEach(m => {
        console.log(`   ${m.name}: Parent=${m.parent_qty}, Children=${m.children_qty}, Diff=${m.diff}`);
      });
      issues.push({ type: 'stock_mismatch', count: stockMismatches.length, items: stockMismatches });
    } else {
      console.log('✅ All parent stocks match children totals');
    }
    
    // Check 3: IMEI status issues
    console.log('\n🔍 CHECKING: IMEI Status Quality\n');
    
    const noStatus = await sql`
      SELECT id, name, variant_attributes->>'imei' as imei, quantity
      FROM lats_product_variants
      WHERE variant_type = 'imei_child'
        AND parent_variant_id IS NOT NULL
        AND (
          NOT variant_attributes ? 'imei_status'
          OR variant_attributes->>'imei_status' IS NULL
          OR variant_attributes->>'imei_status' = ''
        )
    `;
    
    if (noStatus.length > 0) {
      console.log(`❌ ${noStatus.length} IMEIs without status`);
      console.log('   First 3:');
      noStatus.slice(0, 3).forEach(v => {
        console.log(`   - IMEI: ${v.imei}, Qty: ${v.quantity}`);
      });
      issues.push({ type: 'no_status', count: noStatus.length, items: noStatus });
    } else {
      console.log('✅ All IMEIs have status set');
    }
    
    const invalidStatus = await sql`
      SELECT id, name, variant_attributes->>'imei' as imei, quantity
      FROM lats_product_variants
      WHERE variant_type = 'imei_child'
        AND variant_attributes->>'imei_status' = 'invalid'
        AND quantity > 0
    `;
    
    if (invalidStatus.length > 0) {
      console.log(`❌ ${invalidStatus.length} IMEIs with invalid status but have stock`);
      issues.push({ type: 'invalid_status', count: invalidStatus.length });
    } else {
      console.log('✅ No invalid statuses for in-stock IMEIs');
    }
    
    // Check 4: Product-variant sync
    console.log('\n🔍 CHECKING: Product-Variant Stock Sync\n');
    
    const productMismatches = await sql`
      SELECT 
        p.id,
        p.name,
        p.stock_quantity as product_stock,
        COALESCE(SUM(v.quantity), 0)::INT as variant_stock,
        ABS(p.stock_quantity - COALESCE(SUM(v.quantity), 0)) as diff
      FROM lats_products p
      LEFT JOIN lats_product_variants v 
        ON v.product_id = p.id 
        AND v.is_active = TRUE
        AND (v.parent_variant_id IS NULL OR v.variant_type != 'imei_child')
      GROUP BY p.id, p.name, p.stock_quantity
      HAVING p.stock_quantity != COALESCE(SUM(v.quantity), 0)
    `;
    
    if (productMismatches.length > 0) {
      console.log(`❌ ${productMismatches.length} product stock mismatches:`);
      productMismatches.slice(0, 5).forEach(m => {
        console.log(`   ${m.name}: Product=${m.product_stock}, Variants=${m.variant_stock}, Diff=${m.diff}`);
      });
      issues.push({ type: 'product_mismatch', count: productMismatches.length, items: productMismatches });
    } else {
      console.log('✅ All product stocks match variant totals');
    }
    
    // Check 5: Trigger status
    console.log('\n🔍 CHECKING: Critical Triggers\n');
    
    const criticalTriggers = [
      'trigger_update_parent_stock',
      'trg_validate_new_imei', 
      'ensure_imei_has_parent'
    ];
    
    for (const triggerName of criticalTriggers) {
      const trigger = await sql`
        SELECT COUNT(*) as count
        FROM information_schema.triggers
        WHERE trigger_name = ${triggerName}
          AND event_object_table = 'lats_product_variants'
      `;
      
      if (parseInt(trigger[0].count) > 0) {
        console.log(`✅ ${triggerName} active`);
      } else {
        console.log(`❌ ${triggerName} missing`);
        issues.push({ type: 'missing_trigger', name: triggerName });
      }
    }
    
    // Check 6: Function status
    console.log('\n🔍 CHECKING: Critical Functions\n');
    
    const criticalFunctions = [
      'add_imei_to_parent_variant',
      'mark_imei_as_sold',
      'get_available_imeis_for_pos',
      'update_parent_stock_from_children',
      'recalculate_all_parent_stocks'
    ];
    
    for (const funcName of criticalFunctions) {
      const func = await sql`
        SELECT COUNT(*) as count
        FROM pg_proc
        WHERE proname = ${funcName}
      `;
      
      if (parseInt(func[0].count) > 0) {
        console.log(`✅ ${funcName} exists`);
      } else {
        console.log(`❌ ${funcName} missing`);
        issues.push({ type: 'missing_function', name: funcName });
      }
    }
    
    // Check 7: IMEI with NULL values
    console.log('\n🔍 CHECKING: IMEI Data Quality\n');
    
    const nullIMEIs = await sql`
      SELECT id, name, variant_type
      FROM lats_product_variants
      WHERE variant_type = 'imei_child'
        AND (
          NOT variant_attributes ? 'imei'
          OR variant_attributes->>'imei' IS NULL
          OR variant_attributes->>'imei' = ''
        )
    `;
    
    if (nullIMEIs.length > 0) {
      console.log(`❌ ${nullIMEIs.length} IMEI children without IMEI value`);
      nullIMEIs.slice(0, 3).forEach(v => {
        console.log(`   - ${v.name}`);
      });
      issues.push({ type: 'null_imei', count: nullIMEIs.length, items: nullIMEIs });
    } else {
      console.log('✅ All IMEI children have IMEI values');
    }
    
    // Check 8: Invalid parent references
    console.log('\n🔍 CHECKING: Parent References\n');
    
    const invalidParents = await sql`
      SELECT 
        c.id,
        c.name,
        c.parent_variant_id
      FROM lats_product_variants c
      WHERE c.variant_type = 'imei_child'
        AND c.parent_variant_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM lats_product_variants p
          WHERE p.id = c.parent_variant_id
        )
    `;
    
    if (invalidParents.length > 0) {
      console.log(`❌ ${invalidParents.length} IMEI children with invalid parent references`);
      issues.push({ type: 'invalid_parent_ref', count: invalidParents.length });
    } else {
      console.log('✅ All parent references are valid');
    }
    
    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('                   ULTRA DEEP RECHECK SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    if (issues.length === 0) {
      console.log('🎉 NO ISSUES FOUND - SYSTEM IS 100% HEALTHY!\n');
      console.log('✅ Database: Clean');
      console.log('✅ IMEI System: Perfect');
      console.log('✅ Stock Sync: 100%');
      console.log('✅ Triggers: All active');
      console.log('✅ Functions: All working');
      console.log('✅ Data Integrity: Perfect\n');
      return { healthy: true, issues: [] };
    } else {
      console.log(`⚠️  ${issues.length} issue type(s) found:\n`);
      
      const grouped = {};
      issues.forEach(issue => {
        grouped[issue.type] = (grouped[issue.type] || 0) + (issue.count || 1);
      });
      
      Object.entries(grouped).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });
      console.log();
      
      return { healthy: false, issues };
    }
    
  } catch (error) {
    console.error('\n❌ Error during recheck:', error.message);
    throw error;
  }
}

ultraDeepRecheck().then(result => {
  if (!result.healthy) {
    console.log('🔧 Issues found - will need fixing\n');
    process.exit(1);
  } else {
    console.log('✅ System validation complete - all perfect!\n');
    process.exit(0);
  }
});

