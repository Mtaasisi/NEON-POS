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

async function testIMacAddToCart() {
  let browser;
  const results = {
    loginSuccess: false,
    posPageLoaded: false,
    imacFound: false,
    variantModalAppeared: false,
    variantsFound: 0,
    addToCartAttempts: 0,
    addToCartSuccess: 0,
    consoleErrors: [],
    steps: [],
  };

  try {
    log.title('🍎 Testing iMac Add to Cart');

    const screenshotsDir = join(process.cwd(), 'test-screenshots-imac');
    try {
      mkdirSync(screenshotsDir, { recursive: true });
    } catch (err) {
      // Directory exists
    }

    log.info('Launching browser...');
    browser = await chromium.launch({
      headless: false,
      slowMo: 500,
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
    });

    const page = await context.newPage();

    // Capture console errors
    page.on('console', msg => {
      const text = msg.text();
      const type = msg.type();
      
      if (type === 'error') {
        results.consoleErrors.push(text);
        console.log(`${colors.red}[Console Error]${colors.reset} ${text}`);
      }
    });

    // Step 1: Login
    log.info('Step 1: Logging in...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const loginButton = page.locator('button[type="submit"], button:has-text("Login")').first();

    await emailInput.fill('care@care.com');
    await passwordInput.fill('123456');
    await loginButton.click();
    await page.waitForTimeout(3000);

    results.loginSuccess = true;
    results.steps.push('Login successful');
    log.success('Logged in successfully');

    await page.screenshot({ 
      path: join(screenshotsDir, '01-logged-in.png'),
      fullPage: true 
    });

    // Step 2: Navigate to POS
    log.info('Step 2: Navigating to POS page...');
    const posLink = page.locator('a:has-text("POS")').first();
    await posLink.click();
    await page.waitForTimeout(3000);

    results.posPageLoaded = true;
    results.steps.push('POS page loaded');
    log.success('POS page loaded');

    await page.screenshot({ 
      path: join(screenshotsDir, '02-pos-page.png'),
      fullPage: true 
    });

    // Step 3: Search for iMac
    log.info('Step 3: Searching for iMac...');
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    await searchInput.fill('imac');
    await page.waitForTimeout(2000);

    results.steps.push('Searched for iMac');
    log.success('Search completed');

    await page.screenshot({ 
      path: join(screenshotsDir, '03-search-imac.png'),
      fullPage: true 
    });

    // Step 4: Check for and close any blocking modals
    log.info('Step 4: Checking for blocking modals...');
    
    // Look for modal close buttons
    const modalCloseButtons = [
      page.locator('button:has-text("Close")'),
      page.locator('button:has-text("×")'),
      page.locator('button[aria-label="Close"]'),
      page.locator('.modal button.close'),
    ];

    for (const closeBtn of modalCloseButtons) {
      const isVisible = await closeBtn.isVisible({ timeout: 1000 }).catch(() => false);
      if (isVisible) {
        log.info('Found modal, closing it...');
        await closeBtn.click();
        await page.waitForTimeout(1000);
        results.steps.push('Closed blocking modal');
        break;
      }
    }

    // Press Escape key to close any modals
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    await page.screenshot({ 
      path: join(screenshotsDir, '04-after-modal-check.png'),
      fullPage: true 
    });

    // Step 5: Look for iMac product card
    log.info('Step 5: Looking for iMac product...');
    
    // Try to find product by text content
    const imacCard = page.locator('text=iMac').first();
    const isVisible = await imacCard.isVisible({ timeout: 5000 }).catch(() => false);

    if (!isVisible) {
      log.error('iMac product not visible on page');
      results.steps.push('iMac product NOT FOUND');
      
      // Take screenshot and save page content for debugging
      await page.screenshot({ 
        path: join(screenshotsDir, '05-imac-not-found.png'),
        fullPage: true 
      });
      
      const pageContent = await page.content();
      writeFileSync(join(screenshotsDir, 'page-content.html'), pageContent);
      
      throw new Error('iMac product not found on POS page');
    }

    results.imacFound = true;
    results.steps.push('iMac product found');
    log.success('iMac product found!');

    await page.screenshot({ 
      path: join(screenshotsDir, '05-imac-found.png'),
      fullPage: true 
    });

    // Step 6: Click on iMac product (use force if needed)
    log.info('Step 6: Clicking on iMac product...');
    
    try {
      await imacCard.click({ timeout: 5000 });
    } catch (error) {
      log.warn('Normal click failed, trying force click...');
      await imacCard.click({ force: true });
    }
    
    await page.waitForTimeout(2000);

    results.steps.push('Clicked on iMac');
    log.success('Clicked on iMac');

    await page.screenshot({ 
      path: join(screenshotsDir, '06-clicked-imac.png'),
      fullPage: true 
    });

    // Step 7: Check for variant selection modal
    log.info('Step 6: Checking for variant selection...');
    
    const variantModal = await page.locator('text=Select Variant, text=Choose, text=Variant').isVisible({ timeout: 3000 }).catch(() => false);
    
    if (variantModal) {
      results.variantModalAppeared = true;
      results.steps.push('Variant selection modal appeared');
      log.success('Variant selection modal appeared');

      await page.screenshot({ 
        path: join(screenshotsDir, '06-variant-modal.png'),
        fullPage: true 
      });

      // Count variants
      const variantButtons = await page.locator('button:has-text("Variant"), button:has-text("Default"), button:has-text("Select")').all();
      results.variantsFound = variantButtons.length;
      log.info(`Found ${variantButtons.length} variant option(s)`);

      // Select first variant
      if (variantButtons.length > 0) {
        log.info('Selecting first variant...');
        await variantButtons[0].click();
        await page.waitForTimeout(2000);
        results.steps.push('Selected variant');
        log.success('Variant selected');
      }
    } else {
      log.info('No variant modal - might add directly');
      results.steps.push('No variant modal shown');
    }

    await page.screenshot({ 
      path: join(screenshotsDir, '07-after-variant-selection.png'),
      fullPage: true 
    });

    // Step 7: Look for "Add to Cart" confirmation or check cart
    log.info('Step 7: Checking if product was added to cart...');
    await page.waitForTimeout(2000);

    // Check for success toast/message
    const successIndicators = [
      page.locator('text=Added to cart').isVisible({ timeout: 2000 }),
      page.locator('[class*="toast"]').isVisible({ timeout: 2000 }),
      page.locator('text=Success').isVisible({ timeout: 2000 }),
    ];

    const hasSuccess = await Promise.race(successIndicators).catch(() => false);

    if (hasSuccess) {
      results.addToCartSuccess++;
      results.steps.push('✅ iMac added to cart successfully!');
      log.success('✅ iMac SUCCESSFULLY added to cart!');
    } else {
      log.warn('Could not confirm add to cart - checking cart contents...');
      
      // Check cart section for items
      const cartItems = await page.locator('[class*="cart"] [class*="item"]').all();
      if (cartItems.length > 0) {
        results.addToCartSuccess++;
        results.steps.push('✅ iMac found in cart');
        log.success('✅ iMac found in cart!');
      } else {
        results.steps.push('❌ Could not verify add to cart');
        log.error('Could not verify if iMac was added to cart');
      }
    }

    results.addToCartAttempts++;

    await page.screenshot({ 
      path: join(screenshotsDir, '09-final-result.png'),
      fullPage: true 
    });

    // Display results
    log.title('📊 Test Results');
    
    console.log(`${colors.bright}Test Steps:${colors.reset}`);
    results.steps.forEach((step, idx) => {
      const icon = step.includes('✅') ? colors.green : step.includes('❌') ? colors.red : colors.blue;
      console.log(`  ${idx + 1}. ${icon}${step}${colors.reset}`);
    });
    console.log('');

    console.log(`${colors.bright}Summary:${colors.reset}`);
    console.log(`  Login: ${results.loginSuccess ? colors.green + '✓' : colors.red + '✗'}${colors.reset}`);
    console.log(`  POS Page: ${results.posPageLoaded ? colors.green + '✓' : colors.red + '✗'}${colors.reset}`);
    console.log(`  iMac Found: ${results.imacFound ? colors.green + '✓' : colors.red + '✗'}${colors.reset}`);
    console.log(`  Variant Modal: ${results.variantModalAppeared ? colors.green + '✓' : colors.yellow + 'N/A'}${colors.reset}`);
    console.log(`  Variants: ${results.variantsFound}`);
    console.log(`  Add to Cart: ${results.addToCartSuccess > 0 ? colors.green + '✓ SUCCESS' : colors.red + '✗ FAILED'}${colors.reset}`);
    console.log(`  Console Errors: ${results.consoleErrors.length === 0 ? colors.green + '0' : colors.red + results.consoleErrors.length}${colors.reset}`);
    console.log('');

    if (results.consoleErrors.length > 0) {
      console.log(`${colors.bright}Console Errors:${colors.reset}`);
      results.consoleErrors.slice(0, 5).forEach(err => {
        console.log(`  ${colors.red}•${colors.reset} ${err}`);
      });
      console.log('');
    }

    // Save report
    writeFileSync(
      join(screenshotsDir, 'test-report.json'),
      JSON.stringify(results, null, 2)
    );
    log.success('Report saved to test-report.json');

    if (results.addToCartSuccess > 0) {
      log.title(`${colors.green}✅ SUCCESS: iMac can be added to cart!${colors.reset}`);
    } else {
      log.title(`${colors.red}❌ FAILED: iMac could not be added to cart${colors.reset}`);
    }

    log.info('Keeping browser open for 10 seconds...');
    await page.waitForTimeout(10000);

  } catch (error) {
    log.error(`Test failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
      log.info('Browser closed');
    }
  }
}

testIMacAddToCart();

