#!/usr/bin/env node

import puppeteer from 'puppeteer';

console.log('🤖 Automated Customer Creation Test with Login');
console.log('═══════════════════════════════════════════════════════\n');

const TEST_URL = 'http://localhost:3000';
const LOGIN_EMAIL = 'care@care.com';
const LOGIN_PASSWORD = '123456';

// Helper to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTest() {
  let browser;
  let consoleErrors = [];
  let consoleWarnings = [];
  let consoleLogs = [];
  
  try {
    console.log('🚀 Launching browser...');
    browser = await puppeteer.launch({
      headless: false, // Show browser for debugging
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      devtools: true // Open DevTools automatically
    });
    
    const page = await browser.newPage();
    
    // Capture console messages
    page.on('console', msg => {
      const text = msg.text();
      const type = msg.type();
      
      if (type === 'error') {
        consoleErrors.push(text);
        console.log('❌ [Console Error]:', text);
      } else if (type === 'warning') {
        consoleWarnings.push(text);
        console.log('⚠️  [Console Warning]:', text);
      } else if (text.includes('CUSTOMER CREATION') || text.includes('AddCustomerModal') || text.includes('customerApi')) {
        consoleLogs.push(text);
        console.log('📝 [Console Log]:', text);
      }
    });
    
    // Capture page errors
    page.on('pageerror', error => {
      console.error('❌ [Page Error]:', error.message);
      consoleErrors.push(`Page Error: ${error.message}`);
    });
    
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log(`\n📱 Navigating to ${TEST_URL}...`);
    await page.goto(TEST_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    
    console.log('✅ Page loaded\n');
    
    // Wait a bit for React to initialize
    await wait(2000);
    
    console.log('🔐 Step 1: Logging in...');
    console.log(`   Email: ${LOGIN_EMAIL}`);
    console.log(`   Password: ${LOGIN_PASSWORD}\n`);
    
    // Look for login form
    try {
      // Try to find email input
      await page.waitForSelector('input[type="email"], input[name="email"], input[placeholder*="email"]', { timeout: 5000 });
      
      // Fill in login form
      const emailInput = await page.$('input[type="email"], input[name="email"], input[placeholder*="email"]');
      if (emailInput) {
        await emailInput.type(LOGIN_EMAIL, { delay: 100 });
        console.log('   ✅ Email entered');
      }
      
      const passwordInput = await page.$('input[type="password"], input[name="password"]');
      if (passwordInput) {
        await passwordInput.type(LOGIN_PASSWORD, { delay: 100 });
        console.log('   ✅ Password entered');
      }
      
      // Click login button
      const loginButton = await page.$('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")');
      if (loginButton) {
        await loginButton.click();
        console.log('   ✅ Login button clicked');
      }
      
      // Wait for navigation or dashboard
      await wait(3000);
      console.log('   ✅ Logged in successfully\n');
      
    } catch (loginError) {
      console.log('   ⚠️  Login form not found or already logged in');
      console.log('   Continuing with test...\n');
    }
    
    console.log('👥 Step 2: Navigating to Customers page...');
    
    // Try to find and click Customers link
    try {
      const customersLink = await page.$('a[href*="customers"], a:has-text("Customers")');
      if (customersLink) {
        await customersLink.click();
        await wait(2000);
        console.log('   ✅ Navigated to Customers page\n');
      } else {
        // Try to navigate directly
        await page.goto(`${TEST_URL}/customers`, { waitUntil: 'networkidle2' });
        await wait(2000);
        console.log('   ✅ Navigated to Customers page (direct URL)\n');
      }
    } catch (navError) {
      console.log('   ⚠️  Could not navigate to customers page:', navError.message);
      console.log('   Trying direct navigation...');
      await page.goto(`${TEST_URL}/customers`, { waitUntil: 'networkidle2' });
      await wait(2000);
    }
    
    console.log('➕ Step 3: Opening Add Customer modal...');
    
    // Take screenshot before clicking
    await page.screenshot({ path: 'test-before-add-customer.png' });
    console.log('   📸 Screenshot saved: test-before-add-customer.png');
    
    // Try to find Add Customer button
    try {
      await page.waitForSelector('button:has-text("Add"), button:has-text("New Customer"), button:has-text("Create")', { timeout: 5000 });
      
      const addButton = await page.$('button:has-text("Add"), button:has-text("New Customer"), button:has-text("Create")');
      if (addButton) {
        await addButton.click();
        await wait(1000);
        console.log('   ✅ Add Customer button clicked\n');
      }
    } catch (btnError) {
      console.log('   ❌ Could not find Add Customer button');
      console.log('   Taking screenshot for debugging...');
      await page.screenshot({ path: 'test-no-add-button.png' });
      throw new Error('Add Customer button not found');
    }
    
    console.log('📝 Step 4: Filling customer form...');
    
    await wait(1000);
    
    // Fill in customer details
    const testCustomer = {
      name: 'Auto Test Customer ' + Date.now(),
      phone: '+255' + Math.floor(Math.random() * 1000000000),
      email: 'autotest@example.com',
      city: 'Dar es Salaam'
    };
    
    console.log('   Customer details:', testCustomer);
    
    // Fill name
    const nameInput = await page.$('input[name="name"], input[placeholder*="name"]');
    if (nameInput) {
      await nameInput.type(testCustomer.name, { delay: 50 });
      console.log('   ✅ Name entered');
    }
    
    // Fill phone
    const phoneInput = await page.$('input[name="phone"], input[type="tel"]');
    if (phoneInput) {
      await phoneInput.type(testCustomer.phone, { delay: 50 });
      console.log('   ✅ Phone entered');
    }
    
    // Select gender (required)
    try {
      const maleButton = await page.$('button:has-text("Male")');
      if (maleButton) {
        await maleButton.click();
        console.log('   ✅ Gender selected: Male');
      }
    } catch (e) {
      console.log('   ⚠️  Could not select gender');
    }
    
    await wait(500);
    
    console.log('\n   📸 Taking screenshot before submit...');
    await page.screenshot({ path: 'test-form-filled.png' });
    
    console.log('\n💾 Step 5: Submitting form...');
    console.log('   (Watch browser console for debug logs!)\n');
    
    // Clear previous console logs
    consoleLogs = [];
    consoleErrors = [];
    
    // Click submit button
    const submitButton = await page.$('button[type="submit"], button:has-text("Add Customer"), button:has-text("Create")');
    if (submitButton) {
      await submitButton.click();
      console.log('   ✅ Submit button clicked');
    }
    
    // Wait for response
    console.log('   ⏳ Waiting for response (10 seconds)...\n');
    await wait(10000);
    
    // Take screenshot after submit
    await page.screenshot({ path: 'test-after-submit.png' });
    console.log('   📸 Screenshot saved: test-after-submit.png\n');
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 TEST RESULTS');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('🖥️  Console Errors Captured:', consoleErrors.length);
    if (consoleErrors.length > 0) {
      console.log('\n❌ ERRORS FOUND:');
      consoleErrors.forEach((err, i) => {
        console.log(`\n${i + 1}. ${err}`);
      });
    }
    
    console.log('\n⚠️  Console Warnings:', consoleWarnings.length);
    if (consoleWarnings.length > 0) {
      console.log('\nWarnings:');
      consoleWarnings.forEach((warn, i) => {
        console.log(`${i + 1}. ${warn}`);
      });
    }
    
    console.log('\n📝 Debug Logs Captured:', consoleLogs.length);
    if (consoleLogs.length > 0) {
      console.log('\nRelevant logs:');
      consoleLogs.forEach((log, i) => {
        console.log(`${i + 1}. ${log.substring(0, 200)}...`);
      });
    }
    
    console.log('\n📸 Screenshots saved:');
    console.log('   - test-before-add-customer.png');
    console.log('   - test-form-filled.png');
    console.log('   - test-after-submit.png');
    
    console.log('\n═══════════════════════════════════════════════════════');
    
    if (consoleErrors.length === 0) {
      console.log('✅ NO ERRORS FOUND - Customer creation might be working!');
    } else {
      console.log('❌ ERRORS DETECTED - See details above');
    }
    
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Keep browser open for 30 seconds to allow manual inspection
    console.log('🔍 Browser will stay open for 30 seconds...');
    console.log('   Check the browser console manually if needed!\n');
    await wait(30000);
    
  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error('   Error:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    if (browser) {
      await browser.close();
      console.log('🏁 Browser closed. Test complete.\n');
    }
  }
}

// Run the test
runTest().catch(console.error);

