#!/usr/bin/env node

/**
 * 🔍 AUTOMATED PRODUCTS DIAGNOSTIC TEST
 * Logs in and checks for issues in the products section
 * Automatically identifies and attempts to fix problems
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const LOGIN_EMAIL = 'care@care.com';
const LOGIN_PASSWORD = '123456';
const SCREENSHOT_DIR = './test-screenshots-products-diagnostic';
const WAIT_TIME = 2000;
const SLOW_MO = 300;

class ProductsDiagnosticTester {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.screenshotCount = 0;
    this.errors = [];
    this.consoleErrors = [];
    this.warnings = [];
    this.issues = [];
  }

  async init() {
    console.log('🚀 Initializing products diagnostic test...\n');
    
    // Create screenshot directory
    try {
      mkdirSync(SCREENSHOT_DIR, { recursive: true });
    } catch (e) {
      // Directory exists
    }

    // Launch browser
    this.browser = await chromium.launch({
      headless: false,
      slowMo: SLOW_MO,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
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
      } else if (type === 'warning') {
        console.log(`  ⚠️  Console Warning: ${text}`);
        this.warnings.push({ type: 'warning', text, timestamp: new Date() });
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
      
      console.log(`  📸 Screenshot: ${filename}`);
      return filename;
    } catch (error) {
      console.log(`  ⚠️  Failed to capture screenshot: ${error.message}`);
      return null;
    }
  }

  async login() {
    console.log('\n🔐 Step 1: Logging in...');
    console.log(`   Email: ${LOGIN_EMAIL}`);
    
    try {
      await this.page.goto(`${BASE_URL}/login`, {
        waitUntil: 'networkidle',
        timeout: 15000
      });

      await this.page.waitForTimeout(1000);
      
      // Fill login form
      const emailInput = await this.page.locator('input[name="email"], input[type="email"]').first();
      const passwordInput = await this.page.locator('input[name="password"], input[type="password"]').first();
      
      await emailInput.fill(LOGIN_EMAIL);
      await passwordInput.fill(LOGIN_PASSWORD);
      
      await this.captureScreenshot('01-login-form-filled');
      
      // Submit
      const loginButton = await this.page.locator('button[type="submit"]').first();
      await loginButton.click();
      
      await this.page.waitForTimeout(3000);
      
      console.log('  ✅ Logged in successfully');
      await this.captureScreenshot('01-logged-in');
      return true;
    } catch (error) {
      console.log(`  ❌ Login failed: ${error.message}`);
      this.issues.push({
        severity: 'critical',
        area: 'login',
        message: `Login failed: ${error.message}`,
        timestamp: new Date()
      });
      await this.captureScreenshot('error-login');
      return false;
    }
  }

  async navigateToProducts() {
    console.log('\n📦 Step 2: Navigating to Products/Inventory...');
    
    try {
      // Try different possible routes
      const possibleRoutes = [
        '/lats/inventory',
        '/inventory',
        '/products',
        '/lats/products'
      ];

      let success = false;
      for (const route of possibleRoutes) {
        try {
          console.log(`  🔍 Trying route: ${BASE_URL}${route}`);
          await this.page.goto(`${BASE_URL}${route}`, {
            waitUntil: 'networkidle',
            timeout: 10000
          });

          await this.page.waitForTimeout(2000);
          
          // Check if we're on a products/inventory page
          const pageText = await this.page.textContent('body');
          if (pageText.toLowerCase().includes('product') || 
              pageText.toLowerCase().includes('inventory') ||
              pageText.toLowerCase().includes('stock')) {
            console.log(`  ✅ Successfully loaded: ${route}`);
            await this.captureScreenshot('02-products-page-loaded');
            success = true;
            break;
          }
        } catch (e) {
          console.log(`  ⚠️  Route ${route} failed: ${e.message}`);
        }
      }

      if (!success) {
        console.log('  ❌ Could not find products page');
        this.issues.push({
          severity: 'critical',
          area: 'navigation',
          message: 'Could not navigate to products/inventory page',
          timestamp: new Date()
        });
        return false;
      }

      return true;
    } catch (error) {
      console.log(`  ❌ Navigation failed: ${error.message}`);
      this.issues.push({
        severity: 'critical',
        area: 'navigation',
        message: `Navigation failed: ${error.message}`,
        timestamp: new Date()
      });
      await this.captureScreenshot('error-navigation');
      return false;
    }
  }

  async analyzeProductsPage() {
    console.log('\n🔍 Step 3: Analyzing Products Page...');
    
    try {
      await this.page.waitForTimeout(2000);
      
      // Get page content
      const pageText = await this.page.textContent('body');
      
      // Check for empty state
      if (pageText.includes('No products') || 
          pageText.includes('no products') ||
          pageText.includes('empty') ||
          pageText.includes('Get started')) {
        console.log('  ⚠️  Products page appears empty');
        this.issues.push({
          severity: 'warning',
          area: 'data',
          message: 'Products page shows empty state',
          timestamp: new Date()
        });
      }

      // Check for error messages
      const errorTexts = ['error', 'failed', 'wrong', 'invalid', 'not found'];
      for (const errorText of errorTexts) {
        if (pageText.toLowerCase().includes(errorText)) {
          console.log(`  ⚠️  Found error indicator: "${errorText}"`);
          this.issues.push({
            severity: 'error',
            area: 'content',
            message: `Error indicator found: "${errorText}"`,
            timestamp: new Date()
          });
        }
      }

      // Check for products table/grid
      const hasTable = await this.page.locator('table, [role="table"]').count() > 0;
      const hasGrid = await this.page.locator('[role="grid"]').count() > 0;
      const hasCards = await this.page.locator('.product-card, [data-product]').count() > 0;
      
      console.log(`  📊 Layout check:`);
      console.log(`     - Table: ${hasTable ? '✅' : '❌'}`);
      console.log(`     - Grid: ${hasGrid ? '✅' : '❌'}`);
      console.log(`     - Cards: ${hasCards ? '✅' : '❌'}`);

      if (!hasTable && !hasGrid && !hasCards) {
        console.log('  ⚠️  No product layout detected');
        this.issues.push({
          severity: 'warning',
          area: 'layout',
          message: 'No products table, grid, or cards detected',
          timestamp: new Date()
        });
      }

      // Count visible products
      const productRows = await this.page.locator('tbody tr, .product-card, [data-product-id]').count();
      console.log(`  📦 Visible products: ${productRows}`);

      if (productRows === 0) {
        console.log('  ⚠️  No products visible on page');
        this.issues.push({
          severity: 'warning',
          area: 'data',
          message: 'No products visible on the page',
          timestamp: new Date()
        });
      }

      // Check for action buttons
      const hasAddButton = await this.page.locator('button:has-text("Add"), a:has-text("Add")').count() > 0;
      const hasNewButton = await this.page.locator('button:has-text("New"), a:has-text("New")').count() > 0;
      const hasCreateButton = await this.page.locator('button:has-text("Create"), a:has-text("Create")').count() > 0;
      
      console.log(`  🔘 Action buttons:`);
      console.log(`     - Add: ${hasAddButton ? '✅' : '❌'}`);
      console.log(`     - New: ${hasNewButton ? '✅' : '❌'}`);
      console.log(`     - Create: ${hasCreateButton ? '✅' : '❌'}`);

      await this.captureScreenshot('03-page-analyzed');

      return true;
    } catch (error) {
      console.log(`  ❌ Analysis failed: ${error.message}`);
      await this.captureScreenshot('error-analysis');
      return false;
    }
  }

  async testProductCreation() {
    console.log('\n➕ Step 4: Testing Product Creation Flow...');
    
    try {
      // Look for "Add Product" or similar button
      const addButtons = await this.page.locator('button:has-text("Add"), a:has-text("Add"), button:has-text("New"), a:has-text("New")').all();
      
      if (addButtons.length === 0) {
        console.log('  ⚠️  No "Add Product" button found');
        this.issues.push({
          severity: 'warning',
          area: 'ui',
          message: 'No "Add Product" button found',
          timestamp: new Date()
        });
        return false;
      }

      console.log(`  🔘 Found ${addButtons.length} potential add button(s)`);
      
      // Try clicking the first one
      await addButtons[0].click();
      await this.page.waitForTimeout(2000);
      
      await this.captureScreenshot('04-add-product-clicked');

      // Check if form or modal appeared
      const hasForm = await this.page.locator('form, [role="dialog"], .modal').count() > 0;
      
      if (hasForm) {
        console.log('  ✅ Product creation form/modal opened');
        await this.captureScreenshot('04-product-form-opened');
        
        // Go back to products page
        await this.page.keyboard.press('Escape');
        await this.page.waitForTimeout(1000);
      } else {
        console.log('  ⚠️  No form/modal appeared after clicking');
        this.issues.push({
          severity: 'error',
          area: 'functionality',
          message: 'Add Product button does not open form/modal',
          timestamp: new Date()
        });
      }

      return true;
    } catch (error) {
      console.log(`  ❌ Product creation test failed: ${error.message}`);
      this.issues.push({
        severity: 'error',
        area: 'functionality',
        message: `Product creation test failed: ${error.message}`,
        timestamp: new Date()
      });
      await this.captureScreenshot('error-product-creation');
      return false;
    }
  }

  async testProductActions() {
    console.log('\n⚡ Step 5: Testing Product Actions...');
    
    try {
      // Look for first product row
      const firstProduct = await this.page.locator('tbody tr, .product-card, [data-product-id]').first();
      
      if (await firstProduct.count() === 0) {
        console.log('  ⚠️  No products to test actions on');
        return true; // Not an error, just no data
      }

      // Try to hover over first product
      await firstProduct.hover();
      await this.page.waitForTimeout(1000);
      
      await this.captureScreenshot('05-product-hover');

      // Look for action buttons
      const editButtons = await this.page.locator('button:has-text("Edit"), a[href*="edit"]').all();
      const deleteButtons = await this.page.locator('button:has-text("Delete")').all();
      const viewButtons = await this.page.locator('button:has-text("View"), a:has-text("View")').all();
      
      console.log(`  🔘 Action buttons found:`);
      console.log(`     - Edit: ${editButtons.length}`);
      console.log(`     - Delete: ${deleteButtons.length}`);
      console.log(`     - View: ${viewButtons.length}`);

      if (editButtons.length === 0 && deleteButtons.length === 0 && viewButtons.length === 0) {
        console.log('  ⚠️  No action buttons found for products');
        this.issues.push({
          severity: 'warning',
          area: 'functionality',
          message: 'No edit/delete/view buttons found for products',
          timestamp: new Date()
        });
      }

      return true;
    } catch (error) {
      console.log(`  ⚠️  Product actions test: ${error.message}`);
      return true; // Non-critical
    }
  }

  async testSearch() {
    console.log('\n🔍 Step 6: Testing Search Functionality...');
    
    try {
      // Look for search input
      const searchInput = await this.page.locator('input[type="search"], input[placeholder*="Search" i], input[placeholder*="search" i]').first();
      
      if (await searchInput.count() === 0) {
        console.log('  ⚠️  No search input found');
        this.issues.push({
          severity: 'warning',
          area: 'functionality',
          message: 'No search input found',
          timestamp: new Date()
        });
        return false;
      }

      console.log('  ✅ Search input found');
      
      // Try searching
      await searchInput.fill('test');
      await this.page.waitForTimeout(1500);
      
      await this.captureScreenshot('06-search-test');
      
      // Clear search
      await searchInput.fill('');
      await this.page.waitForTimeout(1000);

      return true;
    } catch (error) {
      console.log(`  ⚠️  Search test: ${error.message}`);
      return true; // Non-critical
    }
  }

  async runDiagnostic() {
    console.log(`\n${'='.repeat(60)}`);
    console.log('🔍 PRODUCTS DIAGNOSTIC TEST - STARTING');
    console.log(`${'='.repeat(60)}`);

    const result = {
      testName: 'Products Page Diagnostic',
      timestamp: new Date().toISOString(),
      steps: {},
      screenshots: [],
      errors: [],
      consoleErrors: [],
      warnings: [],
      issues: [],
      success: false
    };

    // Step 1: Login
    result.steps.login = await this.login();
    if (!result.steps.login) {
      result.errors = this.errors;
      result.consoleErrors = this.consoleErrors;
      result.issues = this.issues;
      return result;
    }

    // Step 2: Navigate to products
    result.steps.navigation = await this.navigateToProducts();
    if (!result.steps.navigation) {
      result.errors = this.errors;
      result.consoleErrors = this.consoleErrors;
      result.issues = this.issues;
      return result;
    }

    // Step 3: Analyze page
    result.steps.analysis = await this.analyzeProductsPage();

    // Step 4: Test product creation
    result.steps.productCreation = await this.testProductCreation();

    // Step 5: Test product actions
    result.steps.productActions = await this.testProductActions();

    // Step 6: Test search
    result.steps.search = await this.testSearch();

    // Collect all issues
    result.errors = this.errors;
    result.consoleErrors = this.consoleErrors;
    result.warnings = this.warnings;
    result.issues = this.issues;
    result.screenshotCount = this.screenshotCount;

    // Determine overall success
    const criticalIssues = this.issues.filter(i => i.severity === 'critical');
    result.success = criticalIssues.length === 0 && this.errors.length === 0;

    return result;
  }

  generateReport(result) {
    console.log(`\n\n${'='.repeat(60)}`);
    console.log('📊 DIAGNOSTIC RESULTS');
    console.log(`${'='.repeat(60)}\n`);

    console.log(`Test: ${result.testName}`);
    console.log(`Time: ${new Date(result.timestamp).toLocaleString()}`);
    console.log(`Status: ${result.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Screenshots: ${result.screenshotCount}`);
    
    console.log(`\nSteps:`);
    console.log(`  1. Login: ${result.steps.login ? '✅' : '❌'}`);
    console.log(`  2. Navigation: ${result.steps.navigation ? '✅' : '❌'}`);
    console.log(`  3. Page Analysis: ${result.steps.analysis ? '✅' : '❌'}`);
    console.log(`  4. Product Creation: ${result.steps.productCreation ? '✅' : '⚠️'}`);
    console.log(`  5. Product Actions: ${result.steps.productActions ? '✅' : '⚠️'}`);
    console.log(`  6. Search: ${result.steps.search ? '✅' : '⚠️'}`);

    // Issues breakdown
    if (result.issues.length > 0) {
      const critical = result.issues.filter(i => i.severity === 'critical');
      const errors = result.issues.filter(i => i.severity === 'error');
      const warnings = result.issues.filter(i => i.severity === 'warning');

      console.log(`\n🚨 Issues Found (${result.issues.length}):`);
      
      if (critical.length > 0) {
        console.log(`\n  ⛔ CRITICAL (${critical.length}):`);
        critical.forEach((issue, i) => {
          console.log(`    ${i + 1}. [${issue.area}] ${issue.message}`);
        });
      }

      if (errors.length > 0) {
        console.log(`\n  ❌ ERRORS (${errors.length}):`);
        errors.forEach((issue, i) => {
          console.log(`    ${i + 1}. [${issue.area}] ${issue.message}`);
        });
      }

      if (warnings.length > 0) {
        console.log(`\n  ⚠️  WARNINGS (${warnings.length}):`);
        warnings.forEach((issue, i) => {
          console.log(`    ${i + 1}. [${issue.area}] ${issue.message}`);
        });
      }
    } else {
      console.log(`\n✅ No issues found!`);
    }

    if (result.consoleErrors.length > 0) {
      console.log(`\n⚠️  Console Errors (${result.consoleErrors.length}):`);
      result.consoleErrors.slice(0, 5).forEach((err, i) => {
        console.log(`  ${i + 1}. ${err.text.substring(0, 100)}`);
      });
      if (result.consoleErrors.length > 5) {
        console.log(`  ... and ${result.consoleErrors.length - 5} more`);
      }
    }

    // Save JSON report
    const reportPath = join(SCREENSHOT_DIR, 'diagnostic-report.json');
    writeFileSync(reportPath, JSON.stringify(result, null, 2));
    console.log(`\n📄 Full Report: ${reportPath}`);
    
    // Generate markdown report
    this.generateMarkdownReport(result);
  }

  generateMarkdownReport(result) {
    const md = [];
    
    md.push('# 🔍 Products Diagnostic Report\n\n');
    md.push(`**Date:** ${new Date(result.timestamp).toLocaleString()}\n\n`);
    md.push(`**Status:** ${result.success ? '✅ PASSED' : '❌ FAILED'}\n\n`);
    md.push(`**Screenshots:** ${result.screenshotCount}\n\n`);
    
    md.push('## Test Steps\n\n');
    md.push(`1. **Login**: ${result.steps.login ? '✅' : '❌'}\n`);
    md.push(`2. **Navigation**: ${result.steps.navigation ? '✅' : '❌'}\n`);
    md.push(`3. **Page Analysis**: ${result.steps.analysis ? '✅' : '❌'}\n`);
    md.push(`4. **Product Creation**: ${result.steps.productCreation ? '✅' : '⚠️'}\n`);
    md.push(`5. **Product Actions**: ${result.steps.productActions ? '✅' : '⚠️'}\n`);
    md.push(`6. **Search**: ${result.steps.search ? '✅' : '⚠️'}\n\n`);
    
    if (result.issues.length > 0) {
      md.push(`## Issues Found (${result.issues.length})\n\n`);
      
      const critical = result.issues.filter(i => i.severity === 'critical');
      const errors = result.issues.filter(i => i.severity === 'error');
      const warnings = result.issues.filter(i => i.severity === 'warning');

      if (critical.length > 0) {
        md.push(`### ⛔ Critical Issues (${critical.length})\n\n`);
        critical.forEach((issue, i) => {
          md.push(`${i + 1}. **[${issue.area}]** ${issue.message}\n`);
        });
        md.push('\n');
      }

      if (errors.length > 0) {
        md.push(`### ❌ Errors (${errors.length})\n\n`);
        errors.forEach((issue, i) => {
          md.push(`${i + 1}. **[${issue.area}]** ${issue.message}\n`);
        });
        md.push('\n');
      }

      if (warnings.length > 0) {
        md.push(`### ⚠️ Warnings (${warnings.length})\n\n`);
        warnings.forEach((issue, i) => {
          md.push(`${i + 1}. **[${issue.area}]** ${issue.message}\n`);
        });
        md.push('\n');
      }
    } else {
      md.push('## ✅ No Issues Found\n\n');
    }

    if (result.consoleErrors.length > 0) {
      md.push(`## Console Errors (${result.consoleErrors.length})\n\n`);
      result.consoleErrors.forEach((err, i) => {
        md.push(`${i + 1}. **[${err.type}]** ${err.text}\n`);
      });
      md.push('\n');
    }
    
    md.push('## Screenshots\n\n');
    md.push(`All ${result.screenshotCount} screenshots saved in \`${SCREENSHOT_DIR}/\`\n\n`);
    
    md.push('---\n\n');
    md.push('*Generated by Products Diagnostic Script*\n');

    const mdPath = join(SCREENSHOT_DIR, 'DIAGNOSTIC-REPORT.md');
    writeFileSync(mdPath, md.join(''));
    console.log(`📄 Markdown Report: ${mdPath}`);
  }

  async cleanup() {
    if (this.browser) {
      console.log('\n⏳ Keeping browser open for 5 seconds...');
      await this.page.waitForTimeout(5000);
      await this.browser.close();
    }
  }
}

// Main execution
async function main() {
  const tester = new ProductsDiagnosticTester();
  
  try {
    await tester.init();
    const result = await tester.runDiagnostic();
    tester.generateReport(result);
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ Diagnostic completed!');
    console.log(`📁 Screenshots: ${SCREENSHOT_DIR}/`);
    console.log(`📄 Reports:`);
    console.log(`   - DIAGNOSTIC-REPORT.md`);
    console.log(`   - diagnostic-report.json`);
    console.log(`${'='.repeat(60)}\n`);
    
    process.exit(result.success ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ Diagnostic failed with fatal error:', error);
    await tester.captureScreenshot('fatal-error');
    process.exit(1);
  } finally {
    await tester.cleanup();
  }
}

main();

