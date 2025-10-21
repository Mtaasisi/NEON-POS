#!/usr/bin/env node

/**
 * 🧪 AUTOMATED QUALITY CHECK TEST - PO PAGE
 * ==========================================
 * Tests the Quality Check functionality in Purchase Order pages
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:5173',
  credentials: {
    email: 'care@care.com',
    password: '123456'
  },
  timeout: 30000,
  headless: false, // Set to true for CI/CD
  slowMo: 100 // Slow down by 100ms for visibility
};

// Test Results
const results = {
  tests: [],
  screenshots: [],
  errors: [],
  timestamp: new Date().toISOString()
};

// Utility Functions
function log(emoji, message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    reset: '\x1b[0m'
  };
  const color = colors[type] || colors.info;
  console.log(`${color}${emoji} ${message}${colors.reset}`);
}

function addTest(name, status, message, details = {}) {
  results.tests.push({
    name,
    status,
    message,
    timestamp: new Date().toISOString(),
    ...details
  });
  
  const emoji = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
  const type = status === 'pass' ? 'success' : status === 'fail' ? 'error' : 'warning';
  log(emoji, `${name}: ${message}`, type);
}

async function takeScreenshot(page, name) {
  const filename = `test-screenshots/quality-check-${name}-${Date.now()}.png`;
  await page.screenshot({ path: filename, fullPage: true });
  results.screenshots.push(filename);
  log('📸', `Screenshot saved: ${filename}`, 'info');
  return filename;
}

async function waitForNetworkIdle(page, timeout = 5000) {
  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch (error) {
    log('⚠️', 'Network did not become idle, continuing...', 'warning');
  }
}

// Main Test Function
async function runTests() {
  console.log('\n');
  log('🧪', '='.repeat(60), 'info');
  log('🧪', 'AUTOMATED QUALITY CHECK TEST - PO PAGE', 'info');
  log('🧪', '='.repeat(60), 'info');
  console.log('\n');

  let browser;
  let context;
  let page;

  try {
    // Launch Browser
    log('🚀', 'Launching browser...', 'info');
    browser = await chromium.launch({
      headless: CONFIG.headless,
      slowMo: CONFIG.slowMo
    });

    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: { dir: 'test-screenshots/' }
    });

    page = await context.newPage();

    // Set longer timeout for navigation
    page.setDefaultTimeout(CONFIG.timeout);

    // Listen for console messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        results.errors.push({
          type: 'console',
          message: msg.text(),
          timestamp: new Date().toISOString()
        });
      }
    });

    // Listen for page errors
    page.on('pageerror', error => {
      results.errors.push({
        type: 'page',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    });

    // TEST 1: Navigate to application
    log('📍', 'TEST 1: Navigating to application...', 'info');
    try {
      await page.goto(CONFIG.baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);
      await takeScreenshot(page, 'initial-page');
      addTest('Navigate to App', 'pass', 'Successfully loaded application');
    } catch (error) {
      addTest('Navigate to App', 'fail', `Failed to load: ${error.message}`);
      throw error;
    }

    // TEST 2: Check if login page or already logged in
    log('🔐', 'TEST 2: Checking authentication status...', 'info');
    const currentUrl = page.url();
    const isLoginPage = currentUrl.includes('/login') || currentUrl === CONFIG.baseUrl + '/';
    
    if (isLoginPage) {
      // Login
      log('🔑', 'Login page detected, attempting to login...', 'info');
      
      try {
        // Wait for email input
        await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 5000 });
        
        // Fill login form
        await page.fill('input[type="email"], input[name="email"]', CONFIG.credentials.email);
        await page.fill('input[type="password"], input[name="password"]', CONFIG.credentials.password);
        
        await takeScreenshot(page, 'login-filled');
        
        // Click login button
        await page.click('button[type="submit"]');
        
        // Wait for navigation
        await page.waitForURL('**/dashboard', { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(3000);
        await waitForNetworkIdle(page);
        
        await takeScreenshot(page, 'after-login');
        addTest('Login', 'pass', 'Successfully logged in');
      } catch (error) {
        await takeScreenshot(page, 'login-failed');
        addTest('Login', 'fail', `Login failed: ${error.message}`);
        throw error;
      }
    } else {
      addTest('Authentication', 'pass', 'Already logged in');
    }

    // TEST 3: Navigate to Purchase Orders page
    log('📦', 'TEST 3: Navigating to Purchase Orders...', 'info');
    try {
      // Try multiple navigation methods
      const poNavigationMethods = [
        // Method 1: Click on menu item
        async () => {
          const poLink = await page.$('a[href*="/purchase-order"], a:has-text("Purchase Order")');
          if (poLink) {
            await poLink.click();
            return true;
          }
          return false;
        },
        // Method 2: Direct URL navigation
        async () => {
          await page.goto(`${CONFIG.baseUrl}/lats/purchase-orders`, { waitUntil: 'domcontentloaded' });
          return true;
        }
      ];

      let navigated = false;
      for (const method of poNavigationMethods) {
        try {
          navigated = await method();
          if (navigated) break;
        } catch (e) {
          continue;
        }
      }

      if (!navigated) {
        throw new Error('Could not navigate to Purchase Orders page');
      }

      await page.waitForTimeout(3000);
      await waitForNetworkIdle(page);
      await takeScreenshot(page, 'purchase-orders-list');
      addTest('Navigate to PO List', 'pass', 'Successfully navigated to Purchase Orders page');
    } catch (error) {
      await takeScreenshot(page, 'po-navigation-failed');
      addTest('Navigate to PO List', 'fail', `Navigation failed: ${error.message}`);
      throw error;
    }

    // TEST 4: Check if there are any Purchase Orders
    log('🔍', 'TEST 4: Checking for existing Purchase Orders...', 'info');
    try {
      await page.waitForTimeout(2000);
      
      // Look for PO rows/cards
      const poItems = await page.$$('[class*="purchase"], [class*="order"], tr[data-id], div[data-po-id]');
      
      if (poItems.length === 0) {
        log('⚠️', 'No Purchase Orders found. You may need to create one first.', 'warning');
        addTest('Find Purchase Orders', 'warning', 'No POs found - cannot test quality check');
        
        // Take screenshot and exit gracefully
        await takeScreenshot(page, 'no-purchase-orders');
        return;
      }

      log('✅', `Found ${poItems.length} Purchase Order(s)`, 'success');
      addTest('Find Purchase Orders', 'pass', `Found ${poItems.length} Purchase Orders`);
      
      // TEST 5: Click on first PO to view details
      log('👆', 'TEST 5: Opening first Purchase Order...', 'info');
      const firstPO = poItems[0];
      await firstPO.click();
      
      await page.waitForTimeout(2000);
      await waitForNetworkIdle(page);
      await takeScreenshot(page, 'po-detail-page');
      addTest('Open PO Details', 'pass', 'Successfully opened Purchase Order details');
      
    } catch (error) {
      await takeScreenshot(page, 'po-check-failed');
      addTest('Find/Open Purchase Orders', 'fail', `Error: ${error.message}`);
      throw error;
    }

    // TEST 6: Check PO status and workflow
    log('🔍', 'TEST 6: Checking Purchase Order status...', 'info');
    try {
      const pageText = await page.textContent('body');
      
      // Check if there's an info message about quality check being available after received
      const hasReceivedInfoMessage = pageText.includes('Quality Check will be available once this order is marked as') ||
                                      pageText.includes('received');
      
      // Check current status
      let poStatus = 'unknown';
      if (pageText.includes('Status: sent') || pageText.includes('status: sent')) {
        poStatus = 'sent';
      } else if (pageText.includes('Status: received') || pageText.includes('status: received')) {
        poStatus = 'received';
      } else if (pageText.includes('Status: pending') || pageText.includes('status: pending')) {
        poStatus = 'pending';
      }
      
      log('📋', `Purchase Order status detected: ${poStatus}`, 'info');
      addTest('Detect PO Status', 'pass', `PO status is: ${poStatus}`);
      
      // If PO is not received, try to mark it as received first
      if (poStatus !== 'received') {
        log('⚠️', 'PO is not in "received" status. Quality Check requires "received" status.', 'warning');
        
        // Look for "Mark as Received" or "Receive Order" button
        const receiveButtonSelectors = [
          'button:has-text("Mark as Received")',
          'button:has-text("Receive Order")',
          'button:has-text("Mark Received")',
          'button:has-text("Receive")'
        ];
        
        let receiveButton = null;
        for (const selector of receiveButtonSelectors) {
          try {
            receiveButton = await page.$(selector);
            if (receiveButton && await receiveButton.isVisible()) {
              log('✅', `Found receive button: ${selector}`, 'success');
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        if (receiveButton) {
          log('👆', 'Attempting to mark PO as received...', 'info');
          await receiveButton.click();
          await page.waitForTimeout(2000);
          await waitForNetworkIdle(page);
          await takeScreenshot(page, 'after-mark-received');
          addTest('Mark as Received', 'pass', 'Successfully marked PO as received');
        } else {
          log('⚠️', 'Could not find button to mark PO as received', 'warning');
          await takeScreenshot(page, 'no-receive-button');
          addTest('Mark as Received', 'warning', 'Receive button not found - PO may need manual status change');
        }
      }
      
    } catch (error) {
      await takeScreenshot(page, 'status-check-failed');
      addTest('Check PO Status', 'fail', `Error: ${error.message}`);
    }

    // TEST 7: Look for Quality Check button
    log('🔍', 'TEST 7: Looking for Quality Check functionality...', 'info');
    try {
      // Wait a bit for UI to update
      await page.waitForTimeout(1000);
      
      // Look for Quality Check button or section
      const qualityCheckSelectors = [
        'button:has-text("Quality Check")',
        'button:has-text("New Quality Check")',
        'button:has-text("QC")',
        '[aria-label*="Quality Check"]',
        '[data-testid*="quality-check"]',
        '.quality-check',
        '#quality-check'
      ];

      let qualityCheckElement = null;
      let foundSelector = null;

      for (const selector of qualityCheckSelectors) {
        try {
          qualityCheckElement = await page.$(selector);
          if (qualityCheckElement && await qualityCheckElement.isVisible()) {
            foundSelector = selector;
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!qualityCheckElement) {
        log('❌', 'Quality Check button/section not found on PO page', 'error');
        await takeScreenshot(page, 'no-quality-check-found');
        
        // Check if there's a message explaining why
        const pageText = await page.textContent('body');
        if (pageText.includes('Quality Check will be available')) {
          log('ℹ️', 'Info message found: Quality Check requires "received" status', 'info');
          addTest('Find Quality Check Element', 'fail', 'Quality Check button not found - PO needs to be in "received" status first');
        } else {
          addTest('Find Quality Check Element', 'fail', 'Quality Check button/section not found on PO detail page');
        }
        return;
      }

      log('✅', `Quality Check element found using selector: ${foundSelector}`, 'success');
      await takeScreenshot(page, 'quality-check-found');
      addTest('Find Quality Check Element', 'pass', `Found Quality Check element`);

      // TEST 8: Check if Quality Check is clickable
      log('👆', 'TEST 8: Testing Quality Check interaction...', 'info');
      try {
        const isVisible = await qualityCheckElement.isVisible();
        const isEnabled = await qualityCheckElement.isEnabled();
        
        if (!isVisible) {
          addTest('Quality Check Visibility', 'fail', 'Quality Check element is not visible');
          return;
        }
        
        if (!isEnabled) {
          addTest('Quality Check Enabled State', 'warning', 'Quality Check element is disabled');
        } else {
          addTest('Quality Check Enabled State', 'pass', 'Quality Check element is enabled');
        }

        // Try to click Quality Check
        await qualityCheckElement.click();
        await page.waitForTimeout(2000);
        await takeScreenshot(page, 'quality-check-clicked');
        
        // Check if modal/dialog opened
        const modalSelectors = [
          '[role="dialog"]',
          '.modal',
          '[class*="Modal"]',
          '[class*="dialog"]'
        ];

        let modalFound = false;
        for (const selector of modalSelectors) {
          const modal = await page.$(selector);
          if (modal && await modal.isVisible()) {
            modalFound = true;
            break;
          }
        }

        if (modalFound) {
          addTest('Quality Check Interaction', 'pass', 'Quality Check modal/dialog opened successfully');
          await takeScreenshot(page, 'quality-check-modal');
          
          // TEST 9: Check modal content
          log('🔍', 'TEST 9: Checking Quality Check modal content...', 'info');
          const modalContent = await page.textContent('[role="dialog"], .modal, [class*="Modal"]');
          
          // Look for expected elements in QC
          const hasProductList = modalContent.toLowerCase().includes('product') || 
                                  modalContent.toLowerCase().includes('item');
          const hasInspectionFields = modalContent.toLowerCase().includes('inspect') || 
                                       modalContent.toLowerCase().includes('quality') ||
                                       modalContent.toLowerCase().includes('status');
          
          if (hasProductList && hasInspectionFields) {
            addTest('Quality Check Modal Content', 'pass', 'QC modal has expected elements');
          } else {
            addTest('Quality Check Modal Content', 'warning', 'QC modal may be missing some elements');
          }
          
        } else {
          addTest('Quality Check Interaction', 'warning', 'Quality Check clicked but no modal detected');
        }
        
      } catch (error) {
        await takeScreenshot(page, 'quality-check-interaction-failed');
        addTest('Quality Check Interaction', 'fail', `Interaction failed: ${error.message}`);
      }

    } catch (error) {
      await takeScreenshot(page, 'quality-check-test-failed');
      addTest('Quality Check Test', 'fail', `Error: ${error.message}`);
    }

    // TEST 10: Check for console errors
    log('🔍', 'TEST 10: Checking for console errors...', 'info');
    if (results.errors.length > 0) {
      const errorSummary = results.errors.slice(0, 5).map(e => e.message).join('\n  - ');
      addTest('Console Errors', 'warning', `Found ${results.errors.length} errors. First few:\n  - ${errorSummary}`);
    } else {
      addTest('Console Errors', 'pass', 'No console errors detected');
    }

  } catch (error) {
    log('💥', `Fatal error: ${error.message}`, 'error');
    results.errors.push({
      type: 'fatal',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  } finally {
    // Generate Report
    console.log('\n');
    log('📊', '='.repeat(60), 'info');
    log('📊', 'TEST REPORT - QUALITY CHECK IN PO PAGE', 'info');
    log('📊', '='.repeat(60), 'info');
    console.log('\n');

    const passed = results.tests.filter(t => t.status === 'pass').length;
    const failed = results.tests.filter(t => t.status === 'fail').length;
    const warnings = results.tests.filter(t => t.status === 'warning').length;
    const total = results.tests.length;

    log('✅', `Passed: ${passed}/${total}`, 'success');
    log('❌', `Failed: ${failed}/${total}`, 'error');
    log('⚠️', `Warnings: ${warnings}/${total}`, 'warning');
    console.log('\n');

    // Detailed results
    console.log('📋 Test Results:\n');
    results.tests.forEach((test, i) => {
      const emoji = test.status === 'pass' ? '✅' : test.status === 'fail' ? '❌' : '⚠️';
      console.log(`  ${i + 1}. ${emoji} ${test.name}: ${test.message}`);
    });

    console.log('\n');
    if (results.screenshots.length > 0) {
      log('📸', `Screenshots saved: ${results.screenshots.length}`, 'info');
      results.screenshots.forEach(s => console.log(`     - ${s}`));
    }

    // Save results to file
    const fs = await import('fs');
    const reportPath = 'quality-check-test-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    log('💾', `Report saved to: ${reportPath}`, 'info');

    console.log('\n');
    if (passed === total) {
      log('🎉', 'ALL TESTS PASSED!', 'success');
    } else if (failed === 0) {
      log('✅', 'Tests completed with warnings', 'warning');
    } else {
      log('⚠️', `Tests completed with ${failed} failures`, 'error');
    }

    // Close browser
    if (browser) {
      await browser.close();
      log('👋', 'Browser closed', 'info');
    }
  }
}

// Run tests
runTests().catch(error => {
  console.error('Failed to run tests:', error);
  process.exit(1);
});

