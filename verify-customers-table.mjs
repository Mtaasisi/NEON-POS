import { Pool } from '@neondatabase/serverless';

// Source database (Developer/Neon)
const SOURCE_DB = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

// Target database (Production/Supabase)
const TARGET_DB = 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const sourcePool = new Pool({ connectionString: SOURCE_DB });
const targetPool = new Pool({ connectionString: TARGET_DB });

async function getTableColumns(pool, tableName) {
  try {
    const result = await pool.query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);
    return result.rows;
  } catch (error) {
    return [];
  }
}

async function checkCustomersTable() {
  console.log('🔍 Verifying customers Table Branch Isolation\n');
  console.log('📊 Source (Developer): ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech');
  console.log('📊 Target (Production): aws-0-eu-north-1.pooler.supabase.com\n');

  // Check if customers table exists in source
  const sourceColumns = await getTableColumns(sourcePool, 'customers');
  const targetColumns = await getTableColumns(targetPool, 'customers');

  console.log('='.repeat(80));
  console.log('📋 CUSTOMERS TABLE COMPARISON');
  console.log('='.repeat(80));

  if (sourceColumns.length === 0) {
    console.log('\n⚠️  customers table does not exist in SOURCE database');
    console.log('   (This is expected - the app uses lats_customers instead)');
  } else {
    console.log(`\n📊 Source columns: ${sourceColumns.length}`);
    const sourceColumnNames = sourceColumns.map(c => c.column_name);
    console.log(`   Columns: ${sourceColumnNames.join(', ')}`);
  }

  if (targetColumns.length === 0) {
    console.log('\n❌ customers table does not exist in TARGET database');
  } else {
    console.log(`\n📊 Target columns: ${targetColumns.length}`);
    const targetColumnNames = targetColumns.map(c => c.column_name);
    console.log(`   Columns: ${targetColumnNames.join(', ')}`);
  }

  // Check for branch_id
  const sourceHasBranchId = sourceColumns.some(c => c.column_name === 'branch_id');
  const targetHasBranchId = targetColumns.some(c => c.column_name === 'branch_id');

  console.log('\n' + '='.repeat(80));
  console.log('🔍 BRANCH ISOLATION CHECK');
  console.log('='.repeat(80));

  if (sourceHasBranchId) {
    console.log('\n✅ Source has branch_id column');
    if (targetHasBranchId) {
      console.log('✅ Target has branch_id column');
      const targetBranchId = targetColumns.find(c => c.column_name === 'branch_id');
      console.log(`   Type: ${targetBranchId.data_type}, Nullable: ${targetBranchId.is_nullable}`);
    } else {
      console.log('❌ Target MISSING branch_id column');
    }
  } else {
    console.log('\n⚠️  Source does NOT have branch_id column');
    if (targetHasBranchId) {
      console.log('✅ Target has branch_id column (extra feature)');
    } else {
      console.log('⚠️  Target also does NOT have branch_id column');
    }
  }

  // Check for is_shared
  const sourceHasIsShared = sourceColumns.some(c => c.column_name === 'is_shared');
  const targetHasIsShared = targetColumns.some(c => c.column_name === 'is_shared');

  if (sourceHasIsShared) {
    console.log('\n✅ Source has is_shared column');
    if (targetHasIsShared) {
      console.log('✅ Target has is_shared column');
      const targetIsShared = targetColumns.find(c => c.column_name === 'is_shared');
      console.log(`   Type: ${targetIsShared.data_type}, Nullable: ${targetIsShared.is_nullable}, Default: ${targetIsShared.column_default || 'none'}`);
    } else {
      console.log('❌ Target MISSING is_shared column');
    }
  } else {
    console.log('\n⚠️  Source does NOT have is_shared column');
    if (targetHasIsShared) {
      console.log('✅ Target has is_shared column (extra feature)');
    } else {
      console.log('⚠️  Target also does NOT have is_shared column');
    }
  }

  // Check for created_by_branch_name (from the error)
  const targetHasCreatedByBranchName = targetColumns.some(c => c.column_name === 'created_by_branch_name');
  console.log(`\n📋 created_by_branch_name: ${targetHasCreatedByBranchName ? '✅ Exists' : '❌ Missing'}`);

  await sourcePool.end();
  await targetPool.end();

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  
  if (targetHasBranchId && targetHasIsShared) {
    console.log('✅ customers table has proper branch isolation!');
  } else {
    console.log('⚠️  customers table may need branch isolation columns');
  }
}

checkCustomersTable().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

