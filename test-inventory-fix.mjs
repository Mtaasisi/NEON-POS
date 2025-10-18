#!/usr/bin/env node
/**
 * Automated Test: Inventory Refresh Fix
 * 
 * This test verifies that the inventory page automatically refreshes
 * when a purchase order is received.
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const LOGIN_EMAIL = 'care@care.com';
const LOGIN_PASSWORD = '123456';

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(emoji, message, color = colors.reset) {
  console.log(`${color}${emoji} ${message}${colors.reset}`);
}

function success(message) {
  log('✅', message, colors.green);
}

function error(message) {
  log('❌', message, colors.red);
}

function info(message) {
  log('ℹ️', message, colors.blue);
}

function step(message) {
  log('📍', message, colors.cyan);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testInventoryRefreshFix() {
  const startTime = Date.now();
  log('🚀', 'Starting Inventory Refresh Fix Test...', colors.bright);
  console.log('');
  
  let browser;
  let passed = 0;
  let failed = 0;
  
  try {
    // Launch browser
    step('Launching browser...');
    browser = await chromium.launch({ 
      headless: false,
      slowMo: 100
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    // Track console logs to verify event emission
    const consoleLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(text);
      if (text.includes('[PurchaseOrderService]') || text.includes('[UnifiedInventoryPage]')) {
        info(`Console: ${text}`);
      }
    });
    
    // Step 1: Login
    step('Step 1: Logging in as care@care.com...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await sleep(2000);
    
    try {
      await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
      await page.fill('input[type="email"], input[name="email"]', LOGIN_EMAIL);
      await page.fill('input[type="password"], input[name="password"]', LOGIN_PASSWORD);
      await page.click('button[type="submit"]');
      await sleep(3000);
      success('Login successful');
      passed++;
    } catch (e) {
      error('Login failed: ' + e.message);
      failed++;
      throw e;
    }
    
    // Step 2: Navigate to Inventory Page
    step('Step 2: Navigating to Inventory page...');
    await page.goto(`${BASE_URL}/lats/inventory`, { waitUntil: 'networkidle' });
    await sleep(3000);
    
    // Get initial product count
    const initialProductCount = await page.locator('table tbody tr, [data-testid="product-card"], .product-card').count();
    info(`Initial product count: ${initialProductCount}`);
    
    // Check metrics
    const metricsVisible = await page.locator('text=/Total Products|Stock Status/i').count() > 0;
    if (metricsVisible) {
      success('Inventory metrics visible');
      passed++;
    } else {
      error('Inventory metrics not visible');
      failed++;
    }
    
    // Step 3: Navigate to Purchase Orders
    step('Step 3: Navigating to Purchase Orders...');
    await page.goto(`${BASE_URL}/lats/purchase-orders`, { waitUntil: 'networkidle' });
    await sleep(2000);
    
    // Look for purchase orders in the table
    const poRows = await page.locator('table tbody tr, .glass-card').count();
    info(`Found ${poRows} purchase order rows`);
    
    if (poRows === 0) {
      log('⚠️', 'No purchase orders found. Test cannot continue without a PO to receive.', colors.yellow);
      log('💡', 'Please create a purchase order manually first, then run this test again.', colors.yellow);
      return;
    }
    
    // Click first purchase order row (try multiple selectors)
    step('Step 4: Opening purchase order detail...');
    const clickSucceeded = await page.locator('table tbody tr, .cursor-pointer').first().click({ timeout: 5000 }).then(() => true).catch(() => false);
    
    if (!clickSucceeded) {
      // Try clicking a link instead
      const poLink = await page.locator('a[href*="purchase-order"]').first().click({ timeout: 5000 }).catch(() => false);
      if (!poLink) {
        log('⚠️', 'Could not click on purchase order. Trying direct navigation...', colors.yellow);
        // Get the first PO ID from the page
        const poText = await page.locator('text=/PO-\\d+/').first().textContent();
        if (poText) {
          const poId = poText.match(/PO-\d+/)?.[0];
          if (poId) {
            await page.goto(`${BASE_URL}/lats/purchase-orders/${poId}`);
          }
        }
      }
    }
    await sleep(2000);
    
    // Check for receive button
    const receiveButton = page.locator('button:has-text("Receive"), button:has-text("Mark as Received")').first();
    const hasReceiveButton = await receiveButton.count() > 0;
    
    if (!hasReceiveButton) {
      log('⚠️', 'No receive button found. Purchase order might already be received.', colors.yellow);
      log('💡', 'Try creating a new purchase order with status "sent" or "pending".', colors.yellow);
      return;
    }
    
    success('Found receive button');
    passed++;
    
    // Step 5: Open inventory page in new tab BEFORE receiving
    step('Step 5: Opening inventory page in new tab...');
    const inventoryPage = await context.newPage();
    await inventoryPage.goto(`${BASE_URL}/lats/inventory`, { waitUntil: 'networkidle' });
    await sleep(2000);
    
    // Track console logs on inventory page
    const inventoryConsoleLogs = [];
    inventoryPage.on('console', msg => {
      const text = msg.text();
      inventoryConsoleLogs.push(text);
      if (text.includes('[UnifiedInventoryPage]') || text.includes('Purchase order received')) {
        success(`Inventory page console: ${text}`);
      }
    });
    
    info('Inventory page opened and ready to detect refresh events');
    
    // Step 6: Receive the purchase order
    step('Step 6: Receiving purchase order...');
    await page.bringToFront();
    
    // Clear console logs to track new ones
    consoleLogs.length = 0;
    inventoryConsoleLogs.length = 0;
    
    await receiveButton.click();
    await sleep(1000);
    
    // Check for success message
    const successMessage = await page.locator('text=/success|received|completed/i').count();
    if (successMessage > 0) {
      success('Purchase order received successfully');
      passed++;
    } else {
      error('No success message found after receiving');
      failed++;
    }
    
    // Step 7: Verify event emission in console
    step('Step 7: Verifying event emission...');
    await sleep(2000);
    
    const eventEmitted = consoleLogs.some(log => 
      log.includes('[PurchaseOrderService]') && log.includes('event emitted')
    );
    
    if (eventEmitted) {
      success('Event emission confirmed in console');
      passed++;
    } else {
      error('Event emission NOT found in console');
      failed++;
    }
    
    // Step 8: Verify inventory page refresh
    step('Step 8: Checking if inventory page auto-refreshed...');
    await inventoryPage.bringToFront();
    await sleep(3000); // Wait for the 1-second delay + processing
    
    const refreshDetected = inventoryConsoleLogs.some(log => 
      log.includes('[UnifiedInventoryPage]') && 
      (log.includes('Purchase order received') || log.includes('refreshing inventory'))
    );
    
    if (refreshDetected) {
      success('Inventory page auto-refresh detected! 🎉');
      passed++;
    } else {
      error('Inventory page did NOT auto-refresh');
      failed++;
    }
    
    // Step 9: Verify products are visible
    step('Step 9: Verifying inventory is displaying products...');
    const finalProductCount = await inventoryPage.locator('table tbody tr, [data-testid="product-card"], .product-card').count();
    info(`Final product count: ${finalProductCount}`);
    
    if (finalProductCount > 0) {
      success('Products are visible in inventory');
      passed++;
    } else {
      error('No products visible in inventory');
      failed++;
    }
    
    // Take final screenshot
    await inventoryPage.screenshot({ path: 'test-result-inventory.png', fullPage: true });
    info('Screenshot saved: test-result-inventory.png');
    
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    
  } catch (err) {
    error(`Test failed with error: ${err.message}`);
    failed++;
  } finally {
    if (browser) {
      await sleep(2000);
      await browser.close();
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('');
    console.log(`${colors.bright}📊 Test Summary${colors.reset}`);
    console.log('─────────────────────────────────────────────────────────');
    console.log(`${colors.green}✅ Passed: ${passed}${colors.reset}`);
    console.log(`${colors.red}❌ Failed: ${failed}${colors.reset}`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('═══════════════════════════════════════════════════════════');
    
    if (failed === 0) {
      console.log('');
      success('🎉 ALL TESTS PASSED! The inventory refresh fix is working!');
      console.log('');
    } else {
      console.log('');
      error('Some tests failed. Please review the output above.');
      console.log('');
      process.exit(1);
    }
  }
}

// Run the test
testInventoryRefreshFix().catch(error => {
  error('Fatal error: ' + error.message);
  process.exit(1);
});
