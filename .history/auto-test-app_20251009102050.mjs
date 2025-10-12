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

async function testApp() {
  let browser;
  const results = {
    consoleErrors: [],
    consoleWarnings: [],
    consoleInfo: [],
    imagesFound: 0,
    imagesFailed: 0,
    networkErrors: [],
  };

  try {
    log.title('🤖 Automated App Testing - Products & Console');

    // Create screenshots directory
    const screenshotsDir = join(process.cwd(), 'test-screenshots');
    try {
      mkdirSync(screenshotsDir, { recursive: true });
      log.info(`Screenshots will be saved to: ${screenshotsDir}`);
    } catch (err) {
      // Directory already exists
    }

    log.info('Launching browser...');
    browser = await chromium.launch({
      headless: false, // Set to false to see what's happening
      slowMo: 100, // Slow down actions for visibility
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
      } else if (type === 'warning') {
        results.consoleWarnings.push(text);
        console.log(`${colors.yellow}[Console Warning]${colors.reset} ${text}`);
      } else if (type === 'log' && (text.includes('Error') || text.includes('❌'))) {
        results.consoleErrors.push(text);
        console.log(`${colors.red}[Console Log Error]${colors.reset} ${text}`);
      }
    });

    // Capture network errors
    page.on('requestfailed', request => {
      const error = `${request.url()} - ${request.failure().errorText}`;
      results.networkErrors.push(error);
      log.error(`Network: ${error}`);
    });

    log.info('Navigating to app (http://localhost:5173)...');
    
    try {
      await page.goto('http://localhost:5173', {
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
      path: join(screenshotsDir, '1-initial-load.png'),
      fullPage: true 
    });
    log.success('Screenshot 1: Initial load');

    // Wait for app to be ready
    await page.waitForTimeout(3000);

    // Try to navigate to products page
    log.info('Looking for products/inventory link...');
    
    const possibleLinks = [
      'text=Products',
      'text=Inventory',
      'text=LATS',
      'a[href*="products"]',
      'a[href*="inventory"]',
      'a[href*="lats"]',
    ];

    let navigated = false;
    for (const selector of possibleLinks) {
      try {
        const link = await page.locator(selector).first();
        if (await link.isVisible({ timeout: 2000 })) {
          log.info(`Found link: ${selector}`);
          await link.click();
          await page.waitForTimeout(2000);
          navigated = true;
          break;
        }
      } catch (err) {
        // Try next selector
      }
    }

    if (!navigated) {
      log.warn('Could not find products link, staying on current page');
    }

    // Take screenshot after navigation
    await page.screenshot({ 
      path: join(screenshotsDir, '2-after-navigation.png'),
      fullPage: true 
    });
    log.success('Screenshot 2: After navigation');

    // Check for product images
    log.info('Checking for product images...');
    
    const imageSelectors = [
      'img[src*="base64"]',
      'img[src*="data:image"]',
      'img[alt*="product"]',
      'img[alt*="Product"]',
      '.product-image img',
      '[class*="product"] img',
    ];

    for (const selector of imageSelectors) {
      try {
        const images = await page.locator(selector).all();
        if (images.length > 0) {
          log.success(`Found ${images.length} images with selector: ${selector}`);
          
          // Check each image
          for (let i = 0; i < Math.min(images.length, 5); i++) {
            const img = images[i];
            const isVisible = await img.isVisible().catch(() => false);
            const src = await img.getAttribute('src').catch(() => null);
            
            if (isVisible && src) {
              results.imagesFound++;
              log.success(`Image ${i + 1}: Visible and has src`);
              
              // Take screenshot of first few images
              if (i < 3) {
                await img.screenshot({ 
                  path: join(screenshotsDir, `3-product-image-${i + 1}.png`)
                });
              }
            } else {
              results.imagesFailed++;
              log.warn(`Image ${i + 1}: Not visible or no src`);
            }
          }
          break;
        }
      } catch (err) {
        // Try next selector
      }
    }

    // Scroll down to load more content
    log.info('Scrolling to load more content...');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);

    // Take final screenshot
    await page.screenshot({ 
      path: join(screenshotsDir, '4-final-state.png'),
      fullPage: true 
    });
    log.success('Screenshot 4: Final state');

    // Get page title
    const title = await page.title();
    log.info(`Page title: ${title}`);

    // Get current URL
    const url = page.url();
    log.info(`Current URL: ${url}`);

    // Generate report
    log.title('📊 Test Results Summary');

    console.log(`
${colors.bright}Console Errors:${colors.reset} ${results.consoleErrors.length}
${results.consoleErrors.length > 0 ? results.consoleErrors.slice(0, 5).map(e => `  - ${e}`).join('\n') : '  None'}

${colors.bright}Console Warnings:${colors.reset} ${results.consoleWarnings.length}
${results.consoleWarnings.length > 0 ? results.consoleWarnings.slice(0, 3).map(w => `  - ${w}`).join('\n') : '  None'}

${colors.bright}Product Images:${colors.reset}
  Found: ${colors.green}${results.imagesFound}${colors.reset}
  Failed: ${results.imagesFailed > 0 ? colors.red : colors.green}${results.imagesFailed}${colors.reset}

${colors.bright}Network Errors:${colors.reset} ${results.networkErrors.length}
${results.networkErrors.length > 0 ? results.networkErrors.slice(0, 3).map(e => `  - ${e}`).join('\n') : '  None'}

${colors.bright}Screenshots:${colors.reset} Saved to ${screenshotsDir}
    `);

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      pageTitle: title,
      currentURL: url,
      results,
    };

    writeFileSync(
      join(screenshotsDir, 'test-report.json'),
      JSON.stringify(report, null, 2)
    );
    log.success('Detailed report saved to test-report.json');

    // Final assessment
    if (results.consoleErrors.length === 0 && results.imagesFound > 0) {
      log.title(`${colors.green}✅ ALL TESTS PASSED!${colors.reset}`);
      console.log(`
${colors.bright}Summary:${colors.reset}
  ✓ No console errors
  ✓ ${results.imagesFound} product images displaying correctly
  ✓ App is working properly!
      `);
    } else if (results.consoleErrors.length === 0) {
      log.title(`${colors.yellow}⚠️  PARTIAL SUCCESS${colors.reset}`);
      console.log(`
${colors.bright}Summary:${colors.reset}
  ✓ No console errors
  ⚠ Images: ${results.imagesFound} found, ${results.imagesFailed} issues
  ℹ Check screenshots for visual confirmation
      `);
    } else {
      log.title(`${colors.red}❌ ISSUES DETECTED${colors.reset}`);
      console.log(`
${colors.bright}Summary:${colors.reset}
  ✗ ${results.consoleErrors.length} console errors
  ${results.imagesFound > 0 ? '✓' : '✗'} Images: ${results.imagesFound} found
  ℹ Review the console errors above
      `);
    }

    // Keep browser open for 5 seconds so you can see
    log.info('Keeping browser open for 5 seconds...');
    await page.waitForTimeout(5000);

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

testApp();

