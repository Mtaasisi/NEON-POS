import { Pool } from '@neondatabase/serverless';

// Target database (Production/Supabase)
const TARGET_DB = 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const targetPool = new Pool({ connectionString: TARGET_DB });

async function checkVariantsIsolation() {
  console.log('🔍 Checking Product Variants Branch Isolation\n');
  console.log('📊 Database: aws-0-eu-north-1.pooler.supabase.com\n');

  const branchId = '24cd45b8-1ce1-486a-b055-29d169c3a8ea';

  // 1. Check variants distribution
  console.log('1️⃣ Checking variants branch_id distribution...');
  try {
    const variantDist = await targetPool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE branch_id IS NULL) as null_branch,
        COUNT(*) FILTER (WHERE branch_id = $1) as this_branch,
        COUNT(*) FILTER (WHERE is_shared = true) as shared,
        COUNT(*) FILTER (WHERE branch_id != $1 AND branch_id IS NOT NULL) as other_branch
      FROM lats_product_variants
    `, [branchId]);
    
    const d = variantDist.rows[0];
    console.log(`   Total variants: ${d.total}`);
    console.log(`   NULL branch_id: ${d.null_branch}`);
    console.log(`   This branch: ${d.this_branch}`);
    console.log(`   Shared: ${d.shared}`);
    console.log(`   Other branches: ${d.other_branch}`);
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  // 2. Check branch settings for variants
  console.log('\n2️⃣ Checking branch settings for variants...');
  try {
    const branch = await targetPool.query(`
      SELECT share_products, data_isolation_mode
      FROM store_locations
      WHERE id = $1
    `, [branchId]);

    if (branch.rows.length > 0) {
      const b = branch.rows[0];
      console.log(`   Isolation mode: ${b.data_isolation_mode}`);
      console.log(`   Share products: ${b.share_products}`);
    }
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  // 3. Test different query scenarios
  console.log('\n3️⃣ Testing variant query scenarios...');

  // Scenario A: Isolated (only this branch)
  try {
    const isolated = await targetPool.query(`
      SELECT COUNT(*) as count 
      FROM lats_product_variants 
      WHERE branch_id = $1
    `, [branchId]);
    console.log(`   A. Isolated mode (branch_id = branch): ${isolated.rows[0].count}`);
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  // Scenario B: Hybrid - shared (branch OR shared OR null)
  try {
    const hybridShared = await targetPool.query(`
      SELECT COUNT(*) as count 
      FROM lats_product_variants 
      WHERE branch_id = $1 OR is_shared = true OR branch_id IS NULL
    `, [branchId]);
    console.log(`   B. Hybrid mode - shared (branch OR shared OR null): ${hybridShared.rows[0].count}`);
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  // Scenario C: Default (branch OR null)
  try {
    const defaultMode = await targetPool.query(`
      SELECT COUNT(*) as count 
      FROM lats_product_variants 
      WHERE branch_id = $1 OR branch_id IS NULL
    `, [branchId]);
    console.log(`   C. Default mode (branch OR null): ${defaultMode.rows[0].count}`);
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  // 4. Check if variants need to be updated
  console.log('\n4️⃣ Checking if variants need branch_id or is_shared updates...');
  try {
    const needsUpdate = await targetPool.query(`
      SELECT COUNT(*) as count
      FROM lats_product_variants
      WHERE (branch_id IS NULL AND (is_shared IS NULL OR is_shared = false))
    `);
    console.log(`   Variants needing update: ${needsUpdate.rows[0].count}`);
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  await targetPool.end();
  console.log('\n✅ Done!');
}

checkVariantsIsolation().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

