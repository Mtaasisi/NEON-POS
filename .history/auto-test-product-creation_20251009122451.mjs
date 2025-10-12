#!/usr/bin/env node

/**
 * 🧪 AUTOMATED PRODUCT CREATION TEST
 * Tests product creation workflow with image upload and automatic screenshots
 * Shows errors visually for easy debugging
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = './test-screenshots-product-creation';
const WAIT_TIME = 2000; // 2 seconds for UI to settle
const SLOW_MO = 300; // Slow down actions for visibility

// Sample product image from FIGS folder
const SAMPLE_IMAGE_PATH = '/Users/mtaasisi/Downloads/FIGS/0.jpg';

class ProductCreationTester {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.testResults = [];
    this.screenshotCount = 0;
    this.errors = [];
    this.consoleErrors = [];
  }

  async init() {
    console.log('🚀 Initializing product creation test...\n');
    
    // Create screenshot directory
    try {
      mkdirSync(SCREENSHOT_DIR, { recursive: true });
    } catch (e) {
      // Directory exists
    }

    // Launch browser
    this.browser = await chromium.launch({
      headless: false, // Set to true for CI/CD
      slowMo: SLOW_MO,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      permissions: ['clipboard-read', 'clipboard-write']
    });

    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(30000);

    // Listen for console messages
    this.page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      
      if (type === 'error') {
        console.log(`  ❌ Console Error: ${text}`);
        this.consoleErrors.push({ type: 'error', text, timestamp: new Date() });
        this.captureScreenshot('console-error');
      } else if (type === 'warning' && text.includes('400')) {
        console.log(`  ⚠️  Console Warning (400): ${text}`);
        this.consoleErrors.push({ type: 'warning', text, timestamp: new Date() });
        this.captureScreenshot('console-warning-400');
      }
    });

    // Listen for page errors
    this.page.on('pageerror', error => {
      console.log(`  ❌ Page Error: ${error.message}`);
      this.errors.push({ type: 'page', message: error.message, timestamp: new Date() });
      this.captureScreenshot('page-error');
    });

    // Listen for network failures
    this.page.on('requestfailed', request => {
      console.log(`  ⚠️  Request Failed: ${request.url()}`);
      this.errors.push({ type: 'network', url: request.url(), timestamp: new Date() });
      this.captureScreenshot('request-failed');
    });

    // Listen for HTTP errors
    this.page.on('response', async response => {
      const status = response.status();
      const url = response.url();
      
      if (status >= 400) {
        console.log(`  ❌ HTTP ${status}: ${url}`);
        
        try {
          const body = await response.text();
          this.errors.push({ 
            type: 'http', 
            status, 
            url, 
            body: body.substring(0, 500),
            timestamp: new Date() 
          });
        } catch (e) {
          this.errors.push({ 
            type: 'http', 
            status, 
            url, 
            timestamp: new Date() 
          });
        }
        
        this.captureScreenshot(`http-${status}-error`);
      }
    });
  }

  async captureScreenshot(label) {
    try {
      this.screenshotCount++;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      const filename = `${String(this.screenshotCount).padStart(2, '0')}-${label}-${timestamp}.png`;
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

  async login(username = 'care@care.com', password = '123456') {
    console.log('\n🔐 Step 0: Logging in...');
    
    try {
      // Check if already logged in
      await this.page.goto(`${BASE_URL}/lats/dashboard`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });

      // If we're on dashboard, we're logged in
      const currentUrl = this.page.url();
      if (currentUrl.includes('/lats/dashboard') || currentUrl.includes('/dashboard')) {
        console.log('  ✅ Already logged in');
        await this.captureScreenshot('00-already-logged-in');
        return true;
      }

      // Need to login
      await this.page.goto(`${BASE_URL}/login`, {
        waitUntil: 'networkidle',
        timeout: 15000
      });

      await this.page.waitForTimeout(1000);
      
      // Fill login form
      const usernameInput = await this.page.locator('input[name="email"], input[type="email"], input[placeholder*="Email" i], input[name="username"], input[type="text"]').first();
      const passwordInput = await this.page.locator('input[name="password"], input[type="password"], input[placeholder*="Password" i]').first();
      
      await usernameInput.fill(username);
      await passwordInput.fill(password);
      
      await this.captureScreenshot('00-login-form-filled');
      
      // Submit
      const loginButton = await this.page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first();
      await loginButton.click();
      
      await this.page.waitForTimeout(3000);
      
      console.log('  ✅ Logged in successfully');
      await this.captureScreenshot('00-logged-in');
      return true;
    } catch (error) {
      console.log(`  ❌ Login failed: ${error.message}`);
      await this.captureScreenshot('error-login');
      return false;
    }
  }

  async navigateToProductCreation() {
    console.log('\n📄 Step 1: Navigating to product creation page...');
    
    try {
      // Route used by the app
      await this.page.goto(`${BASE_URL}/lats/add-product`, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      await this.page.waitForTimeout(WAIT_TIME);
      await this.captureScreenshot('01-product-creation-page');
      
      // Check if form is visible
      const hasForm = await this.page.locator('form, input, select').count() > 0;
      
      if (!hasForm) {
        throw new Error('Product creation form not found on page');
      }
      
      console.log('  ✅ Successfully loaded product creation page');
      return true;
    } catch (error) {
      console.log(`  ❌ Failed to load page: ${error.message}`);
      await this.captureScreenshot('error-page-load');
      return false;
    }
  }

  async fillProductForm(testData) {
    console.log('\n📝 Step 2: Filling product form...');
    
    try {
      // Wait for form to be ready
      await this.page.waitForSelector('#product-name, input, select, textarea', { timeout: 20000 });
      await this.captureScreenshot('02-form-ready');

      // Fill product name (AddProductPage uses #product-name)
      if (testData.name) {
        console.log(`  📝 Filling product name: ${testData.name}`);
        // Wait for name input (by id or placeholder)
        await this.page.waitForSelector('input#product-name, input[placeholder="iPhone 14 Pro Max"]', { timeout: 15000 });
        const nameInput = this.page.locator('input#product-name, input[placeholder="iPhone 14 Pro Max"]').first();
        await nameInput.click({ timeout: 8000 });
        await nameInput.fill('');
        await nameInput.type(String(testData.name), { delay: 15 });
        await this.page.waitForTimeout(500);
      }

      // Select category (CategoryInput is a custom text input + dropdown)
      if (testData.category) {
        console.log(`  📝 Selecting category: ${testData.category}`);
        try {
          const catInput = await this.page.locator('input[placeholder*="Select a category" i], input[placeholder*="category" i]').first();
          await catInput.click();
          await catInput.fill('');
          await catInput.type(testData.category, { delay: 20 });
          await this.page.waitForTimeout(500);
          // choose first matching option
          const firstOption = await this.page.locator('div[role="option"], button:has-text("'+testData.category+'"]').first();
          if (await firstOption.count() > 0) {
            await firstOption.click();
          } else {
            await this.page.keyboard.press('Enter');
          }
        } catch (e) {
          console.log(`  ⚠️  Category selection skipped: ${e.message}`);
        }
      }

      // Select condition (buttons grid in AddProductPage)
      if (testData.condition) {
        console.log(`  📝 Selecting condition: ${testData.condition}`);
        try {
          const condBtn = await this.page.locator('button:has-text("'+testData.condition+'")').first();
          await condBtn.click({ timeout: 5000 });
          await this.page.waitForTimeout(300);
        } catch (e) {
          console.log('  ⚠️  Condition button not found, trying select...');
          const conditionSelect = await this.page.locator('select[name="condition"]').first();
          if (await conditionSelect.count() > 0) {
            await conditionSelect.selectOption(testData.condition);
          }
        }
      }

      // Fill SKU (if auto-generate button exists, click it)
      console.log(`  📝 Setting SKU`);
      try {
        const generateSkuButton = await this.page.locator('button:has-text("Generate"), button:has-text("Auto")').first();
        if (await generateSkuButton.count() > 0) {
          await generateSkuButton.click();
          console.log(`  ✅ Auto-generated SKU`);
          await this.page.waitForTimeout(500);
        } else if (testData.sku) {
          const skuInput = await this.page.locator('input[name="sku"]').first();
          await skuInput.fill(testData.sku);
        }
      } catch (e) {
        console.log(`  ⚠️  SKU handling skipped`);
      }

      // Fill description
      if (testData.description) {
        console.log(`  📝 Filling description: ${testData.description}`);
        const descInput = await this.page.locator('textarea[name="description"], input[name="description"]').first();
        if (await descInput.count() > 0) {
          await descInput.fill(testData.description);
          await this.page.waitForTimeout(500);
        }
      }

      // Fill pricing
      if (testData.price !== undefined) {
        console.log(`  📝 Filling price: ${testData.price}`);
        const priceInput = await this.page.locator('input[placeholder*="Selling price" i], input[name="price"], input[placeholder*="Price" i]').first();
        await priceInput.click();
        await priceInput.fill('');
        await priceInput.type(String(testData.price), { delay: 10 });
        await this.page.waitForTimeout(300);
      }

      if (testData.costPrice !== undefined) {
        console.log(`  📝 Filling cost price: ${testData.costPrice}`);
        const costInput = await this.page.locator('input[placeholder*="Cost price" i], input[name="costPrice"], input[placeholder*="Cost" i]').first();
        await costInput.click();
        await costInput.fill('');
        await costInput.type(String(testData.costPrice), { delay: 10 });
        await this.page.waitForTimeout(300);
      }

      // Fill stock quantity
      if (testData.stockQuantity !== undefined) {
        console.log(`  📝 Filling stock quantity: ${testData.stockQuantity}`);
        const stockInput = await this.page.locator('input[placeholder="0"], input[name="stockQuantity"]').first();
        await stockInput.click();
        await stockInput.fill('');
        await stockInput.type(String(testData.stockQuantity), { delay: 10 });
        await this.page.waitForTimeout(300);
      }

      // Fill min stock level
      if (testData.minStockLevel !== undefined) {
        console.log(`  📝 Filling min stock level: ${testData.minStockLevel}`);
        const minStockInput = await this.page.locator('input[placeholder="2"], input[name="minStockLevel"], input[placeholder*="Minimum" i]').first();
        await minStockInput.click();
        await minStockInput.fill('');
        await minStockInput.type(String(testData.minStockLevel), { delay: 10 });
        await this.page.waitForTimeout(300);
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

  async uploadProductImage(imagePath = SAMPLE_IMAGE_PATH) {
    console.log('\n📷 Step 3: Uploading product image...');
    console.log(`  📁 Using image: ${imagePath}`);
    
    try {
      // Scroll to image upload section
      await this.page.evaluate(() => {
        const heading = Array.from(document.querySelectorAll('h3, h2, label'))
          .find(el => el.textContent.includes('Product Images') || el.textContent.includes('Images'));
        if (heading) {
          heading.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
      
      await this.page.waitForTimeout(1000);

      // Try to find file input
      const fileInput = await this.page.locator('input[type="file"]').first();
      
      if (await fileInput.count() === 0) {
        console.log('  ⚠️  No file input found, skipping image upload');
        await this.captureScreenshot('04-no-file-input');
        return true; // Non-critical
      }

      // Upload the image from FIGS folder
      console.log('  📁 Found file input, uploading image from FIGS folder...');
      try {
        await fileInput.setInputFiles(imagePath);
        await this.page.waitForTimeout(2000); // Wait for upload to process
        await this.captureScreenshot('04-image-uploaded');
        console.log('  ✅ Image uploaded successfully from FIGS folder');
      } catch (e) {
        console.log(`  ⚠️  Image upload failed: ${e.message}`);
        await this.captureScreenshot('04-upload-error');
      }

      return true;
    } catch (error) {
      console.log(`  ⚠️  Image upload issue: ${error.message}`);
      await this.captureScreenshot('warning-image-upload');
      return true; // Non-critical, continue
    }
  }

  async submitForm() {
    console.log('\n🚀 Step 4: Submitting form...');
    
    try {
      // Scroll to submit button
      await this.page.evaluate(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      });
      await this.page.waitForTimeout(1000);

      // Find submit button
      const submitButton = await this.page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Create"), button:has-text("Save Product")').first();
      
      if (await submitButton.count() === 0) {
        throw new Error('Submit button not found');
      }

      // Check if button is enabled
      const isDisabled = await submitButton.isDisabled();
      if (isDisabled) {
        console.log('  ⚠️  Submit button is disabled');
        await this.captureScreenshot('05-submit-disabled');
        
        // Check for validation errors
        const errorMessages = await this.page.locator('.error, .text-red-500, .text-red-600, [class*="error"]').allTextContents();
        if (errorMessages.length > 0) {
          console.log('  ❌ Validation errors found:');
          errorMessages.forEach(msg => console.log(`    - ${msg}`));
        }
        
        return { success: false, message: 'Submit button disabled - validation errors' };
      }

      await this.captureScreenshot('05-before-submit');
      
      // Click submit
      await submitButton.click();
      console.log('  ✅ Submit button clicked');

      // Wait for response
      await this.page.waitForTimeout(4000);
      await this.captureScreenshot('06-after-submit');

      // Check for success or error messages
      const bodyText = await this.page.textContent('body');
      const currentUrl = this.page.url();
      
      // Check for success indicators
      if (
        bodyText.toLowerCase().includes('success') || 
        bodyText.toLowerCase().includes('created') ||
        currentUrl.includes('/inventory') ||
        currentUrl.includes('/products') && !currentUrl.includes('/new')
      ) {
        console.log('  ✅ Product created successfully!');
        await this.captureScreenshot('07-success');
        return { success: true, message: 'Product created successfully' };
      } 
      
      // Check for error indicators
      if (
        bodyText.toLowerCase().includes('error') || 
        bodyText.toLowerCase().includes('failed') || 
        bodyText.includes('400') ||
        bodyText.includes('500')
      ) {
        console.log('  ❌ Error detected in response');
        
        // Try to extract error message
        const errorElements = await this.page.locator('.error, .text-red-500, [role="alert"]').allTextContents();
        const errorMsg = errorElements.length > 0 ? errorElements.join(', ') : 'Unknown error';
        
        await this.captureScreenshot('07-error-response');
        return { success: false, message: `Error: ${errorMsg}` };
      }
      
      // Unclear result
      console.log('  ⚠️  Unclear result - check screenshots');
      await this.captureScreenshot('07-unclear-result');
      return { success: null, message: 'Result unclear - please check screenshots' };
      
    } catch (error) {
      console.log(`  ❌ Error submitting form: ${error.message}`);
      await this.captureScreenshot('error-submit');
      return { success: false, message: error.message };
    }
  }

  async runCompleteTest(testData) {
    console.log(`\n${'='.repeat(60)}`);
    console.log('🧪 PRODUCT CREATION TEST - STARTING');
    console.log(`${'='.repeat(60)}`);

    const result = {
      testName: 'Product Creation Workflow',
      timestamp: new Date().toISOString(),
      testData,
      steps: {},
      screenshots: [],
      errors: [],
      consoleErrors: [],
      success: false
    };

    // Step 0: Login
    result.steps.login = await this.login();
    if (!result.steps.login) {
      result.errors = this.errors;
      result.consoleErrors = this.consoleErrors;
      return result;
    }

    // Step 1: Navigate
    result.steps.navigation = await this.navigateToProductCreation();
    if (!result.steps.navigation) {
      result.errors = this.errors;
      result.consoleErrors = this.consoleErrors;
      return result;
    }

    // Step 2: Fill form
    result.steps.formFill = await this.fillProductForm(testData);
    if (!result.steps.formFill) {
      result.errors = this.errors;
      result.consoleErrors = this.consoleErrors;
      return result;
    }

    // Step 3: Upload image (optional)
    result.steps.imageUpload = await this.uploadProductImage(testData.imagePath);

    // Step 4: Submit
    const submitResult = await this.submitForm();
    result.steps.submission = submitResult.success;
    result.message = submitResult.message;

    // Collect all errors
    result.errors = this.errors;
    result.consoleErrors = this.consoleErrors;

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
    console.log(`  0. Login: ${result.steps.login ? '✅' : '❌'}`);
    console.log(`  1. Navigation: ${result.steps.navigation ? '✅' : '❌'}`);
    console.log(`  2. Form Fill: ${result.steps.formFill ? '✅' : '❌'}`);
    console.log(`  3. Image Upload: ${result.steps.imageUpload ? '✅' : '⚠️'}`);
    console.log(`  4. Submission: ${result.steps.submission ? '✅' : '❌'}`);
    
    if (result.message) {
      console.log(`\nResult: ${result.message}`);
    }

    if (result.errors.length > 0) {
      console.log(`\n❌ Errors Detected (${result.errors.length}):`);
      result.errors.slice(0, 5).forEach((err, i) => {
        console.log(`  ${i + 1}. [${err.type}] ${err.message || err.url || JSON.stringify(err).substring(0, 100)}`);
      });
      if (result.errors.length > 5) {
        console.log(`  ... and ${result.errors.length - 5} more errors`);
      }
    }

    if (result.consoleErrors.length > 0) {
      console.log(`\n⚠️  Console Errors (${result.consoleErrors.length}):`);
      result.consoleErrors.slice(0, 3).forEach((err, i) => {
        console.log(`  ${i + 1}. [${err.type}] ${err.text.substring(0, 100)}`);
      });
      if (result.consoleErrors.length > 3) {
        console.log(`  ... and ${result.consoleErrors.length - 3} more console errors`);
      }
    }

    // Save JSON report
    const reportPath = join(SCREENSHOT_DIR, 'test-report.json');
    writeFileSync(reportPath, JSON.stringify(result, null, 2));
    console.log(`\n📄 JSON Report: ${reportPath}`);
    
    // Save markdown report
    this.generateMarkdownReport(result);

    // Generate HTML visual report
    this.generateHTMLReport(result);
  }

  generateMarkdownReport(result) {
    const md = [];
    
    md.push('# 🧪 Product Creation Test Report\n\n');
    md.push(`**Date:** ${new Date(result.timestamp).toLocaleString()}\n\n`);
    md.push(`**Status:** ${result.success ? '✅ PASSED' : '❌ FAILED'}\n\n`);
    md.push(`**Screenshots Captured:** ${result.screenshotCount}\n\n`);
    
    md.push('## Test Data\n\n');
    md.push('```json\n');
    md.push(JSON.stringify(result.testData, null, 2));
    md.push('\n```\n\n');
    
    md.push('## Test Steps\n\n');
    md.push(`0. **Login**: ${result.steps.login ? '✅ Success' : '❌ Failed'}\n`);
    md.push(`1. **Navigation to Product Creation Page**: ${result.steps.navigation ? '✅ Success' : '❌ Failed'}\n`);
    md.push(`2. **Form Fill**: ${result.steps.formFill ? '✅ Success' : '❌ Failed'}\n`);
    md.push(`3. **Image Upload**: ${result.steps.imageUpload ? '✅ Success' : '⚠️ Warning'}\n`);
    md.push(`4. **Form Submission**: ${result.steps.submission ? '✅ Success' : '❌ Failed'}\n\n`);
    
    if (result.message) {
      md.push(`## Result Message\n\n`);
      md.push(`\`\`\`\n${result.message}\n\`\`\`\n\n`);
    }
    
    if (result.errors.length > 0) {
      md.push(`## Errors (${result.errors.length})\n\n`);
      result.errors.forEach((err, i) => {
        md.push(`### Error ${i + 1}: ${err.type}\n\n`);
        md.push('```json\n');
        md.push(JSON.stringify(err, null, 2));
        md.push('\n```\n\n');
      });
    }

    if (result.consoleErrors.length > 0) {
      md.push(`## Console Errors (${result.consoleErrors.length})\n\n`);
      result.consoleErrors.slice(0, 10).forEach((err, i) => {
        md.push(`${i + 1}. **[${err.type}]** ${err.text}\n`);
      });
      md.push('\n');
    }
    
    md.push('## Screenshots\n\n');
    md.push(`All screenshots are saved in the \`${SCREENSHOT_DIR}\` directory.\n\n`);
    md.push('Screenshots are automatically captured:\n');
    md.push('- ✅ At each major step\n');
    md.push('- ❌ When errors occur\n');
    md.push('- 🐛 On console errors\n');
    md.push('- 🌐 On network failures\n');
    md.push('- ⚠️ On HTTP 4xx/5xx responses\n\n');
    
    md.push('---\n\n');
    md.push('*Generated by Product Creation Auto-Test Script*\n');

    const mdPath = join(SCREENSHOT_DIR, 'TEST-REPORT.md');
    writeFileSync(mdPath, md.join(''));
    console.log(`📄 Markdown Report: ${mdPath}`);
  }

  generateHTMLReport(result) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Product Creation Test Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    .header h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
    }
    .status {
      display: inline-block;
      padding: 10px 30px;
      border-radius: 50px;
      font-size: 1.2em;
      font-weight: bold;
      margin-top: 20px;
    }
    .status.passed {
      background: #10b981;
      color: white;
    }
    .status.failed {
      background: #ef4444;
      color: white;
    }
    .content {
      padding: 40px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section h2 {
      color: #667eea;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 3px solid #667eea;
    }
    .steps {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    .step {
      background: #f3f4f6;
      padding: 20px;
      border-radius: 10px;
      text-align: center;
    }
    .step-icon {
      font-size: 2em;
      margin-bottom: 10px;
    }
    .step-title {
      font-weight: bold;
      margin-bottom: 5px;
    }
    .screenshots {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    .screenshot {
      border: 3px solid #e5e7eb;
      border-radius: 10px;
      overflow: hidden;
      transition: transform 0.3s;
    }
    .screenshot:hover {
      transform: scale(1.05);
      border-color: #667eea;
    }
    .screenshot img {
      width: 100%;
      height: auto;
      display: block;
    }
    .error-box {
      background: #fee;
      border-left: 5px solid #ef4444;
      padding: 15px;
      margin: 10px 0;
      border-radius: 5px;
    }
    .info-box {
      background: #f0f9ff;
      border-left: 5px solid #3b82f6;
      padding: 15px;
      margin: 10px 0;
      border-radius: 5px;
    }
    pre {
      background: #1f2937;
      color: #10b981;
      padding: 15px;
      border-radius: 10px;
      overflow-x: auto;
      font-size: 0.9em;
    }
    .meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    .meta-item {
      background: #f9fafb;
      padding: 15px;
      border-radius: 10px;
      border-left: 4px solid #667eea;
    }
    .meta-label {
      font-size: 0.9em;
      color: #6b7280;
      margin-bottom: 5px;
    }
    .meta-value {
      font-size: 1.2em;
      font-weight: bold;
      color: #1f2937;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🧪 Product Creation Test Report</h1>
      <p>${new Date(result.timestamp).toLocaleString()}</p>
      <div class="status ${result.success ? 'passed' : 'failed'}">
        ${result.success ? '✅ PASSED' : '❌ FAILED'}
      </div>
    </div>
    
    <div class="content">
      <div class="section">
        <h2>📊 Test Summary</h2>
        <div class="meta">
          <div class="meta-item">
            <div class="meta-label">Screenshots</div>
            <div class="meta-value">${result.screenshotCount}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Errors</div>
            <div class="meta-value">${result.errors.length}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Console Errors</div>
            <div class="meta-value">${result.consoleErrors.length}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>📝 Test Steps</h2>
        <div class="steps">
          <div class="step">
            <div class="step-icon">${result.steps.login ? '✅' : '❌'}</div>
            <div class="step-title">Login</div>
          </div>
          <div class="step">
            <div class="step-icon">${result.steps.navigation ? '✅' : '❌'}</div>
            <div class="step-title">Navigation</div>
          </div>
          <div class="step">
            <div class="step-icon">${result.steps.formFill ? '✅' : '❌'}</div>
            <div class="step-title">Form Fill</div>
          </div>
          <div class="step">
            <div class="step-icon">${result.steps.imageUpload ? '✅' : '⚠️'}</div>
            <div class="step-title">Image Upload</div>
          </div>
          <div class="step">
            <div class="step-icon">${result.steps.submission ? '✅' : '❌'}</div>
            <div class="step-title">Submission</div>
          </div>
        </div>
      </div>

      ${result.message ? `
      <div class="section">
        <h2>💬 Result Message</h2>
        <div class="info-box">
          ${result.message}
        </div>
      </div>
      ` : ''}

      ${result.errors.length > 0 ? `
      <div class="section">
        <h2>❌ Errors (${result.errors.length})</h2>
        ${result.errors.map((err, i) => `
          <div class="error-box">
            <strong>Error ${i + 1}: ${err.type}</strong><br>
            <pre>${JSON.stringify(err, null, 2)}</pre>
          </div>
        `).join('')}
      </div>
      ` : ''}

      <div class="section">
        <h2>📸 Screenshots</h2>
        <p>All ${result.screenshotCount} screenshots are saved in the <code>${SCREENSHOT_DIR}</code> directory.</p>
        <p style="margin-top: 10px; color: #6b7280;">
          Screenshots are automatically captured at each step and whenever errors occur.
          Check the directory for detailed visual debugging information.
        </p>
      </div>

      <div class="section">
        <h2>🔧 Test Data</h2>
        <pre>${JSON.stringify(result.testData, null, 2)}</pre>
      </div>
    </div>
  </div>
</body>
</html>`;

    const htmlPath = join(SCREENSHOT_DIR, 'TEST-REPORT.html');
    writeFileSync(htmlPath, html);
    console.log(`📄 HTML Report: ${htmlPath}`);
    console.log(`   Open in browser: file://${join(process.cwd(), htmlPath)}`);
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Test data with multiple product samples
const TEST_PRODUCTS = [
  {
    name: `Test Headphones ${Date.now()}`,
    category: 'accessories',
    condition: 'new',
    sku: `TEST-HP-${Date.now()}`,
    description: 'Premium wireless headphones with noise cancellation. Auto-test product.',
    price: 299.99,
    costPrice: 150.00,
    stockQuantity: 10,
    minStockLevel: 2,
    imagePath: SAMPLE_IMAGE_PATH
  }
];

// Main execution
async function main() {
  const tester = new ProductCreationTester();
  
  try {
    await tester.init();
    
    // Run test with first product
    const result = await tester.runCompleteTest(TEST_PRODUCTS[0]);
    tester.generateReport(result);
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ Test completed!');
    console.log(`📁 Screenshots: ${SCREENSHOT_DIR}/`);
    console.log(`📄 Reports:`);
    console.log(`   - TEST-REPORT.md`);
    console.log(`   - TEST-REPORT.html (open in browser for visual report)`);
    console.log(`   - test-report.json`);
    console.log(`${'='.repeat(60)}\n`);
    
    // Wait a bit before closing so user can see final state
    await tester.page.waitForTimeout(3000);
    
    process.exit(result.success ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ Test failed with fatal error:', error);
    await tester.captureScreenshot('fatal-error');
    process.exit(1);
  } finally {
    await tester.cleanup();
  }
}

main();

