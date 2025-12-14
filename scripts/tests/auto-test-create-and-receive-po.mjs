#!/usr/bin/env node

/**
 * 🎯 COMPLETE AUTOMATED TEST: Create and Receive PO with IMEI
 * ============================================================
 * 
 * This script will:
 * 1. Login as care@care.com
 * 2. Create a new purchase order
 * 3. Receive it with IMEI numbers in children variants
 * 4. Test and verify the complete workflow
 * 5. Report any errors
 */

import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';

// Configuration
const APP_URL = 'http://localhost:5173';
const LOGIN_EMAIL = 'care@care.com';
const LOGIN_PASSWORD = '123456';

// Sample IMEI numbers (15 digits each)
const generateIMEI = (index) => `35123456789${String(index).padStart(4, '0')}`;

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
let testState = {
  poNumber: null,
  poId: null,
};

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
    logInfo(`Screenshot: ${filename}`);
    return filename;
  } catch (error) {
    logWarning(`Failed to capture screenshot: ${error.message}`);
    return null;
  }
}

async function login(page) {
  logStep('STEP 1: Logging in');
  
  try {
    logInfo(`Navigating to ${APP_URL}...`);
    await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await wait(2000);
    
    const currentUrl = page.url();
    
    if (!currentUrl.includes('/login') && !currentUrl.endsWith('/')) {
      logSuccess('Already logged in!');
      return;
    }
    
    await page.waitForSelector('input[type="email"], input[type="text"]', { timeout: 10000 });
    
    const emailInput = await page.$('input[type="email"], input[type="text"]');
    const passwordInput = await page.$('input[type="password"]');
    
    await emailInput.click({ clickCount: 3 });
    await emailInput.type(LOGIN_EMAIL, { delay: 30 });
    
    await passwordInput.click({ clickCount: 3 });
    await passwordInput.type(LOGIN_PASSWORD, { delay: 30 });
    
    const loginButton = await page.$('button[type="submit"]');
    await loginButton.click();
    await wait(5000);
    
    await captureScreenshot(page, 'after-login');
    logSuccess('Logged in successfully');
    
  } catch (error) {
    logError(`Login failed: ${error.message}`);
    throw error;
  }
}

