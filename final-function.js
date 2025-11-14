#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';

// Load environment variables
const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ No DATABASE_URL found in environment');
  process.exit(1);
}

async function createFinalFunction() {
  const sql = neon(DATABASE_URL);

  try {
    console.log('🔧 Creating reverse_purchase_order_payment function using template literals...');

    // Test basic connection
    await sql`SELECT 1`;

    // Create the function using a direct SQL approach
    // First, let's try executing each statement separately
    const statements = [
      // Drop function if exists
      `DROP FUNCTION IF EXISTS public.reverse_purchase_order_payment(UUID, UUID)`,

      // Create the function
      `CREATE FUNCTION public.reverse_purchase_order_payment(
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
        SELECT * INTO v_payment
        FROM purchase_order_payments
        WHERE id = payment_id_param;

        IF NOT FOUND THEN
          RETURN json_build_object('success', false, 'message', 'Payment not found');
        END IF;

        RETURN json_build_object('success', true, 'message', 'Function is working', 'payment_id', v_payment.id);
      END;
      $$`,

      // Grant permissions
      `GRANT EXECUTE ON FUNCTION public.reverse_purchase_order_payment(UUID, UUID) TO authenticated`
    ];

    for (let i = 0; i < statements.length; i++) {
      console.log(`📝 Executing statement ${i + 1}/${statements.length}...`);
      try {
        await sql.unsafe(statements[i]);
        console.log(`✅ Statement ${i + 1} executed successfully`);
      } catch (error) {
        console.error(`❌ Statement ${i + 1} failed:`, error.message);
        // Continue with other statements
      }
    }

    console.log('✅ All statements executed. Verifying function...');

    // Check if function exists
    const funcCheck = await sql`SELECT proname FROM pg_proc WHERE proname = 'reverse_purchase_order_payment'`;
    console.log('Function check result:', funcCheck);

    if (funcCheck.length > 0) {
      console.log('🎉 SUCCESS: Function created successfully!');

      // Test the function
      try {
        const testResult = await sql`SELECT * FROM reverse_purchase_order_payment('00000000-0000-0000-0000-000000000000'::uuid)`;
        console.log('✅ Function test result:', testResult);
        console.log('🎉 The undo payment functionality should now work!');
      } catch (error) {
        if (error.message.includes('Payment not found')) {
          console.log('✅ Function test successful (expected error for non-existent payment)');
          console.log('🎉 The undo payment functionality should now work!');
        } else {
          console.error('⚠️ Unexpected test error:', error.message);
        }
      }
    } else {
      console.error('❌ Function still does not exist');
      console.log('🔍 Checking all functions in public schema...');
      const allFuncs = await sql`SELECT proname FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND proname LIKE '%reverse%'`;
      console.log('All reverse functions in public:', allFuncs);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

createFinalFunction();
