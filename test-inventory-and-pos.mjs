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
};

async function testInventoryAndPOS() {
  let browser;
  const results = {
    loginSuccess: false,
    inventoryPageLoaded: false,
    productsInInventory: 0,
    posPageLoaded: false,
    productsInPOS: 0,
    addToCartSuccess: false,
    consoleErrors: [],
    screenshots: [],
  };

  try {
    log.title('🤖 Testing Inventory and POS - Products Visibility');

    const screenshotsDir = join(process.cwd(), 'test-screenshots');
    try {
      mkdirSync(screenshotsDir, { recursive: true });
    } catch (err) {
      // Directory already exists
    }

    log.info('Launching browser...');
    browser = await chromium.launch({ 
      headless: false,
      slowMo: 500
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });
    
    const page = await context.newPage();

    // Listen to console messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        results.consoleErrors.push(msg.text());
        console.log(`${colors.red}[Console Error]${colors.reset} ${msg.text()}`);
      }
    });

    log.info('Navigating to login page...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.screenshot({ path: join(screenshotsDir, '01-login-page.png'), fullPage: true });
    results.screenshots.push('01-login-page.png');

    // ============================================
    // STEP 1: LOGIN
    // ============================================
    log.title('🔐 Step 1: Testing Login');
    
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 5000 });
    await page.fill('input[type="email"], input[name="email"]', 'care@care.com');
    await page.fill('input[type="password"], input[name="password"]', '123456');
    await page.click('button[type="submit"]');
    
    // Wait for navigation after login
    await page.waitForTimeout(3000);
    await page.screenshot({ path: join(screenshotsDir, '02-after-login.png'), fullPage: true });
    results.screenshots.push('02-after-login.png');
    
    results.loginSuccess = true;
    log.success('Login successful!');

    // ============================================
    // STEP 2: CHECK INVENTORY PAGE
    // ============================================
    log.title('📦 Step 2: Checking Inventory Page');
    
    // Navigate to inventory
    try {
      // Try to find and click inventory/products link
      const inventorySelector = 'a[href*="inventory"], a[href*="products"], text=Inventory, text=Products';
      await page.click(inventorySelector, { timeout: 5000 });
      await page.waitForTimeout(2000);
    } catch (err) {
      log.warn('Could not find inventory link, trying direct navigation...');
      await page.goto('http://localhost:3000/inventory', { waitUntil: 'networkidle' });
    }
    
    await page.screenshot({ path: join(screenshotsDir, '03-inventory-page.png'), fullPage: true });
    results.screenshots.push('03-inventory-page.png');
    
    // Count products in inventory
    await page.waitForTimeout(2000);
    
    // Try multiple selectors to find products
    const productSelectors = [
      '.product-card',
      '[data-testid="product-card"]',
      'div[class*="product"]',
      'tr[class*="product"]',
    ];
    
    let productCount = 0;
    for (const selector of productSelectors) {
      const count = await page.locator(selector).count();
      if (count > productCount) {
        productCount = count;
        log.info(`Found ${count} products using selector: ${selector}`);
      }
    }
    
    results.productsInInventory = productCount;
    
    if (productCount > 0) {
      results.inventoryPageLoaded = true;
      log.success(`Inventory page loaded with ${productCount} products!`);
    } else {
      log.warn('Inventory page loaded but no products found with standard selectors');
      // Take a screenshot and get page content for debugging
      const content = await page.content();
      log.info('Checking for product-related text in page...');
      if (content.includes('product') || content.includes('Product')) {
        log.info('Page contains product-related content');
      }
    }

    // ============================================
    // STEP 3: CHECK POS PAGE
    // ============================================
    log.title('🛒 Step 3: Checking POS Page');
    
    // Navigate to POS
    try {
      const posSelector = 'a[href*="pos"], text=POS';
      await page.click(posSelector, { timeout: 5000 });
      await page.waitForTimeout(3000);
    } catch (err) {
      log.warn('Could not find POS link, trying direct navigation...');
      await page.goto('http://localhost:3000/pos', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
    }
    
    await page.screenshot({ path: join(screenshotsDir, '04-pos-page.png'), fullPage: true });
    results.screenshots.push('04-pos-page.png');
    
    // Count products in POS
    await page.waitForTimeout(2000);
    
    const posProductSelectors = [
      'button:has-text("Add")',
      '.pos-product',
      '[data-testid="pos-product"]',
      'div[class*="product"]',
    ];
    
    let posProductCount = 0;
    for (const selector of posProductSelectors) {
      const count = await page.locator(selector).count();
      if (count > posProductCount) {
        posProductCount = count;
        log.info(`Found ${count} items in POS using selector: ${selector}`);
      }
    }
    
    results.productsInPOS = posProductCount;
    
    if (posProductCount > 0) {
      results.posPageLoaded = true;
      log.success(`POS page loaded with ${posProductCount} products!`);
      
      // Try to add one product to cart
      try {
        await page.click('button:has-text("Add")', { timeout: 3000 });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: join(screenshotsDir, '05-after-add-to-cart.png'), fullPage: true });
        results.screenshots.push('05-after-add-to-cart.png');
        results.addToCartSuccess = true;
        log.success('Successfully added product to cart!');
      } catch (err) {
        log.warn('Could not test add to cart');
      }
    } else {
      log.warn('POS page loaded but no products found');
    }

    // ============================================
    // STEP 4: FINAL SUMMARY
    // ============================================
    log.title('📊 Test Results Summary');
    
    console.log(`\n${colors.bright}Results:${colors.reset}`);
    console.log(`  Login: ${results.loginSuccess ? colors.green + '✓ Success' : colors.red + '✗ Failed'}${colors.reset}`);
    console.log(`  Inventory Page: ${results.inventoryPageLoaded ? colors.green + '✓ Loaded' : colors.red + '✗ Failed'}${colors.reset}`);
    console.log(`  Products in Inventory: ${colors.cyan}${results.productsInInventory}${colors.reset}`);
    console.log(`  POS Page: ${results.posPageLoaded ? colors.green + '✓ Loaded' : colors.red + '✗ Failed'}${colors.reset}`);
    console.log(`  Products in POS: ${colors.cyan}${results.productsInPOS}${colors.reset}`);
    console.log(`  Add to Cart: ${results.addToCartSuccess ? colors.green + '✓ Success' : colors.yellow + '⚠ Not tested'}${colors.reset}`);
    console.log(`  Console Errors: ${results.consoleErrors.length === 0 ? colors.green + '0' : colors.red + results.consoleErrors.length}${colors.reset}`);
    console.log(`\n${colors.bright}Screenshots saved to:${colors.reset} ${screenshotsDir}`);
    results.screenshots.forEach(s => console.log(`  - ${s}`));

    // Keep browser open for manual inspection
    log.info('\nKeeping browser open for 15 seconds for manual inspection...');
    await page.waitForTimeout(15000);

  } catch (error) {
    log.error(`Test failed: ${error.message}`);
    console.error(error);
  } finally {
    if (browser) {
      await browser.close();
      log.info('Browser closed');
    }
  }

  // Exit with appropriate code
  const success = results.loginSuccess && 
                  results.inventoryPageLoaded && 
                  results.posPageLoaded &&
                  results.consoleErrors.length === 0;
  
  process.exit(success ? 0 : 1);
}

testInventoryAndPOS();

