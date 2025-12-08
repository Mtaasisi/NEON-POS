import { Pool } from '@neondatabase/serverless';

// Source database (Developer/Neon)
const SOURCE_DB = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

// Target database (Production/Supabase)
const TARGET_DB = 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const sourcePool = new Pool({ connectionString: SOURCE_DB });
const targetPool = new Pool({ connectionString: TARGET_DB });

// Critical tables to check
const criticalTables = [
  'customers',
  'lats_customers',
  'employees',
  'lats_sales',
  'lats_sale_items',
  'lats_products',
  'lats_product_variants',
  'lats_categories',
  'lats_branches',
  'lats_suppliers',
  'lats_purchase_orders',
  'lats_purchase_order_items',
  'finance_accounts',
  'finance_expenses',
  'finance_transfers',
  'inventory_items',
  'lats_pos_general_settings',
  'users',
  'payment_methods',
  'payment_transactions'
];

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

async function tableExists(pool, tableName) {
  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name = $1
      )
    `, [tableName]);
    return result.rows[0].exists;
  } catch (error) {
    return false;
  }
}

async function compareTable(tableName) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📋 Checking: ${tableName}`);
  console.log('='.repeat(80));

  const sourceExists = await tableExists(sourcePool, tableName);
  const targetExists = await tableExists(targetPool, tableName);

  if (!sourceExists) {
    console.log(`⚠️  Table does not exist in SOURCE database`);
    return { match: false, missing: [], extra: [] };
  }

  if (!targetExists) {
    console.log(`❌ Table does not exist in TARGET database`);
    return { match: false, missing: [], extra: [] };
  }

  const sourceColumns = await getTableColumns(sourcePool, tableName);
  const targetColumns = await getTableColumns(targetPool, tableName);

  const sourceColumnNames = new Set(sourceColumns.map(c => c.column_name));
  const targetColumnNames = new Set(targetColumns.map(c => c.column_name));

  const missing = sourceColumns.filter(c => !targetColumnNames.has(c.column_name));
  const extra = targetColumns.filter(c => !sourceColumnNames.has(c.column_name));

  console.log(`\n📊 Source columns: ${sourceColumns.length}`);
  console.log(`📊 Target columns: ${targetColumns.length}`);

  if (missing.length > 0) {
    console.log(`\n❌ Missing columns in TARGET (${missing.length}):`);
    missing.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''}, nullable: ${col.is_nullable}, default: ${col.column_default || 'none'})`);
    });
  }

  if (extra.length > 0) {
    console.log(`\n⚠️  Extra columns in TARGET (${extra.length}):`);
    extra.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''})`);
    });
  }

  // Check for type mismatches
  const typeMismatches = [];
  for (const sourceCol of sourceColumns) {
    const targetCol = targetColumns.find(tc => tc.column_name === sourceCol.column_name);
    if (targetCol) {
      // Compare types (simplified comparison)
      const sourceType = sourceCol.udt_name || sourceCol.data_type;
      const targetType = targetCol.udt_name || targetCol.data_type;
      
      if (sourceType !== targetType && 
          !(sourceType === 'text' && targetType === 'character varying') &&
          !(sourceType === 'character varying' && targetType === 'text')) {
        typeMismatches.push({
          column: sourceCol.column_name,
          source: sourceType,
          target: targetType
        });
      }
    }
  }

  if (typeMismatches.length > 0) {
    console.log(`\n⚠️  Type mismatches (${typeMismatches.length}):`);
    typeMismatches.forEach(m => {
      console.log(`   - ${m.column}: SOURCE=${m.source}, TARGET=${m.target}`);
    });
  }

  const isMatch = missing.length === 0 && typeMismatches.length === 0;
  
  if (isMatch && extra.length === 0) {
    console.log(`\n✅ Perfect match!`);
  } else if (isMatch) {
    console.log(`\n✅ All source columns exist (${extra.length} extra columns in target are OK)`);
  } else {
    console.log(`\n❌ Mismatch detected`);
  }

  return { match: isMatch, missing, extra, typeMismatches };
}

async function verifyAll() {
  console.log('🔍 Verifying Critical Tables Match\n');
  console.log('📊 Source (Developer): ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech');
  console.log('📊 Target (Production): aws-0-eu-north-1.pooler.supabase.com\n');

  const results = [];
  
  for (const tableName of criticalTables) {
    const result = await compareTable(tableName);
    results.push({ table: tableName, ...result });
  }

  await sourcePool.end();
  await targetPool.end();

  console.log('\n' + '='.repeat(80));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(80));

  const matched = results.filter(r => r.match);
  const mismatched = results.filter(r => !r.match);
  const totalMissing = results.reduce((sum, r) => sum + r.missing.length, 0);

  console.log(`\n✅ Perfect matches: ${matched.length}/${results.length}`);
  console.log(`❌ Mismatches: ${mismatched.length}/${results.length}`);
  console.log(`❌ Total missing columns: ${totalMissing}`);

  if (mismatched.length > 0) {
    console.log(`\n❌ Tables with issues:`);
    mismatched.forEach(r => {
      console.log(`   - ${r.table}: ${r.missing.length} missing columns`);
    });
  }

  if (totalMissing === 0) {
    console.log(`\n🎉 All critical tables match perfectly!`);
  } else {
    console.log(`\n⚠️  Some columns are missing. Run migration to fix.`);
  }
}

verifyAll().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

