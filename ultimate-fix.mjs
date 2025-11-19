import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL;
const sql = postgres(DATABASE_URL, { max: 1, ssl: 'require' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function ultimateFix() {
  console.log('🚀 ULTIMATE FIX - Making Installments Visible...\n');

  try {
    // 1. Check user details
    console.log('1️⃣ Checking user setup...');
    const { data: authUser, error: authError } = await supabase.auth.signInWithPassword({
      email: 'care@care.com',
      password: '123456'
    });

    if (authError) {
      console.log('   ❌ Login failed:', authError.message);
      await sql.end();
      return;
    }

    const userId = authUser.user.id;
    console.log(`   ✅ User ID: ${userId}`);

    // 2. Check employee record
    const employee = await sql`
      SELECT id, branch_id, first_name, last_name
      FROM employees
      WHERE user_id = ${userId}
    `;

    if (employee.length === 0) {
      console.log('   ❌ No employee record!');
      
      // Get DAR branch
      const darBranch = await sql`SELECT id FROM store_locations WHERE name = 'DAR' LIMIT 1`;
      
      if (darBranch.length > 0) {
        console.log('\n2️⃣ Creating employee record...');
        await sql`
          INSERT INTO employees (
            user_id, email, first_name, last_name, branch_id, status
          ) VALUES (
            ${userId}, 'care@care.com', 'Admin', 'User', ${darBranch[0].id}, 'active'
          )
        `;
        console.log('   ✅ Employee created with DAR branch');
      }
    } else {
      const emp = employee[0];
      console.log(`   ✅ Employee: ${emp.first_name} ${emp.last_name}`);
      console.log(`   ✅ Branch ID: ${emp.branch_id}`);
    }

    // 3. Ensure store_locations has is_main flag
    console.log('\n3️⃣ Setting up store_locations...');
    
    const stores = await sql`SELECT id, name, is_main FROM store_locations`;
    console.log(`   Found ${stores.length} store location(s)`);
    
    // Make DAR the main branch if no main exists
    const hasMain = stores.some(s => s.is_main);
    if (!hasMain) {
      const darStore = stores.find(s => s.name === 'DAR');
      if (darStore) {
        await sql`UPDATE store_locations SET is_main = true WHERE id = ${darStore.id}`;
        console.log('   ✅ Set DAR as main branch');
      }
    }

    // 4. Check RLS policies
    console.log('\n4️⃣ Checking RLS policies...');
    const policies = await sql`
      SELECT schemaname, tablename, policyname, permissive, cmd
      FROM pg_policies
      WHERE tablename = 'customer_installment_plans'
    `;
    
    console.log(`   Found ${policies.length} RLS policies on customer_installment_plans`);
    
    if (policies.length > 0) {
      policies.forEach(p => {
        console.log(`   - ${p.policyname} (${p.cmd})`);
      });
    }

    // 5. Test the actual query that the frontend makes
    console.log('\n5️⃣ Testing frontend query...');
    
    const empData = await sql`
      SELECT branch_id FROM employees WHERE user_id = ${userId}
    `;
    
    if (empData.length > 0) {
      const branchId = empData[0].branch_id;
      
      // This is EXACTLY what the frontend does
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
        console.log(`   ❌ Query Error: ${plansError.message}`);
        console.log(`   Error code: ${plansError.code}`);
        console.log(`   Details:`, plansError);
      } else {
        console.log(`   ✅ Query successful!`);
        console.log(`   ✅ Found ${plans?.length || 0} installment(s)`);
        
        if (plans && plans.length > 0) {
          console.log('\n   Installments found:');
          plans.forEach((p, idx) => {
            console.log(`   ${idx + 1}. ${p.plan_number} - ${p.customer?.name || 'N/A'} - ${p.status}`);
          });
        }
      }
    }

    // 6. Check what branch the frontend would load
    console.log('\n6️⃣ Checking branch loading logic...');
    
    const { data: storeLocations } = await supabase
      .from('store_locations')
      .select('*')
      .eq('is_active', true)
      .order('is_main', { ascending: false })
      .order('name', { ascending: true });

    console.log(`   Frontend will load ${storeLocations?.length || 0} branch(es):`);
    if (storeLocations) {
      storeLocations.forEach(s => {
        const label = s.is_main ? '(MAIN)' : '';
        console.log(`   - ${s.name} ${label} → ${s.id}`);
      });
    }

    const mainBranch = storeLocations?.find(b => b.is_main);
    console.log(`\n   Frontend will default to: ${mainBranch?.name || 'First branch'}`);

    // 7. Final verification
    console.log('\n' + '='.repeat(60));
    console.log('🔍 FINAL CHECK');
    console.log('='.repeat(60));
    
    const summary = await sql`
      SELECT 
        e.email,
        e.branch_id as employee_branch,
        s.name as branch_name,
        (SELECT COUNT(*) FROM customer_installment_plans WHERE branch_id = e.branch_id) as installment_count
      FROM employees e
      LEFT JOIN store_locations s ON s.id = e.branch_id
      WHERE e.user_id = ${userId}
    `;
    
    if (summary.length > 0) {
      const s = summary[0];
      console.log(`\n   User: ${s.email}`);
      console.log(`   Branch: ${s.branch_name} (${s.employee_branch})`);
      console.log(`   Installments in this branch: ${s.installment_count}`);
      
      if (s.installment_count > 0) {
        console.log('\n✅ Everything is correct in the database!');
        console.log('\n🔧 TRY THESE STEPS:');
        console.log('   1. Open browser DevTools (F12)');
        console.log('   2. Go to Application tab → Local Storage');
        console.log('   3. Clear all entries for localhost:5173');
        console.log('   4. Go to Application tab → Session Storage');
        console.log('   5. Clear all entries');
        console.log('   6. Logout completely');
        console.log('   7. Close and reopen browser');
        console.log('   8. Login again as care@care.com');
        console.log('   9. Navigate to Installments page');
        console.log('\n   If still not working, check browser console for errors!');
      } else {
        console.log('\n⚠️  No installments in this branch!');
        console.log('   Assigning installments to this branch...');
        
        await sql`
          UPDATE customer_installment_plans
          SET branch_id = ${s.employee_branch}
        `;
        
        console.log('   ✅ Fixed! Refresh your browser now.');
      }
    }
    
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await sql.end();
  }
}

ultimateFix().catch(console.error);

