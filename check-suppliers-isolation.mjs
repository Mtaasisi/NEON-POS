import { Pool } from '@neondatabase/serverless';

// Target database (Production/Supabase)
const TARGET_DB = 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const targetPool = new Pool({ connectionString: TARGET_DB });

async function checkSuppliersIsolation() {
  console.log('🔍 Checking Suppliers Branch Isolation Settings\n');
  console.log('📊 Database: aws-0-eu-north-1.pooler.supabase.com\n');

  const branchId = '24cd45b8-1ce1-486a-b055-29d169c3a8ea';

  // 1. Check branch settings
  console.log('1️⃣ Checking branch settings...');
  try {
    const branch = await targetPool.query(`
      SELECT id, name, data_isolation_mode, share_suppliers
      FROM lats_branches
      WHERE id = $1
    `, [branchId]);

    if (branch.rows.length > 0) {
      const b = branch.rows[0];
      console.log(`   Branch: ${b.name}`);
      console.log(`   Data isolation mode: ${b.data_isolation_mode || 'not set'}`);
      console.log(`   Share suppliers: ${b.share_suppliers || 'not set'}`);
    } else {
      console.log(`   ❌ Branch not found!`);
    }
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  // 2. Check suppliers with different isolation scenarios
  console.log('\n2️⃣ Testing different query scenarios...');

  // Scenario A: No filter (all suppliers)
  try {
    const all = await targetPool.query(`
      SELECT COUNT(*) as count 
      FROM lats_suppliers 
      WHERE is_active = true 
      AND is_trade_in_customer != true
    `);
    console.log(`   A. All active suppliers (no branch filter): ${all.rows[0].count}`);
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  // Scenario B: Isolated mode (only this branch)
  try {
    const isolated = await targetPool.query(`
      SELECT COUNT(*) as count 
      FROM lats_suppliers 
      WHERE is_active = true 
      AND is_trade_in_customer != true
      AND branch_id = $1
    `, [branchId]);
    console.log(`   B. Isolated mode (branch_id = branch): ${isolated.rows[0].count}`);
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  // Scenario C: Hybrid mode - shared (branch OR is_shared OR null)
  try {
    const hybridShared = await targetPool.query(`
      SELECT COUNT(*) as count 
      FROM lats_suppliers 
      WHERE is_active = true 
      AND is_trade_in_customer != true
      AND (branch_id = $1 OR is_shared = true OR branch_id IS NULL)
    `, [branchId]);
    console.log(`   C. Hybrid mode - shared (branch OR shared OR null): ${hybridShared.rows[0].count}`);
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  // Scenario D: Default (branch OR null)
  try {
    const defaultMode = await targetPool.query(`
      SELECT COUNT(*) as count 
      FROM lats_suppliers 
      WHERE is_active = true 
      AND is_trade_in_customer != true
      AND (branch_id = $1 OR branch_id IS NULL)
    `, [branchId]);
    console.log(`   D. Default mode (branch OR null): ${defaultMode.rows[0].count}`);
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  // 3. Check supplier details
  console.log('\n3️⃣ Supplier details:');
  try {
    const suppliers = await targetPool.query(`
      SELECT name, is_active, branch_id, is_shared, is_trade_in_customer
      FROM lats_suppliers
      WHERE is_active = true
      LIMIT 10
    `);
    suppliers.rows.forEach(s => {
      console.log(`   - ${s.name}: active=${s.is_active}, branch=${s.branch_id || 'null'}, shared=${s.is_shared}, trade_in=${s.is_trade_in_customer}`);
    });
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  // 4. Check if is_trade_in_customer column exists
  console.log('\n4️⃣ Checking column structure:');
  try {
    const columns = await targetPool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'lats_suppliers'
      AND column_name IN ('is_active', 'branch_id', 'is_shared', 'is_trade_in_customer')
      ORDER BY column_name
    `);
    columns.rows.forEach(c => {
      console.log(`   - ${c.column_name}: ${c.data_type}, nullable=${c.is_nullable}, default=${c.column_default || 'none'}`);
    });
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  await targetPool.end();
  console.log('\n✅ Done!');
}

checkSuppliersIsolation().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

