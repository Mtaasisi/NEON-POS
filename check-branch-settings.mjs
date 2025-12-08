import { Pool } from '@neondatabase/serverless';

// Target database (Production/Supabase)
const TARGET_DB = 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const targetPool = new Pool({ connectionString: TARGET_DB });

async function checkBranchSettings() {
  console.log('🔍 Checking Branch Settings and Isolation Mode\n');
  console.log('📊 Database: aws-0-eu-north-1.pooler.supabase.com\n');

  const branchId = '24cd45b8-1ce1-486a-b055-29d169c3a8ea';

  // 1. Check lats_branches table structure
  console.log('1️⃣ Checking lats_branches table structure...');
  try {
    const columns = await targetPool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'lats_branches'
      ORDER BY column_name
    `);
    console.log(`   Columns (${columns.rows.length}):`);
    columns.rows.forEach(c => {
      if (c.column_name.includes('isolation') || c.column_name.includes('share') || c.column_name.includes('data')) {
        console.log(`   - ${c.column_name}: ${c.data_type} (nullable=${c.is_nullable})`);
      }
    });
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  // 2. Check branch data
  console.log('\n2️⃣ Checking branch data...');
  try {
    const branch = await targetPool.query(`
      SELECT *
      FROM lats_branches
      WHERE id = $1
    `, [branchId]);

    if (branch.rows.length > 0) {
      const b = branch.rows[0];
      console.log(`   Branch found: ${b.name || 'Unknown'}`);
      console.log(`   Active: ${b.is_active}`);
      console.log(`   All columns: ${Object.keys(b).join(', ')}`);
    } else {
      console.log(`   ❌ Branch not found!`);
    }
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  // 3. Check if we need to add isolation mode columns
  console.log('\n3️⃣ Checking if isolation mode columns exist...');
  try {
    const hasIsolationMode = await targetPool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lats_branches' 
        AND column_name = 'data_isolation_mode'
      )
    `);
    console.log(`   data_isolation_mode exists: ${hasIsolationMode.rows[0].exists}`);

    const hasShareSuppliers = await targetPool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lats_branches' 
        AND column_name = 'share_suppliers'
      )
    `);
    console.log(`   share_suppliers exists: ${hasShareSuppliers.rows[0].exists}`);
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  await targetPool.end();
  console.log('\n✅ Done!');
}

checkBranchSettings().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

