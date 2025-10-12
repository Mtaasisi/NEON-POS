#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

async function fixMissingVariants() {
  try {
    console.log('\n🔧 Fixing Missing Variants');
    console.log('===========================\n');
    
    // Get all products without variants
    console.log('1️⃣ Finding products without variants...');
    const productsWithoutVariants = await sql`
      SELECT p.id, p.name, p.sku, p.selling_price, p.cost_price, p.stock_quantity, p.min_stock_level
      FROM lats_products p
      LEFT JOIN lats_product_variants v ON p.id = v.product_id
      WHERE v.id IS NULL
    `;
    
    console.log(`   Found ${productsWithoutVariants.length} products without variants\n`);
    
    if (productsWithoutVariants.length === 0) {
      console.log('✅ All products already have variants!\n');
      return;
    }
    
    console.log('2️⃣ Creating default variants for each product...\n');
    
    let createdCount = 0;
    for (const product of productsWithoutVariants) {
      try {
        // Create a default variant with the product's data
        const variantData = {
          product_id: product.id,
          sku: `${product.sku}-VAR-DEFAULT`,
          name: 'Default',
          cost_price: product.cost_price || 0,
          selling_price: product.selling_price || 0,
          quantity: product.stock_quantity || 0,
          min_quantity: product.min_stock_level || 0,
          attributes: {},
          barcode: null,
          weight: null,
          dimensions: null
        };
        
        await sql`
          INSERT INTO lats_product_variants (
            product_id, sku, name,
            cost_price, selling_price,
            quantity, min_quantity,
            attributes, barcode, weight, dimensions
          ) VALUES (
            ${variantData.product_id},
            ${variantData.sku},
            ${variantData.name},
            ${variantData.cost_price},
            ${variantData.selling_price},
            ${variantData.quantity},
            ${variantData.min_quantity},
            ${JSON.stringify(variantData.attributes)}::jsonb,
            ${variantData.barcode},
            ${variantData.weight},
            ${variantData.dimensions}
          )
        `;
        
        console.log(`   ✅ Created variant for: ${product.name}`);
        console.log(`      SKU: ${variantData.sku}`);
        console.log(`      Price: ${variantData.selling_price}`);
        console.log(`      Stock: ${variantData.quantity}`);
        console.log('');
        
        createdCount++;
        
      } catch (error) {
        console.log(`   ❌ Failed to create variant for ${product.name}: ${error.message}\n`);
      }
    }
    
    console.log('===========================');
    console.log(`✅ CREATED ${createdCount} DEFAULT VARIANTS`);
    console.log('===========================\n');
    
    // Verify the fix
    console.log('3️⃣ Verifying fix...');
    const remainingProductsWithoutVariants = await sql`
      SELECT COUNT(*) as count
      FROM lats_products p
      LEFT JOIN lats_product_variants v ON p.id = v.product_id
      WHERE v.id IS NULL
    `;
    
    const remaining = remainingProductsWithoutVariants[0].count;
    
    if (remaining === 0) {
      console.log('   ✅ All products now have variants!\n');
      console.log('🎉 FIXED! Your inventory should now show proper prices!\n');
    } else {
      console.log(`   ⚠️  ${remaining} products still without variants\n`);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Details:', error);
    process.exit(1);
  }
}

fixMissingVariants();

