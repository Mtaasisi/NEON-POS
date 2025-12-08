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
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);
    return result.rows.map(r => r.column_name);
  } catch (error) {
    return [];
  }
}

async function getAllTables(pool) {
  try {
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    return result.rows.map(r => r.table_name);
  } catch (error) {
    return [];
  }
}

async function checkBranchIsolation() {
  console.log('🔍 Checking Branch Isolation Across All Tables\n');
  console.log('📊 Source (Developer): ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech');
  console.log('📊 Target (Production): aws-0-eu-north-1.pooler.supabase.com\n');

  // Get all tables from source
  const sourceTables = await getAllTables(sourcePool);
  console.log(`📋 Found ${sourceTables.length} tables in source database\n`);

  const tablesWithBranchId = [];
  const tablesMissingBranchId = [];
  const tablesWithIsShared = [];
  const tablesMissingIsShared = [];

  // Check each table
  for (const tableName of sourceTables) {
    const sourceColumns = await getTableColumns(sourcePool, tableName);
    const targetColumns = await getTableColumns(targetPool, tableName);

    if (targetColumns.length === 0) {
      // Table doesn't exist in target, skip
      continue;
    }

    const sourceHasBranchId = sourceColumns.includes('branch_id');
    const targetHasBranchId = targetColumns.includes('branch_id');
    const sourceHasIsShared = sourceColumns.includes('is_shared');
    const targetHasIsShared = targetColumns.includes('is_shared');

    if (sourceHasBranchId) {
      if (targetHasBranchId) {
        tablesWithBranchId.push(tableName);
      } else {
        tablesMissingBranchId.push(tableName);
      }
    }

    if (sourceHasIsShared) {
      if (targetHasIsShared) {
        tablesWithIsShared.push(tableName);
      } else {
        tablesMissingIsShared.push(tableName);
      }
    }
  }

  // Print results
  console.log('='.repeat(80));
  console.log('📊 BRANCH ISOLATION REPORT');
  console.log('='.repeat(80));

  console.log(`\n✅ Tables with branch_id in BOTH source and target (${tablesWithBranchId.length}):`);
  if (tablesWithBranchId.length > 0) {
    tablesWithBranchId.forEach(t => console.log(`   - ${t}`));
  }

  console.log(`\n❌ Tables MISSING branch_id in target (${tablesMissingBranchId.length}):`);
  if (tablesMissingBranchId.length > 0) {
    tablesMissingBranchId.forEach(t => console.log(`   - ${t}`));
  } else {
    console.log('   ✅ All tables that need branch_id have it!');
  }

  console.log(`\n✅ Tables with is_shared in BOTH source and target (${tablesWithIsShared.length}):`);
  if (tablesWithIsShared.length > 0) {
    tablesWithIsShared.forEach(t => console.log(`   - ${t}`));
  }

  console.log(`\n❌ Tables MISSING is_shared in target (${tablesMissingIsShared.length}):`);
  if (tablesMissingIsShared.length > 0) {
    tablesMissingIsShared.forEach(t => console.log(`   - ${t}`));
  } else {
    console.log('   ✅ All tables that need is_shared have it!');
  }

  await sourcePool.end();
  await targetPool.end();

  return {
    tablesWithBranchId,
    tablesMissingBranchId,
    tablesWithIsShared,
    tablesMissingIsShared
  };
}

checkBranchIsolation().then(result => {
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total tables with branch_id: ${result.tablesWithBranchId.length}`);
  console.log(`Missing branch_id: ${result.tablesMissingBranchId.length}`);
  console.log(`Total tables with is_shared: ${result.tablesWithIsShared.length}`);
  console.log(`Missing is_shared: ${result.tablesMissingIsShared.length}`);

  if (result.tablesMissingBranchId.length === 0 && result.tablesMissingIsShared.length === 0) {
    console.log('\n🎉 All branch isolation columns are present!');
  } else {
    console.log('\n⚠️  Some columns are missing. Run migration to fix.');
  }

  process.exit(0);
}).catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

