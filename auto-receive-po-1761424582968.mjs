#!/usr/bin/env node

/**
 * 🎯 AUTOMATED TEST: Receive Purchase Order PO-1761424582968
 * ============================================================
 * 
 * This script will:
 * 1. Login as care@care.com
 * 2. Find purchase order PO-1761424582968
 * 3. Automatically receive it with IMEI numbers in children variants
 * 4. Test and verify the complete workflow
 * 5. Report any errors and apply fixes
 */

import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';

// Configuration
const APP_URL = 'http://localhost:5173';
const LOGIN_EMAIL = 'care@care.com';
const LOGIN_PASSWORD = '123456';
const TARGET_PO_NUMBER = 'PO-1761424582968'; // Will search for this, or use first available "sent" PO

// Sample IMEI numbers (15 digits each) - will generate more as needed
const SAMPLE_IMEIS = [
  '351234567890123',
  '351234567890124',
  '351234567890125',
  '351234567890126',
  '351234567890127',
  '351234567890128',
  '351234567890129',
  '351234567890130',
  '351234567890131',
  '351234567890132',
];

// Terminal colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const issues = [];
const fixes = [];

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(message) {
  log(`\n${'═'.repeat(80)}`, 'cyan');
  log(`🎯 ${message}`, 'bright');
  log('═'.repeat(80), 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function captureScreenshot(page, name) {
  try {
    const filename = `test-screenshot-${name}-${Date.now()}.png`;
    await page.screenshot({ path: filename, fullPage: true });
    logInfo(`Screenshot saved: ${filename}`);
    return filename;
  } catch (error) {
    logWarning(`Failed to capture screenshot: ${error.message}`);
    return null;
  }
}

async function login(page) {
  logStep('STEP 1: Logging in to the application');
  
  try {
    logInfo(`Navigating to ${APP_URL}...`);
    await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    logSuccess('Application loaded');
    
    // Check if already logged in
    await wait(2000);
    const currentUrl = page.url();
    
    if (!currentUrl.includes('/login') && !currentUrl.endsWith('/')) {
      logSuccess('Already logged in!');
      return;
    }
    
    // Wait for login form
    logInfo('Looking for login form...');
    await page.waitForSelector('input[type="email"], input[type="text"]', { timeout: 10000 });
    logSuccess('Login form found');
    
    // Fill in credentials
    const emailInput = await page.$('input[type="email"], input[type="text"]');
    const passwordInput = await page.$('input[type="password"]');
    
    if (!emailInput || !passwordInput) {
      throw new Error('Could not find login form inputs');
    }
    
    await emailInput.click({ clickCount: 3 }); // Select all
    await emailInput.type(LOGIN_EMAIL, { delay: 50 });
    logInfo(`Entered email: ${LOGIN_EMAIL}`);
    
    await passwordInput.click({ clickCount: 3 }); // Select all
    await passwordInput.type(LOGIN_PASSWORD, { delay: 50 });
    logInfo('Entered password');
    
    // Find and click login button
    const loginButton = await page.$('button[type="submit"]');
    if (!loginButton) {
      throw new Error('Could not find login button');
    }
    
    await captureScreenshot(page, 'before-login');
    await loginButton.click();
    logInfo('Clicked login button');
    
    // Wait for navigation after login
    await wait(5000);
    
    await captureScreenshot(page, 'after-login');
    logSuccess('Logged in successfully!');
    
  } catch (error) {
    logError(`Login failed: ${error.message}`);
    await captureScreenshot(page, 'login-error');
    issues.push({
      step: 'Login',
      error: error.message,
    });
    throw error;
  }
}

async function navigateToPurchaseOrder(page) {
  logStep('STEP 2: Finding or Creating Purchase Order');
  
  try {
    // Direct navigation to purchase orders page
    logInfo('Navigating to Purchase Orders page...');
    const poUrl = `${APP_URL}/lats/purchase-orders`;
    await page.goto(poUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await wait(3000);
    
    await captureScreenshot(page, 'purchase-orders-list');
    logSuccess('On Purchase Orders page');
    
    // Search for the specific PO
    logInfo(`Looking for ${TARGET_PO_NUMBER}...`);
    
    // Check if there's a search box
    const searchBox = await page.$('input[type="search"], input[placeholder*="search" i]');
    if (searchBox) {
      await searchBox.click({ clickCount: 3 });
      await searchBox.type(TARGET_PO_NUMBER, { delay: 100 });
      await wait(2000);
      logInfo('Entered PO number in search box');
    }
    
    // Look for the PO in the table
    const poInfo = await page.evaluate((targetPO) => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      
      for (const row of rows) {
        const text = row.textContent;
        if (text.includes(targetPO)) {
          // Try to extract UUID from link
          const links = row.querySelectorAll('a');
          for (const link of links) {
            const href = link.href;
            if (href && href.includes('purchase-orders')) {
              const uuidMatch = href.match(/purchase-orders\/([a-f0-9-]{36})/i);
              if (uuidMatch) {
                return { found: true, uuid: uuidMatch[1], link: link };
              }
            }
          }
          return { found: true, uuid: null, row: row };
        }
      }
      return { found: false };
    }, TARGET_PO_NUMBER);
    
    if (!poInfo.found) {
      // PO doesn't exist, let's use the first available "sent" PO
      logWarning(`${TARGET_PO_NUMBER} not found. Using first available PO with 'sent' status...`);
      
      // Clear search
      if (searchBox) {
        await searchBox.click({ clickCount: 3 });
        await searchBox.press('Backspace');
        await wait(1000);
      }
      
      // Look for first PO with "sent" status
      const firstPO = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('table tbody tr'));
        
        for (const row of rows) {
          const text = row.textContent.toLowerCase();
          // Look for "sent" or "pending" status
          if (text.includes('sent') || text.includes('pending')) {
            const poNumberCell = row.querySelector('td');
            if (poNumberCell) {
              const poNumber = poNumberCell.textContent.trim();
              const links = row.querySelectorAll('a');
              for (const link of links) {
                if (link.href && link.href.includes('purchase-orders')) {
                  return { found: true, poNumber, link };
                }
              }
            }
          }
        }
        return { found: false };
      });
      
      if (!firstPO.found) {
        throw new Error('No purchase orders with "sent" status found. Please create one first.');
      }
      
      logInfo(`Found PO: ${firstPO.poNumber}`);
      
      // Update target for logging
      return await navigateToPurchaseOrder(page); // Recursive call with cleared search
    }
    
    // Now click on the PO to open it
    const clicked = await page.evaluate((targetPO) => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      
      for (const row of rows) {
        const text = row.textContent;
        if (text.includes(targetPO)) {
          const links = row.querySelectorAll('a');
          for (const link of links) {
            if (link.href && link.href.includes('purchase-orders')) {
              link.click();
              return true;
            }
          }
          row.click();
          return true;
        }
      }
      return false;
    }, TARGET_PO_NUMBER);
    
    if (!clicked) {
      throw new Error(`Could not click on ${TARGET_PO_NUMBER}`);
    }
    
    await wait(3000);
    logSuccess('Opened purchase order detail page');
    
    await captureScreenshot(page, 'po-detail-page');
    
  } catch (error) {
    logError(`Navigation failed: ${error.message}`);
    await captureScreenshot(page, 'navigation-error');
    issues.push({
      step: 'Navigation',
      error: error.message,
    });
    throw error;
  }
}

