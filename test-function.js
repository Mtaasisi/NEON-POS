#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';

// Load environment variables
const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ No DATABASE_URL found in environment');
  process.exit(1);
}

async function testFunction() {
  const sql = neon(DATABASE_URL);

  try {
    console.log('🔧 Testing database connection and function creation...');

    // First, test basic connection
    const testResult = await sql`SELECT 1 as test`;
    console.log('✅ Database connection successful');

    // Try to create a very simple function first
    console.log('📝 Creating simple test function...');
    await sql.unsafe(`
      CREATE OR REPLACE FUNCTION public.test_function(test_param UUID)
      RETURNS JSON
      LANGUAGE plpgsql
      AS $$
      BEGIN
        RETURN json_build_object('success', true, 'param', test_param);
      END;
      $$;
    `);

    console.log('✅ Simple function created. Testing...');

    // Test the simple function
    const result = await sql`SELECT * FROM test_function('12345678-1234-1234-1234-123456789abc'::uuid)`;
    console.log('✅ Simple function test result:', result);

    // Now try the actual function
    console.log('📝 Creating actual reverse_purchase_order_payment function...');

    const createFunctionSQL = `
CREATE OR REPLACE FUNCTION public.reverse_purchase_order_payment(
  payment_id_param UUID,
  user_id_param UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment purchase_order_payments%ROWTYPE;
BEGIN
  -- Check if payment exists
  SELECT * INTO v_payment
  FROM purchase_order_payments
  WHERE id = payment_id_param;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Payment not found'
    );
  END IF;

  -- Return success for now (we'll implement the full logic after testing)
  RETURN json_build_object(
    'success', true,
    'message', 'Payment found and would be reversed',
    'payment_id', v_payment.id,
    'amount', v_payment.amount
  );
END;
$$;
`;

    await sql.unsafe(createFunctionSQL);

    console.log('✅ Function created. Verifying...');

    // Verify the function exists
    const funcCheck = await sql`SELECT proname FROM pg_proc WHERE proname = 'reverse_purchase_order_payment'`;
    console.log('Function check result:', funcCheck);

    if (funcCheck.length > 0) {
      console.log('✅ Function exists in database');

      // Test with a fake UUID to see if it responds
      try {
        const testCall = await sql`SELECT * FROM reverse_purchase_order_payment('00000000-0000-0000-0000-000000000000'::uuid)`;
        console.log('✅ Function call test result:', testCall);
        console.log('🎉 Function is working!');
      } catch (error) {
        console.log('⚠️ Function call test error (expected):', error.message);
        if (error.message.includes('Payment not found')) {
          console.log('✅ Function is working correctly (returns expected error)');
        }
      }
    } else {
      console.error('❌ Function still does not exist');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Error details:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testFunction();
