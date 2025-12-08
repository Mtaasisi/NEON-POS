import { Pool } from '@neondatabase/serverless';

// Target database (Production/Supabase)
const TARGET_DB = 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const targetPool = new Pool({ connectionString: TARGET_DB });

async function checkFunctionColumns() {
  console.log('🔍 Checking Function Column References\n');

  // Columns referenced in the function SELECT
  const functionColumns = [
    'id', 'name', 'phone', 'email', 'gender', 'city', 'country', 'color_tag',
    'loyalty_level', 'points', 'total_spent', 'last_visit', 'is_active',
    'referral_source', 'birth_month', 'birth_day', 'birthday', 'initial_notes',
    'notes', 'customer_tag', 'location_description', 'national_id', 'joined_date',
    'created_at', 'updated_at', 'branch_id', 'is_shared', 'created_by_branch_id',
    'created_by_branch_name', 'profile_image', 'whatsapp', 'whatsapp_opt_out',
    'referred_by', 'created_by', 'last_purchase_date', 'total_purchases',
    'total_calls', 'total_call_duration_minutes', 'incoming_calls', 'outgoing_calls',
    'missed_calls', 'avg_call_duration_minutes', 'first_call_date', 'last_call_date',
    'call_loyalty_level', 'total_returns'
  ];

  // Get actual columns from target
  const result = await targetPool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'customers'
    ORDER BY column_name
  `);

  const existingColumns = result.rows.map(r => r.column_name);
  console.log(`✅ Found ${existingColumns.length} columns in customers table\n`);

  // Check which function columns are missing
  const missing = functionColumns.filter(col => !existingColumns.includes(col));
  const found = functionColumns.filter(col => existingColumns.includes(col));

  console.log(`📊 Column Check Results:`);
  console.log(`   ✅ Found: ${found.length}/${functionColumns.length}`);
  console.log(`   ❌ Missing: ${missing.length}/${functionColumns.length}\n`);

  if (missing.length > 0) {
    console.log(`❌ Missing columns:`);
    for (const col of missing) {
      console.log(`   - ${col}`);
    }
  } else {
    console.log(`✅ All function columns exist!`);
  }

  // Check for extra columns that might cause issues
  const extra = existingColumns.filter(col => !functionColumns.includes(col));
  if (extra.length > 0) {
    console.log(`\n📝 Extra columns (not in function, but exist):`);
    for (const col of extra) {
      console.log(`   - ${col}`);
    }
  }

  await targetPool.end();
}

checkFunctionColumns().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});


