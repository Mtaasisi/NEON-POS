import { Pool } from '@neondatabase/serverless';

// Source database (Developer)
const SOURCE_DB = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

// Target database (Production/Supabase)
const TARGET_DB = 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const sourcePool = new Pool({ connectionString: SOURCE_DB });
const targetPool = new Pool({ connectionString: TARGET_DB });

async function fixSearchCustomersFunction() {
  console.log('🔧 Fixing search_customers_fn Function\n');

  // 1. Get function definition from source
  console.log('1️⃣ Getting function definition from source...');
  let sourceDefinition = null;
  try {
    const result = await sourcePool.query(`
      SELECT pg_get_functiondef(oid) as definition
      FROM pg_proc
      WHERE proname = 'search_customers_fn'
    `);

    if (result.rows.length > 0) {
      sourceDefinition = result.rows[0].definition;
      console.log(`   ✅ Got function definition (${sourceDefinition.length} chars)`);
    } else {
      console.log(`   ❌ Function not found in source`);
      return;
    }
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
    return;
  }

  // 2. Drop existing function in target
  console.log('\n2️⃣ Dropping existing function in target...');
  try {
    await targetPool.query(`DROP FUNCTION IF EXISTS search_customers_fn(text, integer, integer)`);
    console.log(`   ✅ Dropped existing function`);
  } catch (error) {
    console.error(`   ⚠️  Error dropping (may not exist):`, error.message);
  }

  // 3. Create function in target
  console.log('\n3️⃣ Creating function in target...');
  try {
    // The definition should be ready to use, but we need to make sure it's a complete statement
    await targetPool.query(sourceDefinition);
    console.log(`   ✅ Function created successfully`);
  } catch (error) {
    console.error(`   ❌ Error creating function:`, error.message);
    console.error(`   Error code:`, error.code);
    
    // Try to extract just the function body if the full definition fails
    const match = sourceDefinition.match(/CREATE OR REPLACE FUNCTION[\s\S]*?AS\s+\$\$([\s\S]*?)\$\$/);
    if (match) {
      console.log(`\n   ⚠️  Trying alternative approach...`);
      // We might need to manually construct it
    }
    return;
  }

  // 4. Test the function
  console.log('\n4️⃣ Testing function...');
  try {
    const result = await targetPool.query(`
      SELECT * FROM search_customers_fn(''::text, 1, 100)
    `);
    console.log(`   ✅ Function executed successfully`);
    console.log(`   ✅ Returned ${result.rows.length} rows`);
  } catch (error) {
    console.error(`   ❌ Function test error:`, error.message);
    console.error(`   Error code:`, error.code);
  }

  await sourcePool.end();
  await targetPool.end();
  console.log('\n✅ Done!');
}

fixSearchCustomersFunction().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});


