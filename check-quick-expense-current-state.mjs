/**
 * CHECK QUICK EXPENSE CURRENT STATE
 * Verify the current implementation and identify any remaining issues
 */

import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function checkQuickExpenseState() {
  const sql = postgres(DATABASE_URL);

  try {
    console.log('🔍 CHECKING QUICK EXPENSE CURRENT STATE\n');

    // Check form data simulation (what user entered)
    console.log('📝 FORM DATA SIMULATION (from user screenshot):');
    console.log('   Category: Bodaboda');
    console.log('   Vendor: IUY (optional)');
    console.log('   Amount: 6,757 (formatted), 6757 (raw)');
    console.log('   Description: UYTUIYF BJKGH');
    console.log('');

    // Check expense categories
    const categories = await sql`
      SELECT id, name, is_active FROM expense_categories
      WHERE is_active = true
      ORDER BY name
    `;

    console.log(`📂 EXPENSE CATEGORIES (${categories.length} active):`);
    categories.forEach(cat => {
      console.log(`   ${cat.name}${cat.name === 'Bodaboda' ? ' ← SELECTED' : ''}`);
    });

    // Check if Bodaboda category exists
    const bodabodaCategory = categories.find(c => c.name === 'Bodaboda');
    if (!bodabodaCategory) {
      console.log('\n❌ ERROR: Selected category "Bodaboda" does not exist in database!');
    } else {
      console.log(`\n✅ SELECTED CATEGORY VALID: ${bodabodaCategory.name} (ID: ${bodabodaCategory.id})`);
    }

    // Check payment accounts
    const accounts = await sql`
      SELECT id, name, type, balance FROM finance_accounts
      WHERE is_active = true AND is_payment_method = true
      ORDER BY type, name
    `;

    console.log(`\n💳 PAYMENT ACCOUNTS (${accounts.length} available):`);
    accounts.forEach(acc => {
      console.log(`   ${acc.name} (${acc.type}) - Balance: ${acc.balance}`);
    });

    // Check branch setup
    const branches = await sql`
      SELECT id, name, data_isolation_mode FROM store_locations
      WHERE is_active = true
      ORDER BY name
    `;

    console.log(`\n🏢 BRANCHES (${branches.length}):`);
    branches.forEach(branch => {
      console.log(`   ${branch.name}: ${branch.data_isolation_mode} mode`);
    });

    // Simulate form validation
    console.log(`\n🔍 FORM VALIDATION SIMULATION:`);

    const simulatedFormData = {
      account_id: '', // This is likely the issue
      category: 'Bodaboda',
      amount: '6757',
      description: 'UYTUIYF BJKGH',
      vendor_name: 'IUY'
    };

    console.log('Form Data:', simulatedFormData);

    // Check each validation step
    const issues = [];

    if (!simulatedFormData.account_id) {
      issues.push('❌ account_id is empty - "Please select a payment account"');
    }

    if (!simulatedFormData.amount || simulatedFormData.amount.trim() === '') {
      issues.push('❌ amount is empty');
    }

    if (!simulatedFormData.description || simulatedFormData.description.trim() === '') {
      issues.push('❌ description is empty');
    }

    if (simulatedFormData.category === '') {
      issues.push('❌ category not selected');
    }

    if (issues.length === 0) {
      console.log('✅ FORM VALIDATION: All fields pass validation');
    } else {
      console.log('❌ FORM VALIDATION ISSUES:');
      issues.forEach(issue => console.log(`   ${issue}`));
    }

    // Check recent expense transactions
    const recentExpenses = await sql`
      SELECT COUNT(*) as count, MAX(created_at) as latest
      FROM account_transactions
      WHERE transaction_type = 'expense'
      AND created_at >= NOW() - INTERVAL '1 hour'
    `;

    console.log(`\n🕐 RECENT EXPENSE ACTIVITY:`);
    console.log(`   Expenses in last hour: ${recentExpenses[0].count}`);
    console.log(`   Latest expense: ${recentExpenses[0].latest || 'None'}`);

    // Check if the issue is account visibility
    console.log(`\n🎯 DIAGNOSIS:`);
    console.log('The most likely issue is: ACCOUNTS NOT VISIBLE IN UI');
    console.log('');
    console.log('Possible causes:');
    console.log('1. User role detection issue (customer-care vs admin)');
    console.log('2. Account loading failed');
    console.log('3. Branch filtering hiding accounts');
    console.log('4. React state not updating');
    console.log('');
    console.log('🔧 DEBUG STEPS:');
    console.log('1. Open browser console (F12)');
    console.log('2. Open Quick Expense modal');
    console.log('3. Look for [QuickExpense] debug logs');
    console.log('4. Check if accounts are loading');
    console.log('5. Check user role detection');

    // Check user roles (if possible)
    console.log(`\n👤 USER ROLE CHECK:`);
    console.log('This needs to be checked in the browser console logs.');
    console.log('Look for: "User role detection" in [QuickExpense] logs');

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  } finally {
    await sql.end();
  }
}

checkQuickExpenseState()
  .then(() => console.log('\n🏆 State check completed'))
  .catch(error => {
    console.error('\n💥 State check failed:', error.message);
    process.exit(1);
  });