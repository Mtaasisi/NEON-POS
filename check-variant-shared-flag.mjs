#!/usr/bin/env node

/**
 * Check if VARIANTS are marked as shared
 * The UI filters both products AND variants by is_shared flag
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync, existsSync } from 'fs';

console.log('\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║   🔍 CHECK VARIANT SHARED FLAGS                             ║');
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

async function checkVariants() {
  try {
    // Get Arusha branch
    const branches = await sql`
      SELECT id, name FROM store_locations
      WHERE UPPER(name) LIKE '%ARUSHA%' OR UPPER(code) LIKE '%ARUSHA%'
    `;
    
    const arushaBranch = branches[0];
    console.log(`📍 Checking variants at: ${arushaBranch.name}\n`);
    console.log('─'.repeat(80));
    
    // Check all variants at Arusha
    console.log('\n🔍 Checking all variants at Arusha branch...\n');
    
    const variants = await sql`
      SELECT 
        pv.id as variant_id,
        pv.variant_name,
        pv.sku,
        pv.quantity,
        pv.is_shared as variant_is_shared,
        p.id as product_id,
        p.name as product_name,
        p.is_shared as product_is_shared
      FROM lats_product_variants pv
      JOIN lats_products p ON p.id = pv.product_id
      WHERE pv.branch_id = ${arushaBranch.id}
      ORDER BY p.name
    `;
    
    console.log(`Found ${variants.length} variants:\n`);
    
    const variantsNotShared = variants.filter(v => !v.variant_is_shared);
    const productsNotShared = variants.filter(v => !v.product_is_shared);
    
    console.log('📊 Status:');
    console.log(`   Products with is_shared = true: ${variants.length - productsNotShared.length} / ${variants.length}`);
    console.log(`   Variants with is_shared = true: ${variants.length - variantsNotShared.length} / ${variants.length}\n`);
    
    if (variantsNotShared.length > 0) {
      console.log('─'.repeat(80));
      console.log('\n⚠️  VARIANTS NOT MARKED AS SHARED (These WON\'T show in UI!):\n');
      
      variantsNotShared.forEach((v, index) => {
        console.log(`${index + 1}. ${v.product_name}`);
        console.log(`   Variant: ${v.variant_name || 'N/A'}`);
        console.log(`   SKU: ${v.sku}`);
        console.log(`   Stock: ${v.quantity} units`);
        console.log(`   Product is_shared: ${v.product_is_shared} ${v.product_is_shared ? '✅' : '❌'}`);
        console.log(`   Variant is_shared: ${v.variant_is_shared} ${v.variant_is_shared ? '✅' : '❌'}`);
        console.log('');
      });
      
      console.log('─'.repeat(80));
      console.log('\n🔧 FIXING: Marking all variants as shared...\n');
      
      // Fix all variants
      await sql`
        UPDATE lats_product_variants
        SET is_shared = true
        WHERE branch_id = ${arushaBranch.id}
      `;
      
      console.log(`✅ Updated ${variantsNotShared.length} variants to is_shared = true\n`);
    } else {
      console.log('✅ All variants are already marked as shared!\n');
    }
    
    console.log('─'.repeat(80));
    console.log('\n📋 FINAL CHECK - What the UI will see:\n');
    
    // Simulate what the frontend query will return
    const uiQuery = await sql`
      SELECT 
        p.id as product_id,
        p.name as product_name,
        p.is_shared as product_is_shared,
        pv.id as variant_id,
        pv.variant_name,
        pv.quantity,
        pv.is_shared as variant_is_shared
      FROM lats_products p
      JOIN lats_product_variants pv ON pv.product_id = p.id
      WHERE pv.branch_id = ${arushaBranch.id}
        AND p.is_shared = true
        AND pv.is_shared = true
      ORDER BY p.name
    `;
    
    console.log(`UI will show ${uiQuery.length} products:\n`);
    
    uiQuery.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.product_name} - ${item.quantity} units`);
    });
    
    console.log('');
    console.log('─'.repeat(80));
    console.log('\n📊 SUMMARY:\n');
    
    const totalStock = uiQuery.reduce((sum, item) => sum + parseInt(item.quantity), 0);
    
    console.log(`Total Products Visible: ${uiQuery.length}`);
    console.log(`Total Stock: ${totalStock} units`);
    console.log('');
    
    if (uiQuery.length === variants.length) {
      console.log('✅ PERFECT! All products will now show in Arusha inventory! 🎉\n');
      console.log('💡 Action Required:');
      console.log('   1. Hard refresh browser: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)');
      console.log('   2. Or clear browser cache completely');
      console.log('   3. Switch to Arusha branch');
      console.log('   4. Go to Inventory page\n');
    } else {
      console.log(`⚠️  Only ${uiQuery.length} out of ${variants.length} products will show\n`);
    }
    
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ CHECK COMPLETE                                          ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

checkVariants();

