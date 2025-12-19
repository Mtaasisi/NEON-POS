/**
 * DEBUG ACCOUNT VISIBILITY IN QUICK EXPENSE
 * Simulate the render conditions to identify why accounts aren't showing
 */

import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function debugAccountVisibility() {
  const sql = postgres(DATABASE_URL);

  try {
    console.log('🔍 DEBUGGING ACCOUNT VISIBILITY IN QUICK EXPENSE\n');

    // Get accounts
    const accounts = await sql`
      SELECT id, name, type, balance FROM finance_accounts
      WHERE is_active = true AND is_payment_method = true
      ORDER BY type, name
    `;

    console.log(`📊 AVAILABLE ACCOUNTS: ${accounts.length}`);
    accounts.forEach(acc => {
      console.log(`   ${acc.name} (${acc.type})`);
    });

    // Simulate different user scenarios
    const scenarios = [
      { role: 'admin', isCustomerCare: false, description: 'Admin User (normal case)' },
      { role: 'customer-care', isCustomerCare: true, description: 'Customer Care User' },
      { role: 'manager', isCustomerCare: false, description: 'Manager User' }
    ];

    console.log(`\n🎭 SIMULATING RENDER CONDITIONS:\n`);

    scenarios.forEach(scenario => {
      console.log(`👤 ${scenario.description}:`);
      console.log(`   isCustomerCare: ${scenario.isCustomerCare}`);
      console.log(`   paymentAccounts.length: ${accounts.length}`);

      const showAccountButtons = !scenario.isCustomerCare && accounts.length > 1;
      const showCashAccount = scenario.isCustomerCare && accounts.length > 0;

      console.log(`   showAccountButtons: ${showAccountButtons} (!${scenario.isCustomerCare} && ${accounts.length} > 1)`);
      console.log(`   showCashAccount: ${showCashAccount} (${scenario.isCustomerCare} && ${accounts.length} > 0)`);

      if (showAccountButtons) {
        console.log(`   ✅ Would show: Multiple account buttons (${accounts.length} accounts)`);
      } else if (showCashAccount) {
        console.log(`   ✅ Would show: Single cash account display`);
      } else {
        console.log(`   ❌ Would show: NO ACCOUNTS (This is the problem!)`);
        console.log(`   💡 Reason: ${scenario.isCustomerCare ? 'User is customer-care but no accounts available' : `User is not customer-care but only ${accounts.length} account(s) available`}`);
      }

      console.log('');
    });

    // Provide solutions
    console.log('🔧 POSSIBLE SOLUTIONS:');
    console.log('');

    if (accounts.length === 0) {
      console.log('❌ CRITICAL: No accounts available');
      console.log('   Solution: Create payment accounts in the system');
    } else if (accounts.length === 1) {
      console.log('⚠️  Only 1 account available');
      console.log('   For admin users: Need 2+ accounts to show account buttons');
      console.log('   For customer-care: Account must be of type "cash"');
      console.log('');
      console.log('   Current accounts:');
      accounts.forEach(acc => {
        console.log(`   - ${acc.name}: ${acc.type}`);
      });
    } else {
      console.log('✅ Multiple accounts available - should work for admin users');
    }

    console.log('');
    console.log('🛠️  IMMEDIATE FIXES:');
    console.log('1. Check browser console for [QuickExpense] debug logs');
    console.log('2. Look for user role detection');
    console.log('3. Check account loading status');
    console.log('4. Emergency fallback should now show accounts if needed');

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await sql.end();
  }
}

debugAccountVisibility()
  .then(() => console.log('\n🏆 Debug completed'))
  .catch(error => {
    console.error('\n💥 Debug failed:', error.message);
    process.exit(1);
  });