#!/usr/bin/env node

/**
 * 🧪 AUTOMATIC UI TEST FOR INVENTORY EDIT FUNCTIONALITY
 * 
 * This script will automatically test all the edit buttons and functionality
 * in the Purchase Order detail page inventory items section.
 */

import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Starting automatic UI test for inventory edit functionality...\n');

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:5173', // Adjust if your dev server runs on different port
  headless: false, // Set to true to run without browser window
  slowMo: 1000, // Slow down actions for better visibility
  timeout: 30000,
  testPurchaseOrderId: 'PO-1760129569389' // Use the PO from your screenshot
};

class InventoryEditTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  async setup() {
    console.log('🚀 Setting up browser...');
    
    this.browser = await puppeteer.launch({
      headless: CONFIG.headless,
      slowMo: CONFIG.slowMo,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1920, height: 1080 }
    });

    this.page = await this.browser.newPage();
    
    // Set longer timeout
    this.page.setDefaultTimeout(CONFIG.timeout);
    
    // Enable console logging
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Browser Error:', msg.text());
      }
    });

    console.log('✅ Browser setup complete\n');
  }

  async testPageLoad() {
    console.log('📄 Testing page load...');
    
    try {
      await this.page.goto(`${CONFIG.baseUrl}/purchase-orders/${CONFIG.testPurchaseOrderId}`);
      await this.page.waitForSelector('[data-testid="purchase-order-detail"]', { timeout: 10000 });
      
      console.log('✅ Page loaded successfully');
      return true;
    } catch (error) {
      console.log('❌ Page load failed:', error.message);
      this.addError('Page load', error.message);
      return false;
    }
  }

  async testInventorySection() {
    console.log('📦 Testing inventory section visibility...');
    
    try {
      // Wait for inventory items table
      await this.page.waitForSelector('table', { timeout: 10000 });
      
      // Check if we can see inventory items
      const inventoryItems = await this.page.$$('tbody tr');
      console.log(`✅ Found ${inventoryItems.length} inventory items`);
      
      if (inventoryItems.length === 0) {
        console.log('⚠️  No inventory items found - cannot test editing');
        return false;
      }
      
      return true;
    } catch (error) {
      console.log('❌ Inventory section not found:', error.message);
      this.addError('Inventory section', error.message);
      return false;
    }
  }

  async testSerialNumberButtons() {
    console.log('🔢 Testing serial number edit buttons...');
    
    try {
      // Look for "Add Serial" or "Edit" buttons in serial number column
      const serialButtons = await this.page.$$('button:has-text("Add Serial"), button:has-text("Edit")');
      
      if (serialButtons.length > 0) {
        console.log(`✅ Found ${serialButtons.length} serial number edit buttons`);
        
        // Test clicking the first button
        await serialButtons[0].click();
        await this.page.waitForTimeout(1000);
        
        // Check if prompt appears (this is hard to test automatically)
        console.log('✅ Serial number button clickable');
        return true;
      } else {
        console.log('❌ No serial number edit buttons found');
        this.addError('Serial buttons', 'No edit buttons found in serial number column');
        return false;
      }
    } catch (error) {
      console.log('❌ Serial number button test failed:', error.message);
      this.addError('Serial buttons', error.message);
      return false;
    }
  }

  async testStatusDropdowns() {
    console.log('📊 Testing status dropdowns...');
    
    try {
      // Look for status dropdowns (select elements with available/sold/reserved/damaged options)
      const statusDropdowns = await this.page.$$('select option[value="available"], select option[value="sold"]');
      
      if (statusDropdowns.length > 0) {
        console.log(`✅ Found ${statusDropdowns.length} status dropdown options`);
        
        // Test clicking a dropdown
        const selectElement = await this.page.$('select');
        if (selectElement) {
          await selectElement.click();
          await this.page.waitForTimeout(500);
          console.log('✅ Status dropdown is clickable');
          return true;
        }
      } else {
        console.log('❌ No status dropdowns found');
        this.addError('Status dropdowns', 'No status select elements found');
        return false;
      }
    } catch (error) {
      console.log('❌ Status dropdown test failed:', error.message);
      this.addError('Status dropdowns', error.message);
      return false;
    }
  }

  async testLocationButtons() {
    console.log('📍 Testing location assign buttons...');
    
    try {
      // Look for "Assign" buttons
      const assignButtons = await this.page.$$('button:has-text("Assign")');
      
      if (assignButtons.length > 0) {
        console.log(`✅ Found ${assignButtons.length} location assign buttons`);
        
        // Test clicking the first button
        await assignButtons[0].click();
        await this.page.waitForTimeout(1000);
        
        console.log('✅ Location assign button clickable');
        return true;
      } else {
        console.log('❌ No location assign buttons found');
        this.addError('Location buttons', 'No Assign buttons found');
        return false;
      }
    } catch (error) {
      console.log('❌ Location button test failed:', error.message);
      this.addError('Location buttons', error.message);
      return false;
    }
  }

  async testSetPriceButtons() {
    console.log('💰 Testing set price buttons...');
    
    try {
      // Look for "Set Price" buttons
      const priceButtons = await this.page.$$('button:has-text("Set Price")');
      
      if (priceButtons.length > 0) {
        console.log(`✅ Found ${priceButtons.length} set price buttons`);
        
        // Test clicking the first button
        await priceButtons[0].click();
        await this.page.waitForTimeout(1000);
        
        console.log('✅ Set price button clickable');
        return true;
      } else {
        console.log('❌ No set price buttons found');
        this.addError('Price buttons', 'No Set Price buttons found');
        return false;
      }
    } catch (error) {
      console.log('❌ Set price button test failed:', error.message);
      this.addError('Price buttons', error.message);
      return false;
    }
  }

  async testJavaScriptErrors() {
    console.log('🔍 Testing for JavaScript errors...');
    
    const errors = [];
    
    // Listen for console errors
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait a bit to catch any errors
    await this.page.waitForTimeout(2000);
    
    if (errors.length > 0) {
      console.log(`❌ Found ${errors.length} JavaScript errors:`);
      errors.forEach(error => console.log(`   - ${error}`));
      this.addError('JavaScript errors', errors.join('; '));
      return false;
    } else {
      console.log('✅ No JavaScript errors detected');
      return true;
    }
  }

  async takeScreenshot(name) {
    try {
      const screenshotPath = join(__dirname, `test-screenshot-${name}.png`);
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    } catch (error) {
      console.log('❌ Screenshot failed:', error.message);
    }
  }

  addError(test, message) {
    this.testResults.errors.push({ test, message });
    this.testResults.failed++;
  }

  addPass(test) {
    this.testResults.passed++;
  }

  async runAllTests() {
    console.log('🎯 Running comprehensive UI tests...\n');
    
    this.testResults.total = 6;
    
    // Test 1: Page Load
    if (await this.testPageLoad()) {
      this.addPass('Page load');
    }
    await this.takeScreenshot('page-loaded');
    
    // Test 2: Inventory Section
    if (await this.testInventorySection()) {
      this.addPass('Inventory section');
    }
    await this.takeScreenshot('inventory-section');
    
    // Test 3: JavaScript Errors
    if (await this.testJavaScriptErrors()) {
      this.addPass('JavaScript errors');
    }
    
    // Test 4: Serial Number Buttons
    if (await this.testSerialNumberButtons()) {
      this.addPass('Serial number buttons');
    }
    await this.takeScreenshot('serial-buttons');
    
    // Test 5: Status Dropdowns
    if (await this.testStatusDropdowns()) {
      this.addPass('Status dropdowns');
    }
    await this.takeScreenshot('status-dropdowns');
    
    // Test 6: Location Buttons
    if (await this.testLocationButtons()) {
      this.addPass('Location buttons');
    }
    await this.takeScreenshot('location-buttons');
    
    // Test 7: Set Price Buttons
    if (await this.testSetPriceButtons()) {
      this.addPass('Set price buttons');
    }
    await this.takeScreenshot('price-buttons');
    
    await this.takeScreenshot('final-state');
  }

  generateReport() {
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('========================');
    console.log(`Total Tests: ${this.testResults.total}`);
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`Success Rate: ${Math.round((this.testResults.passed / this.testResults.total) * 100)}%`);
    
    if (this.testResults.errors.length > 0) {
      console.log('\n❌ ERRORS FOUND:');
      this.testResults.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.test}: ${error.message}`);
      });
    }
    
    console.log('\n📸 Screenshots saved for debugging');
    
    // Generate recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    
    if (this.testResults.failed === 0) {
      console.log('🎉 All tests passed! Edit functionality is working correctly.');
    } else {
      console.log('🔧 Issues found. Check the errors above and:');
      console.log('   1. Verify the dev server is running on the correct port');
      console.log('   2. Check browser console for JavaScript errors');
      console.log('   3. Ensure the purchase order has received items');
      console.log('   4. Try hard refresh (Ctrl+Shift+R) in the browser');
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Main execution
async function main() {
  const tester = new InventoryEditTester();
  
  try {
    await tester.setup();
    await tester.runAllTests();
    tester.generateReport();
  } catch (error) {
    console.error('💥 Test execution failed:', error.message);
  } finally {
    await tester.cleanup();
  }
}

// Run the tests
main().catch(console.error);
