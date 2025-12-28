#!/usr/bin/env node
/**
 * Check why products are not showing up in customer portal
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.VITE_DATABASE_URL ||
                    process.env.DATABASE_URL ||
                    'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

console.log(`🔍 Checking customer portal visibility...\n`);

async function checkPortalVisibility() {
  const sql = neon(DATABASE_URL);

  try {
    // Check what controls customer portal visibility
    console.log('📋 Customer Portal Visibility Requirements:');
    console.log('1. is_active = true');
    console.log('2. is_customer_portal_visible = true');
    console.log('3. Product must have variants with stock > 0');
    console.log('');

    // Check products that should be visible but aren't
    console.log('🔍 Checking products with is_customer_portal_visible = true:');
    const visibleQuery = `
      SELECT id, name, is_active, is_customer_portal_visible, total_quantity
      FROM lats_products
      WHERE is_customer_portal_visible = true
      ORDER BY created_at DESC
      LIMIT 10;
    `;
    const visibleProducts = await sql.query(visibleQuery);

    console.log(`Found ${visibleProducts.length} products marked as customer portal visible:`);
    visibleProducts.forEach((product, index) => {
      console.log(`  ${index + 1}. ${product.name} (ID: ${product.id})`);
      console.log(`     Active: ${product.is_active}, Portal Visible: ${product.is_customer_portal_visible}, Total Qty: ${product.total_quantity}`);
    });

    // Check if these products have active variants
    if (visibleProducts.length > 0) {
      console.log('\n🔍 Checking variants for portal-visible products:');
      const productIds = visibleProducts.map(p => p.id);
      const variantsQuery = `
        SELECT pv.product_id, pv.id, pv.sku, pv.quantity, pv.is_active, p.name as product_name
        FROM lats_product_variants pv
        JOIN lats_products p ON pv.product_id = p.id
        WHERE pv.product_id IN ('${productIds.join("','")}')
        AND pv.is_active = true
        ORDER BY pv.product_id, pv.created_at;
      `;
      const variants = await sql.query(variantsQuery);

      console.log(`Found ${variants.length} active variants:`);
      variants.forEach((variant, index) => {
        console.log(`  ${index + 1}. ${variant.product_name} - ${variant.sku} (Qty: ${variant.quantity})`);
      });
    }

    // Check what happens with the specific product "tttttt"
    console.log('\n🎯 Checking specific product "tttttt":');
    const specificQuery = `
      SELECT id, name, is_active, is_customer_portal_visible, total_quantity, attributes
      FROM lats_products
      WHERE name = 'tttttt';
    `;
    const specificProduct = await sql.query(specificQuery);

    if (specificProduct.length === 0) {
      console.log('❌ Product "tttttt" not found in database');
    } else {
      const product = specificProduct[0];
      console.log('✅ Found product:');
      console.log(`   ID: ${product.id}`);
      console.log(`   Name: ${product.name}`);
      console.log(`   Active: ${product.is_active}`);
      console.log(`   Portal Visible: ${product.is_customer_portal_visible}`);
      console.log(`   Total Quantity: ${product.total_quantity}`);
      console.log(`   Attributes: ${JSON.stringify(product.attributes, null, 2)}`);

      // Check its variants
      const variantQuery = `
        SELECT id, sku, variant_name, quantity, is_active
        FROM lats_product_variants
        WHERE product_id = '${product.id}';
      `;
      const productVariants = await sql.query(variantQuery);

      console.log(`\n   Variants (${productVariants.length} total):`);
      productVariants.forEach((variant, index) => {
        console.log(`     ${index + 1}. ${variant.sku || variant.variant_name} - Qty: ${variant.quantity}, Active: ${variant.is_active}`);
      });

      // Check active variants with stock
      const activeVariants = productVariants.filter(v => v.is_active && v.quantity > 0);
      console.log(`\n   Active variants with stock: ${activeVariants.length}`);

      if (activeVariants.length === 0) {
        console.log('❌ ISSUE: No active variants with stock > 0 - this prevents portal display');
      } else {
        console.log('✅ Has active variants with stock');
      }
    }

    // Provide solutions
    console.log('\n🛠️  Solutions to make product visible in customer portal:');
    console.log('1. Set is_customer_portal_visible = true in lats_products table');
    console.log('2. Ensure product is_active = true');
    console.log('3. Ensure at least one variant has quantity > 0 and is_active = true');
    console.log('4. Check that product has valid category and other required fields');

  } catch (error) {
    console.error('❌ Error checking portal visibility:', error);
  }
}

checkPortalVisibility();
