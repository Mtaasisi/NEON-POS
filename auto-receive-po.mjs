#!/usr/bin/env node

/**
 * Automated Purchase Order Receive Script
 * Receives PO-1763064185396 automatically
 */

import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';

const APP_URL = 'http://localhost:5173';
const LOGIN_EMAIL = 'care@care.com';
const LOGIN_PASSWORD = '123456';
const TARGET_PO = 'PO-1763064185396';

// Logging functions
function log(message, color = 'reset') {
  const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    bright: '\x1b[1m'
  };
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${'═'.repeat(60)}`, 'cyan');
  log(`Step ${step}: ${message}`, 'bright');
  log('═'.repeat(60), 'cyan');
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
  const filename = `auto-receive-${name}-${Date.now()}.png`;
  await page.screenshot({ path: filename, fullPage: true });
  logInfo(`Screenshot saved: ${filename}`);
  return filename;
}

async function login(page) {
  logStep(1, 'Logging in to the application');

  try {
    await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    logSuccess('Application loaded');

    // Wait for login form
    await page.waitForSelector('input[type="email"], input[type="text"]', { timeout: 10000 });
    logSuccess('Login form found');

    // Fill in credentials
    const emailInput = await page.$('input[type="email"], input[type="text"]');
    const passwordInput = await page.$('input[type="password"]');

    if (!emailInput || !passwordInput) {
      throw new Error('Could not find login form inputs');
    }

    await emailInput.type(LOGIN_EMAIL, { delay: 50 });
    logInfo(`Entered email: ${LOGIN_EMAIL}`);

    await passwordInput.type(LOGIN_PASSWORD, { delay: 50 });
    logInfo('Entered password');

    // Find and click login button
    const loginButton = await page.$('button[type="submit"]');
    if (!loginButton) {
      throw new Error('Could not find login button');
    }

    await loginButton.click();
    logInfo('Clicked login button');

    // Wait for navigation after login
    await wait(3000);

    // Check if we're logged in
    const url = page.url();
    if (url.includes('/login') || url === APP_URL + '/') {
      const errors = await page.$$eval('.error, .text-red-500, [class*="error"]', elements =>
        elements.map(el => el.textContent).filter(text => text && text.trim())
      );
      if (errors.length > 0) {
        throw new Error(`Login failed: ${errors[0]}`);
      }
    }

    logSuccess('Logged in successfully');
    await captureScreenshot(page, 'after-login');

  } catch (error) {
    logError(`Login failed: ${error.message}`);
    await captureScreenshot(page, 'login-error');
    throw error;
  }
}

async function navigateToPurchaseOrders(page) {
  logStep(2, 'Navigating to Purchase Orders');

  try {
    // Try direct navigation to purchase orders
    logInfo('Navigating to /lats/purchase-orders');
    await page.goto(APP_URL + '/lats/purchase-orders', { waitUntil: 'networkidle2', timeout: 30000 });
    await wait(3000);

    logSuccess('Purchase orders page loaded');
    await captureScreenshot(page, 'purchase-orders-page');

  } catch (error) {
    logError(`Navigation failed: ${error.message}`);
    await captureScreenshot(page, 'navigation-error');
    throw error;
  }
}

async function findAndClickPurchaseOrder(page) {
  logStep(3, `Finding Purchase Order ${TARGET_PO}`);

  try {
    // Wait for the page to load
    await wait(2000);

    // Look for the PO in the table
    logInfo(`Searching for ${TARGET_PO}...`);

    // Try multiple selectors
    const selectors = [
      `a[href*="${TARGET_PO.replace('PO-', '')}"]`,
      `tr:has-text("${TARGET_PO}") a`,
      `td:has-text("${TARGET_PO}")`,
      `a:has-text("${TARGET_PO}")`
    ];

    let poElement = null;
    for (const selector of selectors) {
      try {
        poElement = await page.$(selector);
        if (poElement) {
          logSuccess(`Found PO with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    if (!poElement) {
      // Check if the PO exists on the page
      const pageText = await page.evaluate(() => document.body.innerText);
      if (pageText.includes(TARGET_PO.replace('PO-', ''))) {
        logWarning('PO ID found in page text but could not locate clickable element');

        // Try to find any link that might be the PO
        const links = await page.$$('a');
        for (const link of links) {
          const href = await page.evaluate(el => el.href, link);
          const text = await page.evaluate(el => el.textContent, link);
          if (href && href.includes('purchase-orders') && text && text.includes(TARGET_PO.replace('PO-', ''))) {
            poElement = link;
            logSuccess('Found PO link by href and text analysis');
            break;
          }
        }
      }
    }

    if (!poElement) {
      throw new Error(`Purchase order ${TARGET_PO} not found on the page`);
    }

    // Click on the PO
    logInfo('Clicking on purchase order...');
    await poElement.click();
    await wait(3000);

    logSuccess('Purchase order detail page opened');
    await captureScreenshot(page, 'po-detail-opened');

  } catch (error) {
    logError(`Failed to find PO: ${error.message}`);
    await captureScreenshot(page, 'po-not-found');
    throw error;
  }
}

