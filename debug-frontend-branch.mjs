import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL;
const sql = postgres(DATABASE_URL, { max: 1, ssl: 'require' });

async function debugFrontendBranch() {
  console.log('🔍 Debugging Frontend Branch Issue...\n');

  try {
    // Get employee details
    console.log('1️⃣ Employee Details:');
    const employee = await sql`
      SELECT 
        e.id,
        e.first_name,
        e.last_name,
        e.email,
        e.user_id,
        e.branch_id,
        s.name as branch_name
      FROM employees e
      LEFT JOIN store_locations s ON s.id = e.branch_id
      WHERE e.email = 'care@care.com'
    `;
    
    if (employee.length === 0) {
      console.log('   ❌ No employee found!');
      await sql.end();
      return;
    }
    
    const emp = employee[0];
    console.log(`   Email: ${emp.email}`);
    console.log(`   User ID: ${emp.user_id}`);
    console.log(`   Branch ID: ${emp.branch_id}`);
    console.log(`   Branch Name: ${emp.branch_name || 'N/A'}`);

    // Check which branches exist in both systems
    console.log('\n2️⃣ Branch Systems:');
    
    const storeLocations = await sql`
      SELECT id, name FROM store_locations ORDER BY name
    `;
    console.log('   store_locations:');
    storeLocations.forEach(s => console.log(`   - ${s.name} (${s.id})`));
    
    const latsBranches = await sql`
      SELECT id, name FROM lats_branches ORDER BY name
    `;
    console.log('   lats_branches:');
    latsBranches.forEach(b => console.log(`   - ${b.name} (${b.id})`));

    // Check installments distribution
    console.log('\n3️⃣ Installment Plans Distribution:');
    const installmentsByBranch = await sql`
      SELECT 
        branch_id,
        COUNT(*) as count
      FROM customer_installment_plans
      GROUP BY branch_id
    `;
    
    for (const row of installmentsByBranch) {
      const branchInfo = await sql`
        SELECT name FROM lats_branches WHERE id = ${row.branch_id}
      `;
      const branchName = branchInfo.length > 0 ? branchInfo[0].name : 'Unknown';
      console.log(`   ${branchName} (${row.branch_id}): ${row.count} plan(s)`);
    }

    // Check what the app SHOULD be querying
    console.log('\n4️⃣ Expected Query (what the frontend should do):');
    console.log(`   SELECT * FROM customer_installment_plans`);
    console.log(`   WHERE branch_id = '${emp.branch_id}'`);
    
    // Actually run that query
    const expectedPlans = await sql`
      SELECT 
        cip.id,
        cip.plan_number,
        cip.branch_id,
        cip.status,
        cip.total_amount,
        cip.balance_due,
        c.name as customer_name
      FROM customer_installment_plans cip
      LEFT JOIN customers c ON c.id = cip.customer_id
      WHERE cip.branch_id = ${emp.branch_id}
      ORDER BY cip.created_at DESC
    `;
    
    console.log(`\n   Result: ${expectedPlans.length} plan(s) found\n`);
    
    if (expectedPlans.length > 0) {
      expectedPlans.forEach((plan, idx) => {
        console.log(`   ${idx + 1}. ${plan.plan_number} - ${plan.customer_name} - ${plan.status}`);
      });
    }

    // Check if there's a BranchContext mismatch
    console.log('\n5️⃣ Potential Issues:');
    
    // Check if employee's branch exists in lats_branches
    const empBranchInLats = latsBranches.some(b => b.id === emp.branch_id);
    if (!empBranchInLats) {
      console.log('   ⚠️  ISSUE FOUND: Employee branch NOT in lats_branches!');
      console.log(`      Employee is in: ${emp.branch_name} (${emp.branch_id})`);
      console.log(`      But lats_branches only has: ${latsBranches.map(b => b.name).join(', ')}`);
      console.log('   → The BranchContext might be loading a different branch!');
    } else {
      console.log('   ✅ Employee branch exists in lats_branches');
    }

    // Check if any plans have NULL branch_id
    const nullBranchPlans = await sql`
      SELECT COUNT(*) as count FROM customer_installment_plans WHERE branch_id IS NULL
    `;
    if (nullBranchPlans[0].count > 0) {
      console.log(`   ⚠️  ${nullBranchPlans[0].count} plan(s) have NULL branch_id`);
    }

    // Suggest the fix
    console.log('\n' + '='.repeat(60));
    console.log('💡 SOLUTION:');
    console.log('='.repeat(60));
    
    if (!empBranchInLats) {
      console.log('\nThe BranchContext loads from lats_branches, but your employee');
      console.log('is assigned to store_locations. We need to check which branch');
      console.log('the frontend is actually using.\n');
      console.log('OPTIONS:');
      console.log('A) Check browser console for which branch_id is being used');
      console.log('B) Update all installments to ALL branches (make them visible everywhere)');
      console.log('C) Fix the branch assignment to use lats_branches IDs\n');
    } else {
      console.log('\nEverything looks correct in the database!');
      console.log('The issue might be:');
      console.log('1. Browser cache - Try hard refresh (Ctrl+Shift+R)');
      console.log('2. Need to logout and login again');
      console.log('3. Check browser console (F12) for JavaScript errors');
      console.log('4. The InstallmentsPage might have an error\n');
    }
    
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sql.end();
  }
}

debugFrontendBranch().catch(console.error);

