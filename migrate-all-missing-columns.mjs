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
    return [];
  }
}

function buildColumnDefinition(col, allowNullable = true) {
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
    // Handle array types
    if (col.udt_name && col.udt_name.includes('uuid')) {
      dataType = 'UUID[]';
    } else if (col.udt_name && col.udt_name.includes('text')) {
      dataType = 'TEXT[]';
    } else {
      dataType = 'TEXT[]'; // Default to text array
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
  
  // Add NOT NULL only if not allowing nullable (for initial add)
  if (col.is_nullable === 'NO' && !allowNullable) {
    def += ' NOT NULL';
  }
  
  // Add default value if exists
  if (col.column_default) {
    // Clean up default value
    let defaultValue = col.column_default;
    // Remove ::type casts for cleaner SQL
    defaultValue = defaultValue.replace(/::[a-z_\[\]]+/gi, '');
    // Handle function calls
    if (defaultValue.includes('now()')) {
      defaultValue = 'now()';
    } else if (defaultValue.includes('CURRENT_DATE')) {
      defaultValue = 'CURRENT_DATE';
    } else if (defaultValue.includes('gen_random_uuid()')) {
      defaultValue = 'gen_random_uuid()';
    } else if (defaultValue.includes('ARRAY[]')) {
      defaultValue = "'{}'";
    } else if (defaultValue.includes("'")) {
      // Keep string defaults as is
    }
    def += ` DEFAULT ${defaultValue}`;
  }
  
  return def;
}

async function columnExists(pool, tableName, columnName) {
  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
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

async function addColumn(pool, tableName, columnDef, col) {
  try {
    // First, add column as nullable (even if it should be NOT NULL)
    const nullableDef = buildColumnDefinition(col, true);
    const sql = `ALTER TABLE ${tableName} ADD COLUMN ${nullableDef}`;
    await pool.query(sql);
    
    // If it should be NOT NULL and has a default, update existing rows first
    if (col.is_nullable === 'NO' && col.column_default) {
      try {
        let defaultValue = col.column_default.replace(/::[a-z_\[\]]+/gi, '');
        if (defaultValue.includes('now()')) {
          defaultValue = 'now()';
        } else if (defaultValue.includes('CURRENT_DATE')) {
          defaultValue = 'CURRENT_DATE';
        } else if (defaultValue.includes('gen_random_uuid()')) {
          defaultValue = 'gen_random_uuid()';
        } else if (defaultValue.includes('ARRAY[]')) {
          defaultValue = "'{}'";
        }
        
        await pool.query(`
          UPDATE ${tableName} 
          SET ${col.column_name} = ${defaultValue} 
          WHERE ${col.column_name} IS NULL
        `);
      } catch (updateError) {
        // If update fails, column stays nullable - that's okay
        console.log(`      ⚠️  Could not set default values for ${col.column_name}`);
      }
      
      // Now try to alter to NOT NULL
      try {
        await pool.query(`ALTER TABLE ${tableName} ALTER COLUMN ${col.column_name} SET NOT NULL`);
      } catch (notNullError) {
        // If this fails, column stays nullable - that's okay for now
        console.log(`      ⚠️  Could not set NOT NULL for ${col.column_name} (existing null values)`);
      }
    }
    
    return true;
  } catch (error) {
    // If column already exists or other error, log and continue
    if (error.message.includes('already exists')) {
      return false; // Already exists
    }
    throw error;
  }
}

async function migrateAllColumns() {
  console.log('🚀 Starting Complete Schema Migration\n');
  console.log('📊 Source (Developer): ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech');
  console.log('📊 Target (Production): aws-0-eu-north-1.pooler.supabase.com\n');

  // Get all tables from source
  const sourceTables = await getAllTables(sourcePool);
  console.log(`📋 Found ${sourceTables.length} tables in source database\n`);

  let totalAdded = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  const errors = [];

  // Process each table
  for (const tableName of sourceTables) {
    const sourceColumns = await getTableColumns(sourcePool, tableName);
    const targetColumns = await getTableColumns(targetPool, tableName);

    if (targetColumns.length === 0) {
      console.log(`⚠️  Table ${tableName} doesn't exist in target, skipping...`);
      continue;
    }

    const targetColumnNames = new Set(targetColumns.map(c => c.column_name));
    const missingColumns = sourceColumns.filter(
      sc => !targetColumnNames.has(sc.column_name)
    );

    if (missingColumns.length > 0) {
      console.log(`\n📋 ${tableName} (${missingColumns.length} missing columns):`);
      
      for (const col of missingColumns) {
        const exists = await columnExists(targetPool, tableName, col.column_name);
        if (exists) {
          totalSkipped++;
          continue;
        }

        try {
          const colDef = buildColumnDefinition(col, true);
          const added = await addColumn(targetPool, tableName, colDef, col);
          
          if (added) {
            console.log(`   ✅ Added: ${col.column_name}`);
            totalAdded++;
          } else {
            totalSkipped++;
          }
        } catch (error) {
          console.error(`   ❌ Error adding ${col.column_name}:`, error.message);
          errors.push({ table: tableName, column: col.column_name, error: error.message });
          totalErrors++;
        }
      }
    }
  }

  await sourcePool.end();
  await targetPool.end();

  console.log('\n' + '='.repeat(80));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Columns Added: ${totalAdded}`);
  console.log(`⏭️  Columns Skipped (already exist): ${totalSkipped}`);
  console.log(`❌ Errors: ${totalErrors}`);
  
  if (errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    errors.forEach(e => {
      console.log(`   ${e.table}.${e.column}: ${e.error}`);
    });
  }

  console.log('\n✅ Migration complete!');
}

migrateAllColumns().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

