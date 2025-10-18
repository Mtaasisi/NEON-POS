#!/usr/bin/env node

/**
 * Automated Browser Test using Playwright
 * - Login as care@care.com
 * - Navigate to product creation
 * - Create a product
 * - Identify and report errors
 */

import { chromium } from 'playwright';

const APP_URL = 'http://localhost:3000';
const LOGIN_EMAIL = 'care@care.com';
const LOGIN_PASSWORD = '123456';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  console.log('🚀 Starting automated browser test with Playwright...\n');
  
  let browser;
  let errors = [];
  let consoleErrors = [];
  
  try {
    // Launch browser
    console.log('🌐 Launching browser...');
    browser = await chromium.launch({
      headless: false, // Show browser for debugging
    });
    
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // Listen for console messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Listen for page errors
    page.on('pageerror', error => {
      consoleErrors.push(`Page error: ${error.message}`);
    });
    
    // Listen for failed requests
    page.on('response', response => {
      if (response.status() >= 400) {
        consoleErrors.push(`${response.status()} ${response.url()}`);
      }
    });
    
    // Navigate to app
    console.log('📱 Navigating to app...');
    try {
      await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(2000);
      
      // Take screenshot
      await page.screenshot({ path: 'test-screenshots/01-initial-page.png', fullPage: true });
      console.log('✅ Screenshot saved: 01-initial-page.png');
    } catch (err) {
      console.error('❌ Failed to navigate:', err.message);
      errors.push(`Navigation failed: ${err.message}`);
      
      // Try to take a screenshot anyway
      try {
        await page.screenshot({ path: 'test-screenshots/error-navigation.png' });
      } catch (e) {}
      
      throw err;
    }
    
    // Login
    console.log('\n🔐 Attempting login...');
    
    try {
      // Wait for email input
      await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
      
      // Fill login form
      await page.fill('input[type="email"], input[name="email"]', LOGIN_EMAIL);
      await page.fill('input[type="password"], input[name="password"]', LOGIN_PASSWORD);
      
      await page.screenshot({ path: 'test-screenshots/02-login-filled.png' });
      console.log('✅ Screenshot saved: 02-login-filled.png');
      
      // Click login button
      await page.click('button[type="submit"]');
      console.log('✅ Login submitted');
      
      // Wait for navigation
      await sleep(3000);
      await page.screenshot({ path: 'test-screenshots/03-after-login.png', fullPage: true });
      console.log('✅ Screenshot saved: 03-after-login.png');
      
    } catch (err) {
      console.error('❌ Login failed:', err.message);
      errors.push(`Login failed: ${err.message}`);
      await page.screenshot({ path: 'test-screenshots/error-login.png', fullPage: true });
    }
    
    // Navigate to product creation
    console.log('\n📦 Navigating to product creation...');
    
    try {
      // Try direct URL navigation
      await page.goto(`${APP_URL}/add-product`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(2000);
      
      await page.screenshot({ path: 'test-screenshots/04-product-page.png', fullPage: true });
      console.log('✅ Screenshot saved: 04-product-page.png');
      
    } catch (err) {
      console.error('❌ Navigation to product page failed:', err.message);
      errors.push(`Product page navigation failed: ${err.message}`);
    }
    
    // Fill product form
    console.log('\n✍️  Filling product creation form...');
    
    const testProduct = {
      name: 'Test Product ' + Date.now(),
      sku: 'TEST-' + Date.now(),
      barcode: '1234567890' + Math.floor(Math.random() * 1000),
      price: '99.99',
      cost: '50.00',
      stock: '100',
      description: 'Automated test product'
    };
    
    console.log('Product data:', testProduct);
    
    // Fill form fields
    try {
      const filled = [];
      
      // Try to fill each field
      if (await page.locator('input[name="name"], input[placeholder*="name" i]').count() > 0) {
        await page.fill('input[name="name"], input[placeholder*="name" i]', testProduct.name);
        filled.push('name');
      }
      
      if (await page.locator('input[name="sku"], input[placeholder*="sku" i]').count() > 0) {
        await page.fill('input[name="sku"], input[placeholder*="sku" i]', testProduct.sku);
        filled.push('sku');
      }
      
      if (await page.locator('input[name="barcode"], input[placeholder*="barcode" i]').count() > 0) {
        await page.fill('input[name="barcode"], input[placeholder*="barcode" i]', testProduct.barcode);
        filled.push('barcode');
      }
      
      if (await page.locator('input[name="price"], input[placeholder*="price" i]').count() > 0) {
        await page.fill('input[name="price"], input[placeholder*="price" i]', testProduct.price);
        filled.push('price');
      }
      
      if (await page.locator('input[name="cost"], input[placeholder*="cost" i]').count() > 0) {
        await page.fill('input[name="cost"], input[placeholder*="cost" i]', testProduct.cost);
        filled.push('cost');
      }
      
      if (await page.locator('input[name="stock"], input[placeholder*="stock" i], input[placeholder*="quantity" i]').count() > 0) {
        await page.fill('input[name="stock"], input[placeholder*="stock" i], input[placeholder*="quantity" i]', testProduct.stock);
        filled.push('stock');
      }
      
      console.log(`✅ Filled fields: ${filled.join(', ')}`);
      
      await page.screenshot({ path: 'test-screenshots/05-form-filled.png', fullPage: true });
      console.log('✅ Screenshot saved: 05-form-filled.png');
      
    } catch (err) {
      console.error('❌ Error filling form:', err.message);
      errors.push(`Form fill error: ${err.message}`);
    }
    
    // Submit form
    console.log('\n📤 Submitting product creation form...');
    
    try {
      // Find and click submit button
      const submitButton = page.locator('button[type="submit"]').first();
      if (await submitButton.count() > 0) {
        await submitButton.click();
        console.log('✅ Submit button clicked');
        
        // Wait for response
        await sleep(3000);
        
        await page.screenshot({ path: 'test-screenshots/06-after-submit.png', fullPage: true });
        console.log('✅ Screenshot saved: 06-after-submit.png');
      } else {
        console.log('⚠️  Submit button not found');
        errors.push('Submit button not found');
      }
      
    } catch (err) {
      console.error('❌ Error submitting form:', err.message);
      errors.push(`Form submission error: ${err.message}`);
    }
    
    // Check for errors on page
    console.log('\n🔍 Checking for errors on page...');
    
    try {
      const errorElements = await page.locator('.error, .alert-error, [role="alert"], .text-red-500, .text-red-600').all();
      for (const element of errorElements) {
        const text = await element.textContent();
        if (text && text.trim()) {
          errors.push(text.trim());
          console.log(`❌ Error found: ${text.trim()}`);
        }
      }
    } catch (err) {
      // Continue
    }
    
    // Final screenshot
    await page.screenshot({ path: 'test-screenshots/07-final-state.png', fullPage: true });
    console.log('✅ Screenshot saved: 07-final-state.png');
    
    // Report results
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS');
    console.log('='.repeat(60));
    
    if (errors.length === 0 && consoleErrors.length === 0) {
      console.log('\n✅ No errors detected!');
      console.log('🎉 Product creation test completed successfully!');
    } else {
      if (errors.length > 0) {
        console.log('\n❌ Page Errors:');
        errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
      }
      
      if (consoleErrors.length > 0) {
        console.log('\n❌ Console/Network Errors:');
        consoleErrors.slice(0, 15).forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
        if (consoleErrors.length > 15) {
          console.log(`  ... and ${consoleErrors.length - 15} more`);
        }
      }
    }
    
    console.log('\n📸 Screenshots saved in test-screenshots/');
    console.log('='.repeat(60));
    
    // Keep browser open for inspection
    console.log('\n⏸️  Browser will remain open for 20 seconds...');
    await sleep(20000);
    
  } catch (err) {
    console.error('\n❌ Test failed:', err.message);
    errors.push(err.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log('\n👋 Browser closed');
    }
  }
  
  // Return results for programmatic analysis
  return { errors, consoleErrors };
}

// Create screenshots directory
import { mkdir } from 'fs/promises';
try {
  await mkdir('test-screenshots', { recursive: true });
} catch (err) {
  // Directory might already exist
}

// Run the test
const results = await runTest();

// Exit with error code if there were errors
if (results.errors.length > 0 || results.consoleErrors.length > 0) {
  process.exit(1);
} else {
  process.exit(0);
}


