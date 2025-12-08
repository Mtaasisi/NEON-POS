import { Pool } from '@neondatabase/serverless';

// Source database (Developer)
const SOURCE_DB = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

// Target database (Production/Supabase)
const TARGET_DB = 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const sourcePool = new Pool({ connectionString: SOURCE_DB });
const targetPool = new Pool({ connectionString: TARGET_DB });

async function checkColumnTypes() {
  console.log('🔍 Checking Column Types\n');

  const functionColumns = [
    'points', 'total_spent', 'last_visit', 'is_active', 'is_shared',
    'whatsapp_opt_out', 'total_purchases', 'total_calls', 'total_call_duration_minutes',
    'incoming_calls', 'outgoing_calls', 'missed_calls', 'avg_call_duration_minutes',
    'total_returns'
  ];

  console.log('1️⃣ Checking source database...');
  const sourceTypes = {};
  for (const col of functionColumns) {
    try {
      const result = await sourcePool.query(`
        SELECT data_type, udt_name
        FROM information_schema.columns
        WHERE table_name = 'customers' AND column_name = $1
      `, [col]);
      if (result.rows.length > 0) {
        sourceTypes[col] = result.rows[0];
        console.log(`   ${col}: ${result.rows[0].data_type} (${result.rows[0].udt_name})`);
      }
    } catch (e) {
      console.log(`   ${col}: NOT FOUND`);
    }
  }

  console.log('\n2️⃣ Checking target database...');
  const targetTypes = {};
  for (const col of functionColumns) {
    try {
      const result = await targetPool.query(`
        SELECT data_type, udt_name
        FROM information_schema.columns
        WHERE table_name = 'customers' AND column_name = $1
      `, [col]);
      if (result.rows.length > 0) {
        targetTypes[col] = result.rows[0];
        console.log(`   ${col}: ${result.rows[0].data_type} (${result.rows[0].udt_name})`);
      } else {
        console.log(`   ${col}: NOT FOUND`);
      }
    } catch (e) {
      console.log(`   ${col}: ERROR - ${e.message}`);
    }
  }

  // Check for points vs loyalty_points
  console.log('\n3️⃣ Checking points column...');
  try {
    const sourcePoints = await sourcePool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'customers' AND column_name IN ('points', 'loyalty_points')
    `);
    console.log('   Source:');
    for (const row of sourcePoints.rows) {
      console.log(`     - ${row.column_name}: ${row.data_type}`);
    }

    const targetPoints = await targetPool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'customers' AND column_name IN ('points', 'loyalty_points')
    `);
    console.log('   Target:');
    for (const row of targetPoints.rows) {
      console.log(`     - ${row.column_name}: ${row.data_type}`);
    }
  } catch (e) {
    console.error(`   Error:`, e.message);
  }

  await sourcePool.end();
  await targetPool.end();
}

checkColumnTypes().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});


