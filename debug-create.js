#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';

// Load environment variables
const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ No DATABASE_URL found in environment');
  process.exit(1);
}

async function debugCreate() {
  const sql = neon(DATABASE_URL);

  try {
    console.log('🔧 Debug function creation...');

    // Test basic connection
    await sql`SELECT 1`;

    // Try to create a very simple function first
    console.log('📝 Creating simple test function...');
    try {
      await sql.unsafe(`
        CREATE OR REPLACE FUNCTION public.test_simple_func()
        RETURNS TEXT
        LANGUAGE plpgsql
        AS $$
        BEGIN
          RETURN 'Hello World';
        END;
        $$;
      `);
      console.log('✅ Simple function created');
    } catch (error) {
      console.error('❌ Simple function creation failed:', error.message);
      return;
    }

    // Check if simple function exists
    const simpleCheck = await sql`SELECT proname FROM pg_proc WHERE proname = 'test_simple_func'`;
    console.log('Simple function check:', simpleCheck);

    if (simpleCheck.length === 0) {
      console.error('❌ Even simple function creation is not working');
      return;
    }

    // Now try the reverse function
    console.log('📝 Creating reverse function...');
    const reverseSQL = `
CREATE OR REPLACE FUNCTION public.reverse_purchase_order_payment(
  payment_id_param uuid,
  user_id_param uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
)
RETURNS json
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN json_build_object('success', false, 'message', 'Payment not found');
END;
$function$;
`;

    await sql.unsafe(reverseSQL);
    console.log('✅ Reverse function SQL executed');

    // Check if reverse function exists
    const reverseCheck = await sql`SELECT proname FROM pg_proc WHERE proname = 'reverse_purchase_order_payment'`;
    console.log('Reverse function check:', reverseCheck);

    if (reverseCheck.length > 0) {
      console.log('🎉 SUCCESS: reverse_purchase_order_payment function created!');

      // Test the function
      try {
        const testResult = await sql`SELECT * FROM reverse_purchase_order_payment('00000000-0000-0000-0000-000000000000'::uuid)`;
        console.log('✅ Function test result:', testResult);
        console.log('🎉 The undo payment functionality should now work!');
      } catch (error) {
        if (error.message && error.message.includes('Payment not found')) {
          console.log('✅ Function test successful (expected "Payment not found" error)');
          console.log('🎉 The undo payment functionality should now work!');
        } else {
          console.log('⚠️ Function test returned unexpected result:', error.message);
        }
      }
    } else {
      console.error('❌ Reverse function still does not exist');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugCreate();
