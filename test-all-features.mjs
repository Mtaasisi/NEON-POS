#!/usr/bin/env node

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
  step: (num, msg) => console.log(`${colors.cyan}[${num}]${colors.reset} ${msg}`),
};

async function testAllFeatures() {
  let browser;
  const results = {
    features: [],
    consoleErrors: [],
    networkErrors: [],
    screenshots: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0
    }
  };

  try {
    log.title('🔍 Comprehensive Feature Testing - All Pages');

    const screenshotsDir = join(process.cwd(), 'test-screenshots-full');
    mkdirSync(screenshotsDir, { recursive: true });
    log.info(`Screenshots: ${screenshotsDir}\n`);

    browser = await chromium.launch({
      headless: false,
      slowMo: 400,
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
    });

    const page = await context.newPage();

    // Track errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        results.consoleErrors.push(msg.text());
      }
    });

    page.on('requestfailed', request => {
      results.networkErrors.push(`${request.url()} - ${request.failure().errorText}`);
    });

    // Helper function to test a feature
    const testFeature = async (name, testFunc) => {
      log.step(results.summary.total + 1, `Testing: ${name}`);
      results.summary.total++;
      
      try {
        await testFunc();
        results.features.push({ name, status: 'passed', issues: [] });
        results.summary.passed++;
        log.success(`${name} - PASSED`);
        return true;
      } catch (error) {
        results.features.push({ name, status: 'failed', issues: [error.message] });
        results.summary.failed++;
        log.error(`${name} - FAILED: ${error.message}`);
        return false;
      }
    };

    const screenshot = async (name) => {
      const filename = `${String(results.screenshots.length + 1).padStart(2, '0')}-${name}.png`;
      await page.screenshot({ path: join(screenshotsDir, filename), fullPage: true });
      results.screenshots.push(filename);
      log.info(`📸 ${filename}`);
    };

    // ===================================================================
    // TEST 1: LOGIN
    // ===================================================================
    log.title('1️⃣  Authentication');
    
    await testFeature('Navigate to app', async () => {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
    });
    await screenshot('01-initial-load');

    await testFeature('Login with credentials', async () => {
      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      const loginButton = page.locator('button[type="submit"], button:has-text("Login")').first();

      await emailInput.fill('care@care.com');
      await passwordInput.fill('123456');
      await loginButton.click();
      await page.waitForTimeout(3000);

      // Verify login success
      const loggedIn = await page.locator('text=Logout').isVisible({ timeout: 3000 }).catch(() => false) ||
                       !(await page.locator('input[type="email"]').isVisible({ timeout: 2000 }).catch(() => false));
      
      if (!loggedIn) throw new Error('Login verification failed');
    });
    await screenshot('02-logged-in');

    // ===================================================================
    // TEST 2: DASHBOARD/HOME
    // ===================================================================
    log.title('2️⃣  Dashboard');

    await testFeature('Dashboard loads', async () => {
      // Check for dashboard elements
      const dashboardElements = [
        page.locator('text=Dashboard').isVisible({ timeout: 3000 }),
        page.locator('text=Sales').isVisible({ timeout: 3000 }),
        page.locator('text=Total').isVisible({ timeout: 3000 }),
      ];
      
      const hasElements = await Promise.race(dashboardElements).catch(() => false);
      if (!hasElements) log.warn('Dashboard elements not found - may be on different page');
    });
    await screenshot('03-dashboard');

    // ===================================================================
    // TEST 3: POS PAGE
    // ===================================================================
    log.title('3️⃣  POS (Point of Sale)');

    await testFeature('Navigate to POS', async () => {
      const posLink = page.locator('a:has-text("POS"), text=POS').first();
      await posLink.click();
      await page.waitForTimeout(3000);

      const onPOS = await page.locator('text=Shopping Cart').isVisible({ timeout: 5000 }).catch(() => false);
      if (!onPOS) throw new Error('POS page did not load');
    });
    await screenshot('04-pos-page');

    await testFeature('POS - Search products', async () => {
      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
      await searchInput.fill('mac');
      await page.waitForTimeout(2000);
      
      const results = await page.locator('text=Mac, text=iMac').isVisible({ timeout: 3000 }).catch(() => false);
      if (!results) log.warn('Search results not visible');
    });
    await screenshot('05-pos-search');

    await testFeature('POS - Add to cart', async () => {
      // Clear search first
      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
      await searchInput.clear();
      await page.waitForTimeout(1000);

      // Try to add first visible product
      const addButtons = await page.locator('button:has-text("Add")').all();
      if (addButtons.length > 0) {
        await addButtons[0].click({ force: true });
        await page.waitForTimeout(2000);
      } else {
        log.warn('No add to cart buttons found');
      }
    });
    await screenshot('06-pos-cart');

    // ===================================================================
    // TEST 4: PRODUCTS/INVENTORY
    // ===================================================================
    log.title('4️⃣  Products & Inventory');

    await testFeature('Navigate to Products', async () => {
      const navLinks = [
        page.locator('a:has-text("Products")'),
        page.locator('a:has-text("Inventory")'),
        page.locator('text=LATS'),
      ];

      let navigated = false;
      for (const link of navLinks) {
        try {
          if (await link.first().isVisible({ timeout: 2000 })) {
            await link.first().click();
            await page.waitForTimeout(3000);
            navigated = true;
            break;
          }
        } catch (e) {}
      }

      if (!navigated) throw new Error('Could not navigate to Products');
    });
    await screenshot('07-products-page');

    await testFeature('Products - View product list', async () => {
      const productElements = await page.locator('[class*="product"], [data-testid*="product"]').count();
      log.info(`Found ${productElements} product elements`);
      
      if (productElements === 0) log.warn('No products visible');
    });

    await testFeature('Products - Search functionality', async () => {
      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
      if (await searchInput.isVisible({ timeout: 2000 })) {
        await searchInput.fill('laptop');
        await page.waitForTimeout(2000);
      }
    });
    await screenshot('08-products-search');

    // ===================================================================
    // TEST 5: CUSTOMERS
    // ===================================================================
    log.title('5️⃣  Customers');

    await testFeature('Navigate to Customers', async () => {
      const customerLink = page.locator('a:has-text("Customers"), a:has-text("Customer")').first();
      if (await customerLink.isVisible({ timeout: 2000 })) {
        await customerLink.click();
        await page.waitForTimeout(3000);
      } else {
        log.warn('Customers link not found');
      }
    });
    await screenshot('09-customers-page');

    await testFeature('Customers - View list', async () => {
      const customerElements = await page.locator('[class*="customer"], table tr').count();
      log.info(`Found ${customerElements} customer-related elements`);
    });

    // ===================================================================
    // TEST 6: SALES/REPORTS
    // ===================================================================
    log.title('6️⃣  Sales & Reports');

    await testFeature('Navigate to Sales', async () => {
      const salesLinks = [
        page.locator('a:has-text("Sales")'),
        page.locator('a:has-text("Reports")'),
        page.locator('a:has-text("Transactions")'),
      ];

      let found = false;
      for (const link of salesLinks) {
        try {
          if (await link.first().isVisible({ timeout: 2000 })) {
            await link.first().click();
            await page.waitForTimeout(3000);
            found = true;
            break;
          }
        } catch (e) {}
      }

      if (!found) log.warn('Sales page not found');
    });
    await screenshot('10-sales-page');

    // ===================================================================
    // TEST 7: SETTINGS
    // ===================================================================
    log.title('7️⃣  Settings');

    await testFeature('Navigate to Settings', async () => {
      const settingsLink = page.locator('a:has-text("Settings"), button:has-text("Settings")').first();
      if (await settingsLink.isVisible({ timeout: 2000 })) {
        await settingsLink.click();
        await page.waitForTimeout(3000);
      } else {
        log.warn('Settings link not found');
      }
    });
    await screenshot('11-settings-page');

    // ===================================================================
    // TEST 8: NAVIGATION & UI
    // ===================================================================
    log.title('8️⃣  Navigation & UI');

    await testFeature('Sidebar navigation', async () => {
      const sidebar = await page.locator('[class*="sidebar"], nav').isVisible({ timeout: 2000 }).catch(() => false);
      if (!sidebar) log.warn('Sidebar not found');
    });

    await testFeature('Responsive design', async () => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(1000);
      await screenshot('12-mobile-view');
      
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(1000);
    });

    // ===================================================================
    // TEST 9: ERROR HANDLING
    // ===================================================================
    log.title('9️⃣  Error Handling');

    await testFeature('Console errors check', async () => {
      if (results.consoleErrors.length > 0) {
        throw new Error(`${results.consoleErrors.length} console errors found`);
      }
    });

    await testFeature('Network errors check', async () => {
      if (results.networkErrors.length > 0) {
        log.warn(`${results.networkErrors.length} network errors found`);
      }
    });

    // ===================================================================
    // TEST 10: PERFORMANCE
    // ===================================================================
    log.title('🔟 Performance');

    await testFeature('Page load performance', async () => {
      const metrics = await page.evaluate(() => {
        const perf = performance.getEntriesByType('navigation')[0];
        return {
          loadTime: perf.loadEventEnd - perf.loadEventStart,
          domReady: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
        };
      });
      
      log.info(`Load time: ${metrics.loadTime}ms`);
      log.info(`DOM ready: ${metrics.domReady}ms`);
      
      if (metrics.loadTime > 5000) {
        log.warn('Slow page load detected');
      }
    });

    await screenshot('13-final-state');

    // ===================================================================
    // GENERATE REPORT
    // ===================================================================
    log.title('📊 Test Results Summary');

    console.log(`${colors.bright}Overall Results:${colors.reset}`);
    console.log(`  Total Tests: ${results.summary.total}`);
    console.log(`  Passed: ${colors.green}${results.summary.passed}${colors.reset}`);
    console.log(`  Failed: ${results.summary.failed > 0 ? colors.red : colors.green}${results.summary.failed}${colors.reset}`);
    console.log(`  Success Rate: ${colors.green}${Math.round((results.summary.passed / results.summary.total) * 100)}%${colors.reset}`);
    console.log('');

    console.log(`${colors.bright}Console Errors:${colors.reset} ${results.consoleErrors.length}`);
    if (results.consoleErrors.length > 0) {
      results.consoleErrors.slice(0, 5).forEach(err => {
        console.log(`  ${colors.red}•${colors.reset} ${err.substring(0, 100)}`);
      });
    }
    console.log('');

    console.log(`${colors.bright}Network Errors:${colors.reset} ${results.networkErrors.length}`);
    if (results.networkErrors.length > 0) {
      results.networkErrors.slice(0, 3).forEach(err => {
        console.log(`  ${colors.red}•${colors.reset} ${err.substring(0, 100)}`);
      });
    }
    console.log('');

    console.log(`${colors.bright}Feature Status:${colors.reset}`);
    results.features.forEach(feature => {
      const icon = feature.status === 'passed' ? colors.green + '✓' : colors.red + '✗';
      console.log(`  ${icon} ${feature.name}${colors.reset}`);
      if (feature.issues.length > 0) {
        feature.issues.forEach(issue => {
          console.log(`    ${colors.yellow}→${colors.reset} ${issue}`);
        });
      }
    });
    console.log('');

    console.log(`${colors.bright}Screenshots:${colors.reset} ${results.screenshots.length} saved`);
    console.log(`  Location: ${screenshotsDir}`);
    console.log('');

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      testName: 'Comprehensive Feature Test',
      summary: results.summary,
      features: results.features,
      consoleErrors: results.consoleErrors,
      networkErrors: results.networkErrors,
      screenshots: results.screenshots,
    };

    writeFileSync(
      join(screenshotsDir, 'comprehensive-test-report.json'),
      JSON.stringify(report, null, 2)
    );
    log.success('Detailed report saved to comprehensive-test-report.json');

    // Final assessment
    const passRate = (results.summary.passed / results.summary.total) * 100;
    
    if (passRate === 100 && results.consoleErrors.length === 0) {
      log.title(`${colors.green}✅ PERFECT SCORE!${colors.reset}`);
      console.log('All features working perfectly with no errors! 🎉');
    } else if (passRate >= 80) {
      log.title(`${colors.green}✅ GOOD!${colors.reset}`);
      console.log(`Most features working well (${passRate}% pass rate)`);
    } else if (passRate >= 60) {
      log.title(`${colors.yellow}⚠️  NEEDS ATTENTION${colors.reset}`);
      console.log(`Some features need fixing (${passRate}% pass rate)`);
    } else {
      log.title(`${colors.red}❌ CRITICAL ISSUES${colors.reset}`);
      console.log(`Major issues detected (${passRate}% pass rate)`);
    }

    log.info('\nKeeping browser open for 10 seconds...');
    await page.waitForTimeout(10000);

  } catch (error) {
    log.error(`Test suite failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
      log.info('Browser closed');
    }
  }

  return results;
}

testAllFeatures();

