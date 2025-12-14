#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';

// Load environment variables
const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ No DATABASE_URL found in environment');
  process.exit(1);
}

async function debugFunction() {
  const sql = neon(DATABASE_URL);

  try {
    console.log('🔧 Debugging function creation...');

    // Check existing functions
    console.log('📝 Checking existing functions...');
    const existingFuncs = await sql`SELECT proname, pronamespace::regnamespace as schema_name FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE proname LIKE '%reverse%' OR proname LIKE '%test%'`;
    console.log('Existing functions:', existingFuncs);

    // Try to create function with explicit schema
    console.log('📝 Creating function with explicit schema...');
    await sql.unsafe(`
      CREATE OR REPLACE FUNCTION public.reverse_purchase_order_payment(
        payment_id_param UUID,
        user_id_param UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
      )
      RETURNS JSON
      LANGUAGE plpgsql
      AS $$
      BEGIN
        RETURN json_build_object('success', false, 'message', 'Payment not found');
      END;
      $$;
    `);

    console.log('✅ Function creation completed. Checking again...');

    // Check if function exists now
    const funcsAfter = await sql`SELECT proname, pronamespace::regnamespace as schema_name FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE proname = 'reverse_purchase_order_payment'`;
    console.log('Functions after creation:', funcsAfter);

    if (funcsAfter.length > 0) {
      console.log('✅ Function exists! Testing call...');

      // Try calling it
      try {
        const callResult = await sql`SELECT public.reverse_purchase_order_payment('00000000-0000-0000-0000-000000000000'::uuid)`;
        console.log('✅ Function call successful:', callResult);
      } catch (callError) {
        console.log('⚠️ Function call error:', callError.message);

        // Try with schema prefix
        try {
          const callResult2 = await sql`SELECT * FROM public.reverse_purchase_order_payment('00000000-0000-0000-0000-000000000000'::uuid)`;
          console.log('✅ Function call with FROM successful:', callResult2);
        } catch (callError2) {
          console.log('❌ Function call with FROM also failed:', callError2.message);
        }
      }
    } else {
      console.error('❌ Function still does not exist after creation');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugFunction();
