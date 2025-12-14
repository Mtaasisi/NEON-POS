import { Pool } from '@neondatabase/serverless';

// Target database (Production/Supabase)
const TARGET_DB = 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const targetPool = new Pool({ connectionString: TARGET_DB });

async function verifyCustomerFunction() {
  console.log('🔍 Verifying search_customers_fn Function\n');

  // 1. Get function definition from target
  console.log('1️⃣ Getting function definition...');
  try {
    const funcDef = await targetPool.query(`
      SELECT pg_get_functiondef(oid) as definition
      FROM pg_proc
      WHERE proname = 'search_customers_fn'
    `);

    if (funcDef.rows.length > 0) {
      const definition = funcDef.rows[0].definition;
      console.log(`   ✅ Function exists`);
      
      // Check if it references country
      if (definition.includes('c.country') || definition.includes('country')) {
        console.log(`   ✅ Function references country column`);
      }
      
      // Check if it references location_description
      if (definition.includes('location_description')) {
        console.log(`   ✅ Function references location_description column`);
      }
    } else {
      console.log(`   ❌ Function not found`);
    }
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  // 2. Test the function
  console.log('\n2️⃣ Testing function...');
  try {
    const result = await targetPool.query(`
      SELECT * FROM search_customers_fn(''::text, 1, 100)
    `);
    console.log(`   ✅ Function executed successfully`);
    console.log(`   ✅ Returned ${result.rows.length} rows`);
  } catch (error) {
    console.error(`   ❌ Function error:`, error.message);
    console.error(`   Error code:`, error.code);
    
    // If function has issues, we may need to recreate it
    if (error.message.includes('country') || error.message.includes('location_description')) {
      console.log(`\n   ⚠️  Function needs to be updated. Getting source definition...`);
      
      // Get source definition
      const sourcePool = new Pool({ 
        connectionString: 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
      });
      
      try {
        const sourceFunc = await sourcePool.query(`
          SELECT pg_get_functiondef(oid) as definition
          FROM pg_proc
          WHERE proname = 'search_customers_fn'
        `);
        
        if (sourceFunc.rows.length > 0) {
          console.log(`   ✅ Got source definition`);
          const sourceDef = sourceFunc.rows[0].definition;
          
          // Extract CREATE OR REPLACE FUNCTION part
          const createMatch = sourceDef.match(/CREATE OR REPLACE FUNCTION[\s\S]*?AS\s+\$\$[\s\S]*?\$\$/);
          if (createMatch) {
            console.log(`   📝 Would recreate function with correct columns`);
            // We'll create a script to do this if needed
          }
        }
        
        await sourcePool.end();
      } catch (e) {
        console.error(`   ❌ Error getting source:`, e.message);
      }
    }
  }

  // 3. Test direct customer query
  console.log('\n3️⃣ Testing direct customer query with new columns...');
  try {
    const result = await targetPool.query(`
      SELECT id, name, phone, country, location_description
      FROM customers
      LIMIT 5
    `);
    console.log(`   ✅ Direct query works`);
    console.log(`   ✅ Returned ${result.rows.length} rows`);
  } catch (error) {
    console.error(`   ❌ Direct query error:`, error.message);
  }

  await targetPool.end();
  console.log('\n✅ Verification complete!');
}

verifyCustomerFunction().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});


