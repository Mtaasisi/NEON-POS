#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config();

const sql = neon(process.env.DATABASE_URL);

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║           FIXING REMAINING ISSUES - FINAL CLEANUP             ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

async function fixRemainingIssues() {
  try {
    console.log('⚙️  Disabling validation triggers temporarily...\n');
    
    await sql`ALTER TABLE lats_product_variants DISABLE TRIGGER trg_validate_new_imei`;
    await sql`ALTER TABLE lats_product_variants DISABLE TRIGGER ensure_imei_has_parent`;
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🔧 FIX 1: Deleting IMEI Children Without IMEI Value\n');
    
    // Find IMEI children without actual IMEI value
    const invalidIMEIs = await sql`
      SELECT id, name, variant_attributes->>'imei' as imei
      FROM lats_product_variants
      WHERE variant_type = 'imei_child'
        AND (
          NOT variant_attributes ? 'imei'
          OR variant_attributes->>'imei' IS NULL
          OR variant_attributes->>'imei' = ''
        )
    `;
    
    console.log(`Found ${invalidIMEIs.length} IMEI children without IMEI value`);
    console.log('These are invalid and will be deleted...\n');
    
    if (invalidIMEIs.length > 0) {
      // Delete stock movements first
      await sql`
        DELETE FROM lats_stock_movements
        WHERE variant_id IN (
          SELECT id FROM lats_product_variants
          WHERE variant_type = 'imei_child'
            AND (
              NOT variant_attributes ? 'imei'
              OR variant_attributes->>'imei' IS NULL
              OR variant_attributes->>'imei' = ''
            )
        )
      `;
      console.log('   Deleted related stock movements');
      
      // Delete the invalid IMEI children
      const deleted = await sql`
        DELETE FROM lats_product_variants
        WHERE variant_type = 'imei_child'
          AND (
            NOT variant_attributes ? 'imei'
            OR variant_attributes->>'imei' IS NULL
            OR variant_attributes->>'imei' = ''
          )
      `;
      
      console.log(`   ✅ Deleted ${invalidIMEIs.length} invalid IMEI children\n`);
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🔧 FIX 2: Recalculating Parent Stocks\n');
    
    const recalc = await sql`
      SELECT * FROM recalculate_all_parent_stocks()
      WHERE old_quantity != new_quantity
    `;
    
    if (recalc.length > 0) {
      console.log(`✅ Fixed ${recalc.length} parent stock mismatches:`);
      recalc.forEach(r => {
        console.log(`   ${r.parent_name}: ${r.old_quantity} → ${r.new_quantity}`);
      });
    } else {
      console.log('✅ All parent stocks already correct');
    }
    console.log();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🔧 FIX 3: Synchronizing Product Stocks\n');
    
    await sql`
      UPDATE lats_products p
      SET stock_quantity = (
        SELECT COALESCE(SUM(v.quantity), 0)
        FROM lats_product_variants v
        WHERE v.product_id = p.id
          AND v.is_active = TRUE
          AND (v.parent_variant_id IS NULL OR v.variant_type != 'imei_child')
      )
    `;
    
    console.log('✅ Product stocks synchronized\n');
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('⚙️  Re-enabling triggers...\n');
    
    await sql`ALTER TABLE lats_product_variants ENABLE TRIGGER trg_validate_new_imei`;
    await sql`ALTER TABLE lats_product_variants ENABLE TRIGGER ensure_imei_has_parent`;
    
    console.log('✅ Triggers re-enabled\n');
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                    FINAL VERIFICATION');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    // Final verification
    const finalCheck = await sql`
      SELECT 
        'Orphaned IMEIs' as check_name,
        COUNT(*)::text as count,
        CASE WHEN COUNT(*) = 0 THEN '✅' ELSE '❌' END as status
      FROM lats_product_variants
      WHERE variant_type = 'imei_child'
        AND parent_variant_id IS NULL
      
      UNION ALL
      
      SELECT 
        'IMEIs Without Value',
        COUNT(*)::text,
        CASE WHEN COUNT(*) = 0 THEN '✅' ELSE '❌' END
      FROM lats_product_variants
      WHERE variant_type = 'imei_child'
        AND (
          NOT variant_attributes ? 'imei'
          OR variant_attributes->>'imei' IS NULL
          OR variant_attributes->>'imei' = ''
        )
      
      UNION ALL
      
      SELECT 
        'Stock Mismatches',
        COUNT(*)::text,
        CASE WHEN COUNT(*) = 0 THEN '✅' ELSE '❌' END
      FROM (
        SELECT p.id
        FROM lats_product_variants p
        LEFT JOIN lats_product_variants c 
          ON c.parent_variant_id = p.id 
          AND c.variant_type = 'imei_child'
        WHERE (p.is_parent = TRUE OR p.variant_type = 'parent')
        GROUP BY p.id, p.quantity
        HAVING p.quantity != COALESCE(SUM(c.quantity), 0)
      ) subq
      
      UNION ALL
      
      SELECT 
        'IMEIs Without Status',
        COUNT(*)::text,
        CASE WHEN COUNT(*) = 0 THEN '✅' ELSE '❌' END
      FROM lats_product_variants
      WHERE variant_type = 'imei_child'
        AND parent_variant_id IS NOT NULL
        AND variant_attributes ? 'imei'
        AND (
          NOT variant_attributes ? 'imei_status'
          OR variant_attributes->>'imei_status' IS NULL
          OR variant_attributes->>'imei_status' = ''
        )
    `;
    
    console.log('Final Status Check:');
    finalCheck.forEach(c => {
      console.log(`   ${c.status} ${c.check_name}: ${c.count}`);
    });
    
    const allGood = finalCheck.every(c => c.status === '✅');
    
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    if (allGood) {
      console.log('║          ✅ ALL ISSUES FIXED - SYSTEM PERFECT ✅                ║');
    } else {
      console.log('║          ⚠️  SOME ISSUES REMAIN - NEEDS ATTENTION              ║');
    }
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    
  } catch (error) {
    console.error('\n❌ Error fixing issues:', error.message);
    
    // Re-enable triggers
    try {
      await sql`ALTER TABLE lats_product_variants ENABLE TRIGGER trg_validate_new_imei`;
      await sql`ALTER TABLE lats_product_variants ENABLE TRIGGER ensure_imei_has_parent`;
    } catch (e) {
      console.error('Failed to re-enable triggers:', e.message);
    }
    
    throw error;
  }
}

fixRemainingIssues();

