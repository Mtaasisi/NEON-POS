#!/usr/bin/env node

/**
 * 🧪 AUTOMATED DEVICE CREATION TEST
 * Tests device creation workflow with automatic screenshot on errors
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = './test-screenshots-device-creation';
const WAIT_TIME = 2000; // 2 seconds for UI to settle

class DeviceCreationTester {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.testResults = [];
    this.screenshotCount = 0;
  }

  async init() {
    console.log('🚀 Initializing device creation test...\n');
    
    // Create screenshot directory
    try {
      mkdirSync(SCREENSHOT_DIR, { recursive: true });
    } catch (e) {
      // Directory exists
    }

    // Launch browser
    this.browser = await chromium.launch({
      headless: false, // Set to false to see what's happening
      slowMo: 500, // Slow down actions for visibility
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });

    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(30000);

    // Listen for console errors
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`  ❌ Console Error: ${msg.text()}`);
        this.captureScreenshot('console-error');
      }
    });

    // Listen for page errors
    this.page.on('pageerror', error => {
      console.log(`  ❌ Page Error: ${error.message}`);
      this.captureScreenshot('page-error');
    });

    // Listen for network failures
    this.page.on('requestfailed', request => {
      console.log(`  ⚠️  Request Failed: ${request.url()}`);
      this.captureScreenshot('request-failed');
    });
  }

  async captureScreenshot(label) {
    try {
      this.screenshotCount++;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${this.screenshotCount}-${label}-${timestamp}.png`;
      const filepath = join(SCREENSHOT_DIR, filename);
      
      await this.page.screenshot({ 
        path: filepath, 
        fullPage: true 
      });
      
      console.log(`  📸 Screenshot saved: ${filename}`);
      return filename;
    } catch (error) {
      console.log(`  ⚠️  Failed to capture screenshot: ${error.message}`);
      return null;
    }
  }

  async navigateToDeviceCreation() {
    console.log('\n📄 Step 1: Navigating to device creation page...');
    
    try {
      await this.page.goto(`${BASE_URL}/devices/new`, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      await this.page.waitForTimeout(WAIT_TIME);
      await this.captureScreenshot('01-device-creation-page');
      
      console.log('  ✅ Successfully loaded device creation page');
      return true;
    } catch (error) {
      console.log(`  ❌ Failed to load page: ${error.message}`);
      await this.captureScreenshot('error-page-load');
      return false;
    }
  }

  async fillDeviceForm(testData) {
    console.log('\n📝 Step 2: Filling device form...');
    
    try {
      // Wait for form to be ready
      await this.page.waitForSelector('input, select, textarea', { timeout: 10000 });
      await this.captureScreenshot('02-form-ready');

      // Fill brand
      if (testData.brand) {
        console.log(`  📝 Filling brand: ${testData.brand}`);
        const brandInput = await this.page.locator('input[name="brand"], input[placeholder*="Brand" i]').first();
        await brandInput.fill(testData.brand);
        await this.page.waitForTimeout(500);
      }

      // Fill model
      if (testData.model) {
        console.log(`  📝 Filling model: ${testData.model}`);
        const modelInput = await this.page.locator('input[name="model"], input[placeholder*="Model" i]').first();
        await modelInput.fill(testData.model);
        await this.page.waitForTimeout(500);
      }

      // Fill serial number
      if (testData.serialNumber) {
        console.log(`  📝 Filling serial number: ${testData.serialNumber}`);
        const serialInput = await this.page.locator('input[name="serialNumber"], input[placeholder*="Serial" i], input[placeholder*="IMEI" i]').first();
        await serialInput.fill(testData.serialNumber);
        await this.page.waitForTimeout(500);
      }

      // Fill issue description
      if (testData.issueDescription) {
        console.log(`  📝 Filling issue description: ${testData.issueDescription}`);
        const issueInput = await this.page.locator('textarea[name="issueDescription"], textarea[placeholder*="Issue" i], textarea[placeholder*="Problem" i]').first();
        await issueInput.fill(testData.issueDescription);
        await this.page.waitForTimeout(500);
      }

      // Fill unlock code (optional)
      if (testData.unlockCode) {
        console.log(`  📝 Filling unlock code: ${testData.unlockCode}`);
        const unlockInput = await this.page.locator('input[name="unlockCode"], input[placeholder*="Unlock" i]').first();
        if (await unlockInput.count() > 0) {
          await unlockInput.fill(testData.unlockCode);
          await this.page.waitForTimeout(500);
        }
      }

      await this.captureScreenshot('03-form-filled');
      console.log('  ✅ Form filled successfully');
      return true;
    } catch (error) {
      console.log(`  ❌ Error filling form: ${error.message}`);
      await this.captureScreenshot('error-filling-form');
      return false;
    }
  }

  async selectCustomer(customerName = null) {
    console.log('\n👤 Step 3: Selecting customer...');
    
    try {
      // Look for customer search/select input
      const customerInput = await this.page.locator('input[placeholder*="Customer" i], input[placeholder*="Search" i]').first();
      
      if (await customerInput.count() > 0) {
        if (customerName) {
          await customerInput.fill(customerName);
          await this.page.waitForTimeout(1000);
          
          // Click first result
          const firstResult = await this.page.locator('[role="option"], .customer-option, li').first();
          if (await firstResult.count() > 0) {
            await firstResult.click();
            console.log(`  ✅ Selected customer: ${customerName}`);
          }
        } else {
          console.log('  ⚠️  No customer specified, skipping customer selection');
        }
      }

      await this.captureScreenshot('04-customer-selected');
      return true;
    } catch (error) {
      console.log(`  ⚠️  Customer selection issue: ${error.message}`);
      await this.captureScreenshot('warning-customer-selection');
      return true; // Non-critical, continue
    }
  }

  async submitForm() {
    console.log('\n🚀 Step 4: Submitting form...');
    
    try {
      // Find submit button
      const submitButton = await this.page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Create"), button:has-text("Save")').first();
      
      if (await submitButton.count() === 0) {
        throw new Error('Submit button not found');
      }

      await this.captureScreenshot('05-before-submit');
      
      // Click submit
      await submitButton.click();
      console.log('  ✅ Submit button clicked');

      // Wait for response
      await this.page.waitForTimeout(3000);
      await this.captureScreenshot('06-after-submit');

      // Check for success or error messages
      const bodyText = await this.page.textContent('body');
      
      if (bodyText.includes('success') || bodyText.includes('created')) {
        console.log('  ✅ Device created successfully!');
        await this.captureScreenshot('07-success');
        return { success: true, message: 'Device created successfully' };
      } else if (bodyText.includes('error') || bodyText.includes('failed') || bodyText.includes('400')) {
        console.log('  ❌ Error detected in response');
        await this.captureScreenshot('07-error-response');
        return { success: false, message: 'Error in form submission' };
      } else {
        console.log('  ⚠️  Unclear result - check screenshots');
        await this.captureScreenshot('07-unclear-result');
        return { success: null, message: 'Result unclear' };
      }
    } catch (error) {
      console.log(`  ❌ Error submitting form: ${error.message}`);
      await this.captureScreenshot('error-submit');
      return { success: false, message: error.message };
    }
  }

  async checkNetworkErrors() {
    console.log('\n🌐 Checking network activity...');
    
    try {
      // Check for any 400/500 errors in network
      const failedRequests = [];
      
      this.page.on('response', response => {
        if (response.status() >= 400) {
          failedRequests.push({
            url: response.url(),
            status: response.status(),
            statusText: response.statusText()
          });
          console.log(`  ❌ HTTP ${response.status()}: ${response.url()}`);
        }
      });

      if (failedRequests.length > 0) {
        await this.captureScreenshot('network-errors');
      }

      return failedRequests;
    } catch (error) {
      console.log(`  ⚠️  Error checking network: ${error.message}`);
      return [];
    }
  }

  async runCompleteTest(testData) {
    console.log(`\n${'='.repeat(60)}`);
    console.log('🧪 DEVICE CREATION TEST - STARTING');
    console.log(`${'='.repeat(60)}`);

    const result = {
      testName: 'Device Creation Workflow',
      timestamp: new Date().toISOString(),
      steps: {},
      screenshots: [],
      success: false
    };

    // Step 1: Navigate
    result.steps.navigation = await this.navigateToDeviceCreation();
    if (!result.steps.navigation) {
      return result;
    }

    // Step 2: Fill form
    result.steps.formFill = await this.fillDeviceForm(testData);
    if (!result.steps.formFill) {
      return result;
    }

    // Step 3: Select customer (optional)
    result.steps.customerSelection = await this.selectCustomer(testData.customerName);

    // Step 4: Submit
    const submitResult = await this.submitForm();
    result.steps.submission = submitResult.success;
    result.message = submitResult.message;

    // Overall success
    result.success = submitResult.success === true;
    result.screenshotCount = this.screenshotCount;

    return result;
  }

  generateReport(result) {
    console.log(`\n\n${'='.repeat(60)}`);
    console.log('📊 TEST RESULTS');
    console.log(`${'='.repeat(60)}\n`);

    console.log(`Test: ${result.testName}`);
    console.log(`Time: ${new Date(result.timestamp).toLocaleString()}`);
    console.log(`Status: ${result.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Screenshots: ${result.screenshotCount}`);
    
    console.log(`\nSteps:`);
    console.log(`  1. Navigation: ${result.steps.navigation ? '✅' : '❌'}`);
    console.log(`  2. Form Fill: ${result.steps.formFill ? '✅' : '❌'}`);
    console.log(`  3. Customer Selection: ${result.steps.customerSelection ? '✅' : '❌'}`);
    console.log(`  4. Submission: ${result.steps.submission ? '✅' : '❌'}`);
    
    if (result.message) {
      console.log(`\nMessage: ${result.message}`);
    }

    // Save JSON report
    const reportPath = join(SCREENSHOT_DIR, 'test-report.json');
    writeFileSync(reportPath, JSON.stringify(result, null, 2));
    console.log(`\n📄 Report saved: ${reportPath}`);
    
    // Save markdown report
    this.generateMarkdownReport(result);
  }

  generateMarkdownReport(result) {
    const md = [];
    
    md.push('# 🧪 Device Creation Test Report\n\n');
    md.push(`**Date:** ${new Date(result.timestamp).toLocaleString()}\n\n`);
    md.push(`**Status:** ${result.success ? '✅ PASSED' : '❌ FAILED'}\n\n`);
    md.push(`**Screenshots Captured:** ${result.screenshotCount}\n\n`);
    
    md.push('## Test Steps\n\n');
    md.push(`1. **Navigation to Device Creation Page**: ${result.steps.navigation ? '✅ Success' : '❌ Failed'}\n`);
    md.push(`2. **Form Fill**: ${result.steps.formFill ? '✅ Success' : '❌ Failed'}\n`);
    md.push(`3. **Customer Selection**: ${result.steps.customerSelection ? '✅ Success' : '❌ Failed'}\n`);
    md.push(`4. **Form Submission**: ${result.steps.submission ? '✅ Success' : '❌ Failed'}\n\n`);
    
    if (result.message) {
      md.push(`## Result Message\n\n`);
      md.push(`${result.message}\n\n`);
    }
    
    md.push('## Screenshots\n\n');
    md.push(`All screenshots are saved in the \`${SCREENSHOT_DIR}\` directory.\n\n`);
    md.push('Screenshots are automatically captured:\n');
    md.push('- At each major step\n');
    md.push('- When errors occur\n');
    md.push('- On console errors\n');
    md.push('- On network failures\n\n');
    
    md.push('---\n\n');
    md.push('*Generated by Device Creation Auto-Test Script*\n');

    const mdPath = join(SCREENSHOT_DIR, 'TEST-REPORT.md');
    writeFileSync(mdPath, md.join(''));
    console.log(`📄 Markdown report: ${mdPath}\n`);
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Test data
const TEST_DEVICE_DATA = {
  brand: 'Apple',
  model: 'iPhone 15 Pro',
  serialNumber: `TEST-${Date.now()}`,
  issueDescription: 'Screen cracked, needs replacement. Auto-test device.',
  unlockCode: '1234',
  customerName: null // Set to customer name if you want to test with a specific customer
};

// Main execution
async function main() {
  const tester = new DeviceCreationTester();
  
  try {
    await tester.init();
    const result = await tester.runCompleteTest(TEST_DEVICE_DATA);
    tester.generateReport(result);
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ Test completed!');
    console.log(`📁 Screenshots: ${SCREENSHOT_DIR}/`);
    console.log(`📄 Reports: TEST-REPORT.md & test-report.json`);
    console.log(`${'='.repeat(60)}\n`);
    
    process.exit(result.success ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    await tester.captureScreenshot('fatal-error');
    process.exit(1);
  } finally {
    await tester.cleanup();
  }
}

main();

