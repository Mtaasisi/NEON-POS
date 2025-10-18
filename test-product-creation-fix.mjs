#!/usr/bin/env node

/**
 * Automated Browser Test: Product Creation
 * - Login as care@care.com
 * - Navigate to product creation
 * - Create a product
 * - Identify and report errors
 */

import puppeteer from 'puppeteer';

const APP_URL = 'http://localhost:3000';
const LOGIN_EMAIL = 'care@care.com';
const LOGIN_PASSWORD = '123456';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  console.log('🚀 Starting automated browser test...\n');
  
  let browser;
  let errors = [];
  let consoleErrors = [];
  
  try {
    // Launch browser
    console.log('🌐 Launching browser...');
    browser = await puppeteer.launch({
      headless: false, // Show browser for debugging
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1280, height: 720 }
    });
    
    const page = await browser.newPage();
    
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Listen for network errors
    page.on('response', response => {
      if (response.status() >= 400) {
        consoleErrors.push(`${response.status()} ${response.url()}`);
      }
    });
    
    // Navigate to app
    console.log('📱 Navigating to app...');
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(3000);
    
    // Take screenshot of initial page
    await page.screenshot({ path: 'test-screenshots/01-initial-page.png', fullPage: true });
    console.log('✅ Screenshot saved: 01-initial-page.png');
    
    // Login
    console.log('\n🔐 Attempting login...');
    
    // Wait for email input
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 5000 });
    
    // Fill login form
    await page.type('input[type="email"], input[name="email"]', LOGIN_EMAIL);
    await page.type('input[type="password"], input[name="password"]', LOGIN_PASSWORD);
    
    await page.screenshot({ path: 'test-screenshots/02-login-filled.png' });
    console.log('✅ Screenshot saved: 02-login-filled.png');
    
    // Click login button
    await page.click('button[type="submit"]');
    console.log('✅ Login submitted');
    
    // Wait for navigation after login
    await sleep(3000);
    await page.screenshot({ path: 'test-screenshots/03-after-login.png', fullPage: true });
    console.log('✅ Screenshot saved: 03-after-login.png');
    
    // Navigate to product creation
    console.log('\n📦 Navigating to product creation...');
    
    // Look for "Products" or "Add Product" link/button
    const productLinkSelectors = [
      'a[href*="product"]',
      'button:has-text("Product")',
      'a:has-text("Product")',
      'a[href="/products"]',
      'a[href="/add-product"]'
    ];
    
    let navigated = false;
    for (const selector of productLinkSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          console.log(`Found potential product link: ${selector}`);
          
          // Try to find "Add Product" or similar
          for (const element of elements) {
            const text = await page.evaluate(el => el.textContent, element);
            console.log(`  - Link text: ${text}`);
            
            if (text.toLowerCase().includes('add') || text.toLowerCase().includes('product')) {
              await element.click();
              console.log(`✅ Clicked: ${text}`);
              await sleep(2000);
              navigated = true;
              break;
            }
          }
          
          if (navigated) break;
        }
      } catch (err) {
        // Skip selectors that don't work
      }
    }
    
    // Alternative: try direct URL navigation
    if (!navigated) {
      console.log('Trying direct URL navigation...');
      await page.goto(`${APP_URL}/add-product`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(3000);
    }
    
    await page.screenshot({ path: 'test-screenshots/04-product-page.png', fullPage: true });
    console.log('✅ Screenshot saved: 04-product-page.png');
    
    // Fill product form
    console.log('\n✍️  Filling product creation form...');
    
    const testProduct = {
      name: 'Test Product ' + Date.now(),
      sku: 'TEST-' + Date.now(),
      barcode: '1234567890' + Math.floor(Math.random() * 1000),
      price: '99.99',
      cost: '50.00',
      stock: '100',
      description: 'Automated test product created by browser test'
    };
    
    console.log('Product data:', testProduct);
    
    // Try to fill form fields
    const fieldMappings = [
      { selector: 'input[name="name"], input[placeholder*="name" i]', value: testProduct.name },
      { selector: 'input[name="sku"], input[placeholder*="sku" i]', value: testProduct.sku },
      { selector: 'input[name="barcode"], input[placeholder*="barcode" i]', value: testProduct.barcode },
      { selector: 'input[name="price"], input[placeholder*="price" i]', value: testProduct.price },
      { selector: 'input[name="cost"], input[placeholder*="cost" i]', value: testProduct.cost },
      { selector: 'input[name="stock"], input[placeholder*="stock" i], input[placeholder*="quantity" i]', value: testProduct.stock },
      { selector: 'textarea[name="description"], textarea[placeholder*="description" i]', value: testProduct.description }
    ];
    
    for (const field of fieldMappings) {
      try {
        const input = await page.$(field.selector);
        if (input) {
          await input.click({ clickCount: 3 }); // Select all
          await input.type(field.value);
          console.log(`✅ Filled: ${field.selector}`);
        } else {
          console.log(`⚠️  Field not found: ${field.selector}`);
        }
      } catch (err) {
        console.log(`❌ Error filling ${field.selector}:`, err.message);
      }
    }
    
    await page.screenshot({ path: 'test-screenshots/05-form-filled.png', fullPage: true });
    console.log('✅ Screenshot saved: 05-form-filled.png');
    
    // Submit form
    console.log('\n📤 Submitting product creation form...');
    
    try {
      // Look for submit button
      const submitSelectors = [
        'button[type="submit"]',
        'button:has-text("Create")',
        'button:has-text("Add")',
        'button:has-text("Save")'
      ];
      
      let submitted = false;
      for (const selector of submitSelectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            const buttonText = await page.evaluate(el => el.textContent, button);
            console.log(`Found button: ${buttonText}`);
            
            if (buttonText.toLowerCase().includes('create') || 
                buttonText.toLowerCase().includes('add') || 
                buttonText.toLowerCase().includes('save')) {
              await button.click();
              console.log(`✅ Clicked: ${buttonText}`);
              submitted = true;
              break;
            }
          }
        } catch (err) {
          // Continue trying
        }
      }
      
      if (!submitted) {
        console.log('⚠️  Could not find submit button');
      }
      
      // Wait for response
      await sleep(3000);
      
      await page.screenshot({ path: 'test-screenshots/06-after-submit.png', fullPage: true });
      console.log('✅ Screenshot saved: 06-after-submit.png');
      
    } catch (err) {
      console.log('❌ Error submitting form:', err.message);
      errors.push(err.message);
    }
    
    // Check for error messages on page
    console.log('\n🔍 Checking for errors...');
    
    const errorSelectors = [
      '.error',
      '.alert-error',
      '[role="alert"]',
      '.text-red-500',
      '.text-red-600',
      '.bg-red-100',
      '[class*="error"]'
    ];
    
    for (const selector of errorSelectors) {
      try {
        const errorElements = await page.$$(selector);
        for (const element of errorElements) {
          const text = await page.evaluate(el => el.textContent, element);
          if (text && text.trim()) {
            errors.push(text.trim());
            console.log(`❌ Error found: ${text.trim()}`);
          }
        }
      } catch (err) {
        // Continue
      }
    }
    
    // Final screenshot
    await page.screenshot({ path: 'test-screenshots/07-final-state.png', fullPage: true });
    console.log('✅ Screenshot saved: 07-final-state.png');
    
    // Report findings
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS');
    console.log('='.repeat(60));
    
    if (errors.length === 0 && consoleErrors.length === 0) {
      console.log('✅ No errors detected!');
    } else {
      if (errors.length > 0) {
        console.log('\n❌ Page Errors:');
        errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
      }
      
      if (consoleErrors.length > 0) {
        console.log('\n❌ Console/Network Errors:');
        consoleErrors.slice(0, 10).forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
        if (consoleErrors.length > 10) {
          console.log(`  ... and ${consoleErrors.length - 10} more`);
        }
      }
    }
    
    console.log('\n📸 Screenshots saved in test-screenshots/ directory');
    console.log('='.repeat(60));
    
    // Keep browser open for manual inspection
    console.log('\n⏸️  Browser will remain open for 30 seconds for inspection...');
    await sleep(30000);
    
  } catch (err) {
    console.error('\n❌ Test failed:', err.message);
    console.error(err.stack);
  } finally {
    if (browser) {
      await browser.close();
      console.log('\n👋 Browser closed');
    }
  }
}

// Create screenshots directory
import { mkdir } from 'fs/promises';
try {
  await mkdir('test-screenshots', { recursive: true });
} catch (err) {
  // Directory might already exist
}

// Run the test
runTest().catch(console.error);

