#!/usr/bin/env node

/**
 * 🔍 VERIFY PRODUCT IN INVENTORY UI
 * ==================================
 * Opens the inventory page and searches for the created product
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const APP_URL = 'http://localhost:5173';
const LOGIN_EMAIL = 'care@care.com';
const LOGIN_PASSWORD = '123456';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

const log = (emoji, message, color = colors.reset) => {
  console.log(`${color}${emoji} ${message}${colors.reset}`);
};

const takeScreenshot = async (page, name) => {
  const screenshotPath = join(__dirname, 'test-screenshots', `${name}-${Date.now()}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  log('📸', `Screenshot: ${name}`, colors.cyan);
  return screenshotPath;
};

async function main() {
  console.log('\n');
  log('🔍', '═══════════════════════════════════════════════', colors.blue);
  log('🔍', '  VERIFYING PRODUCT IN INVENTORY', colors.bright);
  log('🔍', '═══════════════════════════════════════════════', colors.blue);
  console.log('\n');

  let browser;
  let context;
  let page;

  try {
    // Launch Browser
    log('🚀', 'Launching browser...', colors.cyan);
    browser = await chromium.launch({
      headless: false,
      slowMo: 50,
    });

    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });

    page = await context.newPage();
    log('✅', 'Browser ready', colors.green);

    // Navigate and Login
    log('🌐', `Navigating to ${APP_URL}...`, colors.cyan);
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Check if already logged in
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    
    if (currentUrl.includes('/login') || currentUrl === APP_URL + '/') {
      log('🔐', 'Logging in...', colors.cyan);
      
      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      
      await emailInput.fill(LOGIN_EMAIL);
      await passwordInput.fill(LOGIN_PASSWORD);
      
      const loginButton = page.locator('button[type="submit"]').first();
      await loginButton.click();
      
      await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
      log('✅', 'Logged in successfully', colors.green);
    } else {
      log('✅', 'Already logged in', colors.green);
    }

    await page.waitForTimeout(2000);

    // Navigate to Inventory
    log('📦', 'Navigating to inventory...', colors.cyan);
    
    // Try to find inventory/products link
    const inventoryLink = page.locator('a[href*="/lats"], a[href*="/inventory"]').first();
    if (await inventoryLink.count() > 0) {
      await inventoryLink.click();
      await page.waitForTimeout(2000);
    } else {
      await page.goto(`${APP_URL}/lats/inventory`, { waitUntil: 'networkidle' });
    }
    
    log('✅', 'On inventory page', colors.green);
    await takeScreenshot(page, 'inventory-page');

    // Get all products from the page
    log('🔎', 'Scanning for products...', colors.cyan);
    
    // Wait for products to load
    await page.waitForTimeout(3000);
    
    // Try to find product cards or list items
    const productElements = await page.locator('[class*="product"], [data-testid*="product"]').all();
    log('📋', `Found ${productElements.length} product elements`, colors.cyan);

    // Look for "Test Product" specifically
    const testProducts = page.locator('text=/Test Product/i');
    const testProductCount = await testProducts.count();
    
    if (testProductCount > 0) {
      log('✅', `Found ${testProductCount} test product(s)!`, colors.green);
      
      // Highlight and capture the test products
      for (let i = 0; i < Math.min(testProductCount, 5); i++) {
        try {
          const product = testProducts.nth(i);
          await product.scrollIntoViewIfNeeded();
          await page.waitForTimeout(500);
          
          // Get product details if visible
          const productText = await product.textContent();
          log('🎯', `Product ${i + 1}: ${productText.substring(0, 50)}...`, colors.magenta);
        } catch (err) {
          // Continue to next
        }
      }
      
      // Take screenshot with test products visible
      await takeScreenshot(page, 'test-products-found');
      
      // Try to click on first test product to see details
      try {
        log('👆', 'Clicking on first test product...', colors.cyan);
        await testProducts.first().click();
        await page.waitForTimeout(2000);
        await takeScreenshot(page, 'test-product-details');
        log('✅', 'Product details opened', colors.green);
      } catch (err) {
        log('⚠️', 'Could not open product details', colors.yellow);
      }
      
    } else {
      log('⚠️', 'No test products found on current view', colors.yellow);
      
      // Try searching
      log('🔍', 'Trying to search for "Test Product"...', colors.cyan);
      
      const searchInput = page.locator('input[type="search"], input[placeholder*="Search" i]').first();
      if (await searchInput.count() > 0) {
        await searchInput.fill('Test Product');
        await page.waitForTimeout(2000);
        await takeScreenshot(page, 'search-results');
        
        const searchResults = await testProducts.count();
        if (searchResults > 0) {
          log('✅', `Found ${searchResults} test product(s) after search!`, colors.green);
        } else {
          log('⚠️', 'No results found even after search', colors.yellow);
        }
      }
    }

    // Get page content for analysis
    log('📊', 'Analyzing page content...', colors.cyan);
    
    const bodyText = await page.locator('body').textContent();
    const hasTestProduct = bodyText.includes('Test Product');
    
    if (hasTestProduct) {
      log('✅', 'Page contains "Test Product" text', colors.green);
      
      // Count occurrences
      const matches = bodyText.match(/Test Product/gi);
      if (matches) {
        log('📈', `"Test Product" appears ${matches.length} time(s) on page`, colors.cyan);
      }
    } else {
      log('⚠️', 'Page does not contain "Test Product" text', colors.yellow);
    }

    // Take final screenshot
    await takeScreenshot(page, 'inventory-final-view');

    // Summary
    console.log('\n');
    log('📊', '═══════════════════════════════════════════════', colors.magenta);
    log('📊', '  VERIFICATION SUMMARY', colors.bright);
    log('📊', '═══════════════════════════════════════════════', colors.magenta);
    console.log('\n');
    
    if (testProductCount > 0) {
      log('✅', `SUCCESS: Found ${testProductCount} test product(s) in inventory!`, colors.green);
      log('🎉', 'The product was successfully created and is visible!', colors.green);
    } else {
      log('⚠️', 'Test products not immediately visible', colors.yellow);
      log('💡', 'Possible reasons:', colors.cyan);
      log('  ', '- Products may be on a different page/tab', colors.reset);
      log('  ', '- Filters may be hiding the products', colors.reset);
      log('  ', '- Products may be in a different branch', colors.reset);
    }
    
    console.log('\n');
    log('📸', 'Screenshots saved to: test-screenshots/', colors.cyan);
    console.log('\n');

    // Keep browser open to review
    log('⏳', 'Keeping browser open for 10 seconds to review...', colors.yellow);
    await page.waitForTimeout(10000);

  } catch (error) {
    log('💥', `ERROR: ${error.message}`, colors.red);
    console.error(error);
    
    if (page) {
      await takeScreenshot(page, 'error-verification');
    }
    
    throw error;
  } finally {
    if (context) {
      await context.close();
    }
    
    if (browser) {
      await browser.close();
    }
    
    log('✅', 'Browser closed', colors.green);
  }
}

// Run verification
main()
  .then(() => {
    log('✅', 'Verification completed', colors.green);
    process.exit(0);
  })
  .catch((error) => {
    log('❌', 'Verification failed', colors.red);
    console.error(error);
    process.exit(1);
  });

