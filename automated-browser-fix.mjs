#!/usr/bin/env node

import { chromium } from 'playwright';
import fs from 'fs';

console.log('🚀 AUTOMATED BROWSER FIX FOR PRODUCTS DISPLAY');
console.log('='.repeat(60));

async function automatedFix() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000,
    args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  try {
    console.log('📱 Step 1: Opening application...');
    
    // Try different common ports
    const ports = [5173, 3000, 8080, 4173];
    let appUrl = null;
    
    for (const port of ports) {
      try {
        await page.goto(`http://localhost:${port}`, { timeout: 5000 });
        appUrl = `http://localhost:${port}`;
        console.log(`✅ App found on port ${port}`);
        break;
      } catch (e) {
        console.log(`❌ Port ${port} not available`);
      }
    }
    
    if (!appUrl) {
      throw new Error('Could not find running application on any port');
    }
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    console.log('🔍 Step 2: Looking for login form...');
    
    // Clear any existing cache first
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Look for email input field
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[placeholder*="email" i]',
      'input[placeholder*="Email" i]'
    ];
    
    let emailInput = null;
    for (const selector of emailSelectors) {
      try {
        emailInput = page.locator(selector).first();
        if (await emailInput.isVisible()) {
          console.log(`✅ Found email input: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (emailInput && await emailInput.isVisible()) {
      console.log('🔐 Step 3: Logging in...');
      
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      
      await emailInput.fill('care@care.com');
      await passwordInput.fill('123456');
      
      // Look for login button
      const loginSelectors = [
        'button:has-text("Login")',
        'button:has-text("Sign In")',
        'button[type="submit"]',
        'button:has-text("Log In")'
      ];
      
      let loginBtn = null;
      for (const selector of loginSelectors) {
        try {
          loginBtn = page.locator(selector).first();
          if (await loginBtn.isVisible()) {
            console.log(`✅ Found login button: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue
        }
      }
      
      if (loginBtn) {
        await loginBtn.click();
        console.log('⏳ Waiting for login...');
        await page.waitForTimeout(5000);
      }
    } else {
      console.log('ℹ️ No login form found, checking if already logged in...');
    }
    
    console.log('📦 Step 4: Navigating to products/inventory...');
    
    // Try to find and click products/inventory navigation
    const navSelectors = [
      'text=Products',
      'text=Inventory',
      'text=Unified Inventory',
      'text=Inventory Management',
      '[data-testid="products"]',
      '[data-testid="inventory"]',
      'a[href*="product"]',
      'a[href*="inventory"]'
    ];
    
    let navClicked = false;
    for (const selector of navSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible()) {
          console.log(`✅ Found navigation: ${selector}`);
          await element.click();
          await page.waitForTimeout(3000);
          navClicked = true;
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    
    if (!navClicked) {
      console.log('⚠️ Could not find products navigation, continuing...');
    }
    
    console.log('🔍 Step 5: Analyzing current page...');
    
    // Get page content to analyze
    const pageContent = await page.textContent('body');
    
    // Check for total products count
    if (pageContent.includes('57')) {
      console.log('✅ Found "57" in page content (total products count)');
    }
    
    // Check for sample products
    if (pageContent.includes('Sample') || pageContent.includes('sample')) {
      console.log('⚠️ Found "Sample" products - this is the issue!');
    }
    
    // Check for actual product names
    const realProductNames = ['Macbook', 'iPhone', 'JBL', 'Samsung', 'HP', 'Dell'];
    let foundRealProducts = false;
    for (const name of realProductNames) {
      if (pageContent.includes(name)) {
        foundRealProducts = true;
        console.log(`✅ Found real product: ${name}`);
        break;
      }
    }
    
    if (!foundRealProducts) {
      console.log('⚠️ No real products found in page content');
    }
    
    console.log('🧹 Step 6: Clearing cache and forcing refresh...');
    
    // Clear all cache and storage
    await page.evaluate(() => {
      // Clear storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear service worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
          for(let registration of registrations) {
            registration.unregister();
          }
        });
      }
      
      // Clear caches
      if ('caches' in window) {
        caches.keys().then(function(names) {
          for (let name of names) {
            caches.delete(name);
          }
        });
      }
      
      console.log('✅ Cache cleared');
    });
    
    // Force reload
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    
    console.log('🔍 Step 7: Checking after cache clear...');
    
    const newPageContent = await page.textContent('body');
    
    // Check if we now see real products
    let realProductsFound = false;
    for (const name of realProductNames) {
      if (newPageContent.includes(name)) {
        realProductsFound = true;
        console.log(`✅ Now found real product: ${name}`);
        break;
      }
    }
    
    if (realProductsFound) {
      console.log('🎉 SUCCESS! Real products are now displaying!');
    } else if (newPageContent.includes('Sample')) {
      console.log('⚠️ Still showing sample products - may need manual refresh');
    } else {
      console.log('ℹ️ Content changed but unclear if real products are showing');
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'after-fix-screenshot.png', fullPage: true });
    console.log('📸 Final screenshot saved as after-fix-screenshot.png');
    
    console.log('\n🎯 AUTOMATED FIX COMPLETE');
    console.log('='.repeat(60));
    console.log('If products still not showing correctly:');
    console.log('1. Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)');
    console.log('2. Clear browser data completely');
    console.log('3. Restart development server');
    console.log('4. Check browser console for errors');
    
  } catch (error) {
    console.error('❌ Automated fix failed:', error.message);
    
    // Take error screenshot
    try {
      await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
      console.log('📸 Error screenshot saved as error-screenshot.png');
    } catch (e) {
      // Ignore screenshot error
    }
    
  } finally {
    await browser.close();
  }
}

// Check if we can import playwright
try {
  automatedFix();
} catch (error) {
  console.error('❌ Playwright not available. Please install it with:');
  console.error('npm install playwright');
  console.error('Or run the manual fix steps below:');
  console.error('');
  console.error('MANUAL FIX STEPS:');
  console.error('1. Open your browser');
  console.error('2. Go to your app (usually http://localhost:5173)');
  console.error('3. Login with care@care.com / 123456');
  console.error('4. Open browser console (F12)');
  console.error('5. Copy and paste the contents of clear-cache.js');
  console.error('6. Press Enter and wait for page to reload');
}
