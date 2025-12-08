import { Pool } from '@neondatabase/serverless';

// Target database (Production/Supabase)
const TARGET_DB = 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const targetPool = new Pool({ connectionString: TARGET_DB });

async function checkBranchTables() {
  console.log('🔍 Checking Branch Tables\n');
  console.log('📊 Database: aws-0-eu-north-1.pooler.supabase.com\n');

  const branchId = '24cd45b8-1ce1-486a-b055-29d169c3a8ea';

  // Check both tables
  console.log('1️⃣ Checking lats_branches table...');
  try {
    const latsBranch = await targetPool.query(`
      SELECT id, name, data_isolation_mode, share_customers
      FROM lats_branches
      WHERE id = $1
    `, [branchId]);

    if (latsBranch.rows.length > 0) {
      const b = latsBranch.rows[0];
      console.log(`   ✅ Found in lats_branches: ${b.name}`);
      console.log(`   Isolation mode: ${b.data_isolation_mode}`);
      console.log(`   Share customers: ${b.share_customers}`);
    } else {
      console.log(`   ❌ Not found in lats_branches`);
    }
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  console.log('\n2️⃣ Checking store_locations table...');
  try {
    const storeLoc = await targetPool.query(`
      SELECT id, name, data_isolation_mode, share_customers
      FROM store_locations
      WHERE id = $1
    `, [branchId]);

    if (storeLoc.rows.length > 0) {
      const s = storeLoc.rows[0];
      console.log(`   ✅ Found in store_locations: ${s.name || 'Unknown'}`);
      console.log(`   Isolation mode: ${s.data_isolation_mode || 'not set'}`);
      console.log(`   Share customers: ${s.share_customers || 'not set'}`);
    } else {
      console.log(`   ❌ Not found in store_locations`);
      
      // Check if table exists
      const tableExists = await targetPool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'store_locations'
        )
      `);
      console.log(`   Table exists: ${tableExists.rows[0].exists}`);
    }
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  // Check customers branch_id distribution
  console.log('\n3️⃣ Checking customers branch_id distribution...');
  try {
    const customerDist = await targetPool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE branch_id IS NULL) as null_branch,
        COUNT(*) FILTER (WHERE branch_id = $1) as this_branch,
        COUNT(*) FILTER (WHERE is_shared = true) as shared
      FROM customers
    `, [branchId]);
    
    const d = customerDist.rows[0];
    console.log(`   Total customers: ${d.total}`);
    console.log(`   NULL branch_id: ${d.null_branch}`);
    console.log(`   This branch: ${d.this_branch}`);
    console.log(`   Shared: ${d.shared}`);
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  await targetPool.end();
  console.log('\n✅ Done!');
}

checkBranchTables().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