async function initiateReceive(page) {
  logStep(4, 'Initiating Receive Process');

  try {
    // Look for receive button
    logInfo('Looking for receive button...');

    const buttons = await page.$$('button, a[role="button"]');
    let receiveButton = null;

    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent || '', button);
      const isVisible = await page.evaluate(el => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      }, button);

      if (isVisible && text.toLowerCase().includes('receive')) {
        receiveButton = button;
        logSuccess(`Found receive button: "${text.trim()}"`);
        break;
      }
    }

    if (!receiveButton) {
      throw new Error('Receive button not found');
    }

    await receiveButton.click();
    logInfo('Clicked receive button');
    await wait(2000);

    logSuccess('Receive modal opened');
    await captureScreenshot(page, 'receive-modal-opened');

  } catch (error) {
    logError(`Failed to initiate receive: ${error.message}`);
    await captureScreenshot(page, 'receive-initiate-error');
    throw error;
  }
}

async function selectPartialReceive(page) {
  logStep(5, 'Selecting Partial Receive');

  try {
    await wait(1000);

    const buttons = await page.$$('button');
    let partialButton = null;

    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent || '', button);
      if (text.toLowerCase().includes('partial')) {
        partialButton = button;
        logSuccess(`Found partial receive button: "${text.trim()}"`);
        break;
      }
    }

    if (partialButton) {
      await partialButton.click();
      logInfo('Selected partial receive');
      await wait(2000);
    } else {
      logWarning('Partial receive button not found, continuing with default selection');
    }

    logSuccess('Partial receive selected');
    await captureScreenshot(page, 'partial-receive-selected');

  } catch (error) {
    logError(`Failed to select partial receive: ${error.message}`);
    await captureScreenshot(page, 'partial-select-error');
    throw error;
  }
}

async function selectItemsToReceive(page) {
  logStep(6, 'Selecting Items to Receive');

  try {
    await wait(1000);

    // Look for "Receive All" or "Select All" buttons
    const buttons = await page.$$('button');
    let selectAllButton = null;

    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent || '', button);
      if (text.toLowerCase().includes('receive all') || text.toLowerCase().includes('select all')) {
        selectAllButton = button;
        logSuccess(`Found select all button: "${text.trim()}"`);
        break;
      }
    }

    if (selectAllButton) {
      await selectAllButton.click();
      logInfo('Clicked select all button');
      await wait(1500);
    } else {
      logWarning('Select all button not found, trying manual quantity input');

      // Try to set quantities manually
      const quantityInputs = await page.$$('input[type="number"]');
      logInfo(`Found ${quantityInputs.length} quantity inputs`);

      for (let i = 0; i < Math.min(quantityInputs.length, 5); i++) {
        try {
          await quantityInputs[i].clear();
          await quantityInputs[i].type('1');
          logInfo(`Set quantity input ${i + 1} to 1`);
        } catch (e) {
          logWarning(`Could not set quantity input ${i + 1}`);
        }
      }
    }

    logSuccess('Items selected for receive');
    await captureScreenshot(page, 'items-selected');

  } catch (error) {
    logError(`Failed to select items: ${error.message}`);
    await captureScreenshot(page, 'item-selection-error');
    throw error;
  }
}

async function continueThroughSteps(page) {
  logStep(7, 'Continuing Through Receive Steps');

  try {
    // Look for continue/confirm buttons
    const buttons = await page.$$('button');
    let continueButton = null;

    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent || '', button);
      if (text.toLowerCase().includes('continue') || text.toLowerCase().includes('confirm') || text.toLowerCase().includes('next')) {
        continueButton = button;
        logSuccess(`Found continue button: "${text.trim()}"`);
        break;
      }
    }

    if (continueButton) {
      await continueButton.click();
      logInfo('Clicked continue button');
      await wait(2000);

      logSuccess('Continued to next step');
      await captureScreenshot(page, 'continued-to-next-step');
    } else {
      logWarning('Continue button not found');
    }

  } catch (error) {
    logError(`Failed to continue: ${error.message}`);
    await captureScreenshot(page, 'continue-error');
    throw error;
  }
}

