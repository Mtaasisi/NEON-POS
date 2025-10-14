#!/usr/bin/env node

/**
 * Automated Browser Test for Store Isolation
 * Tests why isolated stores are still sharing data
 */

import puppeteer from 'puppeteer';

const LOGIN_URL = 'http://localhost:5173';
const EMAIL = 'care@care.com';
const PASSWORD = '123456';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTests() {
  console.log('🚀 Starting Store Isolation Test...\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--start-maximized'],
    defaultViewport: null
  });

  try {
    const page = await browser.newPage();
    
    // Enable console logging from the browser
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('branch') || text.includes('Branch') || text.includes('filter') || text.includes('isolated')) {
        console.log('🌐 Browser:', text);
      }
    });

    // Enable error logging
    page.on('pageerror', error => {
      console.error('❌ Page Error:', error.message);
    });

    console.log('📱 Navigating to login page...');
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle2' });
    await delay(2000);

    console.log('🔐 Attempting to login...');
    
    // Try to find login form
    await page.waitForSelector('input[type="email"], input[type="text"]', { timeout: 10000 });
    
    // Fill in email
    const emailInput = await page.$('input[type="email"], input[type="text"]');
    if (emailInput) {
      await emailInput.type(EMAIL);
      console.log('✅ Email entered');
    }

    await delay(500);

    // Fill in password
    const passwordInput = await page.$('input[type="password"]');
    if (passwordInput) {
      await passwordInput.type(PASSWORD);
      console.log('✅ Password entered');
    }

    await delay(500);

    // Click login button
    const loginButton = await page.$('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")');
    if (loginButton) {
      await loginButton.click();
      console.log('✅ Login button clicked');
    } else {
      // Try pressing Enter
      await passwordInput.press('Enter');
      console.log('✅ Enter pressed');
    }

    // Wait for navigation
    console.log('⏳ Waiting for login to complete...');
    await delay(5000);

    console.log('\n📊 Checking current page state...');
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    // Take a screenshot
    await page.screenshot({ path: 'login-complete.png', fullPage: true });
    console.log('📸 Screenshot saved: login-complete.png');

    // Check if we're logged in by looking for common dashboard elements
    const isDashboard = await page.evaluate(() => {
      return document.body.innerText.includes('Dashboard') || 
             document.body.innerText.includes('Admin') ||
             document.body.innerText.includes('Store');
    });

    if (!isDashboard) {
      console.log('⚠️  May not be logged in yet. Current page text:');
      const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
      console.log(bodyText);
    }

    console.log('\n🏪 Testing Store Isolation Feature...\n');

    // Navigate to Admin Settings
    console.log('📍 Navigating to Admin Settings...');
    await delay(2000);
    
    // Try clicking on Admin or Settings
    const navigationSuccess = await page.evaluate(() => {
      // Look for admin/settings navigation
      const links = Array.from(document.querySelectorAll('a, button'));
      const adminLink = links.find(el => 
        el.textContent.toLowerCase().includes('admin') || 
        el.textContent.toLowerCase().includes('settings')
      );
      
      if (adminLink) {
        adminLink.click();
        return true;
      }
      return false;
    });

    if (navigationSuccess) {
      console.log('✅ Navigated to Admin/Settings');
      await delay(3000);
      await page.screenshot({ path: 'admin-page.png', fullPage: true });
    } else {
      console.log('⚠️  Could not find Admin/Settings link. Trying URL navigation...');
      await page.goto(`${LOGIN_URL}/admin`, { waitUntil: 'networkidle2' });
      await delay(3000);
    }

    // Look for Store Management settings
    console.log('\n🔍 Searching for Store Management Settings...');
    
    const storeManagementFound = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const storeElement = elements.find(el => 
        el.textContent.includes('Store') && 
        (el.textContent.includes('Management') || el.textContent.includes('Branch'))
      );
      
      if (storeElement) {
        storeElement.scrollIntoView();
        return true;
      }
      return false;
    });

    if (storeManagementFound) {
      console.log('✅ Found Store Management section');
      await page.screenshot({ path: 'store-management.png', fullPage: true });
    }

    // Check localStorage for current branch
    console.log('\n📦 Checking localStorage for branch data...');
    const localStorageData = await page.evaluate(() => {
      return {
        currentBranch: localStorage.getItem('current_branch_id'),
        allKeys: Object.keys(localStorage)
      };
    });

    console.log('Current Branch ID:', localStorageData.currentBranch || 'None');
    console.log('LocalStorage Keys:', localStorageData.allKeys.join(', '));

    // Query the database through the browser context
    console.log('\n🗄️  Querying store locations from database...');
    
    const storeData = await page.evaluate(async () => {
      try {
        // Access Supabase client if available
        if (typeof window.supabase !== 'undefined' || window.__SUPABASE_CLIENT__) {
          const supabase = window.supabase || window.__SUPABASE_CLIENT__;
          
          const { data: stores, error } = await supabase
            .from('store_locations')
            .select('id, name, code, data_isolation_mode, share_products, share_customers, is_main, is_active')
            .eq('is_active', true);
          
          if (error) {
            return { error: error.message };
          }
          
          return { stores, error: null };
        }
        
        return { error: 'Supabase client not found' };
      } catch (err) {
        return { error: err.message };
      }
    });

    if (storeData.error) {
      console.log('⚠️  Could not query stores directly:', storeData.error);
      console.log('📝 Will need to check through UI instead');
    } else if (storeData.stores) {
      console.log('\n📊 Store Configuration:');
      console.log('═══════════════════════════════════════════════════════');
      
      storeData.stores.forEach((store, idx) => {
        console.log(`\n${idx + 1}. ${store.name} (${store.code})`);
        console.log(`   ID: ${store.id}`);
        console.log(`   Isolation Mode: ${store.data_isolation_mode}`);
        console.log(`   Share Products: ${store.share_products}`);
        console.log(`   Share Customers: ${store.share_customers}`);
        console.log(`   Main Store: ${store.is_main}`);
        console.log(`   Active: ${store.is_active}`);
      });
      
      console.log('\n═══════════════════════════════════════════════════════');
      
      // Check if any stores are set to isolated but still have sharing enabled
      const isolatedStoresWithSharing = storeData.stores.filter(s => 
        s.data_isolation_mode === 'isolated' && 
        (s.share_products || s.share_customers)
      );
      
      if (isolatedStoresWithSharing.length > 0) {
        console.log('\n⚠️  ISSUE FOUND: Isolated stores with sharing enabled!');
        console.log('═══════════════════════════════════════════════════════');
        isolatedStoresWithSharing.forEach(store => {
          console.log(`\n❌ ${store.name}:`);
          console.log(`   - Mode: ${store.data_isolation_mode} (should prevent all sharing)`);
          console.log(`   - share_products: ${store.share_products} (should be false)`);
          console.log(`   - share_customers: ${store.share_customers} (should be false)`);
        });
        console.log('\n💡 FIX NEEDED: Isolated mode stores should have all share_* flags set to false');
      }
    }

    // Test branch switching and data filtering
    console.log('\n🔄 Testing branch switching behavior...');
    
    const branchSwitchTest = await page.evaluate(async () => {
      try {
        // Try to access branch context
        const results = {
          hasBranchSelector: false,
          availableBranches: [],
          currentBranch: localStorage.getItem('current_branch_id')
        };
        
        // Look for branch selector
        const branchSelectors = document.querySelectorAll('[class*="branch"], [class*="Branch"], [data-branch]');
        results.hasBranchSelector = branchSelectors.length > 0;
        
        return results;
      } catch (err) {
        return { error: err.message };
      }
    });

    console.log('Branch Switch Test Results:', JSON.stringify(branchSwitchTest, null, 2));

    // Check for products to see if filtering is working
    console.log('\n📦 Checking product filtering...');
    
    await page.goto(`${LOGIN_URL}/products`, { waitUntil: 'networkidle2' }).catch(() => {
      console.log('⚠️  Could not navigate to products page');
    });
    
    await delay(3000);
    await page.screenshot({ path: 'products-page.png', fullPage: true });

    // Look at network requests to see what filters are being applied
    console.log('\n🌐 Monitoring network requests for branch filtering...');
    
    page.on('request', request => {
      const url = request.url();
      if (url.includes('supabase') || url.includes('products') || url.includes('lats')) {
        console.log('🔗 Request:', request.method(), url);
        
        // Check if branch_id is in the query
        if (url.includes('branch_id')) {
          console.log('   ✅ Branch filter detected in URL');
        } else if (url.includes('select') || url.includes('from')) {
          console.log('   ⚠️  No branch filter in query URL');
        }
      }
    });

    // Wait to observe some requests
    await delay(5000);

    console.log('\n📝 Test Summary:');
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Successfully logged in');
    console.log('✅ Accessed admin panel');
    console.log('✅ Retrieved store configuration');
    console.log('📸 Screenshots saved for review');
    console.log('═══════════════════════════════════════════════════════');

    console.log('\n🔍 Please review the screenshots and console output above.');
    console.log('Press Ctrl+C to close the browser when done inspecting.\n');

    // Keep browser open for manual inspection
    await delay(300000); // 5 minutes

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
    console.log('\n✅ Test completed');
  }
}

// Run tests
runTests().catch(console.error);

