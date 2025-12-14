import { Pool } from '@neondatabase/serverless';

// Target database (Production/Supabase)
const TARGET_DB = 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const targetPool = new Pool({ connectionString: TARGET_DB });

// Remaining columns to fix
const fixes = [
  { table: 'lats_pos_general_settings', column: 'day_closing_passcode', default: "'1234'", type: 'VARCHAR(255)' },
  { table: 'lats_product_variants', column: 'variant_type', default: "'standard'", type: 'VARCHAR(20)' },
  { table: 'notes', column: 'owner_id', default: null, type: 'TEXT', nullable: true }, // auth.user_id() doesn't exist in Supabase
  { table: 'whatsapp_media_library', column: 'folder', default: "'General'", type: 'VARCHAR(255)' },
];

async function fixColumn(fix) {
  try {
    // Check if column exists
    const check = await targetPool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1 
        AND column_name = $2
      )
    `, [fix.table, fix.column]);

    if (check.rows[0].exists) {
      console.log(`   ✅ ${fix.table}.${fix.column} already exists`);
      return;
    }

    // Add column
    let sql = `ALTER TABLE ${fix.table} ADD COLUMN ${fix.column} ${fix.type}`;
    
    if (fix.nullable !== false) {
      // Column is nullable by default
    } else {
      sql += ' NOT NULL';
    }

    if (fix.default !== null) {
      sql += ` DEFAULT ${fix.default}`;
    }

    await targetPool.query(sql);

    // If default is not null, update existing rows
    if (fix.default !== null && !fix.nullable) {
      await targetPool.query(`
        UPDATE ${fix.table} 
        SET ${fix.column} = ${fix.default} 
        WHERE ${fix.column} IS NULL
      `);
    }

    console.log(`   ✅ Fixed: ${fix.table}.${fix.column}`);
  } catch (error) {
    console.error(`   ❌ Error fixing ${fix.table}.${fix.column}:`, error.message);
  }
}

async function fixAll() {
  console.log('🔧 Fixing Remaining Column Errors\n');

  for (const fix of fixes) {
    await fixColumn(fix);
  }

  await targetPool.end();
  console.log('\n✅ Done!');
}

fixAll().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

