import { Pool } from '@neondatabase/serverless';

// Target database (Production/Supabase)
const TARGET_DB = 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const targetPool = new Pool({ connectionString: TARGET_DB });

async function checkAPITables() {
  console.log('🔍 Checking API Tables for 500 Errors\n');
  console.log('📊 Database: aws-0-eu-north-1.pooler.supabase.com\n');

  const tablesToCheck = [
    'whatsapp_antiban_settings',
    'whatsapp_instances',
    'whatsapp_integrations'
  ];

  for (const tableName of tablesToCheck) {
    console.log(`\n📋 Checking ${tableName}...`);
    
    try {
      const exists = await targetPool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        )
      `, [tableName]);

      if (exists.rows[0].exists) {
        const count = await targetPool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        console.log(`   ✅ Table exists with ${count.rows[0].count} rows`);
        
        // Check structure
        const columns = await targetPool.query(`
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = $1
          ORDER BY ordinal_position
          LIMIT 10
        `, [tableName]);
        console.log(`   Columns: ${columns.rows.map(c => c.column_name).join(', ')}${columns.rows.length >= 10 ? '...' : ''}`);
      } else {
        console.log(`   ❌ Table does NOT exist!`);
      }
    } catch (error) {
      console.error(`   ❌ Error:`, error.message);
    }
  }

  await targetPool.end();
  console.log('\n✅ Done!');
}

checkAPITables().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

