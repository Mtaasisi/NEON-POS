/**
 * CHECK PRODUCT BRANCH ASSIGNMENTS
 * Debug script to see exactly which products have branch_id assigned
 */

import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function checkProductBranches() {
  const sql = postgres(DATABASE_URL);

  try {
    console.log('🔍 Checking product branch assignments...\n');

    // Raw query to see all products and their branch_id
    const allProducts = await sql`
      SELECT id, name, branch_id, created_at
      FROM lats_products
      ORDER BY created_at DESC
      LIMIT 10
    `;

    console.log('📋 Recent products:');
    allProducts.forEach(p => {
      console.log(`  ${p.name} (ID: ${p.id}) - branch_id: ${p.branch_id || 'NULL'}`);
    });

    // Count products with non-null branch_id
    const branchAssignedCount = await sql`
      SELECT COUNT(*) as count
      FROM lats_products
      WHERE branch_id IS NOT NULL
    `;

    console.log(`\n📊 Products with branch_id assigned: ${branchAssignedCount[0].count}`);

    if (branchAssignedCount[0].count > 0) {
      const branchAssignedProducts = await sql`
        SELECT id, name, branch_id
        FROM lats_products
        WHERE branch_id IS NOT NULL
      `;

      console.log('\n📋 Products with branch assignments:');
      branchAssignedProducts.forEach(p => {
        console.log(`  ${p.name} (ID: ${p.id}) - branch: ${p.branch_id}`);
      });
    }

    // Check the specific validation query from branchAwareApi.ts
    const validationQuery = await sql`
      SELECT COUNT(*) as count
      FROM lats_products
      WHERE branch_id IS NOT NULL
    `;

    console.log(`\n🔍 Validation query result: ${validationQuery[0].count} products with branch_id`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sql.end();
  }
}

checkProductBranches()
  .then(() => console.log('\n✅ Check completed'))
  .catch(error => console.error('\n💥 Error:', error.message));