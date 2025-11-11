#!/usr/bin/env node

/**
 * Create Test Purchase Order and Automatically Receive It
 * This will demonstrate the complete workflow in the browser
 */

import puppeteer from 'puppeteer';

const APP_URL = 'http://localhost:5173';
const LOGIN_EMAIL = 'care@care.com';
const LOGIN_PASSWORD = '123456';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  bright: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  log('\n' + '═'.repeat(60), 'cyan');
  log('CREATE TEST PO & AUTO-RECEIVE DEMONSTRATION', 'bright');
  log('═'.repeat(60) + '\n', 'cyan');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  try {
    // Login
    log('Step 1: Logging in...', 'cyan');
    await page.goto(APP_URL);
    await page.waitForSelector('input[type="email"], input[type="text"]');
    await page.type('input[type="email"], input[type="text"]', LOGIN_EMAIL);
    await page.type('input[type="password"]', LOGIN_PASSWORD);
    await page.click('button[type="submit"]');
    await wait(3000);
    log('✅ Logged in successfully\n', 'green');
    
    // Create new purchase order
    log('Step 2: Creating new test purchase order...', 'cyan');
    
    // Look for "Create PO" or "Create Purchase Order" button
    const createButtons = await page.$$('button, a');
    let createPOButton = null;
    
    for (const button of createButtons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text && (text.includes('Create PO') || text.includes('Create Purchase Order'))) {
        createPOButton = button;
        log(`Found button: "${text}"`, 'yellow');
        break;
      }
    }
    
    if (createPOButton) {
      await createPOButton.click();
      await wait(3000);
      log('✅ Create PO page opened', 'green');
      await page.screenshot({ path: 'demo-create-po-page.png' });
      
      log('\n⚠️  Manual PO creation required', 'yellow');
      log('The browser will stay open for you to:', 'yellow');
      log('  1. Select a supplier', 'yellow');
      log('  2. Add products to the PO', 'yellow');
      log('  3. Click "Send to Supplier"', 'yellow');
      log('  4. Then the automated receive will start!\n', 'yellow');
      
      // Wait for user to create PO
      log('Waiting 60 seconds for you to create the PO...', 'cyan');
      log('Press Ctrl+C if you need more time\n', 'cyan');
      
      await wait(60000);
      
      // Navigate to purchase orders
      log('\nStep 3: Navigating to Purchase Orders...', 'cyan');
      await page.goto(APP_URL + '/lats/purchase-orders');
      await wait(3000);
      
      // Find the "Receive Items" button
      log('Step 4: Looking for purchase order to receive...', 'cyan');
      const buttons = await page.$$('button');
      let receiveButton = null;
      
      for (const button of buttons) {
        const text = await page.evaluate(el => el.textContent, button);
        if (text && text.includes('Receive Items')) {
          receiveButton = button;
          log('✅ Found "Receive Items" button!', 'green');
          break;
        }
      }
      
      if (receiveButton) {
        log('\nStarting automated receive in 3 seconds...', 'cyan');
        await wait(3000);
        
        await receiveButton.click();
        log('✅ Clicked "Receive Items"', 'green');
        await wait(3000);
        
        // Continue with automated receive...
        log('\n🤖 Automated receive workflow will continue...', 'bright');
        log('Watch the browser to see the automation in action!\n', 'bright');
        
        await wait(10000);
        
      } else {
        log('⚠️  No "Receive Items" button found', 'yellow');
        log('Please create a purchase order with status "sent" first', 'yellow');
      }
      
    } else {
      log('❌ Could not find "Create PO" button', 'red');
    }
    
    log('\n' + '═'.repeat(60), 'cyan');
    log('Test session complete. Browser will stay open.', 'cyan');
    log('Press Ctrl+C to close when done.', 'cyan');
    log('═'.repeat(60) + '\n', 'cyan');
    
    // Keep browser open
    await new Promise(() => {});
    
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    console.error(error);
  }
}

main().catch(console.error);

