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
        column_default,
        udt_name
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
    console.error('Error getting tables:', error.message);
    return [];
  }
}

async function compareSchemas() {
  console.log('🔍 Comparing Developer Database with Production Database\n');
  console.log('📊 Source (Developer): ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech');
  console.log('📊 Target (Production): aws-0-eu-north-1.pooler.supabase.com\n');

  // Get all tables from both databases
  const sourceTables = await getAllTables(sourcePool);
  const targetTables = await getAllTables(targetPool);

  console.log(`📋 Source tables: ${sourceTables.length}`);
  console.log(`📋 Target tables: ${targetTables.length}\n`);

  const missingTables = sourceTables.filter(t => !targetTables.includes(t));
  const extraTables = targetTables.filter(t => !sourceTables.includes(t));

  console.log('='.repeat(80));
  console.log('📊 SCHEMA COMPARISON RESULTS');
  console.log('='.repeat(80));

  if (missingTables.length > 0) {
    console.log(`\n❌ Missing Tables in Production (${missingTables.length}):`);
    missingTables.forEach(t => console.log(`   - ${t}`));
  } else {
    console.log('\n✅ All tables exist in production');
  }

  if (extraTables.length > 0) {
    console.log(`\n⚠️  Extra Tables in Production (${extraTables.length}):`);
    extraTables.forEach(t => console.log(`   - ${t}`));
  }

  // Compare columns for each table
  const allTables = [...new Set([...sourceTables, ...targetTables])];
  const missingColumns = [];
  const columnMismatches = [];

  console.log('\n' + '='.repeat(80));
  console.log('🔍 Comparing Columns...');
  console.log('='.repeat(80));

  for (const tableName of allTables) {
    if (!sourceTables.includes(tableName)) continue;

    const sourceColumns = await getTableColumns(sourcePool, tableName);
    const targetColumns = await getTableColumns(targetPool, tableName);

    if (targetColumns.length === 0 && sourceColumns.length > 0) {
      // Table exists in source but not in target (already handled above)
      continue;
    }

    const sourceColumnNames = new Set(sourceColumns.map(c => c.column_name));
    const targetColumnNames = new Set(targetColumns.map(c => c.column_name));

    // Find missing columns
    for (const sourceCol of sourceColumns) {
      if (!targetColumnNames.has(sourceCol.column_name)) {
        missingColumns.push({
          table: tableName,
          column: sourceCol.column_name,
          data_type: sourceCol.data_type,
          max_length: sourceCol.character_maximum_length,
          is_nullable: sourceCol.is_nullable,
          default: sourceCol.column_default,
          udt_name: sourceCol.udt_name
        });
      }
    }
  }

  if (missingColumns.length > 0) {
    console.log(`\n❌ Missing Columns in Production (${missingColumns.length}):`);
    const grouped = {};
    missingColumns.forEach(mc => {
      if (!grouped[mc.table]) grouped[mc.table] = [];
      grouped[mc.table].push(mc);
    });

    for (const [table, cols] of Object.entries(grouped)) {
      console.log(`\n   📋 ${table}:`);
      cols.forEach(col => {
        let colDef = `${col.column} (${col.data_type}`;
        if (col.max_length) colDef += `(${col.max_length})`;
        colDef += `, nullable: ${col.is_nullable}`;
        if (col.default) colDef += `, default: ${col.default}`;
        colDef += ')';
        console.log(`      - ${colDef}`);
      });
    }
  } else {
    console.log('\n✅ All columns exist in production');
  }

  await sourcePool.end();
  await targetPool.end();

  return {
    missingTables,
    missingColumns,
    sourceTables,
    targetTables
  };
}

compareSchemas().then(result => {
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`Missing Tables: ${result.missingTables.length}`);
  console.log(`Missing Columns: ${result.missingColumns.length}`);
  console.log('\n✅ Comparison complete!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

