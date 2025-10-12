#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

async function finalCheck() {
  try {
    console.log('\n🎯 FINAL INVENTORY STATUS CHECK');
    console.log('=================================\n');
    
    // Get total counts
    const totalProducts = await sql`SELECT COUNT(*) as count FROM lats_products`;
    const totalVariants = await sql`SELECT COUNT(*) as count FROM lats_product_variants`;
    
    console.log(`📊 INVENTORY STATISTICS:`);
    console.log(`   Total Products: ${totalProducts[0].count}`);
    console.log(`   Total Variants: ${totalVariants[0].count}`);
    console.log('');
    
    // Check for any remaining issues
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
    
    console.log(`🔍 ISSUE CHECK:`);
    console.log(`   Products without variants: ${productsWithoutVariants[0].count}`);
    console.log(`   Products with zero prices: ${productsWithZeroPrices[0].count}`);
    console.log(`   Variants with zero prices: ${variantsWithZeroPrices[0].count}`);
    console.log('');
    
    // Show sample products with prices
    const sampleProducts = await sql`
      SELECT 
        p.name,
        p.selling_price as product_price,
        v.selling_price as variant_price,
        v.quantity as stock
      FROM lats_products p
      JOIN lats_product_variants v ON p.id = v.product_id
      ORDER BY p.name
      LIMIT 5
    `;
    
    console.log(`📋 SAMPLE PRODUCTS WITH PRICES:`);
    sampleProducts.forEach(p => {
      console.log(`   ${p.name}: TSh ${p.variant_price?.toLocaleString()} (Stock: ${p.stock})`);
    });
    console.log('');
    
    // Final status
    const allFixed = productsWithoutVariants[0].count === 0 && 
                    productsWithZeroPrices[0].count === 0 && 
                    variantsWithZeroPrices[0].count === 0;
    
    if (allFixed) {
      console.log('=================================');
      console.log('🎉 INVENTORY FULLY FIXED!');
      console.log('=================================\n');
      console.log('✅ All products have variants');
      console.log('✅ All products have prices');
      console.log('✅ All variants have prices');
      console.log('\n🚀 Your inventory page should now show proper data!');
      console.log('   - Real prices instead of "TSh 0"');
      console.log('   - Proper stock quantities');
      console.log('   - All products with variants');
      console.log('\nPlease refresh your browser to see the changes!\n');
    } else {
      console.log('=================================');
      console.log('⚠️  ISSUES DETECTED');
      console.log('=================================\n');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

finalCheck();
