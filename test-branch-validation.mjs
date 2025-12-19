/**
 * TEST BRANCH ISOLATION VALIDATION
 * Test that the validation now passes after fixing global products
 */

import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function testBranchValidation() {
  const sql = postgres(DATABASE_URL);

  try {
    console.log('🔍 Testing branch isolation validation...\n');

    // Simulate the validation from branchAwareApi.ts
    const issues = [];

    // Check for variants without branch_id (critical issue)
    const variantsWithoutBranchId = await sql`
      SELECT COUNT(*) as count FROM lats_product_variants
      WHERE branch_id IS NULL
    `;

    if (parseInt(variantsWithoutBranchId[0].count) > 0) {
      issues.push(`${variantsWithoutBranchId[0].count} variants found without branch_id assignment (critical)`);
    }

    // Check for products incorrectly assigned to branches (should be global)
    const productsWithBranchId = await sql`
      SELECT COUNT(*) as count FROM lats_products
      WHERE branch_id IS NOT NULL
    `;

    if (parseInt(productsWithBranchId[0].count) > 0) {
      issues.push(`${productsWithBranchId[0].count} products incorrectly assigned to branches (should be global)`);
    }

    console.log('📊 Validation Results:');
    console.log(`  Variants without branch_id: ${variantsWithoutBranchId[0].count}`);
    console.log(`  Products with branch_id: ${productsWithBranchId[0].count}`);

    if (issues.length === 0) {
      console.log('✅ SUCCESS: Branch isolation validation passed - no issues found!');
    } else {
      console.log('❌ FAILURE: Branch isolation issues still exist:');
      issues.forEach(issue => console.log(`  - ${issue}`));
    }

    return issues.length === 0;

  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  } finally {
    await sql.end();
  }
}

testBranchValidation()
  .then(success => {
    console.log(`\n🏆 TEST RESULT: ${success ? 'PASSED' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n💥 Error:', error.message);
    process.exit(1);
  });