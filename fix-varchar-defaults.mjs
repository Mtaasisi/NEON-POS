import { Pool } from '@neondatabase/serverless';

// Target database (Production/Supabase)
const TARGET_DB = 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const targetPool = new Pool({ connectionString: TARGET_DB });

// Columns that failed due to VARCHAR default value syntax
const fixes = [
  { table: 'employees', column: 'employment_type', default: "'full-time'", type: 'VARCHAR(50)' },
  { table: 'employees', column: 'currency', default: "'TZS'", type: 'VARCHAR(10)' },
  { table: 'employees', column: 'status', default: "'active'", type: 'VARCHAR(50)' },
  { table: 'employees', column: 'country', default: "'Tanzania'", type: 'VARCHAR(100)' },
];

async function fixColumn(table, column, defaultValue, dataType) {
  try {
    // Check if column exists
    const check = await targetPool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1 
        AND column_name = $2
      )
    `, [table, column]);

    if (check.rows[0].exists) {
      console.log(`   ✅ ${table}.${column} already exists`);
      return;
    }

    // Add column as nullable first
    await targetPool.query(`
      ALTER TABLE ${table} 
      ADD COLUMN ${column} ${dataType}
    `);

    // Set default values for existing rows
    await targetPool.query(`
      UPDATE ${table} 
      SET ${column} = ${defaultValue} 
      WHERE ${column} IS NULL
    `);

    // Set default constraint
    await targetPool.query(`
      ALTER TABLE ${table} 
      ALTER COLUMN ${column} SET DEFAULT ${defaultValue}
    `);

    console.log(`   ✅ Fixed: ${table}.${column}`);
  } catch (error) {
    console.error(`   ❌ Error fixing ${table}.${column}:`, error.message);
  }
}

async function fixAll() {
  console.log('🔧 Fixing VARCHAR Default Value Errors\n');

  for (const fix of fixes) {
    await fixColumn(fix.table, fix.column, fix.default, fix.type);
  }

  await targetPool.end();
  console.log('\n✅ Done!');
}

fixAll().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

