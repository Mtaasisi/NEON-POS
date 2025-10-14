#!/usr/bin/env node

/**
 * Detailed test to check why customers aren't loading
 */

import puppeteer from 'puppeteer';

const APP_URL = 'http://localhost:3000';
const LOGIN_EMAIL = 'care@care.com';
const LOGIN_PASSWORD = '123456';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runDetailedTest() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🔍 DETAILED CUSTOMER LOADING TEST');
  console.log('═══════════════════════════════════════════════════════\n');

  let browser;
  const apiRequests = [];
  const consoleMessages = [];

  try {
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1920, height: 1080 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Monitor network requests
    page.on('request', request => {
      const url = request.url();
      if (url.includes('customer') || url.includes('supabase')) {
        apiRequests.push({
          method: request.method(),
          url: url.substring(0, 100),
          timestamp: new Date().toISOString()
        });
      }
    });

    // Monitor console messages
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      
      if (text.includes('CUSTOMER') || text.includes('customer') || 
          text.includes('branch') || text.includes('BRANCH') ||
          text.includes('FETCH') || text.includes('ERROR')) {
        console.log(`   🖥️  [Console]: ${text.substring(0, 150)}`);
      }
    });

    // Navigate and login
    console.log('1️⃣  Navigating to app...');
    await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    
    console.log('2️⃣  Logging in...');
    await delay(1000);
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.type('input[type="email"]', LOGIN_EMAIL);
    await page.type('input[type="password"]', LOGIN_PASSWORD);
    await page.click('button[type="submit"]');
    await delay(4000);
    
    // Check branch ID
    console.log('\n3️⃣  Checking branch initialization...');
    const branchId = await page.evaluate(() => localStorage.getItem('current_branch_id'));
    console.log(`   ✅ Branch ID: ${branchId}`);

    // Navigate to customers
    console.log('\n4️⃣  Navigating to customers page...');
    await page.goto(`${APP_URL}/customers`, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(5000); // Wait for data to load

    // Check what's on the page
    console.log('\n5️⃣  Analyzing page content...');
    
    const pageAnalysis = await page.evaluate(() => {
      return {
        hasTable: !!document.querySelector('table'),
        tableRows: document.querySelectorAll('table tbody tr').length,
        hasLoadingSpinner: !!document.querySelector('[class*="loading"], [class*="spinner"]'),
        hasErrorMessage: !!document.querySelector('[class*="error"]'),
        bodyText: document.body.innerText.substring(0, 500),
        customerElements: document.querySelectorAll('[data-customer-id], [data-customer], .customer-row, .customer-item').length,
        allTables: document.querySelectorAll('table').length
      };
    });

    console.log('\n📊 Page Analysis:');
    console.log(`   - Has table: ${pageAnalysis.hasTable}`);
    console.log(`   - Table rows: ${pageAnalysis.tableRows}`);
    console.log(`   - Loading spinner: ${pageAnalysis.hasLoadingSpinner}`);
    console.log(`   - Error message: ${pageAnalysis.hasErrorMessage}`);
    console.log(`   - Customer elements: ${pageAnalysis.customerElements}`);
    console.log(`   - Total tables: ${pageAnalysis.allTables}`);

    // Check API requests
    console.log('\n📡 API Requests Made:');
    const customerRequests = apiRequests.filter(r => r.url.includes('customer'));
    if (customerRequests.length === 0) {
      console.log('   ❌ NO customer API requests were made!');
    } else {
      customerRequests.slice(-3).forEach(req => {
        console.log(`   - ${req.method} ${req.url}`);
      });
    }

    // Check console for errors
    console.log('\n🔍 Console Messages:');
    const errorMessages = consoleMessages.filter(m => 
      m.toLowerCase().includes('error') || m.toLowerCase().includes('fail')
    );
    if (errorMessages.length > 0) {
      console.log(`   ⚠️  Found ${errorMessages.length} error messages`);
      errorMessages.slice(-3).forEach(msg => {
        console.log(`   - ${msg.substring(0, 100)}`);
      });
    } else {
      console.log('   ✅ No error messages in console');
    }

    // Take screenshot
    await page.screenshot({ 
      path: 'customer-loading-debug.png', 
      fullPage: true 
    });
    console.log('\n📸 Screenshot saved: customer-loading-debug.png');

    // Test branch switching
    console.log('\n6️⃣  Testing branch switching...');
    
    // Find branch selector by trying different selectors
    const branchSelectorFound = await page.evaluate(() => {
      const selectors = [
        'select',
        'button[class*="branch"]',
        'button[class*="Branch"]',
        '[class*="BranchSelector"]',
        'div[class*="branch"]'
      ];
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`Found ${elements.length} elements with selector: ${selector}`);
          return true;
        }
      }
      return false;
    });

    if (branchSelectorFound) {
      console.log('   ✅ Branch selector found!');
      
      // Try to click it
      try {
        // Look for clickable branch button
        const branchButton = await page.$('button[class*="branch"], button[class*="Branch"]');
        if (branchButton) {
          console.log('   📍 Clicking branch selector...');
          await branchButton.click();
          await delay(2000);
          
          // Take screenshot of dropdown
          await page.screenshot({ 
            path: 'branch-selector-dropdown.png'
          });
          console.log('   📸 Branch dropdown screenshot: branch-selector-dropdown.png');
        }
      } catch (e) {
        console.log(`   ⚠️  Could not interact with branch selector: ${e.message}`);
      }
    } else {
      console.log('   ⚠️  Branch selector not found on page');
    }

    await delay(2000);

  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
  } finally {
    if (browser) {
      await delay(2000);
      await browser.close();
    }
  }

  console.log('\n═══════════════════════════════════════════════════════\n');
}

runDetailedTest();

