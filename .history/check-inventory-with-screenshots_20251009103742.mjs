#!/usr/bin/env node

import { chromium } from 'playwright';
import { mkdirSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const SCREENSHOT_DIR = join(__dirname, 'inventory-screenshots');
const LOGIN_EMAIL = process.env.LOGIN_EMAIL || 'care@care.com';
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD || '123456';

// Ensure screenshot directory exists
if (!existsSync(SCREENSHOT_DIR)) {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

class InventoryChecker {
  constructor() {
    this.browser = null;
    this.page = null;
    this.consoleLogs = [];
    this.consoleErrors = [];
    this.networkErrors = [];
    this.imageLoadErrors = [];
  }

  async init() {
    console.log('🚀 Starting Inventory Check with Screenshots...\n');
    
    this.browser = await chromium.launch({
      headless: false, // Show browser so you can see what's happening
      slowMo: 500 // Slow down actions for visibility
    });
    
    this.page = await this.browser.newPage({
      viewport: { width: 1920, height: 1080 }
    });

    // Capture console logs
    this.page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      const timestamp = new Date().toISOString();
      
      const logEntry = {
        timestamp,
        type,
        text,
        location: msg.location()
      };

      if (type === 'error') {
        this.consoleErrors.push(logEntry);
        console.log(`❌ Console Error: ${text}`);
      } else if (type === 'warning') {
        console.log(`⚠️  Console Warning: ${text}`);
      } else if (type === 'log') {
        this.consoleLogs.push(logEntry);
      }
    });

    // Capture network errors
    this.page.on('response', response => {
      const status = response.status();
      const url = response.url();
      
      if (status >= 400) {
        const error = {
          timestamp: new Date().toISOString(),
          status,
          url,
          statusText: response.statusText()
        };
        this.networkErrors.push(error);
        console.log(`🌐 Network Error [${status}]: ${url}`);
      }
    });

    // Capture failed image loads
    this.page.on('requestfailed', request => {
      const url = request.url();
      if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
        const error = {
          timestamp: new Date().toISOString(),
          url,
          failure: request.failure()
        };
        this.imageLoadErrors.push(error);
        console.log(`🖼️  Image Load Failed: ${url}`);
      }
    });
  }

  async captureScreenshot(name, fullPage = false) {
    try {
      const filename = `${name}-${Date.now()}.png`;
      const filepath = join(SCREENSHOT_DIR, filename);
      await this.page.screenshot({ 
        path: filepath,
        fullPage 
      });
      console.log(`  📸 Screenshot saved: ${filename}`);
      return filepath;
    } catch (error) {
      console.log(`  ❌ Failed to capture screenshot: ${error.message}`);
      return null;
    }
  }

  async login() {
    console.log('🔐 Step 1: Logging in...\n');
    
    try {
      await this.page.goto(`${BASE_URL}/login`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      await this.page.waitForTimeout(2000);
      await this.captureScreenshot('01-login-page');

      // Fill login form
      await this.page.fill('input[type="email"], input[name="email"]', LOGIN_EMAIL);
      await this.page.fill('input[type="password"], input[name="password"]', LOGIN_PASSWORD);
      
      await this.captureScreenshot('02-login-filled');

      // Click login button
      await this.page.click('button[type="submit"]');
      
      // Wait for navigation
      await this.page.waitForTimeout(3000);
      
      const currentUrl = this.page.url();
      if (currentUrl.includes('/login')) {
        console.log('  ❌ Login failed - still on login page');
        await this.captureScreenshot('02-login-failed');
        return false;
      }

      console.log('  ✅ Login successful');
      await this.captureScreenshot('03-after-login');
      return true;
    } catch (error) {
      console.log(`  ❌ Login error: ${error.message}`);
      await this.captureScreenshot('error-login');
      return false;
    }
  }

  async navigateToInventory() {
    console.log('\n📦 Step 2: Navigating to Inventory...\n');
    
    try {
      // Try multiple possible inventory URLs
      const inventoryUrls = [
        `${BASE_URL}/lats/inventory`,
        `${BASE_URL}/lats/products`,
        `${BASE_URL}/inventory`,
        `${BASE_URL}/products`
      ];

      for (const url of inventoryUrls) {
        try {
          await this.page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 15000
          });

          await this.page.waitForTimeout(2000);

          // Check if we're on a products/inventory page
          const hasProducts = await this.page.locator('[class*="product"], [class*="inventory"]').count() > 0;
          
          if (hasProducts || this.page.url().includes('inventory') || this.page.url().includes('products')) {
            console.log(`  ✅ Successfully navigated to: ${url}`);
            await this.captureScreenshot('04-inventory-page');
            return true;
          }
        } catch (e) {
          console.log(`  ⏭️  Trying next URL...`);
        }
      }

      // If direct navigation failed, try clicking navigation menu
      console.log('  🔍 Trying to find inventory link in navigation...');
      await this.page.waitForTimeout(1000);
      
      const navLinks = await this.page.locator('a, button').all();
      for (const link of navLinks) {
        const text = await link.textContent();
        if (text && (text.toLowerCase().includes('inventory') || text.toLowerCase().includes('product'))) {
          console.log(`  🖱️  Clicking: ${text.trim()}`);
          await link.click();
          await this.page.waitForTimeout(2000);
          await this.captureScreenshot('04-inventory-via-nav');
          return true;
        }
      }

      console.log('  ❌ Could not find inventory page');
      await this.captureScreenshot('error-no-inventory');
      return false;
    } catch (error) {
      console.log(`  ❌ Navigation error: ${error.message}`);
      await this.captureScreenshot('error-navigation');
      return false;
    }
  }

  async checkProducts() {
    console.log('\n🔍 Step 3: Checking Products...\n');
    
    try {
      // Wait for products to load
      await this.page.waitForTimeout(3000);
      
      // Capture full page
      await this.captureScreenshot('05-products-overview', true);

      // Count products
      const productCards = await this.page.locator('[class*="product-card"], [class*="ProductCard"], .product, [data-testid*="product"]').count();
      console.log(`  📊 Found ${productCards} product cards`);

      // Check for images
      const images = await this.page.locator('img').all();
      console.log(`  🖼️  Found ${images.length} total images on page`);

      let loadedImages = 0;
      let failedImages = 0;
      let imageDetails = [];

      for (let i = 0; i < Math.min(images.length, 50); i++) {
        try {
          const img = images[i];
          const src = await img.getAttribute('src');
          const alt = await img.getAttribute('alt');
          const isVisible = await img.isVisible();
          
          // Check if image is actually loaded
          const naturalWidth = await img.evaluate((el) => el.naturalWidth);
          
          const detail = {
            index: i,
            src: src?.substring(0, 100),
            alt,
            isVisible,
            loaded: naturalWidth > 0,
            naturalWidth
          };

          imageDetails.push(detail);

          if (naturalWidth > 0) {
            loadedImages++;
          } else if (isVisible) {
            failedImages++;
          }
        } catch (e) {
          // Skip
        }
      }

      console.log(`  ✅ Loaded images: ${loadedImages}`);
      console.log(`  ❌ Failed images: ${failedImages}`);

      // Scroll through page to load lazy images
      console.log('\n  📜 Scrolling to load more products...');
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 3);
      });
      await this.page.waitForTimeout(2000);
      await this.captureScreenshot('06-products-scrolled-1');

      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight * 2 / 3);
      });
      await this.page.waitForTimeout(2000);
      await this.captureScreenshot('07-products-scrolled-2');

      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await this.page.waitForTimeout(2000);
      await this.captureScreenshot('08-products-bottom', true);

      // Scroll back to top
      await this.page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      await this.page.waitForTimeout(1000);

      // Try to click on a product if available
      if (productCards > 0) {
        console.log('\n  🖱️  Clicking on first product...');
        try {
          const firstProduct = this.page.locator('[class*="product-card"], [class*="ProductCard"]').first();
          await firstProduct.click();
          await this.page.waitForTimeout(2000);
          await this.captureScreenshot('09-product-detail');
          
          // Close modal/detail if it opened
          const closeButtons = await this.page.locator('[aria-label="Close"], button:has-text("Close"), [class*="close"]').all();
          if (closeButtons.length > 0) {
            await closeButtons[0].click();
            await this.page.waitForTimeout(1000);
          }
        } catch (e) {
          console.log(`    ⚠️  Could not click product: ${e.message}`);
        }
      }

      return {
        productCards,
        totalImages: images.length,
        loadedImages,
        failedImages,
        imageDetails
      };
    } catch (error) {
      console.log(`  ❌ Check products error: ${error.message}`);
      await this.captureScreenshot('error-check-products');
      return null;
    }
  }

  async generateReport() {
    console.log('\n📊 Generating Report...\n');
    
    const report = {
      timestamp: new Date().toISOString(),
      consoleLogs: this.consoleLogs,
      consoleErrors: this.consoleErrors,
      networkErrors: this.networkErrors,
      imageLoadErrors: this.imageLoadErrors
    };

    const reportPath = join(SCREENSHOT_DIR, 'report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`  ✅ Report saved: ${reportPath}`);

    // Generate readable summary
    const summaryPath = join(SCREENSHOT_DIR, 'SUMMARY.md');
    let summary = `# Inventory Check Report\n\n`;
    summary += `**Generated:** ${new Date().toISOString()}\n\n`;
    
    summary += `## Console Errors (${this.consoleErrors.length})\n\n`;
    if (this.consoleErrors.length > 0) {
      this.consoleErrors.forEach((error, i) => {
        summary += `### Error ${i + 1}\n`;
        summary += `- **Time:** ${error.timestamp}\n`;
        summary += `- **Message:** ${error.text}\n`;
        summary += `- **Location:** ${JSON.stringify(error.location)}\n\n`;
      });
    } else {
      summary += `✅ No console errors found!\n\n`;
    }

    summary += `## Network Errors (${this.networkErrors.length})\n\n`;
    if (this.networkErrors.length > 0) {
      this.networkErrors.forEach((error, i) => {
        summary += `### Network Error ${i + 1}\n`;
        summary += `- **Status:** ${error.status}\n`;
        summary += `- **URL:** ${error.url}\n`;
        summary += `- **Time:** ${error.timestamp}\n\n`;
      });
    } else {
      summary += `✅ No network errors found!\n\n`;
    }

    summary += `## Image Load Errors (${this.imageLoadErrors.length})\n\n`;
    if (this.imageLoadErrors.length > 0) {
      this.imageLoadErrors.forEach((error, i) => {
        summary += `### Image Error ${i + 1}\n`;
        summary += `- **URL:** ${error.url}\n`;
        summary += `- **Failure:** ${JSON.stringify(error.failure)}\n`;
        summary += `- **Time:** ${error.timestamp}\n\n`;
      });
    } else {
      summary += `✅ No image load errors found!\n\n`;
    }

    summary += `## All Console Logs (${this.consoleLogs.length})\n\n`;
    if (this.consoleLogs.length > 0) {
      summary += `\`\`\`\n`;
      this.consoleLogs.slice(0, 50).forEach(log => {
        summary += `[${log.timestamp}] ${log.text}\n`;
      });
      if (this.consoleLogs.length > 50) {
        summary += `... and ${this.consoleLogs.length - 50} more logs\n`;
      }
      summary += `\`\`\`\n\n`;
    }

    writeFileSync(summaryPath, summary);
    console.log(`  ✅ Summary saved: ${summaryPath}`);

    return report;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.init();
      
      const loginSuccess = await this.login();
      if (!loginSuccess) {
        console.log('\n❌ Cannot proceed without successful login');
        await this.generateReport();
        return;
      }

      const navSuccess = await this.navigateToInventory();
      if (!navSuccess) {
        console.log('\n❌ Cannot proceed without accessing inventory');
        await this.generateReport();
        return;
      }

      const productData = await this.checkProducts();
      
      await this.generateReport();

      console.log('\n' + '='.repeat(60));
      console.log('✅ INVENTORY CHECK COMPLETE');
      console.log('='.repeat(60));
      console.log(`\n📁 Screenshots saved in: ${SCREENSHOT_DIR}`);
      console.log(`\n📊 Summary:`);
      console.log(`   - Products found: ${productData?.productCards || 0}`);
      console.log(`   - Console errors: ${this.consoleErrors.length}`);
      console.log(`   - Network errors: ${this.networkErrors.length}`);
      console.log(`   - Image load errors: ${this.imageLoadErrors.length}`);
      console.log(`   - Loaded images: ${productData?.loadedImages || 0}`);
      console.log(`   - Failed images: ${productData?.failedImages || 0}`);
      console.log('\n');

    } catch (error) {
      console.error('\n❌ Fatal error:', error);
      await this.captureScreenshot('fatal-error');
    } finally {
      await this.cleanup();
    }
  }
}

// Run the checker
const checker = new InventoryChecker();
checker.run().catch(console.error);

