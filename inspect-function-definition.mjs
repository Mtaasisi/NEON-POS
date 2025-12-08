import { Pool } from '@neondatabase/serverless';

// Source database (Developer)
const SOURCE_DB = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const sourcePool = new Pool({ connectionString: SOURCE_DB });

async function inspectFunction() {
  console.log('🔍 Inspecting search_customers_fn Function\n');

  try {
    const result = await sourcePool.query(`
      SELECT pg_get_functiondef(oid) as definition
      FROM pg_proc
      WHERE proname = 'search_customers_fn'
    `);

    if (result.rows.length > 0) {
      const definition = result.rows[0].definition;
      console.log('Function Definition:');
      console.log('='.repeat(80));
      console.log(definition);
      console.log('='.repeat(80));
      
      // Try to extract the SELECT statement
      const selectMatch = definition.match(/SELECT\s+([\s\S]*?)\s+FROM/i);
      if (selectMatch) {
        console.log('\nSELECT clause:');
        console.log(selectMatch[1]);
      }
      
      // Try to extract RETURN TABLE definition
      const returnMatch = definition.match(/RETURNS\s+TABLE\s*\(([\s\S]*?)\)/i);
      if (returnMatch) {
        console.log('\nRETURNS TABLE definition:');
        console.log(returnMatch[1]);
      }
    }
  } catch (error) {
    console.error(`❌ Error:`, error.message);
  }

  await sourcePool.end();
}

inspectFunction().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});