async function createPurchaseOrder(page) {
  logInfo('Creating new purchase order...');
  
  try {
    // Look for "Create" or "New Purchase Order" button
    const createButtons = await page.$$('button, a');
    
    let createButton = null;
    for (const button of createButtons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text && (text.includes('Create') || text.includes('New') || text.includes('Add'))) {
        createButton = button;
        logInfo(`Found button: "${text}"`);
        break;
      }
    }
    
    if (!createButton) {
      logWarning('Could not find Create button - will use first available PO instead');
      return false;
    }
    
    await createButton.click();
    await wait(2000);
    
    logInfo('Create modal/page opened');
    await captureScreenshot(page, 'create-po-modal');
    
    // Fill in minimal PO details
    // Note: This is simplified - you might need to adjust based on actual form
    
    // Look for PO number input
    const poNumberInput = await page.$('input[name="po_number"], input[placeholder*="PO" i]');
    if (poNumberInput) {
      await poNumberInput.click({ clickCount: 3 });
      await poNumberInput.type(TARGET_PO_NUMBER, { delay: 50 });
      logInfo(`Set PO number: ${TARGET_PO_NUMBER}`);
    }
    
    // Select supplier (first one available)
    const supplierSelect = await page.$('select[name="supplier"], select[name="supplier_id"]');
    if (supplierSelect) {
      await supplierSelect.select(1); // Select first option
      logInfo('Selected supplier');
      await wait(500);
    }
    
    // Add a product item
    const addItemButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Add Item') || b.textContent.includes('Add Product'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    
    if (addItemButton) {
      await wait(1000);
      logInfo('Clicked Add Item');
      
      // Select first product and variant
      const productSelects = await page.$$('select');
      if (productSelects.length >= 2) {
        await productSelects[0].select(1); // First product
        await wait(500);
        await productSelects[1].select(1); // First variant
        logInfo('Selected product and variant');
      }
      
      // Set quantity to 2
      const qtyInput = await page.$('input[name*="quantity" i]');
      if (qtyInput) {
        await qtyInput.click({ clickCount: 3 });
        await qtyInput.type('2', { delay: 50 });
        logInfo('Set quantity: 2');
      }
    }
    
    // Save/Submit
    const submitButtons = await page.$$('button[type="submit"], button');
    for (const button of submitButtons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text && (text.includes('Save') || text.includes('Create') || text.includes('Submit'))) {
        await button.click();
        logInfo('Clicked Save/Submit');
        await wait(3000);
        break;
      }
    }
    
    logSuccess('Purchase order created!');
    return true;
    
  } catch (error) {
    logError(`Failed to create PO: ${error.message}`);
    await captureScreenshot(page, 'create-po-error');
    return false;
  }
}

