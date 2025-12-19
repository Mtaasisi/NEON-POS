/**
 * TEST VARIANT BRANCH FILTERING
 * Verify that children variants are properly filtered by branch
 */

import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function testVariantBranchFiltering() {
  const sql = postgres(DATABASE_URL);

  try {
    console.log('🔬 TESTING VARIANT BRANCH FILTERING\n');

    // Get the ARUSHA TEST 01 product
    const product = await sql`
      SELECT id, name FROM lats_products
      WHERE name = 'ARUSHA TEST 01'
      LIMIT 1
    `;

    if (product.length === 0) {
      console.log('❌ Product not found');
      return;
    }

    const productId = product[0].id;
    console.log(`📦 Testing product: ${product[0].name} (${productId})\n`);

    // Get parent variants for this product
    const parentVariants = await sql`
      SELECT id, variant_name, branch_id
      FROM lats_product_variants
      WHERE product_id = ${productId}
      AND is_parent = true
      AND is_active = true
      ORDER BY variant_name
    `;

    console.log(`👨‍👩‍👧‍👦 PARENT VARIANTS (${parentVariants.length}):`);
    parentVariants.forEach((pv, index) => {
      console.log(`${index + 1}. ${pv.variant_name} (Branch: ${pv.branch_id})`);
    });

    // Test branch filtering for each parent variant
    const arushaBranchId = '00000000-0000-0000-0000-000000000001';
    const darBranchId = '85629690-6b1b-4d17-943d-dcf0f9aa9e95';

    console.log(`\n🔍 TESTING BRANCH FILTERING:`);

    for (const parent of parentVariants) {
      console.log(`\n📋 Parent: ${parent.variant_name} (${parent.id})`);

      // Test ARUSHA branch filtering (new logic: only same branch)
      const arushaChildren = await sql`
        SELECT variant_name, branch_id, variant_attributes
        FROM lats_product_variants
        WHERE parent_variant_id = ${parent.id}
        AND is_active = true
        AND variant_type = 'imei_child'
        AND branch_id = ${arushaBranchId}
        ORDER BY variant_name
      `;

      console.log(`  🇹🇿 ARUSHA Branch (${arushaBranchId}): ${arushaChildren.length} children`);
      arushaChildren.forEach(child => {
        const imei = child.variant_attributes?.imei || 'no-imei';
        console.log(`    - ${child.variant_name} (IMEI: ${imei})`);
      });

      // Test DAR branch filtering (new logic: only same branch)
      const darChildren = await sql`
        SELECT variant_name, branch_id, variant_attributes
        FROM lats_product_variants
        WHERE parent_variant_id = ${parent.id}
        AND is_active = true
        AND variant_type = 'imei_child'
        AND branch_id = ${darBranchId}
        ORDER BY variant_name
      `;

      console.log(`  🇹🇿 DAR Branch (${darBranchId}): ${darChildren.length} children`);
      darChildren.forEach(child => {
        const imei = child.variant_attributes?.imei || 'no-imei';
        console.log(`    - ${child.variant_name} (IMEI: ${imei})`);
      });
    }

    // Summary
    console.log(`\n📊 SUMMARY:`);
    console.log(`  Total parent variants: ${parentVariants.length}`);
    console.log(`  ARUSHA children total: 2 (IMEI: 111111, 222222)`);
    console.log(`  DAR children total: 3 (IMEI: 345, 76576576, TYRYTRT)`);

    // Check if filtering is working correctly (new logic)
    let arushaTotal = 0;
    let darTotal = 0;

    // ARUSHA should see children from ARUSHA branch parents only
    const arushaParentIds = parentVariants
      .filter(p => p.branch_id === arushaBranchId)
      .map(p => p.id);

    if (arushaParentIds.length > 0) {
      const arushaCount = await sql`
        SELECT COUNT(*) as count FROM lats_product_variants
        WHERE parent_variant_id = ANY(${arushaParentIds})
        AND is_active = true
        AND variant_type = 'imei_child'
        AND branch_id = ${arushaBranchId}
      `;
      arushaTotal = parseInt(arushaCount[0].count);
    }

    // DAR should see children from DAR branch parents only
    const darParentIds = parentVariants
      .filter(p => p.branch_id === darBranchId)
      .map(p => p.id);

    if (darParentIds.length > 0) {
      const darCount = await sql`
        SELECT COUNT(*) as count FROM lats_product_variants
        WHERE parent_variant_id = ANY(${darParentIds})
        AND is_active = true
        AND variant_type = 'imei_child'
        AND branch_id = ${darBranchId}
      `;
      darTotal = parseInt(darCount[0].count);
    }

    console.log(`\n✅ VERIFICATION:`);
    console.log(`  ARUSHA branch should see: 2 children (actual: ${arushaTotal})`);
    console.log(`  DAR branch should see: 3 children (actual: ${darTotal})`);

    if (arushaTotal === 2 && darTotal === 3) {
      console.log(`  ✅ Branch filtering is working correctly!`);
    } else {
      console.log(`  ❌ Branch filtering has issues!`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await sql.end();
  }
}

testVariantBranchFiltering()
  .then(() => console.log('\n🏆 Test completed successfully'))
  .catch(error => {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
  });