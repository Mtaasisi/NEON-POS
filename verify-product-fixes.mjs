#!/usr/bin/env node

/**
 * QUICK VERIFICATION CHECK
 * =========================
 * Verifies that all product fixes have been applied successfully
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync, existsSync } from 'fs';

console.log('\n🔍 VERIFYING PRODUCT FIXES...\n');

// Get database URL
let DATABASE_URL;
try {
  if (existsSync('database-config.json')) {
    const config = JSON.parse(readFileSync('database-config.json', 'utf-8'));
    DATABASE_URL = config.connectionString || config.url;
  } else {
    DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
  }
} catch (e) {
  console.error('❌ Error reading database config:', e.message);
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function verify() {
  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  📊 DATABASE VERIFICATION REPORT                           ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // 1. Check products
    const products = await sql`
      SELECT COUNT(*) as count 
      FROM lats_products 
      WHERE is_active = true
    `;
    console.log(`✅ Total Active Products: ${products[0].count}`);

    // 2. Check variants
    const variants = await sql`
      SELECT COUNT(*) as count 
      FROM lats_product_variants 
      WHERE is_active = true
    `;
    console.log(`✅ Total Active Variants: ${variants[0].count}`);

    // 3. Products without variants
    const withoutVariants = await sql`
      SELECT p.id, p.name, p.stock_quantity
      FROM lats_products p
      LEFT JOIN lats_product_variants v ON p.id = v.product_id AND v.is_active = true
      WHERE p.is_active = true
      GROUP BY p.id, p.name, p.stock_quantity
      HAVING COUNT(v.id) = 0
    `;
    
    if (withoutVariants.length > 0) {
      console.log(`\n❌ Products WITHOUT Variants: ${withoutVariants.length}`);
      console.log('   These products will NOT work in POS:');
      withoutVariants.forEach(p => {
        console.log(`   - ${p.name} (Stock: ${p.stock_quantity})`);
      });
    } else {
      console.log(`✅ Products Without Variants: 0 (Perfect!)`);
    }

    // 4. Check images
    const brokenImages = await sql`
      SELECT name, image_url
      FROM lats_products
      WHERE is_active = true
        AND (image_url IS NULL OR image_url = '' OR image_url = '/placeholder-product.png')
    `;
    
    if (brokenImages.length > 0) {
      console.log(`\n❌ Products with Broken Images: ${brokenImages.length}`);
      brokenImages.forEach(p => {
        console.log(`   - ${p.name}: ${p.image_url || 'NULL'}`);
      });
    } else {
      console.log(`✅ Broken Images: 0 (All fixed!)`);
    }

    // 5. Check prices
    const zeroPrices = await sql`
      SELECT name, unit_price, cost_price
      FROM lats_products
      WHERE is_active = true
        AND (unit_price IS NULL OR unit_price = 0)
    `;
    
    if (zeroPrices.length > 0) {
      console.log(`\n❌ Products with Zero/Null Prices: ${zeroPrices.length}`);
      zeroPrices.forEach(p => {
        console.log(`   - ${p.name}: Unit=$${p.unit_price || 0}, Cost=$${p.cost_price || 0}`);
      });
    } else {
      console.log(`✅ Zero Prices: 0 (All have prices!)`);
    }

    // 6. Check for temp prices
    const tempPrices = await sql`
      SELECT name, unit_price, cost_price
      FROM lats_products
      WHERE is_active = true
        AND (unit_price = 1.00 OR cost_price = 0.50)
    `;
    
    if (tempPrices.length > 0) {
      console.log(`\n⚠️  Products with TEMPORARY Prices: ${tempPrices.length}`);
      console.log('   (These need manual price updates):');
      tempPrices.forEach(p => {
        console.log(`   - ${p.name}: $${p.unit_price}`);
      });
    }

    // 7. Check duplicate SKUs
    const dupeSKUs = await sql`
      SELECT sku, COUNT(*) as count, STRING_AGG(name, ', ') as products
      FROM lats_products
      WHERE sku IS NOT NULL AND sku != ''
      GROUP BY sku
      HAVING COUNT(*) > 1
    `;
    
    if (dupeSKUs.length > 0) {
      console.log(`\n❌ Duplicate SKUs: ${dupeSKUs.length}`);
      dupeSKUs.forEach(d => {
        console.log(`   - SKU "${d.sku}": ${d.count} products (${d.products})`);
      });
    } else {
      console.log(`✅ Duplicate SKUs: 0 (All unique!)`);
    }

    // 8. Show sample products with variants
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  📦 SAMPLE PRODUCTS (with variant counts)                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    const sampleProducts = await sql`
      SELECT 
        p.name,
        p.unit_price,
        p.stock_quantity,
        COUNT(v.id) as variant_count,
        CASE 
          WHEN p.image_url LIKE 'data:image%' THEN 'Data URI'
          WHEN p.image_url LIKE 'https://%' THEN 'External URL'
          WHEN p.image_url IS NULL THEN 'NULL'
          ELSE LEFT(p.image_url, 30)
        END as image_status
      FROM lats_products p
      LEFT JOIN lats_product_variants v ON p.id = v.product_id AND v.is_active = true
      WHERE p.is_active = true
      GROUP BY p.id, p.name, p.unit_price, p.stock_quantity, p.image_url
      ORDER BY p.name
      LIMIT 10
    `;
    
    console.table(sampleProducts);

    // 9. Calculate overall health
    const totalProducts = parseInt(products[0].count);
    if (totalProducts > 0) {
      const withVariantsCount = totalProducts - withoutVariants.length;
      const withImagesCount = totalProducts - brokenImages.length;
      const withPricesCount = totalProducts - zeroPrices.length;
      
      const healthScore = Math.round(
        (withVariantsCount / totalProducts * 40) +
        (withImagesCount / totalProducts * 30) +
        (withPricesCount / totalProducts * 30)
      );
      
      console.log('\n╔════════════════════════════════════════════════════════════╗');
      console.log('║  🎯 OVERALL HEALTH SCORE                                   ║');
      console.log('╠════════════════════════════════════════════════════════════╣');
      console.log(`║  Score: ${healthScore}%                                             ${healthScore >= 90 ? '✅' : healthScore >= 75 ? '👍' : healthScore >= 50 ? '⚠️' : '❌'}  ║`);
      console.log(`║  Rating: ${healthScore >= 90 ? 'Excellent  ' : healthScore >= 75 ? 'Good      ' : healthScore >= 50 ? 'Fair      ' : 'Poor      '}                                        ║`);
      console.log('╠════════════════════════════════════════════════════════════╣');
      console.log(`║  Products with Variants: ${String(withVariantsCount).padEnd(31)} ║`);
      console.log(`║  Products with Images: ${String(withImagesCount).padEnd(33)} ║`);
      console.log(`║  Products with Prices: ${String(withPricesCount).padEnd(33)} ║`);
      console.log('╚════════════════════════════════════════════════════════════╝\n');

      // Final verdict
      if (withoutVariants.length === 0 && brokenImages.length === 0 && zeroPrices.length === 0) {
        console.log('🎉 SUCCESS! All critical issues are FIXED!');
        console.log('✅ Your POS system should now work perfectly.\n');
        
        if (tempPrices.length > 0) {
          console.log(`⚠️  Note: ${tempPrices.length} product(s) have temporary prices - please update these manually.\n`);
        }
      } else {
        console.log('⚠️  WARNING: Some issues still exist!');
        console.log('   Please review the issues listed above.\n');
      }
    }

    // 10. Check variant schema
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  🔧 SCHEMA VERIFICATION                                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    const schemaCheck = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'lats_product_variants'
        AND table_schema = 'public'
        AND column_name IN ('name', 'variant_name', 'attributes', 'variant_attributes', 'selling_price')
      ORDER BY column_name
    `;
    
    console.log('Variant table columns:');
    console.table(schemaCheck);

  } catch (error) {
    console.error('\n❌ Error during verification:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

verify().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

