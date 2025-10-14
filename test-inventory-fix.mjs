#!/usr/bin/env node

/**
 * 🧪 COMPREHENSIVE INVENTORY FIX TEST
 * Tests the complete fix for the inventory display issue
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = './test-screenshots-inventory-fix';
const WAIT_TIME = 3000;

class InventoryFixTester {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.results = [];
  }

  async init() {
    console.log('🚀 Initializing inventory fix test...\n');
    
    try {
      mkdirSync(SCREENSHOT_DIR, { recursive: true });
    } catch (e) {
      // Directory exists
    }

    this.browser = await chromium.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });

    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(30000);
  }

  async testLogin() {
    console.log('\n🔐 Testing login...');
    
    try {
      await this.page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
      await this.page.waitForTimeout(WAIT_TIME);
      
      await this.page.screenshot({ 
        path: join(SCREENSHOT_DIR, '1-login-page.png'), 
        fullPage: true 
      });

      await this.page.fill('input[type="email"]', 'care@care.com');
      await this.page.fill('input[type="password"]', '123456');
      
      await this.page.screenshot({ 
        path: join(SCREENSHOT_DIR, '2-login-form-filled.png'), 
        fullPage: true 
      });

      await this.page.click('button[type="submit"]');
      await this.page.waitForTimeout(WAIT_TIME * 2);
      
      await this.page.screenshot({ 
        path: join(SCREENSHOT_DIR, '3-after-login.png'), 
        fullPage: true 
      });

      console.log('✅ Login completed');
      return true;

    } catch (error) {
      console.log(`❌ Login error: ${error.message}`);
      await this.page.screenshot({ 
        path: join(SCREENSHOT_DIR, 'login-error.png'), 
        fullPage: true 
      });
      return false;
    }
  }

  async testInventoryPage() {
    console.log('\n📦 Testing inventory page...');
    
    try {
      // Navigate to inventory page
      await this.page.goto(`${BASE_URL}/lats/unified-inventory`, { waitUntil: 'networkidle' });
      await this.page.waitForTimeout(WAIT_TIME * 3);
      
      await this.page.screenshot({ 
        path: join(SCREENSHOT_DIR, '4-inventory-page.png'), 
        fullPage: true 
      });

      // Check for product count in summary cards
      const totalProductsElement = await this.page.locator('text=Total Products').first();
      const totalProductsVisible = await totalProductsElement.isVisible().catch(() => false);
      
      if (totalProductsVisible) {
        const productCountText = await totalProductsElement.textContent();
        console.log(`📊 Product count text: ${productCountText}`);
      }
      
      // Look for the number 69 in summary cards
      const has69Products = await this.page.locator('text=69').first().isVisible().catch(() => false);
      console.log(`📊 Has 69 products indicator: ${has69Products}`);
      
      // Count products in the table/grid
      const productElements = await this.page.locator('[data-testid="product-card"], .product-card, table tbody tr').count();
      console.log(`📋 Products displayed in UI: ${productElements}`);
      
      // Check if we see sample products (which would indicate the fallback is still active)
      const sampleProductElements = await this.page.locator('text=Sample').count();
      console.log(`⚠️ Sample products found: ${sampleProductElements}`);
      
      // Check for real product names (non-sample)
      const hasRealProducts = await this.page.locator('text=Macbook, text=iPhone, text=JBL, text=T8').count() > 0;
      console.log(`✅ Real products found: ${hasRealProducts}`);
      
      // Check console for any errors
      const consoleMessages = [];
      this.page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleMessages.push(msg.text());
        }
      });
      
      await this.page.waitForTimeout(2000); // Wait for any console errors
      
      const testResult = {
        totalProductsVisible,
        has69Products,
        productsDisplayed: productElements,
        sampleProductsFound: sampleProductElements,
        realProductsFound: hasRealProducts,
        consoleErrors: consoleMessages,
        timestamp: new Date().toISOString()
      };
      
      this.results.push(testResult);
      
      console.log('\n📊 Test Results:');
      console.log(`  - Total Products indicator visible: ${testResult.totalProductsVisible}`);
      console.log(`  - Shows 69 products: ${testResult.has69Products}`);
      console.log(`  - Products displayed in UI: ${testResult.productsDisplayed}`);
      console.log(`  - Sample products found: ${testResult.sampleProductsFound}`);
      console.log(`  - Real products found: ${testResult.realProductsFound}`);
      console.log(`  - Console errors: ${testResult.consoleErrors.length}`);
      
      if (testResult.consoleErrors.length > 0) {
        console.log('\n⚠️ Console errors:');
        testResult.consoleErrors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error}`);
        });
      }
      
      return testResult;

    } catch (error) {
      console.log(`❌ Inventory test error: ${error.message}`);
      await this.page.screenshot({ 
        path: join(SCREENSHOT_DIR, 'inventory-error.png'), 
        fullPage: true 
      });
      return null;
    }
  }

  generateReport() {
    console.log(`\n\n${'='.repeat(60)}`);
    console.log('📊 INVENTORY FIX TEST SUMMARY');
    console.log(`${'='.repeat(60)}\n`);

    if (this.results.length > 0) {
      const result = this.results[0];
      console.log(`Total Products Indicator: ${result.totalProductsVisible ? 'Visible' : 'Not visible'}`);
      console.log(`Shows 69 Products: ${result.has69Products ? 'Yes' : 'No'}`);
      console.log(`Products Displayed: ${result.productsDisplayed}`);
      console.log(`Sample Products: ${result.sampleProductsFound}`);
      console.log(`Real Products: ${result.realProductsFound ? 'Yes' : 'No'}`);
      console.log(`Console Errors: ${result.consoleErrors.length}`);
      
      // Determine if fix was successful
      const fixSuccessful = result.realProductsFound && result.productsDisplayed > 3 && result.sampleProductsFound === 0;
      console.log(`\n🎯 Fix Status: ${fixSuccessful ? '✅ SUCCESS' : '❌ FAILED'}`);
      
      if (fixSuccessful) {
        console.log('✅ The inventory display issue has been fixed!');
        console.log('✅ Real products are now loading from the database.');
      } else {
        console.log('❌ The inventory display issue persists.');
        console.log('❌ Check the console errors and database connection.');
      }
    }

    const report = {
      testType: 'Inventory Fix Test',
      results: this.results,
      timestamp: new Date().toISOString(),
      screenshots: SCREENSHOT_DIR
    };

    const reportPath = join(SCREENSHOT_DIR, 'inventory-fix-test-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved: ${reportPath}`);

    return report;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

async function main() {
  const tester = new InventoryFixTester();
  
  try {
    await tester.init();
    
    const loginSuccess = await tester.testLogin();
    if (loginSuccess) {
      await tester.testInventoryPage();
    }
    
    const report = tester.generateReport();
    
    console.log('\n✅ Inventory fix testing completed!\n');
    console.log(`📁 All screenshots saved in: ${SCREENSHOT_DIR}/`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await tester.cleanup();
  }
}

main();
