#!/usr/bin/env node

import { spawn } from 'child_process';
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

async function startAndTest() {
  let devServer;
  let browser;

  try {
    log.title('🚀 Starting Dev Server and Testing App');

    // Start dev server
    log.info('Starting dev server (npm run dev)...');
    devServer = spawn('npm', ['run', 'dev'], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });

    // Wait for server to be ready
    await new Promise((resolve, reject) => {
      let output = '';
      const timeout = setTimeout(() => {
        reject(new Error('Server startup timeout'));
      }, 30000);

      devServer.stdout.on('data', (data) => {
        output += data.toString();
        process.stdout.write(data);
        
        if (output.includes('Local:') || output.includes('localhost:5173')) {
          clearTimeout(timeout);
          resolve();
        }
      });

      devServer.stderr.on('data', (data) => {
        process.stderr.write(data);
      });

      devServer.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    log.success('Dev server is running!');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Now run the tests
    log.title('🧪 Running Automated Tests');

    const screenshotsDir = join(process.cwd(), 'test-screenshots');
    mkdirSync(screenshotsDir, { recursive: true });

    log.info('Launching browser...');
    browser = await chromium.launch({
      headless: false,
      slowMo: 50,
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
    });

    const page = await context.newPage();

    const results = {
      consoleErrors: [],
      consoleWarnings: [],
      imagesFound: 0,
      imagesFailed: 0,
      networkErrors: [],
    };

    // Capture console
    page.on('console', msg => {
      const text = msg.text();
      const type = msg.type();
      
      if (type === 'error') {
        results.consoleErrors.push(text);
        console.log(`${colors.red}[❌ Error]${colors.reset} ${text}`);
      } else if (type === 'warning' && !text.includes('DevTools') && !text.includes('deprecated')) {
        results.consoleWarnings.push(text);
        console.log(`${colors.yellow}[⚠ Warning]${colors.reset} ${text}`);
      } else if (text.includes('Error') || text.includes('❌')) {
        results.consoleErrors.push(text);
        console.log(`${colors.red}[❌ Log Error]${colors.reset} ${text}`);
      }
    });

    page.on('requestfailed', request => {
      const error = `${request.url()} - ${request.failure().errorText}`;
      results.networkErrors.push(error);
    });

    log.info('Loading app...');
    await page.goto('http://localhost:5173', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    await page.screenshot({ 
      path: join(screenshotsDir, '1-initial-load.png'),
      fullPage: true 
    });
    log.success('Screenshot 1: Initial load');

    await page.waitForTimeout(3000);

    // Look for product images
    log.info('Checking for product images...');
    
    const imageSelectors = [
      'img[src*="base64"]',
      'img[src*="data:image"]',
      'img',
    ];

    let foundImages = false;
    for (const selector of imageSelectors) {
      const images = await page.locator(selector).all();
      if (images.length > 0) {
        log.info(`Found ${images.length} images with selector: ${selector}`);
        
        for (let i = 0; i < Math.min(images.length, 10); i++) {
          const img = images[i];
          try {
            const isVisible = await img.isVisible({ timeout: 1000 });
            const src = await img.getAttribute('src');
            
            if (isVisible && src) {
              results.imagesFound++;
              if (!foundImages) {
                log.success(`Product image found and visible!`);
                foundImages = true;
              }
              
              if (i < 3) {
                try {
                  await img.screenshot({ 
                    path: join(screenshotsDir, `product-image-${i + 1}.png`)
                  });
                } catch (e) {
                  // Image might be too small
                }
              }
            }
          } catch (e) {
            results.imagesFailed++;
          }
        }
        if (foundImages) break;
      }
    }

    await page.screenshot({ 
      path: join(screenshotsDir, '2-final-state.png'),
      fullPage: true 
    });
    log.success('Screenshot 2: Final state');

    // Results
    log.title('📊 Test Results');

    console.log(`
${colors.bright}Console Errors:${colors.reset} ${results.consoleErrors.length === 0 ? 
  colors.green + '0 ✓' : colors.red + results.consoleErrors.length}${colors.reset}

${colors.bright}Console Warnings:${colors.reset} ${results.consoleWarnings.length}

${colors.bright}Product Images:${colors.reset}
  Found & Visible: ${colors.green}${results.imagesFound}${colors.reset}
  Failed to Load: ${results.imagesFailed > 0 ? colors.red : colors.green}${results.imagesFailed}${colors.reset}

${colors.bright}Network Errors:${colors.reset} ${results.networkErrors.length === 0 ? 
  colors.green + '0 ✓' : colors.red + results.networkErrors.length}${colors.reset}

${colors.bright}Screenshots:${colors.reset} ${screenshotsDir}
    `);

    // Save report
    writeFileSync(
      join(screenshotsDir, 'test-report.json'),
      JSON.stringify({
        timestamp: new Date().toISOString(),
        results,
        consoleErrorDetails: results.consoleErrors,
      }, null, 2)
    );

    // Final verdict
    if (results.consoleErrors.length === 0 && results.imagesFound > 0) {
      log.title(`${colors.green}🎉 ALL TESTS PASSED!${colors.reset}`);
      console.log(`
  ✓ No console errors
  ✓ ${results.imagesFound} product images displaying correctly
  ✓ App is working properly!
      `);
    } else {
      log.title(`${colors.yellow}⚠️  REVIEW NEEDED${colors.reset}`);
      if (results.consoleErrors.length > 0) {
        console.log(`\n${colors.red}Console Errors Found:${colors.reset}`);
        results.consoleErrors.slice(0, 5).forEach(e => console.log(`  - ${e}`));
      }
    }

    log.info('Keeping browser open for 10 seconds...');
    await page.waitForTimeout(10000);

  } catch (error) {
    log.error(`Test failed: ${error.message}`);
    console.error(error);
  } finally {
    if (browser) {
      await browser.close();
    }
    if (devServer) {
      log.info('Stopping dev server...');
      devServer.kill();
    }
    process.exit(0);
  }
}

startAndTest();

