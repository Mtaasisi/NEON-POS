#!/usr/bin/env node

/**
 * Check and Fix Products Not Showing in Arusha Inventory
 * Problem: Products exist in database but don't show in UI
 * Cause: is_shared flag not set to true
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync, existsSync } from 'fs';

console.log('\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║   🔧 FIX MISSING PRODUCTS IN ARUSHA INVENTORY               ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

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

async function fixMissingProducts() {
  try {
    // Get Arusha branch
    const branches = await sql`
      SELECT id, name FROM store_locations
      WHERE UPPER(name) LIKE '%ARUSHA%' OR UPPER(code) LIKE '%ARUSHA%'
    `;
    
    if (branches.length === 0) {
      console.log('❌ Arusha branch not found\n');
      return;
    }
    
    const arushaBranch = branches[0];
    console.log(`📍 Arusha Branch: ${arushaBranch.name} (${arushaBranch.id})\n`);
    console.log('─'.repeat(80));
    
    // Check products that have variants at Arusha but are NOT shared
    console.log('\n🔍 STEP 1: Finding products with variants at Arusha...\n');
    
    const problemProducts = await sql`
      SELECT DISTINCT
        p.id as product_id,
        p.name as product_name,
        p.sku,
        p.is_shared,
        p.branch_id as product_branch_id,
        pv.id as variant_id,
        pv.quantity as variant_stock,
        pv.is_shared as variant_is_shared
      FROM lats_products p
      JOIN lats_product_variants pv ON pv.product_id = p.id
      WHERE pv.branch_id = ${arushaBranch.id}
      ORDER BY p.name
    `;
    
    console.log(`Found ${problemProducts.length} products with variants at Arusha:\n`);
    
    const needsFixing = problemProducts.filter(p => !p.is_shared);
    const alreadyShared = problemProducts.filter(p => p.is_shared);
    
    console.log('📊 Status Breakdown:');
    console.log(`   ✅ Already Shared: ${alreadyShared.length} products`);
    console.log(`   ⚠️  Need Fixing: ${needsFixing.length} products\n`);
    
    if (needsFixing.length > 0) {
      console.log('─'.repeat(80));
      console.log('\n⚠️  PRODUCTS THAT NEED FIXING (NOT showing in UI):\n');
      
      needsFixing.forEach((product, index) => {
        console.log(`${index + 1}. ${product.product_name}`);
        console.log(`   SKU: ${product.sku}`);
        console.log(`   Stock at Arusha: ${product.variant_stock} units`);
        console.log(`   is_shared: ${product.is_shared} ❌`);
        console.log('');
      });
      
      console.log('─'.repeat(80));
      console.log('\n🔧 STEP 2: Applying fix to mark products as shared...\n');
      
      // Fix each product
      for (const product of needsFixing) {
        console.log(`Fixing: ${product.product_name}...`);
        
        await sql`
          UPDATE lats_products
          SET is_shared = true
          WHERE id = ${product.product_id}
        `;
        
        console.log(`   ✅ Marked as shared\n`);
      }
      
      console.log('─'.repeat(80));
      console.log(`\n✅ Fixed ${needsFixing.length} products!\n`);
    } else {
      console.log('✅ All products are already marked as shared!\n');
    }
    
    console.log('─'.repeat(80));
    console.log('\n🔍 STEP 3: Verifying fix...\n');
    
    // Verify all products are now shared
    const verifyProducts = await sql`
      SELECT DISTINCT
        p.id as product_id,
        p.name as product_name,
        p.is_shared,
        pv.quantity
      FROM lats_products p
      JOIN lats_product_variants pv ON pv.product_id = p.id
      WHERE pv.branch_id = ${arushaBranch.id}
      ORDER BY p.name
    `;
    
    const stillNotShared = verifyProducts.filter(p => !p.is_shared);
    
    if (stillNotShared.length === 0) {
      console.log('✅ PERFECT! All products are now shared and will show in Arusha inventory\n');
      
      console.log('📋 Products that will now appear in Arusha inventory:\n');
      verifyProducts.forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.product_name} (${product.quantity} units)`);
      });
      console.log('');
    } else {
      console.log('⚠️  Warning: Some products still not shared:\n');
      stillNotShared.forEach(p => console.log(`   - ${p.product_name}`));
      console.log('');
    }
    
    console.log('─'.repeat(80));
    console.log('\n📊 FINAL SUMMARY:\n');
    
    const totalProducts = verifyProducts.length;
    const sharedProducts = verifyProducts.filter(p => p.is_shared).length;
    const totalStock = verifyProducts.reduce((sum, p) => sum + parseInt(p.quantity), 0);
    
    console.log(`Total Products at Arusha: ${totalProducts}`);
    console.log(`Products Marked as Shared: ${sharedProducts} / ${totalProducts}`);
    console.log(`Total Stock: ${totalStock} units`);
    console.log('');
    
    if (sharedProducts === totalProducts) {
      console.log('✅ ALL PRODUCTS WILL NOW SHOW IN ARUSHA INVENTORY! 🎉\n');
      console.log('💡 Next Steps:');
      console.log('   1. Refresh your browser (Ctrl+F5 or Cmd+Shift+R)');
      console.log('   2. Clear browser cache if needed');
      console.log('   3. Navigate to Inventory page in Arusha branch');
      console.log('   4. All products should now be visible!\n');
    } else {
      console.log('⚠️  Some products still need attention\n');
    }
    
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ FIX COMPLETE                                            ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

fixMissingProducts();

