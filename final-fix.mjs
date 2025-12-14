import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL;
const sql = postgres(DATABASE_URL, { max: 1, ssl: 'require' });

async function finalFix() {
  console.log('🔧 FINAL FIX - Assigning Everything to DAR Branch...\n');

  try {
    // Get DAR branch (the employee was originally assigned to it)
    console.log('1️⃣ Getting DAR branch...');
    const darBranch = await sql`
      SELECT id, name FROM lats_branches WHERE name = 'DAR'
    `;
    
    if (darBranch.length === 0) {
      console.log('   ❌ DAR branch not found!');
      
      // Get any branch
      const anyBranch = await sql`
        SELECT id, name FROM lats_branches LIMIT 1
      `;
      
      if (anyBranch.length === 0) {
        console.log('   ❌ No branches exist!');
        await sql.end();
        return;
      }
      
      const branch = anyBranch[0];
      console.log(`   Using ${branch.name} instead`);
      await assignToBranch(sql, branch.id, branch.name);
    } else {
      const branch = darBranch[0];
      console.log(`   ✅ Found ${branch.name} (${branch.id})`);
      await assignToBranch(sql, branch.id, branch.name);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await sql.end();
  }
}

async function assignToBranch(sql, branchId, branchName) {
  console.log(`\n2️⃣ Assigning employee to ${branchName}...`);
  await sql`
    UPDATE employees
    SET branch_id = ${branchId}
    WHERE email = 'care@care.com'
  `;
  console.log('   ✅ Employee assigned');

  console.log(`\n3️⃣ Assigning all installments to ${branchName}...`);
  const result = await sql`
    UPDATE customer_installment_plans
    SET branch_id = ${branchId}
  `;
  console.log('   ✅ Installments assigned');

  // Verify
  console.log('\n4️⃣ Verification:');
  
  const employee = await sql`
    SELECT e.first_name, e.last_name, e.branch_id, s.name as branch_name
    FROM employees e
    LEFT JOIN store_locations s ON s.id = e.branch_id
    WHERE e.email = 'care@care.com'
  `;
  
  if (employee.length > 0) {
    const e = employee[0];
    console.log(`   Employee: ${e.first_name} ${e.last_name}`);
    console.log(`   Branch: ${e.branch_name || branchName} (${e.branch_id})`);
  }

  const installments = await sql`
    SELECT 
      cip.plan_number,
      cip.status,
      cip.total_amount,
      cip.balance_due,
      c.name as customer_name
    FROM customer_installment_plans cip
    LEFT JOIN customers c ON c.id = cip.customer_id
    WHERE cip.branch_id = ${branchId}
    ORDER BY cip.created_at DESC
  `;
  
  console.log(`\n   ✅ ${installments.length} installment(s) in ${branchName}:\n`);
  
  installments.forEach((plan, idx) => {
    console.log(`   ${idx + 1}. ${plan.plan_number}`);
    console.log(`      Customer: ${plan.customer_name || 'N/A'}`);
    console.log(`      Status: ${plan.status}`);
    console.log(`      Balance: ${plan.balance_due} / ${plan.total_amount}`);
    console.log('');
  });

  console.log('=' + '='.repeat(59));
  console.log('✅ FIX COMPLETE!');
  console.log('=' + '='.repeat(59));
  console.log(`\n📊 Result:`);
  console.log(`   Branch: ${branchName} (${branchId})`);
  console.log(`   Employee: care@care.com assigned`);
  console.log(`   Installments visible: ${installments.length}`);
  console.log('\n🎉 NOW GO TO YOUR BROWSER:');
  console.log('   1. Refresh the page');
  console.log('   2. Login as: care@care.com (password: 123456)');
  console.log('   3. Navigate to Installments page');
  console.log(`   4. You should see ${installments.length} installment plan(s)!`);
  console.log('=' + '='.repeat(59) + '\n');
}

finalFix().catch(console.error);

