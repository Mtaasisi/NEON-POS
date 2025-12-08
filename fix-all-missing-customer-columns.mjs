import { Pool } from '@neondatabase/serverless';

// Source database (Developer)
const SOURCE_DB = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

// Target database (Production/Supabase)
const TARGET_DB = 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const sourcePool = new Pool({ connectionString: SOURCE_DB });
const targetPool = new Pool({ connectionString: TARGET_DB });

async function fixAllMissingCustomerColumns() {
  console.log('🔧 Fixing All Missing Customer Columns\n');

  // 1. Get all columns from source customers table
  console.log('1️⃣ Getting all columns from source database...');
  let sourceColumns = [];
  try {
    const result = await sourcePool.query(`
      SELECT 
        column_name, 
        data_type, 
        character_maximum_length, 
        is_nullable, 
        column_default
      FROM information_schema.columns
      WHERE table_name = 'customers'
      ORDER BY ordinal_position
    `);
    sourceColumns = result.rows;
    console.log(`   ✅ Found ${sourceColumns.length} columns in source`);
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
    return;
  }

  // 2. Get all columns from target customers table
  console.log('\n2️⃣ Getting all columns from target database...');
  let targetColumns = [];
  try {
    const result = await targetPool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'customers'
      ORDER BY ordinal_position
    `);
    targetColumns = result.rows.map(r => r.column_name);
    console.log(`   ✅ Found ${targetColumns.length} columns in target`);
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
    return;
  }

  // 3. Find missing columns
  console.log('\n3️⃣ Finding missing columns...');
  const missingColumns = sourceColumns.filter(
    col => !targetColumns.includes(col.column_name)
  );

  if (missingColumns.length === 0) {
    console.log(`   ✅ No missing columns found!`);
    await sourcePool.end();
    await targetPool.end();
    return;
  }

  console.log(`   ⚠️  Found ${missingColumns.length} missing columns:`);
  for (const col of missingColumns) {
    console.log(`   - ${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''}`);
  }

  // 4. Add missing columns
  console.log('\n4️⃣ Adding missing columns...');
  let added = 0;
  let errors = 0;

  for (const col of missingColumns) {
    try {
      // Determine data type
      let dataType = col.data_type.toUpperCase();
      if (col.data_type === 'character varying') {
        dataType = `VARCHAR(${col.character_maximum_length || 255})`;
      } else if (col.data_type === 'text') {
        dataType = 'TEXT';
      } else if (col.data_type === 'timestamp without time zone') {
        dataType = 'TIMESTAMP';
      } else if (col.data_type === 'timestamp with time zone') {
        dataType = 'TIMESTAMPTZ';
      } else if (col.data_type === 'uuid') {
        dataType = 'UUID';
      } else if (col.data_type === 'integer') {
        dataType = 'INTEGER';
      } else if (col.data_type === 'bigint') {
        dataType = 'BIGINT';
      } else if (col.data_type === 'numeric') {
        dataType = 'NUMERIC';
      } else if (col.data_type === 'boolean') {
        dataType = 'BOOLEAN';
      } else if (col.data_type === 'double precision') {
        dataType = 'DOUBLE PRECISION';
      } else if (col.data_type === 'real') {
        dataType = 'REAL';
      } else if (col.data_type === 'date') {
        dataType = 'DATE';
      } else if (col.data_type === 'time without time zone') {
        dataType = 'TIME';
      } else if (col.data_type === 'time with time zone') {
        dataType = 'TIMETZ';
      } else if (col.data_type === 'interval') {
        dataType = 'INTERVAL';
      } else if (col.data_type === 'jsonb') {
        dataType = 'JSONB';
      } else if (col.data_type === 'json') {
        dataType = 'JSON';
      } else if (col.data_type === 'array') {
        // For arrays, we need to check the element type
        const arrayType = await sourcePool.query(`
          SELECT udt_name
          FROM information_schema.columns
          WHERE table_name = 'customers' AND column_name = $1
        `, [col.column_name]);
        if (arrayType.rows.length > 0) {
          const baseType = arrayType.rows[0].udt_name;
          dataType = `${baseType.toUpperCase()}[]`;
        }
      }

      // Handle nullable
      const nullable = col.is_nullable === 'YES' ? '' : 'NOT NULL';

      // Handle default (skip if it's a function call that might not work)
      let defaultValue = '';
      if (col.column_default && !col.column_default.includes('::')) {
        defaultValue = `DEFAULT ${col.column_default}`;
      }

      const sql = `ALTER TABLE customers ADD COLUMN ${col.column_name} ${dataType} ${nullable} ${defaultValue}`.trim();
      
      await targetPool.query(sql);
      console.log(`   ✅ Added ${col.column_name}`);
      added++;
    } catch (error) {
      console.error(`   ❌ Error adding ${col.column_name}:`, error.message);
      errors++;
    }
  }

  // 5. Verify
  console.log('\n5️⃣ Verifying...');
  try {
    const verify = await targetPool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'customers'
      ORDER BY column_name
    `);
    console.log(`   ✅ Target now has ${verify.rows.length} columns`);
    console.log(`   ✅ Added ${added} columns, ${errors} errors`);
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  await sourcePool.end();
  await targetPool.end();
  console.log('\n✅ Done!');
}

fixAllMissingCustomerColumns().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});


