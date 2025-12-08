import { Pool } from '@neondatabase/serverless';

// Target database (Production/Supabase)
const TARGET_DB = 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const targetPool = new Pool({ connectionString: TARGET_DB });

async function checkSuppliersQuery() {
  console.log('🔍 Checking Suppliers Query Issues\n');
  console.log('📊 Database: aws-0-eu-north-1.pooler.supabase.com\n');

  const branchId = '24cd45b8-1ce1-486a-b055-29d169c3a8ea';

  // Check suppliers with different query patterns
  console.log('1️⃣ All suppliers (no filter):');
  try {
    const all = await targetPool.query('SELECT COUNT(*) as count FROM lats_suppliers');
    console.log(`   Total: ${all.rows[0].count}`);
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  console.log('\n2️⃣ Active suppliers (is_active = true):');
  try {
    const active = await targetPool.query(`
      SELECT COUNT(*) as count 
      FROM lats_suppliers 
      WHERE is_active = true
    `);
    console.log(`   Active: ${active.rows[0].count}`);
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  console.log('\n3️⃣ Suppliers with branch filter (branch_id = branch OR branch_id IS NULL OR is_shared = true):');
  try {
    const branchFiltered = await targetPool.query(`
      SELECT COUNT(*) as count 
      FROM lats_suppliers 
      WHERE is_active = true 
      AND (branch_id = $1 OR branch_id IS NULL OR is_shared = true)
    `, [branchId]);
    console.log(`   Accessible: ${branchFiltered.rows[0].count}`);
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  console.log('\n4️⃣ Suppliers details:');
  try {
    const details = await targetPool.query(`
      SELECT id, name, is_active, branch_id, is_shared
      FROM lats_suppliers
      WHERE is_active = true
      LIMIT 10
    `);
    console.log(`   Found ${details.rows.length} suppliers:`);
    details.rows.forEach(s => {
      console.log(`   - ${s.name}: active=${s.is_active}, branch_id=${s.branch_id}, shared=${s.is_shared}`);
    });
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  // Check if is_active column exists
  console.log('\n5️⃣ Checking column structure:');
  try {
    const columns = await targetPool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'lats_suppliers'
      AND column_name IN ('is_active', 'branch_id', 'is_shared')
      ORDER BY column_name
    `);
    console.log(`   Columns:`);
    columns.rows.forEach(c => {
      console.log(`   - ${c.column_name}: ${c.data_type}, nullable=${c.is_nullable}, default=${c.column_default || 'none'}`);
    });
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  await targetPool.end();
  console.log('\n✅ Done!');
}

checkSuppliersQuery().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