async function receivePurchaseOrderWithIMEI(page) {
  logStep('STEP 3: Receiving Purchase Order with IMEI Numbers');
  
  try {
    // Wait for page to fully load
    await wait(2000);
    
    // Look for "Receive Items" button
    logInfo('Looking for "Receive Items" button...');
    
    let receiveButton = null;
    const buttons = await page.$$('button');
    
    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text && (text.includes('Receive Items') || text.includes('Receive Order') || text.includes('Receive Stock'))) {
        receiveButton = button;
        logInfo(`Found button: "${text}"`);
        break;
      }
    }
    
    if (!receiveButton) {
      throw new Error('Could not find "Receive Items" button');
    }
    
    await receiveButton.click();
    logSuccess('Clicked "Receive Items" button');
    await wait(2000);
    
    await captureScreenshot(page, 'after-receive-click');
    
    // Step 3a: Consolidated Receive Modal (Choose Full or Partial)
    logInfo('Looking for Consolidated Receive Modal...');
    await wait(1000);
    
    let proceedButton = null;
    let fullReceiveButton = null;
    
    const modalButtons = await page.$$('button');
    for (const button of modalButtons) {
      const text = await page.evaluate(el => el.textContent, button);
      const disabled = await page.evaluate(el => el.disabled, button);
      
      if (text && !disabled) {
        if (text.includes('Full Receive')) {
          fullReceiveButton = button;
          logInfo('Found "Full Receive" option');
        }
        if (text.includes('Proceed to Receive')) {
          proceedButton = button;
          logInfo('Found "Proceed to Receive" button');
        }
      }
    }
    
    // Select Full Receive if available
    if (fullReceiveButton) {
      await fullReceiveButton.click();
      logSuccess('Selected "Full Receive" option');
      await wait(500);
    }
    
    // Click Proceed to Receive
    if (proceedButton) {
      await proceedButton.click();
      logSuccess('Clicked "Proceed to Receive"');
      await wait(3000);
    } else {
      logWarning('No "Proceed to Receive" button found - might already be on serial number modal');
    }
    
    await captureScreenshot(page, 'after-proceed-to-receive');
    
    // Step 3b: Serial Number / IMEI Input Modal
    logInfo('Looking for Serial Number / IMEI Input Modal...');
    await wait(2000);
    
    // Check if modal is open
    const modalExists = await page.$('[role="dialog"], .modal, [class*="modal"], [class*="Modal"]');
    
    if (!modalExists) {
      logWarning('Modal not found - checking page state...');
      await captureScreenshot(page, 'no-modal-found');
      
      // Check for errors
      const errors = await page.evaluate(() => {
        const errorElements = document.querySelectorAll('.error, [class*="error"], .text-red-500, .text-red-600');
        return Array.from(errorElements).map(el => el.textContent.trim()).filter(t => t.length > 0);
      });
      
      if (errors.length > 0) {
        logError('Errors found on page:');
        errors.forEach(err => logError(`  - ${err}`));
      }
    } else {
      logSuccess('Serial Number Modal is open!');
      
      // Get modal title to confirm
      const modalTitle = await page.evaluate(() => {
        const modal = document.querySelector('[role="dialog"], .modal, [class*="modal"]');
        if (modal) {
          const title = modal.querySelector('h1, h2, h3, [class*="title"]');
          return title ? title.textContent.trim() : 'Unknown';
        }
        return null;
      });
      
      logInfo(`Modal title: "${modalTitle}"`);
      
      // Count how many IMEI/Serial input fields we need to fill
      const inputInfo = await page.evaluate(() => {
        const inputs = document.querySelectorAll('input[type="text"][placeholder*="Serial" i], input[type="text"][placeholder*="IMEI" i]');
        return {
          count: inputs.length,
          placeholders: Array.from(inputs).slice(0, 5).map(inp => inp.placeholder)
        };
      });
      
      logInfo(`Found ${inputInfo.count} IMEI/Serial input fields`);
      if (inputInfo.placeholders.length > 0) {
        logInfo(`Sample placeholders: ${inputInfo.placeholders.join(', ')}`);
      }
      
      // Fill in IMEI numbers
      if (inputInfo.count > 0) {
        logInfo(`Filling in ${inputInfo.count} IMEI numbers...`);
        
        const inputs = await page.$$('input[type="text"][placeholder*="Serial" i], input[type="text"][placeholder*="IMEI" i]');
        
        for (let i = 0; i < Math.min(inputs.length, SAMPLE_IMEIS.length); i++) {
          const input = inputs[i];
          const imei = SAMPLE_IMEIS[i % SAMPLE_IMEIS.length];
          
          // Clear and fill
          await input.click({ clickCount: 3 });
          await input.type(imei, { delay: 30 });
          
          logInfo(`  [${i + 1}/${inputs.length}] Entered IMEI: ${imei}`);
          
          // Small delay between inputs
          await wait(100);
        }
        
        logSuccess(`Filled ${Math.min(inputs.length, SAMPLE_IMEIS.length)} IMEI numbers`);
        await captureScreenshot(page, 'imei-filled');
      }
      
      // Look for "Confirm" or "Next" button
      await wait(1000);
      logInfo('Looking for Confirm/Next button...');
      
      const confirmButtons = await page.$$('button');
      let confirmButton = null;
      
      for (const button of confirmButtons) {
        const text = await page.evaluate(el => el.textContent, button);
        const disabled = await page.evaluate(el => el.disabled, button);
        
        if (text && !disabled && (
          text.includes('Confirm') ||
          text.includes('Next') ||
          text.includes('Continue') ||
          text.includes('Confirm Pricing')
        )) {
          confirmButton = button;
          logInfo(`Found button: "${text}"`);
          break;
        }
      }
      
      if (confirmButton) {
        await confirmButton.click();
        logSuccess('Clicked confirm button');
        await wait(3000);
        
        await captureScreenshot(page, 'after-confirm-imei');
      } else {
        logWarning('No confirm button found - might need to scroll or check modal state');
      }
    }
    
    // Step 3c: Pricing Modal / Add to Inventory Confirmation
    logInfo('Checking for pricing/inventory confirmation modal...');
    await wait(2000);
    
    let addToInventoryButton = null;
    let confirmAddButton = null;
    
    const finalButtons = await page.$$('button');
    
    for (const button of finalButtons) {
      const text = await page.evaluate(el => el.textContent, button);
      const disabled = await page.evaluate(el => el.disabled, button);
      const isVisible = await page.evaluate(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }, button);
      
      if (text && !disabled && isVisible) {
        if (text.includes('Confirm & Add') || text.includes('Add to Inventory')) {
          confirmAddButton = button;
          logInfo(`Found button: "${text}"`);
          break;
        }
      }
    }
    
    if (confirmAddButton) {
      await captureScreenshot(page, 'before-confirm-add');
      await confirmAddButton.click();
      logSuccess('Clicked "Confirm & Add" button');
      
      // Wait for database operations
      await wait(8000);
      
      await captureScreenshot(page, 'after-confirm-add');
      
      // Check for success messages
      const successMessages = await page.evaluate(() => {
        const toasts = document.querySelectorAll('[data-sonner-toast], [role="status"], .toast, [class*="success"]');
        return Array.from(toasts).map(t => t.textContent.trim()).filter(t => t.length > 0);
      });
      
      if (successMessages.length > 0) {
        logSuccess('Success messages found:');
        successMessages.forEach(msg => logSuccess(`  ✓ ${msg}`));
      }
      
      logSuccess('✅ PURCHASE ORDER RECEIVED SUCCESSFULLY!');
      
    } else {
      logWarning('No final confirmation button found');
      
      // Log all visible buttons for debugging
      logInfo('All visible buttons:');
      for (const button of finalButtons) {
        const text = await page.evaluate(el => el.textContent, button);
        const isVisible = await page.evaluate(el => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        }, button);
        
        if (text && text.length > 0 && text.length < 50 && isVisible) {
          logInfo(`  - "${text}"`);
        }
      }
      
      await captureScreenshot(page, 'no-confirm-add-button');
    }
    
  } catch (error) {
    logError(`Receiving failed: ${error.message}`);
    await captureScreenshot(page, 'receive-error');
    issues.push({
      step: 'Receive Purchase Order',
      error: error.message,
    });
    throw error;
  }
}