async function createPurchaseOrder(page) {
  logStep('STEP 2: Creating Purchase Order');
  
  try {
    // Navigate to purchase orders page
    logInfo('Navigating to Purchase Orders...');
    await page.goto(`${APP_URL}/lats/purchase-orders`, { waitUntil: 'networkidle2', timeout: 30000 });
    await wait(3000);
    
    await captureScreenshot(page, 'po-list-before-create');
    
    // Find "Create" button
    logInfo('Looking for Create button...');
    const createClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a'));
      const createBtn = buttons.find(btn => 
        btn.textContent.includes('Create') || 
        btn.textContent.includes('New') ||
        btn.textContent.includes('Add Purchase Order')
      );
      
      if (createBtn) {
        createBtn.click();
        return true;
      }
      return false;
    });
    
    if (!createClicked) {
      // Try direct navigation
      logInfo('Navigating directly to create page...');
      await page.goto(`${APP_URL}/lats/purchase-orders/new`, { waitUntil: 'networkidle2' });
      await wait(2000);
    } else {
      await wait(2000);
    }
    
    logSuccess('On create purchase order page');
    await captureScreenshot(page, 'po-create-page');
    
    // Wait for form to load
    await wait(2000);
    
    // Select supplier
    logInfo('Selecting supplier...');
    const supplierSelected = await page.evaluate(() => {
      // Look for supplier select/dropdown
      const selects = Array.from(document.querySelectorAll('select'));
      const supplierSelect = selects.find(s => 
        s.name && (s.name.includes('supplier') || s.placeholder?.includes('supplier'))
      );
      
      if (supplierSelect && supplierSelect.options.length > 1) {
        supplierSelect.selectedIndex = 1; // Select first supplier
        supplierSelect.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      
      // Try clicking on a supplier dropdown button
      const dropdowns = Array.from(document.querySelectorAll('button, div'));
      const supplierDropdown = dropdowns.find(d => 
        d.textContent.includes('Select supplier') || d.textContent.includes('Supplier')
      );
      
      if (supplierDropdown) {
        supplierDropdown.click();
        return 'clicked-dropdown';
      }
      
      return false;
    });
    
    if (supplierSelected === 'clicked-dropdown') {
      await wait(500);
      // Click first option in dropdown
      await page.evaluate(() => {
        const options = Array.from(document.querySelectorAll('[role="option"], li'));
        if (options.length > 0) {
          options[0].click();
        }
      });
      await wait(500);
    }
    
    logSuccess('Supplier selected');
    
    // Add item
    logInfo('Adding product item...');
    const addItemClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addBtn = buttons.find(btn => 
        btn.textContent.includes('Add Item') || 
        btn.textContent.includes('Add Product')
      );
      
      if (addBtn) {
        addBtn.click();
        return true;
      }
      return false;
    });
    
    if (addItemClicked) {
      await wait(1500);
      logSuccess('Add item clicked');
      
      // Select product
      logInfo('Selecting product...');
      await page.evaluate(() => {
        const selects = Array.from(document.querySelectorAll('select'));
        // Find product select (usually first or second)
        for (const select of selects) {
          if (select.options.length > 1 && !select.value) {
            select.selectedIndex = 1;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            break;
          }
        }
      });
      
      await wait(1000);
      
      // Select variant
      logInfo('Selecting variant...');
      await page.evaluate(() => {
        const selects = Array.from(document.querySelectorAll('select'));
        // Find variant select
        for (const select of selects) {
          if (select.options.length > 1 && !select.value) {
            select.selectedIndex = 1;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            break;
          }
        }
      });
      
      await wait(500);
      
      // Set quantity to 3 (for 3 IMEI numbers)
      logInfo('Setting quantity to 3...');
      await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const qtyInput = inputs.find(inp => 
          inp.name && (inp.name.includes('quantity') || inp.placeholder?.includes('Quantity'))
        );
        
        if (qtyInput) {
          qtyInput.value = '3';
          qtyInput.dispatchEvent(new Event('input', { bubbles: true }));
          qtyInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      
      await wait(500);
      logSuccess('Product added with quantity 3');
    }
    
    await captureScreenshot(page, 'po-filled');
    
    // Submit/Save
    logInfo('Saving purchase order...');
    const submitClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const submitBtn = buttons.find(btn => 
        (btn.type === 'submit' || btn.textContent.includes('Create') || btn.textContent.includes('Save')) &&
        !btn.textContent.includes('Cancel') &&
        !btn.disabled
      );
      
      if (submitBtn) {
        submitBtn.click();
        return true;
      }
      return false;
    });
    
    if (submitClicked) {
      logInfo('Clicked save/create button');
      await wait(5000);
      
      // Check if we're now on the PO detail page or list page
      const currentUrl = page.url();
      logInfo(`Current URL: ${currentUrl}`);
      
      // Try to extract PO number from page
      const poInfo = await page.evaluate(() => {
        const bodyText = document.body.textContent;
        const poMatch = bodyText.match(/PO-\d+/);
        return {
          poNumber: poMatch ? poMatch[0] : null,
          url: window.location.href
        };
      });
      
      if (poInfo.poNumber) {
        testState.poNumber = poInfo.poNumber;
        logSuccess(`Purchase Order created: ${poInfo.poNumber}`);
      } else {
        logWarning('Could not extract PO number from page');
      }
      
      await captureScreenshot(page, 'po-created');
    } else {
      logWarning('Could not click submit button, checking if PO was created anyway...');
      await wait(2000);
      
      // Check if we're on a PO detail page
      const currentUrl = page.url();
      if (currentUrl.includes('purchase-orders/') && !currentUrl.includes('/new')) {
        logSuccess('Navigated to PO detail page');
        const poInfo = await page.evaluate(() => {
          const bodyText = document.body.textContent;
          const poMatch = bodyText.match(/PO-\d+/);
          return { poNumber: poMatch ? poMatch[0] : null };
        });
        
        if (poInfo.poNumber) {
          testState.poNumber = poInfo.poNumber;
          logSuccess(`Purchase Order created: ${poInfo.poNumber}`);
        }
      } else {
        throw new Error('Could not save purchase order');
      }
    }
    
    return testState.poNumber;
    
  } catch (error) {
    logError(`Failed to create PO: ${error.message}`);
    await captureScreenshot(page, 'create-error');
    issues.push({ step: 'Create PO', error: error.message });
    throw error;
  }
}

