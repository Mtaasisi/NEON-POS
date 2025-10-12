#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

async function fixAllZeroPriceProducts() {
  try {
    console.log('\n🔧 Fixing All Zero Price Products');
    console.log('==================================\n');
    
    // Find all products/variants with zero selling prices
    console.log('1️⃣ Finding products with zero selling prices...');
    
    const zeroPriceVariants = await sql`
      SELECT 
        p.id as product_id,
        p.name as product_name,
        p.selling_price as product_price,
        v.id as variant_id,
        v.name as variant_name,
        v.selling_price as variant_price,
        v.cost_price as variant_cost,
        v.quantity as stock
      FROM lats_products p
      JOIN lats_product_variants v ON p.id = v.product_id
      WHERE v.selling_price = 0 OR v.selling_price IS NULL
      ORDER BY p.name
    `;
    
    console.log(`   Found ${zeroPriceVariants.length} variants with zero prices\n`);
    
    if (zeroPriceVariants.length === 0) {
      console.log('✅ No variants with zero prices found!\n');
      return;
    }
    
    console.log('2️⃣ Updating pricing for all zero-price variants...\n');
    
    let updatedCount = 0;
    for (const variant of zeroPriceVariants) {
      const costPrice = parseFloat(variant.variant_cost) || 50; // Default cost if null
      const sellingPrice = costPrice * 2.5; // 150% markup
      
      try {
        // Update variant pricing
        await sql`
          UPDATE lats_product_variants 
          SET selling_price = ${sellingPrice}
          WHERE id = ${variant.variant_id}
        `;
        
        // Update product pricing to match
        await sql`
          UPDATE lats_products 
          SET selling_price = ${sellingPrice}
          WHERE id = ${variant.product_id}
        `;
        
        console.log(`   ✅ ${variant.product_name}`);
        console.log(`      Variant: ${variant.variant_name}`);
        console.log(`      New Price: TSh ${sellingPrice.toFixed(0)}`);
        console.log(`      Stock: ${variant.stock}`);
        console.log('');
        
        updatedCount++;
        
      } catch (error) {
        console.log(`   ❌ Failed to update ${variant.product_name}: ${error.message}\n`);
      }
    }
    
    console.log('==================================');
    console.log(`✅ UPDATED ${updatedCount} VARIANTS`);
    console.log('==================================\n');
    
    // Final verification
    console.log('3️⃣ Final verification...');
    const remainingZeroPrice = await sql`
      SELECT COUNT(*) as count
      FROM lats_product_variants 
      WHERE selling_price = 0 OR selling_price IS NULL
    `;
    
    const remaining = remainingZeroPrice[0].count;
    
    if (remaining === 0) {
      console.log('   ✅ All variants now have proper prices!\n');
      console.log('🎉 ALL ZERO PRICE ISSUES FIXED!');
      console.log('\nYour product pages should now show proper pricing.');
      console.log('Please refresh your browser to see the changes!\n');
    } else {
      console.log(`   ⚠️  ${remaining} variants still have zero prices\n`);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Details:', error);
    process.exit(1);
  }
}

fixAllZeroPriceProducts();