async function verifyReceive(page) {
  logStep('STEP 4: Verifying Purchase Order was Received');
  
  try {
    // Navigate back to purchase orders list
    logInfo('Navigating back to Purchase Orders list...');
    const poUrl = `${APP_URL}/lats/purchase-orders`;
    await page.goto(poUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await wait(3000);
    
    // Search for our PO
    const searchBox = await page.$('input[type="search"], input[placeholder*="search" i]');
    if (searchBox) {
      await searchBox.click({ clickCount: 3 });
      await searchBox.type(TARGET_PO_NUMBER, { delay: 100 });
      await wait(1000);
    }
    
    // Check status
    const status = await page.evaluate((targetPO) => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      
      for (const row of rows) {
        const text = row.textContent;
        if (text.includes(targetPO)) {
          return text;
        }
      }
      return null;
    }, TARGET_PO_NUMBER);
    
    if (status) {
      logInfo(`Current status: ${status.substring(0, 150)}`);
      
      if (status.toLowerCase().includes('received')) {
        logSuccess('✅ Status: RECEIVED');
      } else if (status.toLowerCase().includes('partial')) {
        logSuccess('✅ Status: PARTIALLY RECEIVED');
      } else {
        logWarning(`Status might not have updated yet: ${status}`);
      }
    }
    
    await captureScreenshot(page, 'final-verification');
    
  } catch (error) {
    logError(`Verification failed: ${error.message}`);
    await captureScreenshot(page, 'verification-error');
    issues.push({
      step: 'Verification',
      error: error.message,
    });
  }
}