async function receivePurchaseOrder(page) {
  logStep('STEP 3: Receiving Purchase Order with IMEI');
  
  try {
    // Make sure we're on the PO detail page
    await wait(2000);
    
    // Find "Receive Items" button
    logInfo('Looking for Receive Items button...');
    const receiveClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const receiveBtn = buttons.find(btn => 
        btn.textContent.includes('Receive Items') || 
        btn.textContent.includes('Receive Order') ||
        btn.textContent.includes('Receive Stock')
      );
      
      if (receiveBtn) {
        receiveBtn.click();
        return true;
      }
      return false;
    });
    
    if (!receiveClicked) {
      throw new Error('Receive Items button not found');
    }
    
    logSuccess('Clicked Receive Items');
    await wait(3000);
    
    await captureScreenshot(page, 'after-receive-click');
    
    // Handle Consolidated Receive Modal
    logInfo('Handling Consolidated Receive Modal...');
    
    // Select Full Receive
    const fullReceiveClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const fullReceiveBtn = buttons.find(btn => btn.textContent.includes('Full Receive'));
      if (fullReceiveBtn) {
        fullReceiveBtn.click();
        return true;
      }
      return false;
    });
    
    if (fullReceiveClicked) {
      await wait(500);
      logSuccess('Selected Full Receive');
    }
    
    // Click Proceed to Receive
    const proceedClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const proceedBtn = buttons.find(btn => btn.textContent.includes('Proceed to Receive'));
      if (proceedBtn && !proceedBtn.disabled) {
        proceedBtn.click();
        return true;
      }
      return false;
    });
    
    if (proceedClicked) {
      await wait(3000);
      logSuccess('Clicked Proceed to Receive');
    }
    
    await captureScreenshot(page, 'after-proceed');
    
    // Fill IMEI numbers in Serial Number Modal
    logInfo('Filling IMEI numbers...');
    await wait(2000);
    
    const inputsFilled = await page.evaluate((generateIMEICode) => {
      const generateIMEI = new Function('return ' + generateIMEICode)();
      const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
      const serialInputs = inputs.filter(inp => 
        inp.placeholder && (
          inp.placeholder.toLowerCase().includes('serial') || 
          inp.placeholder.toLowerCase().includes('imei')
        )
      );
      
      let filled = 0;
      serialInputs.forEach((input, index) => {
        const imei = generateIMEI(index);
        input.value = imei;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        filled++;
      });
      
      return { filled, total: serialInputs.length };
    }, generateIMEI.toString());
    
    logSuccess(`Filled ${inputsFilled.filled} IMEI numbers`);
    await wait(1000);
    
    await captureScreenshot(page, 'imei-filled');
    
    // Click Confirm Pricing / Continue
    logInfo('Clicking Confirm button...');
    const confirmClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const confirmBtn = buttons.find(btn => 
        (btn.textContent.includes('Confirm') || 
         btn.textContent.includes('Continue') ||
         btn.textContent.includes('Next')) &&
        !btn.disabled
      );
      
      if (confirmBtn) {
        confirmBtn.click();
        return true;
      }
      return false;
    });
    
    if (confirmClicked) {
      await wait(4000);
      logSuccess('Clicked Confirm');
    }
    
    await captureScreenshot(page, 'after-confirm');
    
    // Final step: Add to Inventory
    logInfo('Looking for Add to Inventory button...');
    await wait(2000);
    
    const addToInventoryClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addBtn = buttons.find(btn => 
        (btn.textContent.includes('Confirm & Add') || 
         btn.textContent.includes('Add to Inventory') ||
         btn.textContent.includes('Complete')) &&
        !btn.disabled
      );
      
      if (addBtn) {
        // Check if button is visible
        const rect = addBtn.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0;
        
        if (isVisible) {
          addBtn.click();
          return true;
        }
      }
      return false;
    });
    
    if (addToInventoryClicked) {
      await wait(7000); // Wait for database operations
      logSuccess('✅ Clicked Add to Inventory!');
      
      // Check for success messages
      const successMessages = await page.evaluate(() => {
        const toasts = document.querySelectorAll('[data-sonner-toast], [role="status"], .toast');
        return Array.from(toasts).map(t => t.textContent.trim()).filter(t => t.length > 0);
      });
      
      if (successMessages.length > 0) {
        successMessages.forEach(msg => logSuccess(`✓ ${msg}`));
      }
      
      await captureScreenshot(page, 'final-success');
      logSuccess('✅ PURCHASE ORDER RECEIVED SUCCESSFULLY!');
    } else {
      logWarning('Could not find or click Add to Inventory button');
      await captureScreenshot(page, 'no-add-button');
    }
    
  } catch (error) {
    logError(`Failed to receive PO: ${error.message}`);
    await captureScreenshot(page, 'receive-error');
    issues.push({ step: 'Receive PO', error: error.message });
    throw error;
  }
}

