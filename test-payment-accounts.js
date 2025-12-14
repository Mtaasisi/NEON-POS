/**
 * Payment Accounts - Automated Test Script
 * 
 * Run with: node test-payment-accounts.js
 * Or: npm test payment-accounts
 * 
 * Prerequisites:
 * - Application running on http://localhost:5173
 * - Admin user credentials
 * - Playwright installed: npm install playwright
 */

const { chromium } = require('playwright');

// Test configuration
const CONFIG = {
  baseUrl: 'http://localhost:5173',
  timeout: 10000,
  slowMo: 500, // Slow down actions for visibility
  headless: false, // Show browser
  
  // Admin credentials (update these)
  username: 'admin@example.com',
  password: 'admin123'
};

// Test data
const TEST_ACCOUNTS = {
  cash: {
    name: 'Test Cash USD',
    type: 'cash',
    currency: 'USD',
    balance: '1000'
  },
  bank: {
    name: 'CRDB Test Bank',
    type: 'bank',
    currency: 'TZS',
    balance: '5000000',
    bankName: 'CRDB Bank',
    accountNumber: '01150012345'
  },
  mobileMoney: {
    name: 'M-Pesa Test',
    type: 'mobile_money',
    currency: 'TZS',
    balance: '500000',
    provider: 'M-Pesa',
    phone: '+255712345678'
  },
  creditCard: {
    name: 'Visa Test Card',
    type: 'credit_card',
    currency: 'USD',
    balance: '5000',
    issuer: 'Visa',
    lastFour: '4532'
  }
};

// Utility functions
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function log(message, type = 'info') {
  const icons = {
    info: '📝',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    test: '🧪'
  };
  console.log(`${icons[type]} ${message}`);
}

// Test functions
async function login(page) {
  await log('Attempting to login...', 'test');
  
  try {
    // Check if already logged in
    const isLoggedIn = await page.locator('text=Dashboard').isVisible({ timeout: 2000 }).catch(() => false);
    if (isLoggedIn) {
      await log('Already logged in', 'success');
      return true;
    }

    // Fill login form
    await page.fill('input[type="email"]', CONFIG.username);
    await page.fill('input[type="password"]', CONFIG.password);
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForURL('**/dashboard', { timeout: CONFIG.timeout });
    await log('Login successful', 'success');
    return true;
  } catch (error) {
    await log(`Login failed: ${error.message}`, 'error');
    return false;
  }
}

async function navigateToPaymentAccounts(page) {
  await log('Navigating to Payment Accounts...', 'test');
  
  try {
    // Navigate to payments page
    await page.goto(`${CONFIG.baseUrl}/payments`);
    await sleep(1000);
    
    // Click on Payment Accounts tab (might be "Providers" or "Payment Accounts")
    const providersTab = page.locator('button:has-text("Payment Accounts"), button:has-text("Providers")').first();
    await providersTab.click();
    await sleep(1000);
    
    // Verify we're on the right page
    const addButton = await page.locator('button:has-text("Add Account")').isVisible();
    if (addButton) {
      await log('Successfully navigated to Payment Accounts', 'success');
      return true;
    }
    
    throw new Error('Add Account button not found');
  } catch (error) {
    await log(`Navigation failed: ${error.message}`, 'error');
    return false;
  }
}

async function test1_CreateCashAccount(page) {
  await log('TEST 1: Create Cash Account (USD)', 'test');
  
  try {
    // Click Add Account
    await page.click('button:has-text("Add Account")');
    await sleep(500);
    
    // Fill form
    const data = TEST_ACCOUNTS.cash;
    await page.fill('input[placeholder*="Cash Drawer"]', data.name);
    await page.selectOption('select:near(:text("Account Type"))', data.type);
    await page.selectOption('select:near(:text("Currency"))', data.currency);
    await page.fill('input[type="number"]', data.balance);
    
    // Check settings
    await page.check('input[type="checkbox"]:near(:text("Active Account"))');
    await page.check('input[type="checkbox"]:near(:text("Payment Method"))');
    
    // Save
    await page.click('button:has-text("Create Account")');
    await sleep(2000);
    
    // Verify success
    const accountCard = await page.locator(`text=${data.name}`).isVisible();
    if (accountCard) {
      await log('✓ Cash account created successfully', 'success');
      return true;
    }
    throw new Error('Account not found in list');
  } catch (error) {
    await log(`✗ Test failed: ${error.message}`, 'error');
    return false;
  }
}

