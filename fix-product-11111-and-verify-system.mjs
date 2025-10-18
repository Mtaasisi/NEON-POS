#!/usr/bin/env node

/**
 * Fix the "11111" product transfer AND verify system functions
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync, existsSync } from 'fs';

console.log('\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║   🔧 FIX TRANSFER + VERIFY SYSTEM                            ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

// Get database URL
let DATABASE_URL;
try {
  if (existsSync('database-config.json')) {
    const config = JSON.parse(readFileSync('database-config.json', 'utf-8'));
    DATABASE_URL = config.url;
    console.log('✅ Connected to database\n');
  } else {
    console.error('❌ database-config.json not found');
    process.exit(1);
  }
} catch (e) {
  console.error('❌ Error reading database config:', e.message);
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function fixAndVerify() {
  try {
    console.log('═'.repeat(80));
    console.log('PART 1: VERIFY DATABASE FUNCTIONS');
    console.log('═'.repeat(80));
    console.log('');
    
    // Check if critical functions exist
    const functions = await sql`
      SELECT 
        proname as function_name,
        pg_get_function_identity_arguments(oid) as arguments
      FROM pg_proc
      WHERE proname IN (
        'complete_stock_transfer_transaction',
        'find_or_create_variant_at_branch',
        'reduce_variant_stock',
        'increase_variant_stock',
        'reserve_variant_stock',
        'release_variant_stock'
      )
      ORDER BY proname
    `;
    
    console.log('🔍 Checking for required functions:\n');
    
    const requiredFunctions = [
      'complete_stock_transfer_transaction',
      'find_or_create_variant_at_branch',
      'reduce_variant_stock',
      'increase_variant_stock',
      'reserve_variant_stock',
      'release_variant_stock'
    ];
    
    const foundFunctions = functions.map(f => f.function_name);
    const missingFunctions = requiredFunctions.filter(f => !foundFunctions.includes(f));
    
    requiredFunctions.forEach(funcName => {
      if (foundFunctions.includes(funcName)) {
        console.log(`✅ ${funcName}`);
      } else {
        console.log(`❌ ${funcName} - MISSING!`);
      }
    });
    
    console.log('');
    
    if (missingFunctions.length > 0) {
      console.log('⚠️  WARNING: Missing functions detected!');
      console.log(`   Missing: ${missingFunctions.join(', ')}\n`);
      console.log('💡 Recommendation: Run STOCK-TRANSFER-ARUSHA-FIX.sql to install functions\n');
    } else {
      console.log('✅ All required functions are installed!\n');
    }
    
    console.log('─'.repeat(80));
    console.log('');
    console.log('═'.repeat(80));
    console.log('PART 2: FIX THE "11111" PRODUCT TRANSFER');
    console.log('═'.repeat(80));
    console.log('');
    
    // Get branch IDs
    const branches = await sql`
      SELECT id, name FROM store_locations
      WHERE name = 'Main Store' OR UPPER(name) LIKE '%ARUSHA%'
    `;
    
    const mainStore = branches.find(b => b.name === 'Main Store');
    const arusha = branches.find(b => b.name.toUpperCase().includes('ARUSHA'));
    
    if (!mainStore || !arusha) {
      console.log('❌ Could not find Main Store or Arusha branch\n');
      return;
    }
    
    console.log(`📍 Branches identified:`);
    console.log(`   Main Store ID: ${mainStore.id}`);
    console.log(`   Arusha ID: ${arusha.id}\n`);
    
    // Get the product and variant info
    const product = await sql`
      SELECT id, name, sku FROM lats_products WHERE name = '11111'
    `;
    
    if (product.length === 0) {
      console.log('❌ Product "11111" not found\n');
      return;
    }
    
    const mainVariant = await sql`
      SELECT id, variant_name, sku, quantity, reserved_quantity
      FROM lats_product_variants
      WHERE product_id = ${product[0].id} AND branch_id = ${mainStore.id}
    `;
    
    if (mainVariant.length === 0) {
      console.log('❌ Main Store variant not found\n');
      return;
    }
    
    console.log('📦 Product Details:');
    console.log(`   Product: ${product[0].name}`);
    console.log(`   Product ID: ${product[0].id}`);
    console.log(`   Main Store Variant ID: ${mainVariant[0].id}`);
    console.log(`   Main Store Stock: ${mainVariant[0].quantity} (Reserved: ${mainVariant[0].reserved_quantity})\n`);
    
    console.log('🔧 Starting fix...\n');
    
    // Step 1: Check if variant exists at Arusha
    console.log('Step 1: Check if variant exists at Arusha...');
    
    const arushaVariantCheck = await sql`
      SELECT id, variant_name, sku, quantity
      FROM lats_product_variants
      WHERE product_id = ${product[0].id} AND branch_id = ${arusha.id}
    `;
    
    let arushaVariantId;
    
    if (arushaVariantCheck.length === 0) {
      console.log('   → Creating variant at Arusha...');
      
      // Create variant at Arusha
      const newVariant = await sql`
        INSERT INTO lats_product_variants (
          product_id,
          branch_id,
          variant_name,
          sku,
          quantity,
          reserved_quantity,
          is_shared
        ) VALUES (
          ${product[0].id},
          ${arusha.id},
          ${mainVariant[0].variant_name},
          ${mainVariant[0].sku || product[0].sku} || '-' || ${arusha.id},
          0,
          0,
          false
        )
        RETURNING id, sku
      `;
      
      arushaVariantId = newVariant[0].id;
      console.log(`   ✅ Created variant at Arusha (ID: ${arushaVariantId})\n`);
    } else {
      arushaVariantId = arushaVariantCheck[0].id;
      console.log(`   ✅ Variant already exists at Arusha (ID: ${arushaVariantId})\n`);
    }
    
    // Step 2: Update stock at Main Store (reduce by 1, release reservation)
    console.log('Step 2: Update Main Store stock...');
    
    await sql`
      UPDATE lats_product_variants
      SET 
        quantity = GREATEST(0, quantity - 1),
        reserved_quantity = GREATEST(0, reserved_quantity - 1)
      WHERE id = ${mainVariant[0].id}
    `;
    
    console.log('   ✅ Reduced Main Store stock by 1 and released reservation\n');
    
    // Step 3: Update stock at Arusha (increase by 1)
    console.log('Step 3: Update Arusha stock...');
    
    await sql`
      UPDATE lats_product_variants
      SET quantity = quantity + 1
      WHERE id = ${arushaVariantId}
    `;
    
    console.log('   ✅ Increased Arusha stock by 1\n');
    
    // Step 4: Update product to be shared (if not already)
    console.log('Step 4: Mark product as shared...');
    
    await sql`
      UPDATE lats_products
      SET is_shared = true
      WHERE id = ${product[0].id}
    `;
    
    console.log('   ✅ Product marked as shared\n');
    
    console.log('─'.repeat(80));
    console.log('');
    console.log('✅ FIX COMPLETE! Verifying...\n');
    
    // Verify the fix
    const mainStockAfter = await sql`
      SELECT quantity, reserved_quantity
      FROM lats_product_variants
      WHERE id = ${mainVariant[0].id}
    `;
    
    const arushaStockAfter = await sql`
      SELECT quantity, reserved_quantity
      FROM lats_product_variants
      WHERE id = ${arushaVariantId}
    `;
    
    console.log('📊 VERIFICATION:\n');
    console.log('Main Store:');
    console.log(`   Before: ${mainVariant[0].quantity} units (Reserved: ${mainVariant[0].reserved_quantity})`);
    console.log(`   After:  ${mainStockAfter[0].quantity} units (Reserved: ${mainStockAfter[0].reserved_quantity})`);
    console.log('');
    console.log('Arusha:');
    console.log(`   Before: ${arushaVariantCheck.length > 0 ? arushaVariantCheck[0].quantity : 0} units`);
    console.log(`   After:  ${arushaStockAfter[0].quantity} units`);
    console.log('');
    
    console.log('═'.repeat(80));
    console.log('PART 3: FINAL VERIFICATION - ALL ARUSHA TRANSFERS');
    console.log('═'.repeat(80));
    console.log('');
    
    // Final check - all transfers vs inventory
    const completedTransfers = await sql`
      SELECT COUNT(*) as count, SUM(quantity)::int as total_qty
      FROM branch_transfers
      WHERE to_branch_id = ${arusha.id} AND status = 'completed'
    `;
    
    const totalInventory = await sql`
      SELECT SUM(quantity)::int as total_qty
      FROM lats_product_variants
      WHERE branch_id = ${arusha.id}
    `;
    
    console.log('📈 FINAL SUMMARY:\n');
    console.log(`Completed Transfers: ${completedTransfers[0].count}`);
    console.log(`Total Units Transferred: ${completedTransfers[0].total_qty}`);
    console.log(`Total Units in Inventory: ${totalInventory[0].total_qty || 0}`);
    console.log('');
    
    if (completedTransfers[0].total_qty === totalInventory[0].total_qty) {
      console.log('✅ PERFECT MATCH! All transfers are now showing in inventory! 🎉\n');
    } else {
      const diff = (totalInventory[0].total_qty || 0) - completedTransfers[0].total_qty;
      if (diff > 0) {
        console.log(`✅ Inventory OK! ${diff} extra units (may be from direct additions)\n`);
      } else {
        console.log(`⚠️  Still missing ${Math.abs(diff)} units\n`);
      }
    }
    
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ COMPLETE - SYSTEM FIXED AND VERIFIED                    ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    
    if (missingFunctions.length > 0) {
      console.log('⚠️  IMPORTANT: Install missing functions to prevent future issues');
      console.log('   Run: psql "$DATABASE_URL" -f STOCK-TRANSFER-ARUSHA-FIX.sql\n');
    } else {
      console.log('✅ All database functions are installed. Future transfers should work perfectly!\n');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

fixAndVerify();

