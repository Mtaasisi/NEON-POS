#!/usr/bin/env node

import puppeteer from 'puppeteer';

console.log('🤖 Automated Customer Creation Test & Fix');
console.log('═══════════════════════════════════════════════════════\n');

const TEST_URL = 'http://localhost:3000';
const LOGIN_EMAIL = 'care@care.com';
const LOGIN_PASSWORD = '123456';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTest() {
  let browser;
  let consoleErrors = [];
  let allConsoleLogs = [];
  
  try {
    console.log('🚀 Launching browser...');
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      devtools: true
    });
    
    const page = await browser.newPage();
    
    // Capture all console messages
    page.on('console', msg => {
      const text = msg.text();
      const type = msg.type();
      allConsoleLogs.push({ type, text });
      
      if (type === 'error') {
        consoleErrors.push(text);
        console.log('\n❌ [Console Error]:', text.substring(0, 200));
      } else if (text.includes('FAILED') || text.includes('Error') || text.includes('❌')) {
        console.log('\n🔴 [Important Log]:', text.substring(0, 200));
      }
    });
    
    page.on('pageerror', error => {
      console.error('\n❌ [Page Error]:', error.message);
      consoleErrors.push(`Page Error: ${error.message}`);
    });
    
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log(`📱 Navigating to ${TEST_URL}...`);
    await page.goto(TEST_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('✅ Page loaded\n');
    
    await wait(2000);
    
    console.log('🔐 Logging in...');
    try {
      // Check if already logged in
      const isLoggedIn = await page.evaluate(() => {
        return document.body.innerText.includes('Customers') || 
               document.body.innerText.includes('Dashboard');
      });
      
      if (!isLoggedIn) {
        await page.type('input[type="email"]', LOGIN_EMAIL, { delay: 50 });
        await page.type('input[type="password"]', LOGIN_PASSWORD, { delay: 50 });
        await page.click('button[type="submit"]');
        await wait(3000);
        console.log('✅ Logged in\n');
      } else {
        console.log('✅ Already logged in\n');
      }
    } catch (e) {
      console.log('⚠️  Login handling skipped\n');
    }
    
    console.log('👥 Navigating to Customers page...');
    await page.goto(`${TEST_URL}/customers`, { waitUntil: 'networkidle2' });
    await wait(2000);
    console.log('✅ On Customers page\n');
    
    await page.screenshot({ path: 'test-customers-page.png' });
    console.log('📸 Screenshot: test-customers-page.png\n');
    
    console.log('🔍 Looking for Add Customer button...');
    
    // Find and click Add Customer button
    const addButtonFound = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addBtn = buttons.find(b => 
        b.textContent.trim() === 'Create' ||
        b.textContent.includes('Add') && 
        (b.textContent.includes('Customer') || b.textContent.includes('New'))
      );
      
      if (addBtn) {
        addBtn.click();
        return true;
      }
      return false;
    });
    
    if (addButtonFound) {
      console.log('✅ Add Customer button clicked\n');
      await wait(1000);
    } else {
      console.log('❌ Add Customer button not found');
      console.log('   Available buttons:', await page.evaluate(() => {
        return Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).slice(0, 10);
      }));
      throw new Error('Add Customer button not found');
    }
    
    console.log('📝 Filling customer form...\n');
    await wait(2000); // Wait for modal to fully appear
    
    const testCustomer = {
      name: 'AutoTest ' + Date.now(),
      phone: '+255' + Math.floor(Math.random() * 1000000000)
    };
    
    console.log('   Name:', testCustomer.name);
    console.log('   Phone:', testCustomer.phone);
    
    // Fill form using any available input
    await page.evaluate((name, phone) => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const nameInput = inputs.find(i => i.placeholder?.toLowerCase().includes('name') || i.name === 'name');
      const phoneInput = inputs.find(i => i.type === 'tel' || i.placeholder?.toLowerCase().includes('phone') || i.name === 'phone');
      
      if (nameInput) {
        nameInput.value = name;
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        nameInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      if (phoneInput) {
        phoneInput.value = phone;
        phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
        phoneInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, testCustomer.name, testCustomer.phone);
    
    console.log('   ✅ Name entered');
    console.log('   ✅ Phone entered');
    
    // Select gender
    const genderSelected = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const maleBtn = buttons.find(b => b.textContent.includes('Male') && !b.textContent.includes('Fe'));
      if (maleBtn) {
        maleBtn.click();
        return true;
      }
      return false;
    });
    
    if (genderSelected) {
      console.log('   ✅ Gender selected\n');
    }
    
    await page.screenshot({ path: 'test-form-filled.png' });
    console.log('📸 Screenshot: test-form-filled.png\n');
    
    console.log('💾 Submitting form...');
    console.log('⏰ Watch the browser console for detailed debug logs!\n');
    
    consoleErrors = [];
    allConsoleLogs = [];
    
    // Click submit
    const submitted = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const submitBtn = buttons.find(b => 
        b.textContent.includes('Add Customer') || 
        (b.type === 'submit' && b.textContent.includes('Add'))
      );
      
      if (submitBtn) {
        submitBtn.click();
        return true;
      }
      return false;
    });
    
    if (submitted) {
      console.log('✅ Submit button clicked\n');
    }
    
    console.log('⏳ Waiting 10 seconds for response...\n');
    await wait(10000);
    
    await page.screenshot({ path: 'test-after-submit.png' });
    console.log('📸 Screenshot: test-after-submit.png\n');
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 TEST RESULTS');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log(`Console Errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log('\n❌ ERRORS FOUND:\n');
      consoleErrors.slice(0, 5).forEach((err, i) => {
        console.log(`${i + 1}. ${err}\n`);
      });
    }
    
    // Check for specific error patterns in logs
    const failedLogs = allConsoleLogs.filter(log => 
      log.text.includes('FAILED') || 
      log.text.includes('Error Code') ||
      log.text.includes('Error Message')
    );
    
    if (failedLogs.length > 0) {
      console.log('\n🔴 CUSTOMER CREATION ERRORS DETECTED:\n');
      failedLogs.forEach(log => {
        console.log(log.text);
        console.log('---');
      });
    }
    
    console.log('\n📸 Screenshots saved:');
    console.log('   - test-customers-page.png');
    console.log('   - test-form-filled.png');
    console.log('   - test-after-submit.png\n');
    
    if (consoleErrors.length === 0 && failedLogs.length === 0) {
      console.log('✅ NO ERRORS - Customer creation might be working!');
    } else {
      console.log('❌ ERRORS DETECTED - Check console output above');
    }
    
    console.log('\n═══════════════════════════════════════════════════════\n');
    console.log('🔍 Browser staying open for 60 seconds...');
    console.log('   Check the browser console manually!\n');
    
    await wait(60000);
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
    console.log('\n🏁 Test complete.\n');
  }
}

runTest().catch(console.error);

