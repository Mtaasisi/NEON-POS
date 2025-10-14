#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require');

console.log('\n🔧 Fixing expense branch assignment...\n');

// Get the expense
const expense = await sql`
  SELECT * FROM finance_expenses
  WHERE amount = 90000
  ORDER BY created_at DESC
  LIMIT 1
`;

if (expense.length === 0) {
  console.log('❌ Expense not found');
  process.exit(1);
}

console.log('Found expense:');
console.log(`   ID: ${expense[0].id}`);
console.log(`   Title: ${expense[0].title}`);
console.log(`   Current branch_id: ${expense[0].branch_id || 'NULL'}`);
console.log('');

// Get available branches
const branches = await sql`
  SELECT id, name FROM store_locations
  WHERE is_active = true
  ORDER BY created_at
  LIMIT 5
`;

console.log(`Found ${branches.length} active branches:`);
branches.forEach((b, i) => {
  console.log(`   ${i + 1}. ${b.name} (ID: ${b.id})`);
});
console.log('');

if (branches.length === 0) {
  console.log('⚠️ No branches found. Setting expense without branch (will show for all branches)');
  console.log('');
  console.log('✅ Expense is ready - it should show in Finance → Expenses');
  console.log('   Make sure you have "All Branches" selected in the branch filter');
  process.exit(0);
}

// Assign to the first branch
const firstBranch = branches[0];
console.log(`Assigning expense to branch: ${firstBranch.name}`);

await sql`
  UPDATE finance_expenses
  SET branch_id = ${firstBranch.id}
  WHERE id = ${expense[0].id}
`;

console.log('✅ Expense updated!');
console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('✅ EXPENSE SHOULD NOW BE VISIBLE!');
console.log('═══════════════════════════════════════════════════════');
console.log('');
console.log(`Expense assigned to branch: ${firstBranch.name}`);
console.log('');
console.log('To see it:');
console.log(`1. Select branch: "${firstBranch.name}"`);
console.log('2. OR select "All Branches"');
console.log('3. Go to Finance → Expenses');
console.log('4. Look for "Purchase Order Payment: PO-1760373302719"');
console.log('');
console.log('💡 TIP: If you have multiple branches, make sure');
console.log('   you are viewing the correct branch or "All Branches"');
console.log('═══════════════════════════════════════════════════════');