async function test2_BankAccountValidation(page) {
  await log('TEST 2: Bank Account Validation', 'test');
  
  try {
    // Click Add Account
    await page.click('button:has-text("Add Account")');
    await sleep(500);
    
    // Fill partial form (missing bank name)
    await page.fill('input[placeholder*="Cash Drawer"]', 'Test Bank');
    await page.selectOption('select:near(:text("Account Type"))', 'bank');
    
    // Try to save without bank name
    await page.click('button:has-text("Create Account")');
    await sleep(1000);
    
    // Check for error message
    const errorExists = await page.locator('text=/Bank name is required/i').isVisible({ timeout: 2000 });
    if (errorExists) {
      await log('✓ Validation working - error shown for missing bank name', 'success');
      
      // Close modal
      await page.click('button:has-text("Cancel"), button:has(svg)').first();
      await sleep(500);
      return true;
    }
    throw new Error('Validation error not shown');
  } catch (error) {
    await log(`✗ Test failed: ${error.message}`, 'error');
    // Try to close modal anyway
    await page.click('button:has-text("Cancel")').catch(() => {});
    return false;
  }
}

async function test3_CreateBankAccount(page) {
  await log('TEST 3: Create Bank Account (Complete)', 'test');
  
  try {
    // Click Add Account
    await page.click('button:has-text("Add Account")');
    await sleep(500);
    
    // Fill complete bank form
    const data = TEST_ACCOUNTS.bank;
    await page.fill('input[placeholder*="Cash Drawer"]', data.name);
    await page.selectOption('select:near(:text("Account Type"))', data.type);
    await page.selectOption('select:near(:text("Currency"))', data.currency);
    await page.fill('input[type="number"]', data.balance);
    
    // Wait for bank-specific fields to appear
    await sleep(500);
    
    // Fill bank-specific fields
    await page.fill('input[placeholder*="CRDB Bank"]', data.bankName);
    await page.fill('input[placeholder*="account number"]', data.accountNumber);
    
    // Save
    await page.click('button:has-text("Create Account")');
    await sleep(2000);
    
    // Verify success
    const accountCard = await page.locator(`text=${data.name}`).isVisible();
    if (accountCard) {
      await log('✓ Bank account created successfully', 'success');
      return true;
    }
    throw new Error('Bank account not found in list');
  } catch (error) {
    await log(`✗ Test failed: ${error.message}`, 'error');
    return false;
  }
}

async function test4_CreateMobileMoneyAccount(page) {
  await log('TEST 4: Create Mobile Money Account', 'test');
  
  try {
    // Click Add Account
    await page.click('button:has-text("Add Account")');
    await sleep(500);
    
    // Fill mobile money form
    const data = TEST_ACCOUNTS.mobileMoney;
    await page.fill('input[placeholder*="Cash Drawer"]', data.name);
    await page.selectOption('select:near(:text("Account Type"))', data.type);
    await page.selectOption('select:near(:text("Currency"))', data.currency);
    await page.fill('input[type="number"]', data.balance);
    
    // Wait for mobile money fields
    await sleep(500);
    
    // Fill mobile money specific fields
    await page.fill('input[placeholder*="M-Pesa"]', data.provider);
    await page.fill('input[placeholder*="+255"]', data.phone);
    
    // Check special settings
    await page.check('input[type="checkbox"]:near(:text("Require Reference"))');
    await page.check('input[type="checkbox"]:near(:text("Require Account Number"))');
    
    // Save
    await page.click('button:has-text("Create Account")');
    await sleep(2000);
    
    // Verify success
    const accountCard = await page.locator(`text=${data.name}`).isVisible();
    if (accountCard) {
      await log('✓ Mobile money account created successfully', 'success');
      return true;
    }
    throw new Error('Mobile money account not found in list');
  } catch (error) {
    await log(`✗ Test failed: ${error.message}`, 'error');
    return false;
  }
}

