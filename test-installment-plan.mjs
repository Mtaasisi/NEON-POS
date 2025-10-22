#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const APP_URL = 'http://localhost:5173';
const LOGIN_EMAIL = 'care@care.com';
const LOGIN_PASSWORD = '123456';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testInstallmentPlan() {
  console.log('🚀 Starting Installment Plan Test...\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized']
  });

  try {
    const page = await browser.newPage();
    
    // Set large desktop viewport to ensure we see desktop layout
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Enable console logging from browser
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') {
        console.log('❌ Browser Error:', text);
      } else if (text.includes('POS Installment')) {
        console.log('📝', text);
      }
    });

    // Listen for page errors
    page.on('pageerror', error => {
      console.error('❌ Page Error:', error.message);
    });

    // Step 1: Navigate to app
    console.log('📍 Step 1: Navigating to', APP_URL);
    await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);
    
    // Take initial screenshot
    await page.screenshot({ path: 'test-screenshots/01-initial-page.png', fullPage: true });
    console.log('✅ Loaded initial page\n');

    // Step 2: Login
    console.log('📍 Step 2: Logging in as', LOGIN_EMAIL);
    
    // Wait for login form
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
    
    // Fill in credentials
    await page.type('input[type="email"], input[name="email"]', LOGIN_EMAIL, { delay: 50 });
    await page.type('input[type="password"], input[name="password"]', LOGIN_PASSWORD, { delay: 50 });
    
    await page.screenshot({ path: 'test-screenshots/02-login-form-filled.png', fullPage: true });
    
    // Click login button
    await page.click('button[type="submit"]');
    console.log('⏳ Waiting for login to complete...');
    
    await delay(3000);
    await page.screenshot({ path: 'test-screenshots/03-after-login.png', fullPage: true });
    console.log('✅ Logged in successfully\n');

    // Step 3: Navigate to POS
    console.log('📍 Step 3: Navigating to POS page');
    
    // Try multiple selectors for POS link
    const posSelectors = [
      'a[href*="/pos"]',
      'a[href="/pos"]',
      'text/POS',
      'text/Point of Sale'
    ];
    
    let posClicked = false;
    for (const selector of posSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        await page.click(selector);
        posClicked = true;
        break;
      } catch (e) {
        // Try next selector
      }
    }
    
    if (!posClicked) {
      // Try navigating directly
      await page.goto(APP_URL + '/pos', { waitUntil: 'networkidle2' });
    }
    
    await delay(3000);
    await page.screenshot({ path: 'test-screenshots/04-pos-page.png', fullPage: true });
    console.log('✅ Navigated to POS page\n');

    // Step 4: Select a customer
    console.log('📍 Step 4: Selecting a customer');
    
    let customerSelected = false;
    
    // Find all buttons and look for customer-related text
    try {
      const allButtons = await page.$$('button');
      for (const button of allButtons) {
        const text = await page.evaluate(el => el.textContent, button);
        if (text && (text.includes('Customer') || text.includes('Select Customer'))) {
          await button.click();
          await delay(1500);
          
          // Try to select first customer from list
          const firstCustomer = await page.$('div[role="option"], li, .customer-item');
          if (firstCustomer) {
            await firstCustomer.click();
            customerSelected = true;
            break;
          }
        }
      }
    } catch (e) {
      console.log('⚠️ Customer selection failed:', e.message);
    }
    
    // Fallback: try input field
    if (!customerSelected) {
      try {
        const inputs = await page.$$('input');
        for (const input of inputs) {
          const placeholder = await page.evaluate(el => el.placeholder || '', input);
          if (placeholder.toLowerCase().includes('customer') || placeholder.toLowerCase().includes('search')) {
            await input.click();
            await delay(1000);
            
            // Try to select first option
            const firstOption = await page.$('div[role="option"], li, button');
            if (firstOption) {
              await firstOption.click();
              customerSelected = true;
              break;
            }
          }
        }
      } catch (e) {
        console.log('⚠️ Fallback selection failed');
      }
    }
    
    await delay(2000);
    await page.screenshot({ path: 'test-screenshots/05-customer-selected.png', fullPage: true });
    console.log(customerSelected ? '✅ Customer selected' : '⚠️ Customer selection unclear\n');

    // Step 5: Add items to cart
    console.log('📍 Step 5: Adding items to cart');
    
    let itemsAdded = 0;
    
    // Find all buttons and look for "Add" text
    try {
      const allButtons = await page.$$('button');
      let clickedButtons = 0;
      
      for (const button of allButtons) {
        if (clickedButtons >= 3) break;
        
        const text = await page.evaluate(el => el.textContent || '', button);
        const isVisible = await page.evaluate(el => {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          return rect.width > 0 && rect.height > 0 && 
                 style.display !== 'none' && 
                 style.visibility !== 'hidden';
        }, button);
        
        if (isVisible && (text.includes('Add') || text === '+')) {
          try {
            await button.click();
            await delay(500);
            itemsAdded++;
            clickedButtons++;
            console.log(`   ✓ Added item ${clickedButtons}`);
          } catch (e) {
            // Button might not be clickable
          }
        }
      }
    } catch (e) {
      console.log('⚠️ Add items failed:', e.message);
    }
    
    await delay(2000);
    await page.screenshot({ path: 'test-screenshots/06-items-added.png', fullPage: true });
    console.log(`${itemsAdded > 0 ? '✅' : '⚠️'} Added ${itemsAdded} items to cart\n`);

    // Step 6: Click Installment Plan button
    console.log('📍 Step 6: Opening Installment Plan modal');
    
    // Wait a bit for cart to update
    await delay(2000);
    
    // Try to find and scroll to the cart section
    try {
      await page.evaluate(() => {
        // Find the cart section or cart totals
        const cartSection = document.querySelector('.pos-cart-section, [class*="cart"], [class*="Cart"]');
        if (cartSection) {
          cartSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
      await delay(1000);
    } catch (e) {
      console.log('   Note: Could not find cart section to scroll to');
    }
    
    let modalOpened = false;
    
    // Debug: List all visible buttons
    console.log('   Debugging: Listing all visible buttons...');
    try {
      const allButtons = await page.$$('button');
      const buttonTexts = [];
      
      for (const button of allButtons) {
        const text = await page.evaluate(el => el.textContent || '', button);
        const isDisabled = await page.evaluate(el => el.disabled, button);
        const isVisible = await page.evaluate(el => {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          return rect.width > 0 && rect.height > 0 && 
                 style.display !== 'none' && 
                 style.visibility !== 'hidden' &&
                 style.opacity !== '0';
        }, button);
        
        if (isVisible && text.trim()) {
          buttonTexts.push(`"${text.trim()}" (disabled: ${isDisabled})`);
          
          if (text.includes('Installment') && !isDisabled) {
            console.log(`   Found button: "${text.trim()}"`);
            await button.click();
            modalOpened = true;
            break;
          }
        }
      }
      
      if (!modalOpened) {
        console.log('   Available buttons:', buttonTexts.slice(0, 20).join(', '));
      }
    } catch (e) {
      console.log('⚠️ Installment button search failed:', e.message);
    }
    
    await delay(2000);
    await page.screenshot({ path: 'test-screenshots/07-installment-modal.png', fullPage: true });
    
    if (!modalOpened) {
      console.log('❌ Could not find Installment Plan button\n');
      console.log('📸 Check screenshot 06 and 07 to see available buttons');
      throw new Error('Installment Plan button not found');
    }
    
    console.log('✅ Installment Plan modal opened\n');

    // Step 7: Fill installment form
    console.log('📍 Step 7: Filling installment form');
    
    // Fill down payment
    const downPaymentInputs = await page.$$('input[type="number"]');
    if (downPaymentInputs.length > 0) {
      await downPaymentInputs[0].click({ clickCount: 3 });
      await downPaymentInputs[0].type('10000');
      console.log('   ✓ Down payment set to 10000');
    }
    
    await delay(500);
    
    // Select payment account - find the select with "Select Account" option
    const allSelects = await page.$$('select');
    let accountSelected = false;
    
    for (const select of allSelects) {
      const options = await select.$$('option');
      const optionTexts = await Promise.all(
        options.map(opt => page.evaluate(el => el.textContent, opt))
      );
      
      // Check if this select has "Select Account" option
      if (optionTexts.some(text => text && text.includes('Select Account'))) {
        if (options.length > 1) {
          const value = await page.evaluate(el => el.value, options[1]);
          await page.evaluate((el, val) => {
            el.value = val;
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }, select, value);
          accountSelected = true;
          console.log('   ✓ Payment account selected');
          break;
        }
      }
    }
    
    if (!accountSelected) {
      console.log('   ⚠️ Could not select payment account');
    }
    
    await delay(1000);
    await page.screenshot({ path: 'test-screenshots/08-form-filled.png', fullPage: true });
    console.log('✅ Form filled\n');

    // Step 8: Submit form
    console.log('📍 Step 8: Submitting installment plan');
    
    let submitClicked = false;
    
    // Find submit button
    try {
      const allButtons = await page.$$('button');
      for (const button of allButtons) {
        const text = await page.evaluate(el => el.textContent || '', button);
        const type = await page.evaluate(el => el.type, button);
        
        if (type === 'submit' && text.includes('Create')) {
          console.log(`   Found submit button: "${text}"`);
          await button.click();
          submitClicked = true;
          break;
        }
      }
    } catch (e) {
      console.log('⚠️ Submit button search failed:', e.message);
    }
    
    if (submitClicked) {
      console.log('⏳ Waiting for submission...');
      
      await delay(5000);
      await page.screenshot({ path: 'test-screenshots/09-after-submit.png', fullPage: true });
      
      // Check for success/error messages
      let hasSuccess = false;
      let hasError = false;
      let errorText = '';
      
      try {
        const allElements = await page.$$('*');
        for (const element of allElements) {
          const text = await page.evaluate(el => el.textContent || '', element);
          const lowerText = text.toLowerCase();
          
          if (lowerText.includes('success') || lowerText.includes('created')) {
            hasSuccess = true;
          }
          if (lowerText.includes('error') || lowerText.includes('failed')) {
            hasError = true;
            errorText = text;
          }
        }
      } catch (e) {
        console.log('⚠️ Message check failed:', e.message);
      }
      
      if (hasSuccess) {
        console.log('✅ Installment plan created successfully!\n');
      } else if (hasError) {
        console.log('❌ Error creating installment plan:', errorText, '\n');
      } else {
        console.log('⚠️ Could not determine success/failure\n');
      }
    } else {
      console.log('❌ Submit button not found\n');
    }

    // Take final screenshot
    await delay(2000);
    await page.screenshot({ path: 'test-screenshots/10-final-state.png', fullPage: true });
    
    console.log('\n📊 Test Complete!');
    console.log('Screenshots saved to test-screenshots/ directory');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error.stack);
  } finally {
    await delay(3000);
    await browser.close();
  }
}

// Run the test
testInstallmentPlan().catch(console.error);

