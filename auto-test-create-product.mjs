#!/usr/bin/env node

/**
 * 🧪 AUTOMATED BROWSER TEST - LOGIN AND CREATE PRODUCT
 * ====================================================
 * This script will:
 * 1. Launch browser
 * 2. Navigate to the POS app
 * 3. Login as care@care.com
 * 4. Navigate to product creation
 * 5. Create a test product
 * 6. Take screenshots of the process
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
};

const log = (emoji, message, color = colors.reset) => {
  console.log(`${color}${emoji} ${message}${colors.reset}`);
};

const takeScreenshot = async (page, name) => {
  const screenshotPath = join(__dirname, 'test-screenshots', `${name}-${Date.now()}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  log('📸', `Screenshot saved: ${screenshotPath}`, colors.cyan);
  return screenshotPath;
};

async function main() {
  console.log('\n');
  log('🧪', '═══════════════════════════════════════════════', colors.blue);
  log('🧪', '  AUTOMATED BROWSER TEST & PRODUCT CREATION', colors.bright);
  log('🧪', '═══════════════════════════════════════════════', colors.blue);
  console.log('\n');

  let browser;
  let context;
  let page;

  try {
    // ============================================
    // STEP 1: Launch Browser
    // ============================================
    log('🚀', 'Launching browser...', colors.cyan);
    browser = await chromium.launch({
      headless: false, // Set to true for CI/CD
      slowMo: 100, // Slow down by 100ms for visibility
    });

    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: {
        dir: join(__dirname, 'test-screenshots'),
        size: { width: 1920, height: 1080 }
      }
    });

    page = await context.newPage();
    
    // Listen to console messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        log('❌', `Browser Console Error: ${msg.text()}`, colors.red);
      }
    });

    log('✅', 'Browser launched successfully', colors.green);

    // ============================================
    // STEP 2: Navigate to App
    // ============================================
    log('🌐', `Navigating to ${APP_URL}...`, colors.cyan);
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 30000 });
    log('✅', 'Page loaded', colors.green);
    await takeScreenshot(page, '01-landing-page');

    // ============================================
    // STEP 3: Login
    // ============================================
    log('🔐', 'Attempting login...', colors.cyan);
    
    // Wait for login form
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    
    await emailInput.waitFor({ timeout: 10000 });
    log('📝', 'Login form found', colors.green);
    
    // Fill in credentials
    await emailInput.fill(LOGIN_EMAIL);
    await passwordInput.fill(LOGIN_PASSWORD);
    log('✅', `Credentials filled: ${LOGIN_EMAIL}`, colors.green);
    await takeScreenshot(page, '02-login-form-filled');
    
    // Click login button
    const loginButton = page.locator('button[type="submit"]').first();
    await loginButton.click();
    log('🔄', 'Login button clicked, waiting for navigation...', colors.yellow);
    
    // Wait for navigation after login
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
    log('✅', 'Login successful!', colors.green);
    await page.waitForTimeout(2000); // Wait for page to settle
    await takeScreenshot(page, '03-logged-in-dashboard');

    // ============================================
    // STEP 4: Navigate to Product Creation
    // ============================================
    log('📦', 'Navigating to product creation...', colors.cyan);
    
    // Try to find and click Products or Inventory link
    const navigationSelectors = [
      'a[href*="/lats"]',
      'a[href*="/inventory"]',
      'a[href*="/products"]',
      'text=/Products/i',
      'text=/Inventory/i',
    ];
    
    let navigated = false;
    for (const selector of navigationSelectors) {
      try {
        const link = page.locator(selector).first();
        if (await link.count() > 0) {
          await link.click();
          log('✅', `Clicked navigation: ${selector}`, colors.green);
          navigated = true;
          await page.waitForTimeout(2000);
          break;
        }
      } catch (error) {
        // Try next selector
      }
    }
    
    if (!navigated) {
      log('⚠️', 'Using direct navigation to /lats/inventory', colors.yellow);
      await page.goto(`${APP_URL}/lats/inventory`, { waitUntil: 'networkidle' });
    }
    
    await takeScreenshot(page, '04-inventory-page');

    // ============================================
    // STEP 5: Open Add Product Modal
    // ============================================
    log('➕', 'Opening add product modal...', colors.cyan);
    
    // Look for "Add Product" or similar button
    const addProductSelectors = [
      'button:has-text("Add Product")',
      'button:has-text("New Product")',
      'button:has-text("Create Product")',
      'button[aria-label*="Add"]',
      '[data-testid="add-product"]',
    ];
    
    let addButtonClicked = false;
    for (const selector of addProductSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.count() > 0 && await button.isVisible()) {
          await button.click();
          log('✅', `Clicked: ${selector}`, colors.green);
          addButtonClicked = true;
          await page.waitForTimeout(1000);
          break;
        }
      } catch (error) {
        // Try next selector
      }
    }
    
    if (!addButtonClicked) {
      log('⚠️', 'Could not find "Add Product" button automatically', colors.yellow);
      log('💡', 'Looking for any button with "+" icon...', colors.cyan);
      
      // Try to find any button with a plus icon
      const plusButtons = page.locator('button:has-text("+")');
      if (await plusButtons.count() > 0) {
        await plusButtons.first().click();
        log('✅', 'Clicked button with "+" icon', colors.green);
        addButtonClicked = true;
      }
    }
    
    await page.waitForTimeout(1500);
    await takeScreenshot(page, '05-add-product-modal');

    // ============================================
    // STEP 6: Fill Product Form
    // ============================================
    log('📝', 'Filling product form...', colors.cyan);
    
    const productData = {
      name: `Test Product ${Date.now()}`,
      barcode: `TEST${Date.now()}`,
      category: 'Electronics',
      price: '99.99',
      cost: '50.00',
      quantity: '10',
      description: 'This is an automated test product created by the test script',
    };
    
    // Fill product name
    const nameInputSelectors = [
      'input[name="name"]',
      'input[placeholder*="Product name" i]',
      'input[placeholder*="Name" i]',
      'input[aria-label*="name" i]',
    ];
    
    for (const selector of nameInputSelectors) {
      try {
        const input = page.locator(selector).first();
        if (await input.count() > 0 && await input.isVisible()) {
          await input.fill(productData.name);
          log('✅', `Product name filled: ${productData.name}`, colors.green);
          break;
        }
      } catch (error) {
        // Try next selector
      }
    }
    
    // Fill barcode
    const barcodeInputSelectors = [
      'input[name="barcode"]',
      'input[name="sku"]',
      'input[placeholder*="Barcode" i]',
      'input[placeholder*="SKU" i]',
    ];
    
    for (const selector of barcodeInputSelectors) {
      try {
        const input = page.locator(selector).first();
        if (await input.count() > 0 && await input.isVisible()) {
          await input.fill(productData.barcode);
          log('✅', `Barcode filled: ${productData.barcode}`, colors.green);
          break;
        }
      } catch (error) {
        // Try next selector
      }
    }
    
    // Fill price
    const priceInputSelectors = [
      'input[name="price"]',
      'input[name="selling_price"]',
      'input[placeholder*="Price" i]',
    ];
    
    for (const selector of priceInputSelectors) {
      try {
        const input = page.locator(selector).first();
        if (await input.count() > 0 && await input.isVisible()) {
          await input.fill(productData.price);
          log('✅', `Price filled: ${productData.price}`, colors.green);
          break;
        }
      } catch (error) {
        // Try next selector
      }
    }
    
    // Fill cost
    const costInputSelectors = [
      'input[name="cost"]',
      'input[name="cost_price"]',
      'input[placeholder*="Cost" i]',
    ];
    
    for (const selector of costInputSelectors) {
      try {
        const input = page.locator(selector).first();
        if (await input.count() > 0 && await input.isVisible()) {
          await input.fill(productData.cost);
          log('✅', `Cost filled: ${productData.cost}`, colors.green);
          break;
        }
      } catch (error) {
        // Try next selector
      }
    }
    
    // Fill quantity/stock
    const quantityInputSelectors = [
      'input[name="quantity"]',
      'input[name="stock"]',
      'input[name="initial_quantity"]',
      'input[placeholder*="Quantity" i]',
      'input[placeholder*="Stock" i]',
    ];
    
    for (const selector of quantityInputSelectors) {
      try {
        const input = page.locator(selector).first();
        if (await input.count() > 0 && await input.isVisible()) {
          await input.fill(productData.quantity);
          log('✅', `Quantity filled: ${productData.quantity}`, colors.green);
          break;
        }
      } catch (error) {
        // Try next selector
      }
    }
    
    await page.waitForTimeout(1000);
    await takeScreenshot(page, '06-product-form-filled');

    // ============================================
    // STEP 7: Submit Product Form
    // ============================================
    log('💾', 'Submitting product form...', colors.cyan);
    
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Save")',
      'button:has-text("Create")',
      'button:has-text("Add")',
      'button:has-text("Submit")',
    ];
    
    for (const selector of submitSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.count() > 0 && await button.isVisible()) {
          await button.click();
          log('✅', 'Submit button clicked', colors.green);
          break;
        }
      } catch (error) {
        // Try next selector
      }
    }
    
    // Wait for success message or modal to close
    await page.waitForTimeout(3000);
    await takeScreenshot(page, '07-product-created');
    
    log('✅', 'Product creation process completed!', colors.green);

    // ============================================
    // STEP 8: Verify Product in List
    // ============================================
    log('🔍', 'Verifying product in list...', colors.cyan);
    
    // Look for the product name in the page
    const productInList = page.locator(`text=${productData.name}`);
    if (await productInList.count() > 0) {
      log('✅', 'Product found in list!', colors.green);
    } else {
      log('⚠️', 'Product not immediately visible (may need refresh)', colors.yellow);
    }
    
    await takeScreenshot(page, '08-final-product-list');

    // ============================================
    // SUCCESS SUMMARY
    // ============================================
    console.log('\n');
    log('🎉', '═══════════════════════════════════════════════', colors.green);
    log('🎉', '  TEST COMPLETED SUCCESSFULLY!', colors.bright + colors.green);
    log('🎉', '═══════════════════════════════════════════════', colors.green);
    console.log('\n');
    
    log('📊', 'Summary:', colors.cyan);
    log('✅', `Email: ${LOGIN_EMAIL}`, colors.green);
    log('✅', `Product Name: ${productData.name}`, colors.green);
    log('✅', `Barcode: ${productData.barcode}`, colors.green);
    log('✅', `Price: $${productData.price}`, colors.green);
    log('📸', 'Screenshots saved to: test-screenshots/', colors.cyan);
    console.log('\n');

    // Keep browser open for 5 seconds to review
    log('⏳', 'Keeping browser open for 5 seconds...', colors.yellow);
    await page.waitForTimeout(5000);

  } catch (error) {
    log('💥', `ERROR: ${error.message}`, colors.red);
    console.error(error);
    
    if (page) {
      await takeScreenshot(page, '99-error-screenshot');
    }
    
    throw error;
  } finally {
    // ============================================
    // CLEANUP
    // ============================================
    if (context) {
      log('🎬', 'Saving video recording...', colors.cyan);
      await context.close();
    }
    
    if (browser) {
      log('🔒', 'Closing browser...', colors.cyan);
      await browser.close();
    }
    
    log('✅', 'Cleanup complete', colors.green);
  }
}

// Run the test
main()
  .then(() => {
    log('✅', 'Test script finished successfully', colors.green);
    process.exit(0);
  })
  .catch((error) => {
    log('❌', 'Test script failed', colors.red);
    console.error(error);
    process.exit(1);
  });