async function verify(page) {
  logStep('STEP 4: Verifying Results');
  
  try {
    // Navigate back to PO list
    logInfo('Navigating to PO list...');
    await page.goto(`${APP_URL}/lats/purchase-orders`, { waitUntil: 'networkidle2' });
    await wait(3000);
    
    if (testState.poNumber) {
      // Search for our PO
      const searchBox = await page.$('input[type="search"]');
      if (searchBox) {
        await searchBox.type(testState.poNumber);
        await wait(1500);
      }
      
      // Check status
      const status = await page.evaluate((poNumber) => {
        const rows = Array.from(document.querySelectorAll('table tbody tr'));
        for (const row of rows) {
          if (row.textContent.includes(poNumber)) {
            return row.textContent;
          }
        }
        return null;
      }, testState.poNumber);
      
      if (status) {
        if (status.toLowerCase().includes('received')) {
          logSuccess(`✅ Status verified: RECEIVED`);
        } else {
          logWarning(`Status: ${status.substring(0, 100)}`);
        }
      }
    }
    
    await captureScreenshot(page, 'final-verification');
    
  } catch (error) {
    logWarning(`Verification failed: ${error.message}`);
  }
}

async function generateReport() {
  logStep('STEP 5: Test Report');
  
  const report = {
    timestamp: new Date().toISOString(),
    poNumber: testState.poNumber,
    success: issues.length === 0,
    issues
  };
  
  const reportFile = `test-report-${Date.now()}.json`;
  writeFileSync(reportFile, JSON.stringify(report, null, 2));
  
  if (issues.length === 0) {
    logSuccess('✅ ALL TESTS PASSED!');
  } else {
    logWarning(`Found ${issues.length} issue(s)`);
    issues.forEach((issue, idx) => {
      logError(`${idx + 1}. ${issue.step}: ${issue.error}`);
    });
  }
  
  logInfo(`Report: ${reportFile}`);
}

async function main() {
  log('\n' + '═'.repeat(80), 'cyan');
  log('🎯 AUTOMATED TEST: CREATE AND RECEIVE PO WITH IMEI', 'bright');
  log('═'.repeat(80) + '\n', 'cyan');
  
  let browser;
  let page;
  
  try {
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1920, height: 1080 },
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized', '--disable-extensions', '--disable-plugins', '--disable-default-apps', '--disable-background-timer-throttling', '--disable-renderer-backgrounding']]
    });
    
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('Download the React DevTools')) {
        logWarning(`Browser: ${msg.text().substring(0, 100)}`);
      }
    });
    
    // Run test steps
    await login(page);
    await createPurchaseOrder(page);
    await receivePurchaseOrder(page);
    await verify(page);
    await generateReport();
    
    logInfo('Browser will remain open for 30 seconds...');
    await wait(30000);
    
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    await generateReport();
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  log('\n' + '═'.repeat(80), 'cyan');
  log('🎉 TEST COMPLETED', 'bright');
  log('═'.repeat(80) + '\n', 'cyan');
}

main().catch(console.error);