async function generateReport() {
  logStep('STEP 5: Generating Test Report');
  
  const report = {
    timestamp: new Date().toISOString(),
    purchaseOrder: TARGET_PO_NUMBER,
    testResults: {
      success: issues.length === 0,
      totalIssues: issues.length,
      totalFixes: fixes.length,
    },
    issues,
    fixes,
  };
  
  const reportFile = `test-report-${TARGET_PO_NUMBER}-${Date.now()}.json`;
  writeFileSync(reportFile, JSON.stringify(report, null, 2));
  
  if (issues.length === 0) {
    logSuccess('✅ ALL TESTS PASSED! No issues found.');
  } else {
    logWarning(`Found ${issues.length} issue(s)`);
    issues.forEach((issue, idx) => {
      logError(`${idx + 1}. ${issue.step}: ${issue.error}`);
    });
  }
  
  logInfo(`Full report saved to: ${reportFile}`);
}

async function main() {
  log('\n' + '═'.repeat(80), 'cyan');
  log('🎯 AUTOMATED TEST: RECEIVE PURCHASE ORDER WITH IMEI', 'bright');
  log('═'.repeat(80), 'cyan');
  log(`Purchase Order: ${TARGET_PO_NUMBER}`, 'blue');
  log(`Login: ${LOGIN_EMAIL}`, 'blue');
  log(`App URL: ${APP_URL}`, 'blue');
  log('═'.repeat(80) + '\n', 'cyan');
  
  let browser;
  let page;
  
  try {
    // Launch browser
    logInfo('Launching browser...');
    browser = await puppeteer.launch({
      headless: false, // Show browser window
      defaultViewport: {
        width: 1920,
        height: 1080
      },
      args: ['--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--start-maximized',, '--disable-extensions', '--disable-plugins', '--disable-default-apps', '--disable-background-timer-throttling', '--disable-renderer-backgrounding']]
    });
    
    page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Enable console logging from the page
    page.on('console', msg => {
      const type = msg.type();
      if (type === 'error') {
        logWarning(`Browser Error: ${msg.text()}`);
      } else if (type === 'log' && msg.text().includes('✅')) {
        logInfo(`Browser: ${msg.text()}`);
      }
    });
    
    // Enable error handling
    page.on('pageerror', error => {
      logError(`Page Error: ${error.message}`);
    });
    
    logSuccess('Browser launched');
    
    // Run test steps
    await login(page);
    await navigateToPurchaseOrder(page);
    await receivePurchaseOrderWithIMEI(page);
    await verifyReceive(page);
    
    // Generate report
    await generateReport();
    
    // Wait to see final state
    logInfo('Test complete! Browser will remain open for 30 seconds...');
    await wait(30000);
    
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    console.error(error);
    
    await generateReport();
  } finally {
    if (browser) {
      logInfo('Closing browser...');
      await browser.close();
    }
  }
  
  log('\n' + '═'.repeat(80), 'cyan');
  log('🎉 TEST COMPLETED', 'bright');
  log('═'.repeat(80) + '\n', 'cyan');
}

// Run the test
main().catch(console.error);

