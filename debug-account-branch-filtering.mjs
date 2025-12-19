/**
 * DEBUG ACCOUNT BRANCH FILTERING
 * Check why accounts are not showing in Quick Expense modal
 */

import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function debugAccountBranchFiltering() {
  const sql = postgres(DATABASE_URL);

  try {
    console.log('🔍 DEBUGGING ACCOUNT BRANCH FILTERING\n');

    // Get current branch ID (simulating what the app would see)
    console.log('📍 CURRENT BRANCH SIMULATION:');
    console.log('   - Assuming current branch is ARUSHA: 00000000-0000-0000-0000-000000000001');
    const currentBranchId = '00000000-0000-0000-0000-000000000001';

    // Check all finance accounts
    const allAccounts = await sql`
      SELECT id, name, type, is_active, is_payment_method, branch_id, is_shared, balance
      FROM finance_accounts
      WHERE is_active = true AND is_payment_method = true
      ORDER BY name
    `;

    console.log(`📊 ALL PAYMENT ACCOUNTS (${allAccounts.length}):`);
    allAccounts.forEach((acc, index) => {
      console.log(`${index + 1}. ${acc.name}`);
      console.log(`   - ID: ${acc.id}`);
      console.log(`   - Type: ${acc.type}`);
      console.log(`   - Branch ID: ${acc.branch_id || 'NULL (shared)'}`);
      console.log(`   - Is Shared: ${acc.is_shared}`);
      console.log(`   - Balance: ${acc.balance}`);
      console.log('');
    });

    // Simulate the branch filtering logic from addBranchFilter
    console.log('🏗️ BRANCH FILTERING SIMULATION:');
    console.log(`Current Branch: ${currentBranchId}`);

    // Get branch settings
    const branchSettings = await sql`
      SELECT data_isolation_mode, share_products, share_inventory, share_customers, share_suppliers
      FROM store_locations
      WHERE id = ${currentBranchId}
    `;

    if (branchSettings.length === 0) {
      console.log('❌ ERROR: Branch not found!');
      return;
    }

    const branch = branchSettings[0];
    console.log(`Branch Mode: ${branch.data_isolation_mode}`);
    console.log(`Share Products: ${branch.share_products}`);
    console.log(`Share Inventory: ${branch.share_inventory}`);

    // Apply filtering logic (simulating addBranchFilter for 'accounts')
    let filteredAccounts = [];

    if (branch.data_isolation_mode === 'isolated') {
      // ISOLATED: Only accounts from this branch
      filteredAccounts = allAccounts.filter(acc => acc.branch_id === currentBranchId);
      console.log('🔒 ISOLATED MODE: Only accounts from current branch');
    } else if (branch.data_isolation_mode === 'shared') {
      // SHARED: All accounts
      filteredAccounts = allAccounts;
      console.log('📊 SHARED MODE: All accounts visible');
    } else if (branch.data_isolation_mode === 'hybrid') {
      // HYBRID: Current branch accounts + shared accounts
      filteredAccounts = allAccounts.filter(acc =>
        acc.branch_id === currentBranchId ||
        acc.is_shared === true ||
        acc.branch_id === null
      );
      console.log('⚖️ HYBRID MODE: Current branch + shared accounts');
    }

    console.log(`\n✅ FILTERED ACCOUNTS (${filteredAccounts.length}):`);
    if (filteredAccounts.length === 0) {
      console.log('❌ NO ACCOUNTS AVAILABLE!');
      console.log('💡 This explains why the modal shows no accounts');
      console.log('');
      console.log('🔧 POSSIBLE FIXES:');
      console.log('1. Set accounts to is_shared = true');
      console.log('2. Assign accounts to the current branch');
      console.log('3. Change branch to shared mode');
      console.log('4. Check branch isolation settings');
    } else {
      filteredAccounts.forEach((acc, index) => {
        console.log(`${index + 1}. ${acc.name} (${acc.type}) - ${acc.balance}`);
      });
    }

    // Check what accounts are assigned to ARUSHA branch specifically
    console.log(`\n🏢 ACCOUNTS ASSIGNED TO ARUSHA BRANCH:`);
    const arushaAccounts = allAccounts.filter(acc => acc.branch_id === currentBranchId);
    if (arushaAccounts.length === 0) {
      console.log('❌ No accounts directly assigned to ARUSHA branch');
    } else {
      arushaAccounts.forEach(acc => {
        console.log(`   - ${acc.name} (${acc.id})`);
      });
    }

    // Check shared accounts
    console.log(`\n🌍 SHARED ACCOUNTS (available to all branches):`);
    const sharedAccounts = allAccounts.filter(acc => acc.is_shared === true || acc.branch_id === null);
    if (sharedAccounts.length === 0) {
      console.log('❌ No shared accounts available');
    } else {
      sharedAccounts.forEach(acc => {
        console.log(`   - ${acc.name} (${acc.id}) - branch_id: ${acc.branch_id || 'NULL'}`);
      });
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await sql.end();
  }
}

debugAccountBranchFiltering()
  .then(() => console.log('\n🏆 Debug completed'))
  .catch(error => {
    console.error('\n💥 Debug failed:', error.message);
    process.exit(1);
  });