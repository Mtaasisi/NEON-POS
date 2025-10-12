#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

async function verifyInventoryFix() {
  try {
    console.log('\n✅ INVENTORY DATA VERIFICATION');
    console.log('==============================\n');
    
    // Check products with variants and prices
    console.log('1️⃣ Checking products with proper pricing...');
    const productsWithPrices = await sql`
      SELECT 
        p.name,
        p.selling_price as product_price,
        v.selling_price as variant_price,
        v.quantity as stock,
        v.name as variant_name
      FROM lats_products p
      JOIN lats_product_variants v ON p.id = v.product_id
      WHERE p.selling_price > 0 AND v.selling_price > 0
      ORDER BY p.name
      LIMIT 10
    `;
    
    console.log(`   Found ${productsWithPrices.length} products with proper pricing:\n`);
    productsWithPrices.forEach(p => {
      console.log(`   ✅ ${p.name}`);
      console.log(`      Price: TSh ${p.variant_price?.toLocaleString()}`);
      console.log(`      Stock: ${p.stock} units`);
      console.log(`      Variant: ${p.variant_name}`);
      console.log('');
    });
    
    // Check for any remaining issues
    console.log('2️⃣ Checking for remaining issues...');
    
    const productsWithoutVariants = await sql`
      SELECT COUNT(*) as count
      FROM lats_products p
      LEFT JOIN lats_product_variants v ON p.id = v.product_id
      WHERE v.id IS NULL
    `;
    
    const productsWithZeroPrices = await sql`
      SELECT COUNT(*) as count
      FROM lats_products p
      WHERE p.selling_price = 0
    `;
    
    const variantsWithZeroPrices = await sql`
      SELECT COUNT(*) as count
      FROM lats_product_variants v
      WHERE v.selling_price = 0 OR v.selling_price IS NULL
    `;
    
    console.log(`   Products without variants: ${productsWithoutVariants[0].count}`);
    console.log(`   Products with zero prices: ${productsWithZeroPrices[0].count}`);
    console.log(`   Variants with zero prices: ${variantsWithZeroPrices[0].count}`);
    console.log('');
    
    // Summary
    const allFixed = productsWithoutVariants[0].count === 0 && 
                    productsWithZeroPrices[0].count === 0 && 
                    variantsWithZeroPrices[0].count === 0;
    
    if (allFixed) {
      console.log('==============================');
      console.log('🎉 ALL INVENTORY ISSUES FIXED!');
      console.log('==============================\n');
      console.log('✅ All products have variants');
      console.log('✅ All products have proper prices');
      console.log('✅ All variants have proper prices');
      console.log('\nYour inventory page should now display:');
      console.log('- Proper product prices (not "TSh 0")');
      console.log('- Correct stock quantities');
      console.log('- All products with variants');
      console.log('\n🚀 Refresh your browser to see the changes!\n');
    } else {
      console.log('==============================');
      console.log('⚠️  SOME ISSUES REMAIN');
      console.log('==============================\n');
      console.log('Please check the counts above for remaining issues.\n');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

verifyInventoryFix();