async function test5_CurrencyFilter(page) {
  await log('TEST 5: Currency Filter', 'test');
  
  try {
    // Select USD filter
    await page.selectOption('select:near(:text("Currency"))', 'USD');
    await sleep(1000);
    
    // Check if only USD accounts are visible
    const usdAccount = await page.locator('text=Test Cash USD').isVisible();
    const tzsAccount = await page.locator('text=CRDB Test Bank').isVisible();
    
    if (usdAccount && !tzsAccount) {
      await log('✓ Currency filter working - shows only USD accounts', 'success');
      
      // Reset filter
      await page.selectOption('select:near(:text("Currency"))', 'all');
      await sleep(500);
      return true;
    }
    throw new Error('Currency filter not working correctly');
  } catch (error) {
    await log(`✗ Test failed: ${error.message}`, 'error');
    return false;
  }
}

async function test6_EditAccount(page) {
  await log('TEST 6: Edit Account', 'test');
  
  try {
    // Find and click edit button on first account
    const editButton = page.locator('button[title*="Edit"]').first();
    await editButton.click();
    await sleep(500);
    
    // Change currency
    await page.selectOption('select:near(:text("Currency"))', 'EUR');
    
    // Save
    await page.click('button:has-text("Update Account")');
    await sleep(2000);
    
    await log('✓ Account edited successfully', 'success');
    return true;
  } catch (error) {
    await log(`✗ Test failed: ${error.message}`, 'error');
    return false;
  }
}

async function test7_ViewHistory(page) {
  await log('TEST 7: View Transaction History', 'test');
  
  try {
    // Click view history button
    const historyButton = page.locator('button:has-text("View Full History")').first();
    await historyButton.click();
    await sleep(1000);
    
    // Verify modal opened
    const modalTitle = await page.locator('text=Transaction History').isVisible();
    if (modalTitle) {
      await log('✓ History modal opened successfully', 'success');
      
      // Close modal
      await page.click('button:has-text("Close")');
      await sleep(500);
      return true;
    }
    throw new Error('History modal did not open');
  } catch (error) {
    await log(`✗ Test failed: ${error.message}`, 'error');
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('\n🚀 Starting Payment Accounts Automated Tests\n');
  console.log('='.repeat(50));
  
  const browser = await chromium.launch({
    headless: CONFIG.headless,
    slowMo: CONFIG.slowMo
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };
  
  try {
    // Navigate to app
    await page.goto(CONFIG.baseUrl);
    await sleep(1000);
    
    // Login
    const loginSuccess = await login(page);
    if (!loginSuccess) {
      throw new Error('Login failed - cannot continue tests');
    }
    
    // Navigate to Payment Accounts
    const navSuccess = await navigateToPaymentAccounts(page);
    if (!navSuccess) {
      throw new Error('Navigation failed - cannot continue tests');
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('Running Test Suite...\n');
    
    // Run all tests
    const tests = [
      test1_CreateCashAccount,
      test2_BankAccountValidation,
      test3_CreateBankAccount,
      test4_CreateMobileMoneyAccount,
      test5_CurrencyFilter,
      test6_EditAccount,
      test7_ViewHistory
    ];
    
    for (const test of tests) {
      results.total++;
      const success = await test(page);
      if (success) {
        results.passed++;
      } else {
        results.failed++;
      }
      await sleep(1000); // Pause between tests
    }
    
  } catch (error) {
    await log(`Fatal error: ${error.message}`, 'error');
  } finally {
    // Print results
    console.log('\n' + '='.repeat(50));
    console.log('📊 Test Results Summary\n');
    console.log(`Total Tests: ${results.total}`);
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
    console.log('='.repeat(50) + '\n');
    
    // Keep browser open for manual inspection
    await log('Tests complete! Browser will remain open for 30 seconds...', 'info');
    await sleep(30000);
    
    await browser.close();
  }
}

// Run tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };

