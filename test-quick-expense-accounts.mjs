/**
 * TEST QUICK EXPENSE ACCOUNT SELECTION
 * Verify that payment accounts are loaded and auto-selected correctly
 */

import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function testQuickExpenseAccounts() {
  const sql = postgres(DATABASE_URL);

  try {
    console.log('🔍 TESTING QUICK EXPENSE ACCOUNT SELECTION\n');

    // Check payment accounts
    const accounts = await sql`
      SELECT id, name, type, is_active, balance FROM finance_accounts
      WHERE is_active = true
      ORDER BY type, name
    `;

    console.log(`📊 PAYMENT ACCOUNTS (${accounts.length} total):`);
    accounts.forEach((acc, index) => {
      console.log(`${index + 1}. ${acc.name} (${acc.id}) - Type: ${acc.type}, Balance: ${acc.balance}`);
    });

    if (accounts.length === 0) {
      console.log('\n❌ CRITICAL: No active payment accounts found!');
      console.log('💡 This will cause the "Please select a payment account" error');
      return;
    }

    // Test customer care account filtering (only cash)
    const cashAccounts = accounts.filter(acc => acc.type === 'cash');
    console.log(`\n💰 CASH ACCOUNTS FOR CUSTOMER CARE: ${cashAccounts.length}`);
    if (cashAccounts.length === 0) {
      console.log('❌ WARNING: No cash accounts available for customer care users');
    } else {
      cashAccounts.forEach(acc => {
        console.log(`  - ${acc.name} (${acc.id})`);
      });
    }

    // Test admin account access (all accounts)
    console.log(`\n👑 ACCOUNTS FOR ADMIN USERS: ${accounts.length}`);
    accounts.forEach(acc => {
      console.log(`  - ${acc.name} (${acc.id}) - ${acc.type}`);
    });

    // Check account_transactions table structure
    const transactionColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'account_transactions'
      AND table_schema = 'public'
      AND column_name IN ('account_id', 'transaction_type', 'amount', 'branch_id')
      ORDER BY column_name
    `;

    console.log(`\n📋 ACCOUNT_TRANSACTIONS TABLE STRUCTURE:`);
    transactionColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(required)'}`);
    });

    // Check if required columns exist
    const requiredColumns = ['account_id', 'transaction_type', 'amount', 'branch_id'];
    const missingColumns = requiredColumns.filter(col =>
      !transactionColumns.some(tc => tc.column_name === col)
    );

    if (missingColumns.length > 0) {
      console.log(`\n❌ MISSING REQUIRED COLUMNS: ${missingColumns.join(', ')}`);
    } else {
      console.log(`\n✅ ALL REQUIRED COLUMNS PRESENT`);
    }

    // Check recent expense transactions
    const recentExpenses = await sql`
      SELECT COUNT(*) as count, MAX(created_at) as latest
      FROM account_transactions
      WHERE transaction_type = 'expense'
      AND created_at >= NOW() - INTERVAL '1 hour'
    `;

    console.log(`\n🕐 RECENT EXPENSE ACTIVITY:`);
    console.log(`  - Expenses in last hour: ${recentExpenses[0].count}`);
    console.log(`  - Latest expense: ${recentExpenses[0].latest || 'None'}`);

    // Summary
    console.log(`\n📊 SUMMARY:`);
    console.log(`  ✅ Total accounts: ${accounts.length}`);
    console.log(`  ✅ Cash accounts: ${cashAccounts.length}`);
    console.log(`  ✅ Database structure: ${missingColumns.length === 0 ? 'Valid' : 'Invalid'}`);

    if (accounts.length > 0 && cashAccounts.length > 0 && missingColumns.length === 0) {
      console.log(`  🎉 ACCOUNT SYSTEM READY FOR QUICK EXPENSE`);
    } else {
      console.log(`  ❌ ISSUES FOUND - WILL CAUSE VALIDATION ERRORS`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await sql.end();
  }
}

testQuickExpenseAccounts()
  .then(() => console.log('\n🏆 Account test completed'))
  .catch(error => {
    console.error('\n💥 Account test failed:', error.message);
    process.exit(1);
  });