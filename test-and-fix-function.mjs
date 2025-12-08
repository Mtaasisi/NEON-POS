import { Pool } from '@neondatabase/serverless';

// Source database (Developer)
const SOURCE_DB = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

// Target database (Production/Supabase)
const TARGET_DB = 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const sourcePool = new Pool({ connectionString: SOURCE_DB });
const targetPool = new Pool({ connectionString: TARGET_DB });

async function testAndFixFunction() {
  console.log('🔧 Testing and Fixing search_customers_fn\n');

  // 1. Test the SELECT statement directly
  console.log('1️⃣ Testing SELECT statement directly...');
  try {
    const testQuery = `
      SELECT
        c.id,
        c.name,
        c.phone,
        c.email,
        COALESCE(c.gender, 'other') as gender,
        COALESCE(c.city, '') as city,
        COALESCE(c.country, '') as country,
        COALESCE(c.color_tag, 'new') as color_tag,
        COALESCE(c.loyalty_level, 'bronze') as loyalty_level,
        COALESCE(c.points, 0) as points,
        COALESCE(c.total_spent, 0) as total_spent,
        COALESCE(c.last_visit, c.created_at) as last_visit,
        COALESCE(c.is_active, true) as is_active,
        c.referral_source,
        c.birth_month,
        c.birth_day,
        c.birthday,
        c.initial_notes,
        c.notes,
        c.customer_tag,
        c.location_description,
        c.national_id,
        c.joined_date,
        c.created_at,
        c.updated_at,
        c.branch_id,
        COALESCE(c.is_shared, false) as is_shared,
        c.created_by_branch_id,
        c.created_by_branch_name,
        c.profile_image,
        COALESCE(c.whatsapp, c.phone) as whatsapp,
        COALESCE(c.whatsapp_opt_out, false) as whatsapp_opt_out,
        c.referred_by,
        c.created_by,
        c.last_purchase_date,
        COALESCE(c.total_purchases, 0) as total_purchases,
        COALESCE(c.total_calls, 0) as total_calls,
        COALESCE(c.total_call_duration_minutes, 0) as total_call_duration_minutes,
        COALESCE(c.incoming_calls, 0) as incoming_calls,
        COALESCE(c.outgoing_calls, 0) as outgoing_calls,
        COALESCE(c.missed_calls, 0) as missed_calls,
        COALESCE(c.avg_call_duration_minutes, 0) as avg_call_duration_minutes,
        c.first_call_date,
        c.last_call_date,
        COALESCE(c.call_loyalty_level, 'Basic') as call_loyalty_level,
        COALESCE(c.total_returns, 0) as total_returns,
        0::bigint as total_count
      FROM customers c
      WHERE
        c.name ILIKE '%%' OR c.phone ILIKE '%%' OR COALESCE(c.email, '') ILIKE '%%' OR COALESCE(c.customer_tag, '') ILIKE '%%'
      ORDER BY c.created_at DESC
      LIMIT 5
    `;

    const result = await targetPool.query(testQuery);
    console.log(`   ✅ SELECT statement works!`);
    console.log(`   ✅ Returned ${result.rows.length} rows`);
    console.log(`   ✅ Returned ${result.fields.length} columns`);
  } catch (error) {
    console.error(`   ❌ SELECT error:`, error.message);
    return;
  }

  // 2. Drop function with CASCADE to clear dependencies
  console.log('\n2️⃣ Dropping function with CASCADE...');
  try {
    await targetPool.query(`DROP FUNCTION IF EXISTS search_customers_fn(text, integer, integer) CASCADE`);
    console.log(`   ✅ Dropped function`);
  } catch (error) {
    console.error(`   ⚠️  Error:`, error.message);
  }

  // 3. Get fresh function definition from source
  console.log('\n3️⃣ Getting fresh function definition...');
  let sourceDefinition = null;
  try {
    const result = await sourcePool.query(`
      SELECT pg_get_functiondef(oid) as definition
      FROM pg_proc
      WHERE proname = 'search_customers_fn'
    `);
    sourceDefinition = result.rows[0].definition;
    console.log(`   ✅ Got definition`);
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
    return;
  }

  // 4. Create function in target
  console.log('\n4️⃣ Creating function in target...');
  try {
    await targetPool.query(sourceDefinition);
    console.log(`   ✅ Function created`);
  } catch (error) {
    console.error(`   ❌ Error creating:`, error.message);
    console.error(`   Error code:`, error.code);
    return;
  }

  // 5. Test the function
  console.log('\n5️⃣ Testing function...');
  try {
    const result = await targetPool.query(`SELECT * FROM search_customers_fn(''::text, 1, 10)`);
    console.log(`   ✅ Function works!`);
    console.log(`   ✅ Returned ${result.rows.length} rows`);
    console.log(`   ✅ Returned ${result.fields.length} columns`);
  } catch (error) {
    console.error(`   ❌ Function test error:`, error.message);
    console.error(`   Error code:`, error.code);
    
    // Try to get more details
    if (error.code === '42804') {
      console.log(`\n   💡 This is a type mismatch error. The function return type doesn't match the SELECT.`);
      console.log(`   💡 This might be a caching issue. Try refreshing the connection.`);
    }
  }

  await sourcePool.end();
  await targetPool.end();
  console.log('\n✅ Done!');
}

testAndFixFunction().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});


