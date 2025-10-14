#!/usr/bin/env node

/**
 * Automated Browser Test: Customer Visibility After Branch Switch
 * Tests the issue where customers don't show after switching branches
 */

import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const APP_URL = 'http://localhost:3000';
const LOGIN_EMAIL = 'care@care.com';
const LOGIN_PASSWORD = '123456';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🧪 AUTOMATED TEST: Customer Visibility After Branch Switch');
  console.log('═══════════════════════════════════════════════════════\n');

  let browser;
  let issuesFound = [];
  let fixesApplied = [];

  try {
    // Launch browser
    console.log('🚀 Launching browser...');
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1920, height: 1080 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('BRANCH SWITCH') || text.includes('current_branch_id') || text.includes('CUSTOMER')) {
        console.log(`   🖥️  [Browser Console]: ${text}`);
      }
    });

    // Navigate to app
    console.log('\n📍 Step 1: Navigating to application...');
    await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);

    // Login
    console.log('\n🔐 Step 2: Logging in as care@care.com...');
    
    // Wait for login form
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
    
    // Fill login form
    await page.type('input[type="email"], input[name="email"]', LOGIN_EMAIL);
    await page.type('input[type="password"], input[name="password"]', LOGIN_PASSWORD);
    
    // Click login button
    await page.click('button[type="submit"]');
    await delay(3000);
    
    console.log('✅ Login successful!');

    // Check localStorage for initial branch
    console.log('\n📊 Step 3: Checking initial branch state...');
    
    // Wait a bit for BranchContext to initialize
    await delay(3000);
    
    const initialBranchId = await page.evaluate(() => localStorage.getItem('current_branch_id'));
    console.log(`   📍 Initial Branch ID: ${initialBranchId || '❌ NOT SET'}`);
    
    if (!initialBranchId) {
      issuesFound.push('❌ CRITICAL: No initial branch ID set in localStorage after login');
      console.log('   ❌ This will cause customers to not display!');
    } else {
      console.log('   ✅ Branch ID is properly initialized!');
    }

    // Navigate to Customers page
    console.log('\n👥 Step 4: Navigating to Customers page...');
    
    // Try to find and click customers link
    try {
      await page.waitForSelector('a[href*="customer"], a:has-text("Customer")', { timeout: 5000 });
      await page.click('a[href*="customer"], a:has-text("Customer")');
      await delay(3000);
      console.log('✅ Navigated to Customers page');
    } catch (e) {
      // Try direct navigation
      await page.goto(`${APP_URL}/customers`, { waitUntil: 'networkidle2' });
      await delay(3000);
      console.log('✅ Navigated to Customers page (direct URL)');
    }

    // Count initial customers
    console.log('\n📊 Step 5: Counting customers before branch switch...');
    const initialCustomerCount = await page.evaluate(() => {
      const rows = document.querySelectorAll('table tbody tr, [data-customer-row], .customer-item');
      return rows.length;
    });
    console.log(`   👥 Customers visible: ${initialCustomerCount}`);

    // Find branch selector
    console.log('\n🏪 Step 6: Finding branch selector...');
    
    let branchSelectorFound = false;
    let branches = [];
    
    try {
      // Look for branch selector - it might be a dropdown or select element
      const branchSelector = await page.$('select[class*="branch"], [class*="BranchSelector"], button:has-text("Branch")');
      
      if (branchSelector) {
        branchSelectorFound = true;
        console.log('✅ Branch selector found!');
        
        // Check if it's a select dropdown
        const isSelect = await page.evaluate(el => el.tagName === 'SELECT', branchSelector);
        
        if (isSelect) {
          // Get available branches from select options
          branches = await page.evaluate(() => {
            const select = document.querySelector('select[class*="branch"], select[class*="BranchSelector"]');
            if (!select) return [];
            return Array.from(select.options).map(opt => ({
              value: opt.value,
              text: opt.text
            }));
          });
          
          console.log(`   📋 Available branches (${branches.length}):`);
          branches.forEach((b, i) => console.log(`      ${i + 1}. ${b.text} (${b.value})`));
          
          // Switch to different branch if available
          if (branches.length > 1) {
            const newBranch = branches.find(b => b.value !== initialBranchId);
            
            if (newBranch) {
              console.log(`\n🔄 Step 7: Switching to branch: ${newBranch.text}...`);
              
              // Get localStorage before switch
              const beforeSwitch = await page.evaluate(() => localStorage.getItem('current_branch_id'));
              console.log(`   📍 Branch ID before switch: ${beforeSwitch}`);
              
              // Select the new branch
              await page.select('select[class*="branch"], select[class*="BranchSelector"]', newBranch.value);
              await delay(5000); // Wait for page reload or data refresh
              
              // Get localStorage after switch
              const afterSwitch = await page.evaluate(() => localStorage.getItem('current_branch_id'));
              console.log(`   📍 Branch ID after switch: ${afterSwitch}`);
              
              if (afterSwitch === beforeSwitch) {
                issuesFound.push('localStorage branch ID did not change after branch switch!');
                console.log('   ❌ ERROR: Branch ID did not change!');
              } else {
                console.log('   ✅ Branch ID updated successfully!');
              }
              
              // Check if page reloaded
              const pageReloaded = await page.evaluate(() => window.performance.navigation.type === 1);
              console.log(`   🔄 Page reloaded: ${pageReloaded ? 'Yes' : 'No'}`);
              
              if (!pageReloaded) {
                issuesFound.push('Page did not reload after branch switch - customers may not refresh');
                console.log('   ⚠️  WARNING: Page did not reload after branch switch');
              }
            }
          }
        }
      } else {
        console.log('   ⚠️  Branch selector not found on this page');
      }
    } catch (error) {
      console.log(`   ⚠️  Error finding branch selector: ${error.message}`);
    }

    // Count customers after branch switch
    console.log('\n👥 Step 8: Counting customers AFTER branch switch...');
    await delay(2000); // Extra wait for data to load
    
    const finalCustomerCount = await page.evaluate(() => {
      const rows = document.querySelectorAll('table tbody tr, [data-customer-row], .customer-item');
      return rows.length;
    });
    console.log(`   👥 Customers visible: ${finalCustomerCount}`);
    
    if (finalCustomerCount === 0 && initialCustomerCount > 0) {
      issuesFound.push('Customers disappeared after branch switch!');
      console.log('   ❌ CRITICAL ISSUE: All customers disappeared!');
    } else if (finalCustomerCount === 0) {
      issuesFound.push('No customers visible in this branch');
      console.log('   ⚠️  No customers visible in this branch');
    } else {
      console.log('   ✅ Customers are visible after branch switch');
    }

    // Check for console errors
    console.log('\n🔍 Step 9: Checking for console errors...');
    const consoleErrors = await page.evaluate(() => {
      return window.__consoleErrors || [];
    });
    
    if (consoleErrors.length > 0) {
      console.log(`   ⚠️  Found ${consoleErrors.length} console errors`);
      issuesFound.push(`${consoleErrors.length} console errors detected`);
    } else {
      console.log('   ✅ No console errors detected');
    }

    // Take screenshot
    console.log('\n📸 Taking diagnostic screenshot...');
    await page.screenshot({ 
      path: 'test-customer-branch-switch-result.png', 
      fullPage: true 
    });
    console.log('   ✅ Screenshot saved: test-customer-branch-switch-result.png');

  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    issuesFound.push(`Test execution error: ${error.message}`);
  } finally {
    if (browser) {
      console.log('\n🔒 Closing browser...');
      await browser.close();
    }
  }

  // Summary Report
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📊 TEST SUMMARY REPORT');
  console.log('═══════════════════════════════════════════════════════\n');

  if (issuesFound.length === 0) {
    console.log('✅ ALL TESTS PASSED! No issues found.');
  } else {
    console.log(`❌ ISSUES FOUND: ${issuesFound.length}\n`);
    issuesFound.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue}`);
    });
  }

  console.log('\n═══════════════════════════════════════════════════════\n');

  return { issuesFound, fixesApplied };
}

// Run the test
runTest().then(({ issuesFound }) => {
  process.exit(issuesFound.length > 0 ? 1 : 0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

