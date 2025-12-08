import { Pool } from '@neondatabase/serverless';

// Target database (Production/Supabase)
const TARGET_DB = 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const targetPool = new Pool({ connectionString: TARGET_DB });

async function recreateFunctionCorrectly() {
  console.log('🔧 Recreating search_customers_fn Correctly\n');

  // Drop existing
  await targetPool.query(`DROP FUNCTION IF EXISTS search_customers_fn(text, integer, integer) CASCADE`);

  // Create function with explicit type matching
  const functionSQL = `
CREATE OR REPLACE FUNCTION public.search_customers_fn(
  search_query text, 
  page_number integer DEFAULT 1, 
  page_size integer DEFAULT 50
)
RETURNS TABLE(
  id uuid, 
  name text, 
  phone text, 
  email text, 
  gender text, 
  city text, 
  country text, 
  color_tag text, 
  loyalty_level text, 
  points integer, 
  total_spent numeric, 
  last_visit timestamptz, 
  is_active boolean, 
  referral_source text, 
  birth_month text, 
  birth_day text, 
  birthday date, 
  initial_notes text, 
  notes text, 
  customer_tag text, 
  location_description text, 
  national_id text, 
  joined_date date, 
  created_at timestamptz, 
  updated_at timestamptz, 
  branch_id uuid, 
  is_shared boolean, 
  created_by_branch_id uuid, 
  created_by_branch_name text, 
  profile_image text, 
  whatsapp text, 
  whatsapp_opt_out boolean, 
  referred_by uuid, 
  created_by uuid, 
  last_purchase_date timestamptz, 
  total_purchases integer, 
  total_calls integer, 
  total_call_duration_minutes numeric, 
  incoming_calls integer, 
  outgoing_calls integer, 
  missed_calls integer, 
  avg_call_duration_minutes numeric, 
  first_call_date timestamptz, 
  last_call_date timestamptz, 
  call_loyalty_level text, 
  total_returns integer, 
  total_count bigint
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  offset_val INTEGER;
  total_count_val BIGINT;
BEGIN
  offset_val := (page_number - 1) * page_size;

  SELECT COUNT(*) INTO total_count_val
  FROM customers c
  WHERE
    c.name ILIKE '%' || search_query || '%'
    OR c.phone ILIKE '%' || search_query || '%'
    OR COALESCE(c.email, '') ILIKE '%' || search_query || '%'
    OR COALESCE(c.customer_tag, '') ILIKE '%' || search_query || '%';

  RETURN QUERY
  SELECT
    c.id::uuid,
    c.name::text,
    c.phone::text,
    c.email::text,
    COALESCE(c.gender, 'other')::text as gender,
    COALESCE(c.city, '')::text as city,
    COALESCE(c.country, '')::text as country,
    COALESCE(c.color_tag, 'new')::text as color_tag,
    COALESCE(c.loyalty_level, 'bronze')::text as loyalty_level,
    COALESCE(c.points, 0)::integer as points,
    COALESCE(c.total_spent, 0)::numeric as total_spent,
    COALESCE(c.last_visit, c.created_at)::timestamptz as last_visit,
    COALESCE(c.is_active, true)::boolean as is_active,
    c.referral_source::text,
    c.birth_month::text,
    c.birth_day::text,
    c.birthday::date,
    c.initial_notes::text,
    c.notes::text,
    c.customer_tag::text,
    c.location_description::text,
    c.national_id::text,
    c.joined_date::date,
    c.created_at::timestamptz,
    c.updated_at::timestamptz,
    NULLIF(c.branch_id::text, '')::uuid as branch_id,
    COALESCE(c.is_shared, false)::boolean as is_shared,
    NULLIF(c.created_by_branch_id::text, '')::uuid as created_by_branch_id,
    c.created_by_branch_name::text,
    c.profile_image::text,
    COALESCE(c.whatsapp, c.phone)::text as whatsapp,
    COALESCE(c.whatsapp_opt_out, false)::boolean as whatsapp_opt_out,
    NULLIF(c.referred_by::text, '')::uuid as referred_by,
    NULLIF(c.created_by::text, '')::uuid as created_by,
    c.last_purchase_date::timestamptz,
    COALESCE(c.total_purchases, 0)::integer as total_purchases,
    COALESCE(c.total_calls, 0)::integer as total_calls,
    COALESCE(c.total_call_duration_minutes, 0)::numeric as total_call_duration_minutes,
    COALESCE(c.incoming_calls, 0)::integer as incoming_calls,
    COALESCE(c.outgoing_calls, 0)::integer as outgoing_calls,
    COALESCE(c.missed_calls, 0)::integer as missed_calls,
    COALESCE(c.avg_call_duration_minutes, 0)::numeric as avg_call_duration_minutes,
    c.first_call_date::timestamptz,
    c.last_call_date::timestamptz,
    COALESCE(c.call_loyalty_level, 'Basic')::text as call_loyalty_level,
    COALESCE(c.total_returns, 0)::integer as total_returns,
    total_count_val::bigint as total_count
  FROM customers c
  WHERE
    c.name ILIKE '%' || search_query || '%'
    OR c.phone ILIKE '%' || search_query || '%'
    OR COALESCE(c.email, '') ILIKE '%' || search_query || '%'
    OR COALESCE(c.customer_tag, '') ILIKE '%' || search_query || '%'
  ORDER BY c.created_at DESC
  LIMIT page_size
  OFFSET offset_val;
END;
$$;
  `;

  try {
    console.log('Creating function with explicit type casts...');
    await targetPool.query(functionSQL);
    console.log('✅ Function created');

    // Test it
    console.log('\nTesting function...');
    const result = await targetPool.query(`SELECT * FROM search_customers_fn(''::text, 1, 5)`);
    console.log(`✅ Function works!`);
    console.log(`✅ Returned ${result.rows.length} rows`);
    console.log(`✅ Returned ${result.fields.length} columns`);
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    console.error(`Error code:`, error.code);
  }

  await targetPool.end();
  console.log('\n✅ Done!');
}

recreateFunctionCorrectly().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

