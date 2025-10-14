#!/usr/bin/env node

/**
 * 🧪 LOGIN AND INVENTORY TEST
 * Tests login functionality and checks inventory product display
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = './test-screenshots-login-inventory';
const WAIT_TIME = 3000;

class LoginInventoryTester {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.results = [];
  }

  async init() {
    console.log('🚀 Initializing login and inventory test...\n');
    
    // Create screenshot directory
    try {
      mkdirSync(SCREENSHOT_DIR, { recursive: true });
    } catch (e) {
      // Directory exists
    }

    // Launch browser
    this.browser = await chromium.launch({
      headless: false, // Set to false to see the browser
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
      // Navigate to login page
      await this.page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
      await this.page.waitForTimeout(WAIT_TIME);
      
      // Take screenshot of login page
      await this.page.screenshot({ 
        path: join(SCREENSHOT_DIR, '1-login-page.png'), 
        fullPage: true 
      });

      // Fill login form
      await this.page.fill('input[type="email"]', 'care@care.com');
      await this.page.fill('input[type="password"]', '123456');
      
      // Take screenshot before login
      await this.page.screenshot({ 
        path: join(SCREENSHOT_DIR, '2-login-form-filled.png'), 
        fullPage: true 
      });

      // Click login button
      await this.page.click('button[type="submit"]');
      
      // Wait for navigation
      await this.page.waitForTimeout(WAIT_TIME * 2);
      
      // Take screenshot after login
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
      await this.page.waitForTimeout(WAIT_TIME * 2);
      
      // Take screenshot of inventory page
      await this.page.screenshot({ 
        path: join(SCREENSHOT_DIR, '4-inventory-page.png'), 
        fullPage: true 
      });

      // Check for product count in summary cards
      const productCountText = await this.page.textContent('text=Total Products');
      console.log(`📊 Product count text: ${productCountText}`);
      
      // Look for the actual number in the summary card
      const totalProductsElement = await this.page.locator('text=69').first();
      const totalProductsVisible = await totalProductsElement.isVisible().catch(() => false);
      
      // Count products in the table
      const productRows = await this.page.locator('table tbody tr').count();
      console.log(`📋 Products in table: ${productRows}`);
      
      // Check if filters are applied
      const searchInput = await this.page.locator('input[placeholder*="Search products"]');
      const searchValue = await searchInput.inputValue().catch(() => '');
      
      const lowStockCheckbox = await this.page.locator('input[type="checkbox"]').first();
      const lowStockChecked = await lowStockCheckbox.isChecked().catch(() => false);
      
      console.log(`🔍 Search value: "${searchValue}"`);
      console.log(`⚠️ Low stock filter: ${lowStockChecked}`);
      
      // Try to clear filters
      if (searchValue) {
        await searchInput.clear();
        await this.page.waitForTimeout(1000);
      }
      
      if (lowStockChecked) {
        await lowStockCheckbox.uncheck();
        await this.page.waitForTimeout(1000);
      }
      
      // Take screenshot after clearing filters
      await this.page.screenshot({ 
        path: join(SCREENSHOT_DIR, '5-inventory-after-clear-filters.png'), 
        fullPage: true 
      });
      
      // Count products again after clearing filters
      const productRowsAfter = await this.page.locator('table tbody tr').count();
      console.log(`📋 Products in table after clearing filters: ${productRowsAfter}`);
      
      const inventoryResult = {
        totalProductsInSummary: totalProductsVisible,
        productsInTable: productRows,
        productsAfterClearFilters: productRowsAfter,
        searchValue,
        lowStockFiltered: lowStockChecked,
        timestamp: new Date().toISOString()
      };
      
      this.results.push(inventoryResult);
      
      return inventoryResult;

    } catch (error) {
      console.log(`❌ Inventory test error: ${error.message}`);
      await this.page.screenshot({ 
        path: join(SCREENSHOT_DIR, 'inventory-error.png'), 
        fullPage: true 
      });
      return null;
    }
  }

  async testOtherInventoryPages() {
    console.log('\n📦 Testing other inventory pages...');
    
    const inventoryPages = [
      { path: '/inventory-manager', name: 'Inventory Manager' },
      { path: '/lats/serial-manager', name: 'Serial Manager' },
      { path: '/lats/spare-parts', name: 'Spare Parts' },
      { path: '/add-product', name: 'Add Product' }
    ];
    
    for (const page of inventoryPages) {
      try {
        console.log(`\n📄 Testing: ${page.name}`);
        await this.page.goto(`${BASE_URL}${page.path}`, { waitUntil: 'networkidle' });
        await this.page.waitForTimeout(WAIT_TIME);
        
        const screenshotName = `${page.name.toLowerCase().replace(/\s+/g, '-')}.png`;
        await this.page.screenshot({ 
          path: join(SCREENSHOT_DIR, screenshotName), 
          fullPage: true 
        });
        
        console.log(`✅ ${page.name} tested`);
        
      } catch (error) {
        console.log(`❌ Error testing ${page.name}: ${error.message}`);
      }
    }
  }

  generateReport() {
    console.log(`\n\n${'='.repeat(60)}`);
    console.log('📊 LOGIN AND INVENTORY TEST SUMMARY');
    console.log(`${'='.repeat(60)}\n`);

    if (this.results.length > 0) {
      const result = this.results[0];
      console.log(`Total Products in Summary: ${result.totalProductsInSummary ? '69 visible' : 'Not found'}`);
      console.log(`Products in Table (before): ${result.productsInTable}`);
      console.log(`Products in Table (after): ${result.productsAfterClearFilters}`);
      console.log(`Search Filter: "${result.searchValue}"`);
      console.log(`Low Stock Filter: ${result.lowStockFiltered ? 'Applied' : 'Not applied'}`);
    }

    // Save detailed report
    const report = {
      testType: 'Login and Inventory Test',
      results: this.results,
      timestamp: new Date().toISOString(),
      screenshots: SCREENSHOT_DIR
    };

    const reportPath = join(SCREENSHOT_DIR, 'login-inventory-test-report.json');
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

// Run the tests
async function main() {
  const tester = new LoginInventoryTester();
  
  try {
    await tester.init();
    
    const loginSuccess = await tester.testLogin();
    if (loginSuccess) {
      await tester.testInventoryPage();
      await tester.testOtherInventoryPages();
    }
    
    const report = tester.generateReport();
    
    console.log('\n✅ Login and inventory testing completed!\n');
    console.log(`📁 All screenshots saved in: ${SCREENSHOT_DIR}/`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await tester.cleanup();
  }
}

main();
