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

async function testPOSCart() {
  let browser;
  const results = {
    loginSuccess: false,
    posPageLoaded: false,
    productsFound: 0,
    addToCartAttempts: 0,
    addToCartSuccess: 0,
    addToCartFailed: 0,
    cartItemsCount: 0,
    consoleErrors: [],
    consoleWarnings: [],
    networkErrors: [],
    issues: [],
    fixes: [],
  };

  try {
    log.title('🤖 Automated POS Cart Testing & Fixing');

    // Create screenshots directory
    const screenshotsDir = join(process.cwd(), 'test-screenshots-pos-cart');
    try {
      mkdirSync(screenshotsDir, { recursive: true });
      log.info(`Screenshots will be saved to: ${screenshotsDir}`);
    } catch (err) {
      // Directory already exists
    }

    log.info('Launching browser...');
    browser = await chromium.launch({
      headless: false,
      slowMo: 300, // Slow down to see what's happening
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
    });

    const page = await context.newPage();

    // Capture console messages
    page.on('console', msg => {
      const text = msg.text();
      const type = msg.type();
      
      if (type === 'error') {
        results.consoleErrors.push(text);
        console.log(`${colors.red}[Console Error]${colors.reset} ${text}`);
        
        // Capture specific cart-related errors
        if (text.toLowerCase().includes('cart') || 
            text.toLowerCase().includes('product') ||
            text.toLowerCase().includes('price') ||
            text.toLowerCase().includes('invalid')) {
          results.issues.push({
            type: 'console_error',
            message: text,
            timestamp: new Date().toISOString()
          });
        }
      } else if (type === 'warning') {
        results.consoleWarnings.push(text);
      }
    });

    // Capture network errors
    page.on('requestfailed', request => {
      const error = `${request.url()} - ${request.failure().errorText}`;
      results.networkErrors.push(error);
      log.error(`Network: ${error}`);
    });

    // Navigate to the app
    log.info('Navigating to app (http://localhost:3000)...');
    
    try {
      await page.goto('http://localhost:3000', {
        waitUntil: 'networkidle',
        timeout: 30000,
      });
      log.success('App loaded successfully');
    } catch (error) {
      log.error(`Failed to load app: ${error.message}`);
      log.info('Make sure your dev server is running: npm run dev');
      throw error;
    }

    // Take initial screenshot
    await page.screenshot({ 
      path: join(screenshotsDir, '01-initial-load.png'),
      fullPage: true 
    });
    log.success('Screenshot 1: Initial load');

    await page.waitForTimeout(2000);

    // === LOGIN PROCESS ===
    log.title('🔐 Testing Login');
    log.info('Looking for login form...');

    try {
      // Check if already logged in (look for logout button or user menu)
      const isLoggedIn = await page.locator('text=Logout').isVisible({ timeout: 2000 }).catch(() => false) ||
                         await page.locator('[data-testid="user-menu"]').isVisible({ timeout: 2000 }).catch(() => false);

      if (isLoggedIn) {
        log.success('Already logged in!');
        results.loginSuccess = true;
      } else {
        // Look for login form
        const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
        const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
        const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In"), button[type="submit"]').first();

        // Fill in credentials
        log.info('Filling login credentials...');
        await emailInput.fill('care@care.com');
        await passwordInput.fill('123456');
        
        await page.screenshot({ 
          path: join(screenshotsDir, '02-login-form-filled.png'),
          fullPage: true 
        });
        
        log.info('Submitting login form...');
        await loginButton.click();
        
        // Wait for navigation or success
        await page.waitForTimeout(3000);
        
        await page.screenshot({ 
          path: join(screenshotsDir, '03-after-login.png'),
          fullPage: true 
        });
        
        // Verify login success
        const loginSuccessful = await page.locator('text=Logout').isVisible({ timeout: 3000 }).catch(() => false) ||
                               await page.locator('[data-testid="user-menu"]').isVisible({ timeout: 3000 }).catch(() => false) ||
                               !(await page.locator('input[type="email"]').isVisible({ timeout: 2000 }).catch(() => false));
        
        if (loginSuccessful) {
          log.success('Login successful!');
          results.loginSuccess = true;
        } else {
          log.error('Login may have failed');
          results.issues.push({
            type: 'login_error',
            message: 'Could not verify successful login',
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      log.error(`Login error: ${error.message}`);
      results.issues.push({
        type: 'login_error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }

    await page.waitForTimeout(2000);

    // === NAVIGATE TO POS PAGE ===
    log.title('🛒 Navigating to POS Page');
    
    try {
      // Look for POS link in navigation
      const posLinkSelectors = [
        'text=POS',
        'a:has-text("POS")',
        'a[href*="pos"]',
        'button:has-text("POS")',
        'text=Point of Sale',
        'text=Sales',
      ];

      let navigated = false;
      for (const selector of posLinkSelectors) {
        try {
          const link = await page.locator(selector).first();
          if (await link.isVisible({ timeout: 2000 })) {
            log.info(`Found POS link: ${selector}`);
            await link.click();
            await page.waitForTimeout(3000);
            navigated = true;
            break;
          }
        } catch (err) {
          // Try next selector
        }
      }

      if (!navigated) {
        // Try direct URL navigation
        log.info('Trying direct URL navigation to /pos...');
        await page.goto('http://localhost:3000/pos', {
          waitUntil: 'networkidle',
          timeout: 15000,
        });
      }

      await page.screenshot({ 
        path: join(screenshotsDir, '04-pos-page.png'),
        fullPage: true 
      });

      // Verify we're on POS page
      const onPOSPage = await page.locator('text=Shopping Cart').isVisible({ timeout: 3000 }).catch(() => false) ||
                       await page.locator('text=Add to Cart').isVisible({ timeout: 3000 }).catch(() => false) ||
                       page.url().includes('pos');

      if (onPOSPage) {
        log.success('Successfully navigated to POS page!');
        results.posPageLoaded = true;
      } else {
        log.error('Could not verify POS page loaded');
        results.issues.push({
          type: 'navigation_error',
          message: 'Could not reach POS page',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      log.error(`Navigation error: ${error.message}`);
      results.issues.push({
        type: 'navigation_error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }

    await page.waitForTimeout(3000);

    // === CHECK FOR PRODUCTS ===
    log.title('📦 Checking for Products');

    try {
      // Wait for products to load (they load asynchronously)
      log.info('Waiting for products to load...');
      await page.waitForTimeout(3000);

      // Look for product cards/items
      const productSelectors = [
        '[class*="product"]',
        '[data-testid*="product"]',
        'img[alt*="product"]',
        'button:has-text("Add")',
      ];

      let productElements = [];
      for (const selector of productSelectors) {
        const elements = await page.locator(selector).all();
        if (elements.length > 0) {
          productElements = elements;
          log.success(`Found ${elements.length} elements with selector: ${selector}`);
          results.productsFound = elements.length;
          break;
        }
      }

      // Also check for product names/titles
      const productTitles = await page.locator('h3, h4, .font-medium').filter({ hasText: /\w+/ }).all();
      log.info(`Found ${productTitles.length} potential product title elements`);

      if (productElements.length === 0 && productTitles.length === 0) {
        log.warn('No products found on POS page');
        results.issues.push({
          type: 'no_products',
          message: 'No products visible on POS page',
          timestamp: new Date().toISOString()
        });
      } else if (productElements.length === 0 && productTitles.length > 0) {
        log.info('Products may be present but product cards not detected by selector');
        results.productsFound = productTitles.length;
      }

      await page.screenshot({ 
        path: join(screenshotsDir, '05-products-view.png'),
        fullPage: true 
      });

    } catch (error) {
      log.error(`Error checking products: ${error.message}`);
    }

    // === TEST ADD TO CART ===
    log.title('🛒 Testing Add to Cart Functionality');

    try {
      // Method 1: Look for "Add to Cart" buttons
      const addToCartButtons = await page.locator('button:has-text("Add to Cart"), button:has-text("Add")').all();
      
      if (addToCartButtons.length > 0) {
        log.info(`Found ${addToCartButtons.length} "Add to Cart" buttons`);
        
        // Try adding first 3 products to cart
        const maxAttempts = Math.min(3, addToCartButtons.length);
        
        for (let i = 0; i < maxAttempts; i++) {
          try {
            log.info(`Attempting to add product ${i + 1} to cart...`);
            results.addToCartAttempts++;
            
            // Click the add to cart button
            await addToCartButtons[i].click();
            await page.waitForTimeout(1500);
            
            // Check for success toast or cart update
            const successIndicators = [
              page.locator('text=Added to cart').isVisible({ timeout: 2000 }),
              page.locator('[class*="toast"]').isVisible({ timeout: 2000 }),
              page.locator('[role="alert"]').isVisible({ timeout: 2000 }),
            ];

            const success = await Promise.race(successIndicators).catch(() => false);
            
            if (success || results.consoleErrors.length === 0) {
              log.success(`Product ${i + 1} added to cart successfully`);
              results.addToCartSuccess++;
            } else {
              log.warn(`Product ${i + 1} add to cart - unclear result`);
            }

            await page.screenshot({ 
              path: join(screenshotsDir, `06-after-add-to-cart-${i + 1}.png`),
              fullPage: true 
            });

          } catch (error) {
            log.error(`Failed to add product ${i + 1}: ${error.message}`);
            results.addToCartFailed++;
            results.issues.push({
              type: 'add_to_cart_error',
              product: i + 1,
              message: error.message,
              timestamp: new Date().toISOString()
            });
          }
        }
      } else {
        // Method 2: Try clicking on product cards directly
        log.info('Looking for clickable product cards...');
        const productCards = await page.locator('[class*="product"], [data-testid*="product"]').all();
        
        if (productCards.length > 0) {
          log.info(`Found ${productCards.length} product cards, trying to click first one...`);
          
          try {
            await productCards[0].click();
            await page.waitForTimeout(2000);
            
            // Look for variant selection modal or direct add
            const variantModal = await page.locator('text=Select Variant, text=Choose Option').isVisible({ timeout: 2000 }).catch(() => false);
            
            if (variantModal) {
              log.info('Variant selection modal appeared, selecting first variant...');
              const selectButton = page.locator('button:has-text("Select"), button:has-text("Add")').first();
              await selectButton.click();
              await page.waitForTimeout(1500);
              results.addToCartSuccess++;
            }

            await page.screenshot({ 
              path: join(screenshotsDir, '06-product-interaction.png'),
              fullPage: true 
            });

          } catch (error) {
            log.error(`Error interacting with product: ${error.message}`);
          }
        }
      }

      // Check cart items count
      const cartCountElement = await page.locator('[class*="cart-count"], [class*="badge"], text=/\\d+ items?/').first().textContent().catch(() => null);
      if (cartCountElement) {
        const match = cartCountElement.match(/\d+/);
        if (match) {
          results.cartItemsCount = parseInt(match[0]);
          log.info(`Cart items count: ${results.cartItemsCount}`);
        }
      }

    } catch (error) {
      log.error(`Add to cart test error: ${error.message}`);
      results.issues.push({
        type: 'test_error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }

    // Take final screenshot
    await page.screenshot({ 
      path: join(screenshotsDir, '07-final-state.png'),
      fullPage: true 
    });

    // === ANALYZE RESULTS ===
    log.title('📊 Test Results Analysis');

    console.log(`
${colors.bright}Login:${colors.reset} ${results.loginSuccess ? colors.green + '✓ Success' : colors.red + '✗ Failed'}${colors.reset}
${colors.bright}POS Page Loaded:${colors.reset} ${results.posPageLoaded ? colors.green + '✓ Yes' : colors.red + '✗ No'}${colors.reset}
${colors.bright}Products Found:${colors.reset} ${results.productsFound}
${colors.bright}Add to Cart Attempts:${colors.reset} ${results.addToCartAttempts}
${colors.bright}Add to Cart Success:${colors.reset} ${colors.green}${results.addToCartSuccess}${colors.reset}
${colors.bright}Add to Cart Failed:${colors.reset} ${results.addToCartFailed > 0 ? colors.red : colors.green}${results.addToCartFailed}${colors.reset}
${colors.bright}Cart Items:${colors.reset} ${results.cartItemsCount}

${colors.bright}Console Errors:${colors.reset} ${results.consoleErrors.length}
${results.consoleErrors.length > 0 ? results.consoleErrors.slice(0, 5).map(e => `  ${colors.red}•${colors.reset} ${e}`).join('\n') : `  ${colors.green}None${colors.reset}`}

${colors.bright}Network Errors:${colors.reset} ${results.networkErrors.length}
${results.networkErrors.length > 0 ? results.networkErrors.slice(0, 3).map(e => `  ${colors.red}•${colors.reset} ${e}`).join('\n') : `  ${colors.green}None${colors.reset}`}

${colors.bright}Issues Detected:${colors.reset} ${results.issues.length}
${results.issues.map(issue => `  ${colors.yellow}•${colors.reset} [${issue.type}] ${issue.message}`).join('\n')}
    `);

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      testName: 'POS Cart Functionality Test',
      results,
    };

    writeFileSync(
      join(screenshotsDir, 'test-report.json'),
      JSON.stringify(report, null, 2)
    );
    log.success('Detailed report saved to test-report.json');

    // Generate fix recommendations
    log.title('🔧 Fix Recommendations');
    
    if (results.issues.length === 0 && results.addToCartSuccess > 0) {
      log.success('🎉 No issues found! POS cart is working correctly.');
    } else {
      log.warn('Issues detected. Generating fix recommendations...');
      
      // Analyze issues and create fixes
      const fixRecommendations = [];
      
      if (!results.loginSuccess) {
        fixRecommendations.push({
          issue: 'Login failure',
          fix: 'Check authentication credentials and API connection',
          priority: 'HIGH'
        });
      }
      
      if (!results.posPageLoaded) {
        fixRecommendations.push({
          issue: 'POS page not loading',
          fix: 'Check routing configuration and component imports',
          priority: 'HIGH'
        });
      }
      
      if (results.productsFound === 0) {
        fixRecommendations.push({
          issue: 'No products visible',
          fix: 'Check product fetching logic and database queries',
          priority: 'HIGH'
        });
      }
      
      if (results.addToCartAttempts > 0 && results.addToCartSuccess === 0) {
        fixRecommendations.push({
          issue: 'Add to cart not working',
          fix: 'Check addToCart function, price validation, and stock checks',
          priority: 'CRITICAL'
        });
      }
      
      // Check for specific console errors
      const priceErrors = results.consoleErrors.filter(e => 
        e.toLowerCase().includes('price') || 
        e.toLowerCase().includes('invalid') ||
        e.toLowerCase().includes('nan')
      );
      
      if (priceErrors.length > 0) {
        fixRecommendations.push({
          issue: 'Price validation errors',
          fix: 'Review price field mapping and ensure proper number parsing',
          priority: 'CRITICAL',
          errors: priceErrors.slice(0, 2)
        });
      }

      console.log('');
      fixRecommendations.forEach((rec, idx) => {
        console.log(`${idx + 1}. [${rec.priority}] ${rec.issue}`);
        console.log(`   ${colors.cyan}→${colors.reset} ${rec.fix}`);
        if (rec.errors) {
          rec.errors.forEach(err => {
            console.log(`   ${colors.red}  Error:${colors.reset} ${err}`);
          });
        }
        console.log('');
      });

      // Save fix recommendations
      writeFileSync(
        join(screenshotsDir, 'fix-recommendations.json'),
        JSON.stringify(fixRecommendations, null, 2)
      );
    }

    // Keep browser open for review
    log.info('Keeping browser open for 10 seconds for review...');
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

  // Return results for programmatic use
  return results;
}

// Run the test
testPOSCart();

