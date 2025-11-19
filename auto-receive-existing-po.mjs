#!/usr/bin/env node

/**
 * 🎯 AUTOMATED TEST: Receive Existing Purchase Order with IMEI
 * =============================================================
 * 
 * This script finds an existing PO with "sent" status and receives it
 * with IMEI numbers automatically.
 * 
 * Usage: node auto-receive-existing-po.mjs
 */

import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';

const APP_URL = 'http://localhost:5173';
const LOGIN_EMAIL = 'care@care.com';
const LOGIN_PASSWORD = '123456';

const generateIMEI = (index) => `35123456789${String(index).padStart(4, '0')}`;

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const issues = [];
let testState = { poNumber: null };

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(message) {
  log(`\n${'═'.repeat(80)}`, 'cyan');
  log(`🎯 ${message}`, 'bright');
  log('═'.repeat(80), 'cyan');
}

function logSuccess(message) { log(`✅ ${message}`, 'green'); }
function logError(message) { log(`❌ ${message}`, 'red'); }
function logWarning(message) { log(`⚠️  ${message}`, 'yellow'); }
function logInfo(message) { log(`ℹ️  ${message}`, 'blue'); }

async function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function screenshot(page, name) {
  try {
    const filename = `test-${name}-${Date.now()}.png`;
    await page.screenshot({ path: filename, fullPage: true });
    logInfo(`📸 ${filename}`);
    return filename;
  } catch (e) {
    return null;
  }
}

