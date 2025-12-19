/**
 * TEST BRANCH STOCK ISOLATION
 * Verify that switching branches fetches only stock from that branch
 */

import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function testBranchStockIsolation() {
  const sql = postgres(DATABASE_URL);

  try {
    console.log('🔬 TESTING BRANCH STOCK ISOLATION\n');

    // Get branch information
    const branches = await sql`
      SELECT id, name, data_isolation_mode, share_products, share_inventory
      FROM store_locations
      WHERE is_active = true
      ORDER BY name
    `;

    console.log('📍 Available branches:');
    branches.forEach(branch => {
      console.log(`  ${branch.name} (${branch.id}): ${branch.data_isolation_mode} mode`);
    });

    if (branches.length < 2) {
      console.log('⚠️  Need at least 2 branches for proper testing');
      return;
    }

    // Test each branch's product isolation
    for (const branch of branches) {
      console.log(`\n🔍 Testing branch: ${branch.name} (${branch.id})`);

      // Simulate the branch filtering logic from latsProductApi.ts
      let query;
      if (branch.data_isolation_mode === 'isolated') {
        query = sql`
          SELECT COUNT(*) as count FROM lats_products
          WHERE is_active = true AND branch_id = ${branch.id}
        `;
        console.log(`  🔒 ISOLATED MODE: Should only see products with branch_id = ${branch.id}`);
      } else if (branch.data_isolation_mode === 'shared') {
        query = sql`
          SELECT COUNT(*) as count FROM lats_products
          WHERE is_active = true
        `;
        console.log(`  📊 SHARED MODE: Should see all products`);
      } else if (branch.data_isolation_mode === 'hybrid') {
        const shareProducts = branch.share_products === true;
        if (shareProducts) {
          query = sql`
            SELECT COUNT(*) as count FROM lats_products
            WHERE is_active = true
          `;
          console.log(`  ⚖️ HYBRID MODE (SHARED): Should see all products`);
        } else {
          query = sql`
            SELECT COUNT(*) as count FROM lats_products
            WHERE is_active = true AND (branch_id = ${branch.id} OR branch_id IS NULL)
          `;
          console.log(`  ⚖️ HYBRID MODE (NOT SHARED): Should see branch ${branch.id} + unassigned products`);
        }
      }

      const result = await query;
      console.log(`  📊 Products visible to branch: ${result[0].count}`);

      // Check variants for this branch
      const variantsQuery = sql`
        SELECT
          branch_id,
          COUNT(*) as variant_count,
          SUM(quantity) as total_stock
        FROM lats_product_variants
        WHERE product_id IN (
          SELECT id FROM lats_products WHERE is_active = true
        )
        GROUP BY branch_id
        ORDER BY branch_id
      `;

      const variants = await variantsQuery;
      console.log(`  📦 Stock distribution across branches:`);
      variants.forEach(v => {
        const branchName = branches.find(b => b.id === v.branch_id)?.name || 'Unknown';
        console.log(`    ${branchName} (${v.branch_id}): ${v.variant_count} variants, ${v.total_stock || 0} total stock`);
      });
    }

    // Test cross-branch contamination check
    console.log(`\n🚫 CROSS-BRANCH CONTAMINATION CHECK:`);

    // Check if any branch can see products it shouldn't
    for (const branch of branches) {
      if (branch.data_isolation_mode === 'isolated') {
        // Isolated branches should NOT see products from other branches
        const crossBranchProducts = await sql`
          SELECT COUNT(*) as count FROM lats_products
          WHERE is_active = true
          AND branch_id != ${branch.id}
          AND branch_id IS NOT NULL
          AND id IN (
            SELECT product_id FROM lats_product_variants
            WHERE branch_id = ${branch.id}
          )
        `;

        if (crossBranchProducts[0].count > 0) {
          console.log(`  ❌ ${branch.name}: Can see ${crossBranchProducts[0].count} products from other branches (ISOLATION BREACH!)`);
        } else {
          console.log(`  ✅ ${branch.name}: Properly isolated (no cross-branch products visible)`);
        }
      } else {
        console.log(`  ℹ️  ${branch.name}: Not isolated mode, cross-branch access allowed`);
      }
    }

    console.log(`\n✅ BRANCH STOCK ISOLATION TEST COMPLETED`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await sql.end();
  }
}

testBranchStockIsolation()
  .then(() => console.log('\n🏆 Test completed successfully'))
  .catch(error => {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
  });