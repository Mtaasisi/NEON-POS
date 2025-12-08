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

function buildColumnDefinition(col) {
  let def = col.column_name;
  
  // Map data types
  let dataType = col.data_type;
  if (col.udt_name === 'uuid') {
    dataType = 'UUID';
  } else if (col.udt_name === 'jsonb') {
    dataType = 'JSONB';
  } else if (col.udt_name === 'text') {
    dataType = 'TEXT';
  } else if (col.data_type === 'ARRAY') {
    if (col.udt_name && col.udt_name.includes('uuid')) {
      dataType = 'UUID[]';
    } else if (col.udt_name && col.udt_name.includes('text')) {
      dataType = 'TEXT[]';
    } else {
      dataType = 'TEXT[]';
    }
  } else if (col.data_type === 'character varying') {
    if (col.character_maximum_length) {
      dataType = `VARCHAR(${col.character_maximum_length})`;
    } else {
      dataType = 'TEXT';
    }
  } else if (col.data_type === 'numeric') {
    dataType = 'NUMERIC';
  } else if (col.data_type === 'integer') {
    dataType = 'INTEGER';
  } else if (col.data_type === 'boolean') {
    dataType = 'BOOLEAN';
  } else if (col.data_type === 'date') {
    dataType = 'DATE';
  } else if (col.data_type === 'timestamp with time zone') {
    dataType = 'TIMESTAMPTZ';
  } else if (col.data_type === 'timestamp without time zone') {
    dataType = 'TIMESTAMP';
  }
  
  def += ` ${dataType}`;
  
  // Add NOT NULL only if needed (we'll add as nullable first)
  // Add default value if exists
  if (col.column_default) {
    let defaultValue = col.column_default;
    defaultValue = defaultValue.replace(/::[a-z_\[\]]+/gi, '');
    if (defaultValue.includes('now()')) {
      defaultValue = 'now()';
    } else if (defaultValue.includes('CURRENT_DATE')) {
      defaultValue = 'CURRENT_DATE';
    } else if (defaultValue.includes('gen_random_uuid()')) {
      defaultValue = 'gen_random_uuid()';
    } else if (defaultValue.includes('ARRAY[]')) {
      defaultValue = "'{}'";
    }
    def += ` DEFAULT ${defaultValue}`;
  }
  
  return def;
}

async function columnExists(pool, tableName, columnName) {
  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1 
        AND column_name = $2
      )
    `, [tableName, columnName]);
    return result.rows[0].exists;
  } catch (error) {
    return false;
  }
}

async function addMissingBranchColumns() {
  console.log('🔧 Adding Missing Branch Isolation Columns\n');
  console.log('📊 Source (Developer): ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech');
  console.log('📊 Target (Production): aws-0-eu-north-1.pooler.supabase.com\n');

  // Focus on tables that should have branch isolation
  const criticalTables = [
    'customers',
    'lats_customers',
    'lats_products',
    'lats_product_variants',
    'lats_sales',
    'lats_sale_items',
    'lats_suppliers',
    'lats_purchase_orders',
    'lats_purchase_order_items',
    'inventory_items',
    'employees',
    'finance_accounts',
    'finance_expenses',
    'payment_transactions'
  ];

  let totalAdded = 0;
  const errors = [];

  for (const tableName of criticalTables) {
    const sourceColumns = await getTableColumns(sourcePool, tableName);
    const targetColumns = await getTableColumns(targetPool, tableName);

    if (targetColumns.length === 0) {
      continue; // Table doesn't exist in target
    }

    const targetColumnNames = new Set(targetColumns.map(c => c.column_name));
    
    // Focus on branch-related columns
    const branchRelatedColumns = sourceColumns.filter(c => 
      c.column_name.includes('branch') || 
      c.column_name === 'is_shared' ||
      c.column_name === 'visible_to_branches' ||
      c.column_name === 'sharing_mode' ||
      c.column_name === 'created_by_branch'
    );

    const missing = branchRelatedColumns.filter(c => !targetColumnNames.has(c.column_name));

    if (missing.length > 0) {
      console.log(`\n📋 ${tableName} (${missing.length} missing branch-related columns):`);
      
      for (const col of missing) {
        const exists = await columnExists(targetPool, tableName, col.column_name);
        if (exists) {
          continue;
        }

        try {
          const colDef = buildColumnDefinition(col);
          await targetPool.query(`ALTER TABLE ${tableName} ADD COLUMN ${colDef}`);
          console.log(`   ✅ Added: ${col.column_name}`);
          totalAdded++;
        } catch (error) {
          console.error(`   ❌ Error adding ${col.column_name}:`, error.message);
          errors.push({ table: tableName, column: col.column_name, error: error.message });
        }
      }
    }
  }

  await sourcePool.end();
  await targetPool.end();

  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Columns Added: ${totalAdded}`);
  console.log(`❌ Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    errors.forEach(e => {
      console.log(`   ${e.table}.${e.column}: ${e.error}`);
    });
  }

  console.log('\n✅ Done!');
}

addMissingBranchColumns().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