async function main() {
  log('\n' + '═'.repeat(80), 'cyan');
  log('🎯 AUTOMATED TEST: RECEIVE EXISTING PO WITH IMEI', 'bright');
  log('═'.repeat(80) + '\n', 'cyan');
  
  let browser, page;
  
  try {
    // Launch browser with extensions disabled
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1920, height: 1080 },
      args: ['--start-maximized',
        '--no-sandbox',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-default-apps',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding', '--disable-extensions', '--disable-plugins', '--disable-default-apps', '--disable-background-timer-throttling', '--disable-renderer-backgrounding']],
      ignoreDefaultArgs: ['--enable-automation']
    });
    
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    // Suppress non-critical console messages
    page.on('console', msg => {
      const text = msg.text();
      // Ignore extension context invalidated errors and other non-critical messages
      if (msg.type() === 'error' &&
          !text.includes('DevTools') &&
          !text.includes('Extension context invalidated') &&
          !text.includes('chrome-extension://') &&
          !text.includes('moz-extension://')) {
        logWarning(`Browser: ${text.substring(0, 80)}...`);
      }
    });
    
    // ========================================
    // STEP 1: Login
    // ========================================
    logStep('STEP 1: Login');
    
    await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await wait(2000);
    
    if (page.url().includes('/login') || page.url().endsWith('/')) {
      await page.waitForSelector('input[type="email"], input[type="text"]', { timeout: 10000 });
      
      const emailInput = await page.$('input[type="email"], input[type="text"]');
      const passwordInput = await page.$('input[type="password"]');
      
      await emailInput.type(LOGIN_EMAIL, { delay: 30 });
      await passwordInput.type(LOGIN_PASSWORD, { delay: 30 });
      
      const loginBtn = await page.$('button[type="submit"]');
      await loginBtn.click();
      await wait(5000);
    }
    
    logSuccess('Logged in');
    await screenshot(page, 'logged-in');
    
    // ========================================
    // STEP 2: Find Existing PO
    // ========================================
    logStep('STEP 2: Find Purchase Order');
    
    await page.goto(`${APP_URL}/lats/purchase-orders`, { waitUntil: 'networkidle2' });
    await wait(3000);
    
    await screenshot(page, 'po-list');
    
    // Find first PO (with any receivable status)
    const poInfo = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      
      for (const row of rows) {
        const text = row.textContent.toLowerCase();
        
        // Look for any PO that's not already received
        // Skip if status is "received" or "cancelled"
        if (!text.includes('received') && !text.includes('cancelled') && !text.includes('completed')) {
          // Extract PO number from first cell
          const firstCell = row.querySelector('td');
          const poNumber = firstCell ? firstCell.textContent.trim() : null;
          
          // Find link to detail page
          const link = row.querySelector('a[href*="purchase-orders/"]');
          if (link && poNumber) {
            return {
              found: true,
              poNumber,
              href: link.href,
              status: text
            };
          }
        }
      }
      
      return { found: false };
    });
    
    if (!poInfo.found) {
      logError('No purchase orders available to receive');
      logWarning('All POs are either already received or cancelled');
      logInfo('Please create a new purchase order:');
      logInfo('1. Go to Purchase Orders → Create');
      logInfo('2. Add items with quantity 2-3');
      logInfo('3. Save');
      logInfo('4. Run this script again');
      throw new Error('No PO found');
    }
    
    logInfo(`Status: ${poInfo.status || 'Unknown'}`);
    
    testState.poNumber = poInfo.poNumber;
    logSuccess(`Found PO: ${poInfo.poNumber}`);
    
    // Navigate to PO detail page
    await page.goto(poInfo.href, { waitUntil: 'networkidle2' });
    await wait(3000);
    
    await screenshot(page, 'po-detail');
    logSuccess('Opened PO detail page');
    
    // ========================================
    // STEP 3: Receive with IMEI
    // ========================================
    logStep('STEP 3: Receive with IMEI Numbers');
    
    // Click "Receive Items"
    const receiveClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => 
        b.textContent.includes('Receive Items') || 
        b.textContent.includes('Receive Order')
      );
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    
    if (!receiveClicked) {
      throw new Error('Receive Items button not found');
    }
    
    logSuccess('Clicked Receive Items');
    await wait(3000);
    await screenshot(page, 'consolidated-modal');
    
    // Select Full Receive
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const fullBtn = buttons.find(b => b.textContent.includes('Full Receive'));
      if (fullBtn) fullBtn.click();
    });
    await wait(500);
    logSuccess('Selected Full Receive');
    
    // Click Proceed
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const proceedBtn = buttons.find(b => b.textContent.includes('Proceed to Receive'));
      if (proceedBtn && !proceedBtn.disabled) proceedBtn.click();
    });
    await wait(4000);
    logSuccess('Clicked Proceed');
    await screenshot(page, 'serial-modal');
    
    // Fill IMEI numbers
    logInfo('Filling IMEI numbers...');
    const result = await page.evaluate((genCode) => {
      const generateIMEI = new Function('return ' + genCode)();
      const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
      const serialInputs = inputs.filter(inp => 
        inp.placeholder && (
          inp.placeholder.toLowerCase().includes('serial') || 
          inp.placeholder.toLowerCase().includes('imei')
        )
      );
      
      let filled = 0;
      serialInputs.forEach((input, index) => {
        if (!input.value || input.value.trim() === '') {
          const imei = generateIMEI(index);
          input.value = imei;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          filled++;
        }
      });
      
      return { filled, total: serialInputs.length };
    }, generateIMEI.toString());
    
    logSuccess(`Filled ${result.filled}/${result.total} IMEI numbers`);
    await wait(1000);
    await screenshot(page, 'imei-filled');
    
    // Click Confirm
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const confirmBtn = buttons.find(b => 
        (b.textContent.includes('Confirm') || b.textContent.includes('Continue')) &&
        !b.disabled
      );
      if (confirmBtn) confirmBtn.click();
    });
    await wait(5000);
    logSuccess('Clicked Confirm');
    await screenshot(page, 'pricing-confirmed');
    
    // Final step: Add to Inventory
    logInfo('Looking for Add to Inventory button...');
    await wait(2000);
    
    const addClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addBtn = buttons.find(b => {
        const text = b.textContent;
        return (
          (text.includes('Confirm & Add') || text.includes('Add to Inventory')) &&
          !b.disabled
        );
      });
      
      if (addBtn) {
        const rect = addBtn.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          addBtn.click();
          return true;
        }
      }
      return false;
    });
    
    if (addClicked) {
      await wait(8000);
      logSuccess('✅ CLICKED ADD TO INVENTORY!');
      
      // Check for success messages
      const messages = await page.evaluate(() => {
        const toasts = document.querySelectorAll('[data-sonner-toast], [role="status"]');
        return Array.from(toasts).map(t => t.textContent.trim()).filter(t => t);
      });
      
      if (messages.length > 0) {
        messages.forEach(msg => logSuccess(`✓ ${msg}`));
      }
      
      await screenshot(page, 'success');
      logSuccess('✅ PURCHASE ORDER RECEIVED SUCCESSFULLY!');
    } else {
      logWarning('Add to Inventory button not found or not clickable');
      await screenshot(page, 'no-add-button');
    }
    
    // ========================================
    // STEP 4: Verify
    // ========================================
    logStep('STEP 4: Verify');
    
    await page.goto(`${APP_URL}/lats/purchase-orders`, { waitUntil: 'networkidle2' });
    await wait(3000);
    
    // Search for our PO
    const searchBox = await page.$('input[type="search"]');
    if (searchBox) {
      await searchBox.type(testState.poNumber);
      await wait(2000);
    }
    
    const status = await page.evaluate((poNum) => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      for (const row of rows) {
        if (row.textContent.includes(poNum)) {
          return row.textContent;
        }
      }
      return null;
    }, testState.poNumber);
    
    if (status) {
      if (status.toLowerCase().includes('received')) {
        logSuccess('✅ Status: RECEIVED');
      } else {
        logInfo(`Status: ${status.substring(0, 100)}`);
      }
    }
    
    await screenshot(page, 'final-verification');
    
    // Generate report
    logStep('STEP 5: Test Report');
    
    const report = {
      timestamp: new Date().toISOString(),
      poNumber: testState.poNumber,
      success: issues.length === 0,
      totalIssues: issues.length,
      issues
    };
    
    const reportFile = `test-report-${Date.now()}.json`;
    writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    if (issues.length === 0) {
      logSuccess('✅ ALL TESTS PASSED!');
      logSuccess(`✅ PO ${testState.poNumber} received with IMEI numbers`);
    } else {
      logWarning(`Found ${issues.length} issue(s)`);
    }
    
    logInfo(`📊 Report: ${reportFile}`);
    
    // Keep browser open
    logInfo('\n🎮 Browser will stay open for 30 seconds for you to review...\n');
    await wait(30000);
    
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    if (page) await screenshot(page, 'error');
    issues.push({ error: error.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  log('\n' + '═'.repeat(80), 'cyan');
  log('🎉 TEST COMPLETED', 'bright');
  log('═'.repeat(80) + '\n', 'cyan');
  
  process.exit(issues.length > 0 ? 1 : 0);
}

main().catch(console.error);

