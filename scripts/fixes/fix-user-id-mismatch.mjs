import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL;
const sql = postgres(DATABASE_URL, { max: 1, ssl: 'require' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixUserIdMismatch() {
  console.log('🔧 Fixing User ID Mismatch...\n');

  try {
    // Login to get the REAL user ID
    console.log('1️⃣ Getting auth user ID...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'care@care.com',
      password: '123456'
    });

    if (authError) {
      console.error('   ❌ Login failed:', authError.message);
      await sql.end();
      return;
    }

    const realUserId = authData.user.id;
    console.log(`   ✅ Real Auth User ID: ${realUserId}`);

    // Get the employee record
    console.log('\n2️⃣ Checking employee record...');
    const employees = await sql`
      SELECT id, user_id, email, first_name, last_name, branch_id
      FROM employees
      WHERE email = 'care@care.com'
    `;

    if (employees.length === 0) {
      console.log('   ❌ No employee found!');
      await sql.end();
      return;
    }

    const emp = employees[0];
    console.log(`   Employee: ${emp.first_name} ${emp.last_name}`);
    console.log(`   Current user_id: ${emp.user_id}`);
    console.log(`   Expected user_id: ${realUserId}`);
    console.log(`   Branch ID: ${emp.branch_id}`);

    if (emp.user_id === realUserId) {
      console.log('\n   ✅ User IDs already match!');
    } else {
      console.log('\n3️⃣ Updating employee user_id...');
      await sql`
        UPDATE employees
        SET user_id = ${realUserId}
        WHERE email = 'care@care.com'
      `;
      console.log('   ✅ Employee user_id updated!');
    }

    // Verify the fix worked
    console.log('\n4️⃣ Verification - Testing actual query...');
    
    const verifyEmp = await sql`
      SELECT branch_id FROM employees WHERE user_id = ${realUserId}
    `;
    
    if (verifyEmp.length === 0) {
      console.log('   ❌ Still no employee found for this user_id');
      await sql.end();
      return;
    }

    const branchId = verifyEmp[0].branch_id;
    console.log(`   ✅ Employee found with branch_id: ${branchId}`);

    // Test the EXACT query the frontend makes
    console.log('\n5️⃣ Testing frontend query (via Supabase client)...');
    
    const { data: plans, error: plansError } = await supabase
      .from('customer_installment_plans')
      .select(`
        *,
        customer:customers!customer_id(id, name, phone, email),
        sale:lats_sales!sale_id(id, sale_number, total_amount)
      `)
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false });

    if (plansError) {
      console.log(`   ❌ Query failed: ${plansError.message}`);
      console.log(`   Code: ${plansError.code}`);
      console.log(`   Details:`, plansError);
    } else {
      console.log(`   ✅ Query successful!`);
      console.log(`   ✅ Found ${plans?.length || 0} installment(s)!`);
      
      if (plans && plans.length > 0) {
        console.log('\n   Installments retrieved via Supabase:');
        plans.forEach((p, idx) => {
          console.log(`   ${idx + 1}. ${p.plan_number} - ${p.customer?.name || 'N/A'} - ${p.status}`);
          console.log(`      Balance: ${p.balance_due} / ${p.total_amount}`);
        });
      }
    }

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ FIX COMPLETE!');
    console.log('='.repeat(60));
    console.log(`\n📊 Summary:`);
    console.log(`   Auth User ID: ${realUserId}`);
    console.log(`   Employee Branch ID: ${branchId}`);
    console.log(`   Installments Found: ${plans?.length || 0}`);
    console.log('\n🎉 NOW DO THIS:');
    console.log('   1. Open your browser (localhost:5173)');
    console.log('   2. Press F12 to open DevTools');
    console.log('   3. Go to Console tab');
    console.log('   4. Type: localStorage.clear() and press Enter');
    console.log('   5. Type: sessionStorage.clear() and press Enter');
    console.log('   6. Close DevTools');
    console.log('   7. Refresh the page (Ctrl+Shift+R or Cmd+Shift+R)');
    console.log('   8. Login as: care@care.com / 123456');
    console.log('   9. Go to Installments page');
    console.log(`   10. You WILL see ${plans?.length || 0} installments!`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await sql.end();
  }
}

fixUserIdMismatch().catch(console.error);