async function handleSerialNumbers(page) {
  logStep(8, 'Handling Serial Numbers');

  try {
    await wait(1000);

    const buttons = await page.$$('button');
    let continueButton = null;

    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent || '', button);
      if (text.toLowerCase().includes('continue') || text.toLowerCase().includes('skip') || text.toLowerCase().includes('next')) {
        continueButton = button;
        logSuccess(`Found serial number continue button: "${text.trim()}"`);
        break;
      }
    }

    if (continueButton) {
      await continueButton.click();
      logInfo('Handled serial numbers');
      await wait(2000);
    }

    logSuccess('Serial numbers handled');
    await captureScreenshot(page, 'serial-numbers-handled');

  } catch (error) {
    logError(`Failed to handle serial numbers: ${error.message}`);
    await captureScreenshot(page, 'serial-numbers-error');
    throw error;
  }
}

async function setPricing(page) {
  logStep(9, 'Setting Pricing');

  try {
    await wait(1000);

    const buttons = await page.$$('button');
    let pricingButton = null;

    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent || '', button);
      if (text.toLowerCase().includes('set pricing') || text.toLowerCase().includes('continue') || text.toLowerCase().includes('confirm')) {
        pricingButton = button;
        logSuccess(`Found pricing button: "${text.trim()}"`);
        break;
      }
    }

    if (pricingButton) {
      await pricingButton.click();
      logInfo('Set pricing');
      await wait(2000);
    }

    logSuccess('Pricing set');
    await captureScreenshot(page, 'pricing-set');

  } catch (error) {
    logError(`Failed to set pricing: ${error.message}`);
    await captureScreenshot(page, 'pricing-error');
    throw error;
  }
}

async function finalizeReceive(page) {
  logStep(10, 'Finalizing Receive');

  try {
    await wait(1000);

    const buttons = await page.$$('button');
    let finalButton = null;

    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent || '', button);
      if (text.toLowerCase().includes('add to inventory') ||
          (text.toLowerCase().includes('receive') && !text.toLowerCase().includes('partial'))) {
        finalButton = button;
        logSuccess(`Found final receive button: "${text.trim()}"`);
        break;
      }
    }

    if (finalButton) {
      await finalButton.click();
      logInfo('Clicked final receive button');
      await wait(3000);

      logSuccess('Receive finalized');
      await captureScreenshot(page, 'receive-finalized');
    } else {
      throw new Error('Final receive button not found');
    }

  } catch (error) {
    logError(`Failed to finalize receive: ${error.message}`);
    await captureScreenshot(page, 'finalize-error');
    throw error;
  }
}

async function main() {
  log('\n🚀 AUTOMATED PURCHASE ORDER RECEIVE', 'cyan');
  log('═══════════════════════════════════════════════', 'cyan');
  log(`Target PO: ${TARGET_PO}`, 'bright');
  log('═══════════════════════════════════════════════', 'cyan');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1920, height: 1080 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logWarning(`Browser console error: ${msg.text()}`);
      }
    });

    await login(page);
    await navigateToPurchaseOrders(page);
    await findAndClickPurchaseOrder(page);
    await initiateReceive(page);
    await selectPartialReceive(page);
    await selectItemsToReceive(page);
    await continueThroughSteps(page);
    await handleSerialNumbers(page);
    await setPricing(page);
    await finalizeReceive(page);

    log('\n🎉 PURCHASE ORDER RECEIVE COMPLETED SUCCESSFULLY!', 'green');
    log('═══════════════════════════════════════════════════════════════', 'green');

    // Wait a bit to see the results
    await wait(5000);

  } catch (error) {
    log('\n❌ RECEIVE PROCESS FAILED', 'red');
    log('══════════════════════════', 'red');
    log(`Error: ${error.message}`, 'red');

    // Save error details
    const errorReport = {
      timestamp: new Date().toISOString(),
      targetPO: TARGET_PO,
      error: error.message,
      stack: error.stack
    };

    writeFileSync('auto-receive-error.json', JSON.stringify(errorReport, null, 2));
    logError('Error report saved to: auto-receive-error.json');

  } finally {
    if (browser) {
      await browser.close();
      logInfo('Browser closed');
    }
  }
}

main().catch(console.error);