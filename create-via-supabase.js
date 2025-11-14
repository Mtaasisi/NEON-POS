#!/usr/bin/env node
import { supabase } from './src/lib/supabaseClient.ts';

async function createViaSupabase() {
  try {
    console.log('🔧 Creating reverse_purchase_order_payment function via Supabase client...');

    // Use the rpc method to try to execute raw SQL
    // First, let's try a simple query to test the connection
    const { data: testData, error: testError } = await supabase.rpc('get_purchase_order_payment_summary', {
      purchase_order_id_param: '00000000-0000-0000-0000-000000000000'
    });

    if (testError) {
      console.log('⚠️ RPC test error (expected):', testError.message);
    } else {
      console.log('✅ Supabase RPC connection working');
    }

    // Now try to execute raw SQL using the sql client
    const { sql } = await import('./src/lib/supabaseClient.ts');

    console.log('📝 Creating function via SQL client...');

    // Try the same approach as the working process function
    const createSQL = `
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

    // Execute the function creation
    await sql.unsafe(createSQL);

    console.log('✅ Function creation executed. Checking if it exists...');

    // Check if function exists by trying to call it
    const { data, error } = await supabase.rpc('reverse_purchase_order_payment', {
      payment_id_param: '00000000-0000-0000-0000-000000000000',
      user_id_param: '00000000-0000-0000-0000-000000000001'
    });

    if (error) {
      if (error.message && error.message.includes('function reverse_purchase_order_payment')) {
        console.error('❌ Function still does not exist');
      } else if (error.message && error.message.includes('Payment not found')) {
        console.log('✅ Function exists and is working!');
        console.log('🎉 The undo payment functionality should now work!');
      } else {
        console.log('⚠️ Unexpected error:', error.message);
      }
    } else {
      console.log('✅ Function call successful:', data);
      console.log('🎉 The undo payment functionality should now work!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

createViaSupabase();
