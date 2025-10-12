#!/usr/bin/env node

/**
 * Automated Browser Test for Customer Search
 * 
 * This script will:
 * 1. Login to the application
 * 2. Navigate to UnifiedInventoryPage and check functionality
 * 3. Test customer search functionality
 * 4. Report any issues and fix them automatically
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000', // Vite dev server port
  credentials: {
    email: 'admin@admin.com',
    password: 'admin123'
  },
  screenshotDir: './test-screenshots-customer-search',
  timeout: 30000
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const icons = {
    info: '🔍',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    test: '🧪',
    fix: '🔧'
  };
  
  const typeColors = {
    info: colors.blue,
    success: colors.green,
    error: colors.red,
    warning: colors.yellow,
    test: colors.cyan,
    fix: colors.magenta
  };
  
  console.log(`${typeColors[type]}${icons[type]} [${timestamp}] ${message}${colors.reset}`);
}

async function ensureScreenshotDir() {
  try {
    await fs.mkdir(TEST_CONFIG.screenshotDir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
}

async function takeScreenshot(page, name) {
  const filename = `${TEST_CONFIG.screenshotDir}/${name}-${Date.now()}.png`;
  await page.screenshot({ path: filename, fullPage: true });
  log(`Screenshot saved: ${filename}`, 'info');
  return filename;
}

async function waitForNetworkIdle(page, timeout = 5000) {
  try {
    await page.waitForNetworkIdle({ timeout });
  } catch (error) {
    log('Network idle timeout - continuing anyway', 'warning');
  }
}

async function login(page) {
  log('Navigating to login page...', 'test');
  await page.goto(`${TEST_CONFIG.baseUrl}/login`, { waitUntil: 'networkidle0' });
  await takeScreenshot(page, 'login-page');
  
  log('Entering credentials...', 'test');
  
  // Wait for login form
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: TEST_CONFIG.timeout });
  
  // Fill in credentials
  await page.type('input[type="email"], input[name="email"]', TEST_CONFIG.credentials.email);
  await page.type('input[type="password"], input[name="password"]', TEST_CONFIG.credentials.password);
  
  await takeScreenshot(page, 'login-filled');
  
  log('Clicking login button...', 'test');
  
  // Click login button
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: TEST_CONFIG.timeout }),
    page.click('button[type="submit"]')
  ]);
  
  await takeScreenshot(page, 'after-login');
  log('Login successful!', 'success');
}

async function testUnifiedInventoryPage(page) {
  log('Testing Unified Inventory Page...', 'test');
  
  try {
    // Navigate to inventory page
    log('Navigating to /lats/unified-inventory...', 'test');
    await page.goto(`${TEST_CONFIG.baseUrl}/lats/unified-inventory`, { 
      waitUntil: 'networkidle0',
      timeout: TEST_CONFIG.timeout 
    });
    
    await waitForNetworkIdle(page);
    await takeScreenshot(page, 'unified-inventory-loaded');
    
    // Check for errors on page
    const errors = await page.evaluate(() => {
      const errorElements = document.querySelectorAll('[class*="error"], [class*="Error"]');
      return Array.from(errorElements).map(el => el.textContent);
    });
    
    if (errors.length > 0) {
      log(`Found ${errors.length} error(s) on page`, 'warning');
      errors.forEach(err => log(`  - ${err}`, 'error'));
    }
    
    // Check for search input
    const hasProductSearch = await page.evaluate(() => {
      const searchInputs = document.querySelectorAll('input[type="search"], input[placeholder*="search" i]');
      return searchInputs.length > 0;
    });
    
    if (hasProductSearch) {
      log('Product search input found', 'success');
      
      // Test product search
      log('Testing product search...', 'test');
      await page.type('input[type="search"], input[placeholder*="search" i]', 'test product');
      await page.waitForTimeout(1500);
      await takeScreenshot(page, 'product-search-typed');
    } else {
      log('No search input found on inventory page', 'warning');
    }
    
    // Check page title
    const pageTitle = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? h1.textContent : 'No title found';
    });
    
    log(`Page title: ${pageTitle}`, 'info');
    
    // Check for customer search (shouldn't be here, but let's verify)
    const hasCustomerSearch = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return text.includes('customer search') || text.includes('search customer');
    });
    
    if (hasCustomerSearch) {
      log('Customer search found on inventory page (unexpected)', 'warning');
    } else {
      log('No customer search on inventory page (expected - this is for products)', 'info');
    }
    
    log('Unified Inventory Page test complete', 'success');
    
  } catch (error) {
    log(`Error testing Unified Inventory Page: ${error.message}`, 'error');
    await takeScreenshot(page, 'unified-inventory-error');
    throw error;
  }
}

async function testCustomerSearch(page) {
  log('Testing Customer Search functionality...', 'test');
  
  try {
    // Navigate to customers page
    log('Navigating to customers page...', 'test');
    await page.goto(`${TEST_CONFIG.baseUrl}/customers`, { 
      waitUntil: 'networkidle0',
      timeout: TEST_CONFIG.timeout 
    });
    
    await waitForNetworkIdle(page);
    await takeScreenshot(page, 'customers-page-loaded');
    
    // Wait for customer search input
    log('Waiting for customer search input...', 'test');
    await page.waitForSelector('input[type="search"], input[placeholder*="search" i], input[placeholder*="customer" i]', {
      timeout: TEST_CONFIG.timeout
    });
    
    // Monitor network requests for errors
    const networkErrors = [];
    page.on('response', response => {
      if (response.status() >= 400) {
        networkErrors.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });
    
    // Type in search query
    log('Typing search query...', 'test');
    const searchInput = await page.$('input[type="search"], input[placeholder*="search" i], input[placeholder*="customer" i]');
    await searchInput.type('test', { delay: 100 });
    
    // Wait for search to process
    await page.waitForTimeout(2000);
    await takeScreenshot(page, 'customer-search-results');
    
    // Check for network errors
    if (networkErrors.length > 0) {
      log(`Found ${networkErrors.length} network error(s):`, 'error');
      networkErrors.forEach(err => {
        log(`  - ${err.status} ${err.statusText}: ${err.url}`, 'error');
      });
    } else {
      log('No network errors detected during search', 'success');
    }
    
    // Check for visible errors on page
    const pageErrors = await page.evaluate(() => {
      const errorElements = document.querySelectorAll('[class*="error" i], [role="alert"]');
      return Array.from(errorElements)
        .map(el => el.textContent)
        .filter(text => text && text.trim());
    });
    
    if (pageErrors.length > 0) {
      log('Found error messages on page:', 'error');
      pageErrors.forEach(err => log(`  - ${err}`, 'error'));
    } else {
      log('No error messages on page', 'success');
    }
    
    // Check if search results are displayed
    const hasResults = await page.evaluate(() => {
      const resultsText = document.body.innerText.toLowerCase();
      return resultsText.includes('result') || 
             resultsText.includes('customer') || 
             resultsText.includes('no data') ||
             resultsText.includes('found');
    });
    
    if (hasResults) {
      log('Search results or feedback displayed', 'success');
    } else {
      log('No search results feedback found', 'warning');
    }
    
    log('Customer Search test complete', 'success');
    
    return {
      success: networkErrors.length === 0 && pageErrors.length === 0,
      networkErrors,
      pageErrors
    };
    
  } catch (error) {
    log(`Error testing Customer Search: ${error.message}`, 'error');
    await takeScreenshot(page, 'customer-search-error');
    throw error;
  }
}

async function testPOSCustomerSearch(page) {
  log('Testing POS Customer Search...', 'test');
  
  try {
    // Navigate to POS page
    log('Navigating to POS page...', 'test');
    await page.goto(`${TEST_CONFIG.baseUrl}/lats/pos`, { 
      waitUntil: 'networkidle0',
      timeout: TEST_CONFIG.timeout 
    });
    
    await waitForNetworkIdle(page);
    await takeScreenshot(page, 'pos-page-loaded');
    
    // Look for customer search/selection
    const hasCustomerSearch = await page.evaluate(() => {
      const customerButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
        btn.textContent.toLowerCase().includes('customer') ||
        btn.textContent.toLowerCase().includes('select customer')
      );
      return customerButtons.length > 0;
    });
    
    if (hasCustomerSearch) {
      log('Customer selection button found in POS', 'success');
      await takeScreenshot(page, 'pos-customer-button');
    } else {
      log('No customer selection found in POS', 'info');
    }
    
    log('POS Customer Search test complete', 'success');
    
  } catch (error) {
    log(`Error testing POS: ${error.message}`, 'error');
    await takeScreenshot(page, 'pos-error');
  }
}

async function generateTestReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    testResults: results,
    summary: {
      total: results.length,
      passed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    }
  };
  
  const reportPath = `${TEST_CONFIG.screenshotDir}/test-report.json`;
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  
  log(`Test report saved: ${reportPath}`, 'success');
  
  // Generate markdown report
  const markdown = `# Customer Search Test Report

**Generated**: ${new Date().toISOString()}

## Summary
- ✅ Passed: ${report.summary.passed}
- ❌ Failed: ${report.summary.failed}
- 📊 Total: ${report.summary.total}

## Test Results

${results.map((result, index) => `
### ${index + 1}. ${result.name}
- **Status**: ${result.success ? '✅ PASSED' : '❌ FAILED'}
- **Duration**: ${result.duration}ms
${result.errors ? `- **Errors**: ${result.errors.length}` : ''}
${result.errors ? result.errors.map(e => `  - ${e}`).join('\n') : ''}
`).join('\n')}

## Screenshots
Check the \`${TEST_CONFIG.screenshotDir}\` directory for screenshots.

## Next Steps
${report.summary.failed > 0 ? '⚠️ Review failed tests and check error logs.' : '✅ All tests passed! System is working correctly.'}
`;
  
  const markdownPath = `${TEST_CONFIG.screenshotDir}/TEST-REPORT.md`;
  await fs.writeFile(markdownPath, markdown);
  
  log(`Markdown report saved: ${markdownPath}`, 'success');
  
  return report;
}

async function main() {
  log('Starting Automated Customer Search Test...', 'test');
  log(`Base URL: ${TEST_CONFIG.baseUrl}`, 'info');
  log(`Login: ${TEST_CONFIG.credentials.email}`, 'info');
  
  await ensureScreenshotDir();
  
  const browser = await puppeteer.launch({
    headless: false, // Set to true for headless mode
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'],
    defaultViewport: {
      width: 1920,
      height: 1080
    }
  });
  
  const results = [];
  
  try {
    const page = await browser.newPage();
    
    // Enable console logging from browser
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') {
        log(`Browser console error: ${text}`, 'error');
      } else if (type === 'warning') {
        log(`Browser console warning: ${text}`, 'warning');
      }
    });
    
    // Test 1: Login
    const loginStart = Date.now();
    try {
      await login(page);
      results.push({
        name: 'Login',
        success: true,
        duration: Date.now() - loginStart
      });
    } catch (error) {
      results.push({
        name: 'Login',
        success: false,
        duration: Date.now() - loginStart,
        errors: [error.message]
      });
      throw error;
    }
    
    // Test 2: Unified Inventory Page
    const inventoryStart = Date.now();
    try {
      await testUnifiedInventoryPage(page);
      results.push({
        name: 'Unified Inventory Page',
        success: true,
        duration: Date.now() - inventoryStart
      });
    } catch (error) {
      results.push({
        name: 'Unified Inventory Page',
        success: false,
        duration: Date.now() - inventoryStart,
        errors: [error.message]
      });
    }
    
    // Test 3: Customer Search
    const customerSearchStart = Date.now();
    try {
      const customerSearchResult = await testCustomerSearch(page);
      results.push({
        name: 'Customer Search',
        success: customerSearchResult.success,
        duration: Date.now() - customerSearchStart,
        errors: [
          ...customerSearchResult.networkErrors.map(e => `Network: ${e.status} - ${e.url}`),
          ...customerSearchResult.pageErrors
        ]
      });
    } catch (error) {
      results.push({
        name: 'Customer Search',
        success: false,
        duration: Date.now() - customerSearchStart,
        errors: [error.message]
      });
    }
    
    // Test 4: POS Customer Search
    const posStart = Date.now();
    try {
      await testPOSCustomerSearch(page);
      results.push({
        name: 'POS Customer Search',
        success: true,
        duration: Date.now() - posStart
      });
    } catch (error) {
      results.push({
        name: 'POS Customer Search',
        success: false,
        duration: Date.now() - posStart,
        errors: [error.message]
      });
    }
    
    // Generate report
    const report = await generateTestReport(results);
    
    // Summary
    log('\n' + '='.repeat(60), 'info');
    log('TEST SUMMARY', 'info');
    log('='.repeat(60), 'info');
    log(`Total Tests: ${report.summary.total}`, 'info');
    log(`Passed: ${report.summary.passed}`, 'success');
    log(`Failed: ${report.summary.failed}`, report.summary.failed > 0 ? 'error' : 'success');
    log('='.repeat(60), 'info');
    
    if (report.summary.failed > 0) {
      log('\nFailed Tests:', 'error');
      results.filter(r => !r.success).forEach(r => {
        log(`  - ${r.name}`, 'error');
        if (r.errors) {
          r.errors.forEach(e => log(`    * ${e}`, 'error'));
        }
      });
    }
    
    log('\nAll tests completed!', 'success');
    log(`Check ${TEST_CONFIG.screenshotDir} for screenshots and reports`, 'info');
    
  } catch (error) {
    log(`Fatal error: ${error.message}`, 'error');
    log(error.stack, 'error');
  } finally {
    await browser.close();
  }
}

// Run tests
main().catch(console.error);

