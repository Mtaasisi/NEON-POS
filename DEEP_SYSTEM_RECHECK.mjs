#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config();

const sql = neon(process.env.DATABASE_URL);

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║            DEEP SYSTEM RECHECK - FINDING ALL ISSUES           ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

async function deepRecheck() {
  const issues = [];
  
  try {
    console.log('🔍 PHASE 1: Database Structure Issues\n');
    
    // Check for IMEI children without parent_variant_id
    const orphanedIMEIs = await sql`
      SELECT 
        id,
        name,
        variant_type,
        parent_variant_id,
        variant_attributes->>'imei' as imei
      FROM lats_product_variants
      WHERE variant_type = 'imei_child'
        AND parent_variant_id IS NULL
    `;
    
    if (orphanedIMEIs.length > 0) {
      console.log(`❌ ISSUE 1: ${orphanedIMEIs.length} IMEI children without parent_variant_id`);
      orphanedIMEIs.forEach(v => {
        console.log(`   - ${v.name} (IMEI: ${v.imei || 'N/A'})`);
        issues.push({
          type: 'orphaned_imei',
          id: v.id,
          name: v.name,
          imei: v.imei
        });
      });
      console.log();
    } else {
      console.log('✅ No orphaned IMEI children\n');
    }
    
    // Check for variants with IMEI but wrong type
    const wrongTypeIMEIs = await sql`
      SELECT 
        id,
        name,
        variant_type,
        variant_attributes->>'imei' as imei
      FROM lats_product_variants
      WHERE variant_attributes ? 'imei'
        AND variant_type NOT IN ('imei_child', 'imei')
    `;
    
    if (wrongTypeIMEIs.length > 0) {
      console.log(`❌ ISSUE 2: ${wrongTypeIMEIs.length} variants have IMEI but wrong type`);
      wrongTypeIMEIs.forEach(v => {
        console.log(`   - ${v.name} (Type: ${v.variant_type}, IMEI: ${v.imei})`);
        issues.push({
          type: 'wrong_imei_type',
          id: v.id,
          name: v.name,
          current_type: v.variant_type,
          imei: v.imei
        });
      });
      console.log();
    } else {
      console.log('✅ All IMEIs have correct variant_type\n');
    }
    
    // Check for parent variants not marked correctly
    const unmarkedParents = await sql`
      SELECT 
        p.id,
        p.name,
        p.is_parent,
        p.variant_type,
        COUNT(c.id) as children_count
      FROM lats_product_variants p
      JOIN lats_product_variants c ON c.parent_variant_id = p.id
      WHERE (p.is_parent != TRUE OR p.variant_type != 'parent')
      GROUP BY p.id, p.name, p.is_parent, p.variant_type
    `;
    
    if (unmarkedParents.length > 0) {
      console.log(`❌ ISSUE 3: ${unmarkedParents.length} parent variants not marked correctly`);
      unmarkedParents.forEach(p => {
        console.log(`   - ${p.name} (is_parent: ${p.is_parent}, type: ${p.variant_type}, children: ${p.children_count})`);
        issues.push({
          type: 'unmarked_parent',
          id: p.id,
          name: p.name,
          children_count: p.children_count
        });
      });
      console.log();
    } else {
      console.log('✅ All parent variants marked correctly\n');
    }
    
    console.log('🔍 PHASE 2: Stock Synchronization Issues\n');
    
    // Check for stock mismatches
    const stockMismatches = await sql`
      SELECT 
        p.id,
        p.name,
        p.quantity as parent_quantity,
        COALESCE(SUM(c.quantity), 0)::INT as children_quantity,
        ABS(p.quantity - COALESCE(SUM(c.quantity), 0)) as difference
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
      console.log(`❌ ISSUE 4: ${stockMismatches.length} parent variants with stock mismatch`);
      stockMismatches.forEach(p => {
        console.log(`   - ${p.name}: Parent=${p.parent_quantity}, Children=${p.children_quantity} (Diff: ${p.difference})`);
        issues.push({
          type: 'stock_mismatch',
          id: p.id,
          name: p.name,
          parent_quantity: p.parent_quantity,
          children_quantity: p.children_quantity
        });
      });
      console.log();
    } else {
      console.log('✅ All parent stocks match children totals\n');
    }
    
    console.log('🔍 PHASE 3: IMEI Data Quality Issues\n');
    
    // Check for IMEIs without status
    const noStatus = await sql`
      SELECT 
        id,
        name,
        variant_attributes->>'imei' as imei,
        quantity
      FROM lats_product_variants
      WHERE variant_type = 'imei_child'
        AND variant_attributes ? 'imei'
        AND (
          NOT variant_attributes ? 'imei_status'
          OR variant_attributes->>'imei_status' IS NULL
          OR variant_attributes->>'imei_status' = ''
        )
    `;
    
    if (noStatus.length > 0) {
      console.log(`❌ ISSUE 5: ${noStatus.length} IMEIs without status`);
      console.log('   First 5:');
      noStatus.slice(0, 5).forEach(v => {
        console.log(`   - ${v.imei} (Qty: ${v.quantity})`);
        issues.push({
          type: 'no_imei_status',
          id: v.id,
          imei: v.imei,
          quantity: v.quantity
        });
      });
      console.log();
    } else {
      console.log('✅ All IMEIs have status set\n');
    }
    
    // Check for invalid IMEI formats
    const invalidFormats = await sql`
      SELECT 
        id,
        name,
        variant_attributes->>'imei' as imei,
        LENGTH(variant_attributes->>'imei') as imei_length
      FROM lats_product_variants
      WHERE variant_type = 'imei_child'
        AND variant_attributes ? 'imei'
        AND (
          LENGTH(variant_attributes->>'imei') != 15
          OR variant_attributes->>'imei' !~ '^[0-9]+$'
        )
    `;
    
    if (invalidFormats.length > 0) {
      console.log(`❌ ISSUE 6: ${invalidFormats.length} IMEIs with invalid format`);
      invalidFormats.slice(0, 5).forEach(v => {
        console.log(`   - ${v.imei} (Length: ${v.imei_length})`);
        issues.push({
          type: 'invalid_imei_format',
          id: v.id,
          imei: v.imei,
          length: v.imei_length
        });
      });
      console.log();
    } else {
      console.log('✅ All IMEIs have valid format\n');
    }
    
    console.log('🔍 PHASE 4: Trigger & Function Validation\n');
    
    // Check critical triggers exist
    const criticalTriggers = [
      'trigger_update_parent_stock',
      'trg_validate_new_imei',
      'ensure_imei_has_parent'
    ];
    
    for (const triggerName of criticalTriggers) {
      const trigger = await sql`
        SELECT trigger_name, event_manipulation
        FROM information_schema.triggers
        WHERE trigger_name = ${triggerName}
          AND event_object_table = 'lats_product_variants'
      `;
      
      if (trigger.length > 0) {
        console.log(`✅ ${triggerName} exists (${trigger.length} events)`);
      } else {
        console.log(`❌ ISSUE 7: Missing trigger: ${triggerName}`);
        issues.push({
          type: 'missing_trigger',
          trigger_name: triggerName
        });
      }
    }
    console.log();
    
    // Check critical functions exist
    const criticalFunctions = [
      'add_imei_to_parent_variant',
      'mark_imei_as_sold',
      'get_available_imeis_for_pos',
      'update_parent_stock_from_children'
    ];
    
    for (const funcName of criticalFunctions) {
      const func = await sql`
        SELECT proname
        FROM pg_proc
        WHERE proname = ${funcName}
      `;
      
      if (func.length > 0) {
        console.log(`✅ ${funcName} exists`);
      } else {
        console.log(`❌ ISSUE 8: Missing function: ${funcName}`);
        issues.push({
          type: 'missing_function',
          function_name: funcName
        });
      }
    }
    console.log();
    
    console.log('🔍 PHASE 5: Product-Variant Consistency\n');
    
    // Check products with no variants
    const productsNoVariants = await sql`
      SELECT 
        p.id,
        p.name,
        p.sku
      FROM lats_products p
      WHERE NOT EXISTS (
        SELECT 1 FROM lats_product_variants v
        WHERE v.product_id = p.id
      )
      AND p.is_active = TRUE
    `;
    
    if (productsNoVariants.length > 0) {
      console.log(`⚠️  WARNING: ${productsNoVariants.length} active products without variants`);
      productsNoVariants.slice(0, 3).forEach(p => {
        console.log(`   - ${p.name} (${p.sku})`);
      });
      console.log();
    } else {
      console.log('✅ All active products have variants\n');
    }
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                      SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const issueTypes = {};
    issues.forEach(issue => {
      issueTypes[issue.type] = (issueTypes[issue.type] || 0) + 1;
    });
    
    console.log(`Total Issues Found: ${issues.length}\n`);
    
    if (issues.length > 0) {
      console.log('Issues by Type:');
      Object.entries(issueTypes).forEach(([type, count]) => {
        console.log(`   - ${type}: ${count}`);
      });
      console.log();
    } else {
      console.log('🎉 NO ISSUES FOUND - SYSTEM IS HEALTHY!\n');
    }
    
    return issues;
    
  } catch (error) {
    console.error('❌ Error during recheck:', error.message);
    throw error;
  }
}

deepRecheck().then(issues => {
  if (issues.length > 0) {
    console.log('📝 Issues have been identified and will be fixed in the next step.\n');
    process.exit(1);
  } else {
    console.log('✅ System recheck complete - all healthy!\n');
    process.exit(0);
  }
});

