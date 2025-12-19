/**
 * DEBUG ARUSHA TEST 01 PRODUCT VARIANTS
 * Check what's actually stored in the database for this product
 */

import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function debugArushaTestProduct() {
  const sql = postgres(DATABASE_URL);

  try {
    console.log('🔍 DEBUGGING ARUSHA TEST 01 PRODUCT\n');

    // First, find the product
    const product = await sql`
      SELECT * FROM lats_products
      WHERE name = 'ARUSHA TEST 01'
      LIMIT 1
    `;

    if (product.length === 0) {
      console.log('❌ Product "ARUSHA TEST 01" not found');
      return;
    }

    const productId = product[0].id;
    console.log('📦 Product found:', {
      id: productId,
      name: product[0].name,
      branch_id: product[0].branch_id,
      created_at: product[0].created_at,
      updated_at: product[0].updated_at
    });

    // Get all variants for this product
    const allVariants = await sql`
      SELECT
        id,
        product_id,
        branch_id,
        variant_name,
        name,
        sku,
        quantity,
        is_parent,
        is_active,
        parent_variant_id,
        variant_attributes,
        variant_type,
        created_at,
        updated_at
      FROM lats_product_variants
      WHERE product_id = ${productId}
      ORDER BY is_parent DESC, created_at ASC
    `;

    console.log(`\n🔧 ALL VARIANTS (${allVariants.length} total):`);
    allVariants.forEach((variant, index) => {
      const type = variant.is_parent ? 'PARENT' : 'CHILD';
      const imei = variant.variant_attributes?.imei || 'none';
      console.log(`${index + 1}. ${variant.variant_name} (${type})`);
      console.log(`   ID: ${variant.id}`);
      console.log(`   Branch: ${variant.branch_id}`);
      console.log(`   Quantity: ${variant.quantity}`);
      console.log(`   IMEI: ${imei}`);
      console.log(`   Created: ${variant.created_at}`);
      console.log(`   Active: ${variant.is_active}`);
      console.log('');
    });

    // Separate parent and child variants
    const parentVariants = allVariants.filter(v => v.is_parent);
    const childVariants = allVariants.filter(v => !v.is_parent);

    console.log(`📊 SUMMARY:`);
    console.log(`   Parent variants: ${parentVariants.length}`);
    console.log(`   Child variants: ${childVariants.length}`);
    console.log(`   Total variants: ${allVariants.length}`);

    if (childVariants.length !== 4) {
      console.log(`\n❌ ISSUE: Expected 4 child variants but found ${childVariants.length}`);

      // Check if there are any inactive variants
      const inactiveVariants = allVariants.filter(v => !v.is_active);
      if (inactiveVariants.length > 0) {
        console.log(`⚠️  Found ${inactiveVariants.length} inactive variants:`);
        inactiveVariants.forEach(v => {
          console.log(`   - ${v.variant_name} (ID: ${v.id})`);
        });
      }

      // Check for variants with null parent_variant_id that should be children
      const orphanedVariants = allVariants.filter(v => !v.is_parent && !v.parent_variant_id);
      if (orphanedVariants.length > 0) {
        console.log(`⚠️  Found ${orphanedVariants.length} orphaned child variants (no parent):`);
        orphanedVariants.forEach(v => {
          console.log(`   - ${v.variant_name} (ID: ${v.id})`);
        });
      }
    } else {
      console.log(`\n✅ CORRECT: Found 4 child variants as expected`);
    }

    // Check recent database activity
    console.log(`\n🕐 RECENT ACTIVITY:`);
    const recentVariants = await sql`
      SELECT
        variant_name,
        created_at,
        updated_at
      FROM lats_product_variants
      WHERE product_id = ${productId}
      ORDER BY created_at DESC
      LIMIT 10
    `;

    recentVariants.forEach(v => {
      console.log(`   ${v.variant_name}: created ${v.created_at}, updated ${v.updated_at}`);
    });

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await sql.end();
  }
}

debugArushaTestProduct()
  .then(() => console.log('\n🏆 Debug completed'))
  .catch(error => {
    console.error('\n💥 Debug failed:', error.message);
    process.exit(1);
  });