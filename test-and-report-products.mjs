#!/usr/bin/env node

/**
 * Simple Product Test & Report
 * Tests products in the UI and provides a detailed report
 */

import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:5173';
const TEST_EMAIL = 'care@care.com';
const TEST_PASSWORD = '123456';

class ProductReporter {
  constructor() {
    this.browser = null;
    this.page = null;
    this.findings = {
      login: { success: false, details: '' },
      branch: { id: null, name: null },
      productsPage: { loaded: false, productCount: 0, errors: [] },
      addProductPage: { loaded: false, formFields: 0 },
      issues: [],
      recommendations: []
    };
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      error: '\x1b[31m',
      warning: '\x1b[33m',
      reset: '\x1b[0m'
    };
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${colors[type]}${prefix} ${message}${colors.reset}`);
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async init() {
    this.log('Launching browser...');
    this.browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1920, height: 1080 },
      args: ['--start-maximized']
    });
    this.page = await this.browser.newPage();
    
    // Collect console errors
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        this.findings.productsPage.errors.push(msg.text());
      }
    });
  }

  async login() {
    try {
      this.log(`Navigating to login page...`);
      await this.page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle2', timeout: 15000 });
      await this.sleep(1000);

      this.log(`Logging in as ${TEST_EMAIL}...`);
      await this.page.waitForSelector('input[type="email"]', { timeout: 10000 });
      await this.page.type('input[type="email"]', TEST_EMAIL);
      await this.page.type('input[type="password"]', TEST_PASSWORD);
      await this.page.click('button[type="submit"]');
      
      await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
      
      // Get branch info
      const branchInfo = await this.page.evaluate(() => ({
        current_branch_id: localStorage.getItem('current_branch_id'),
        current_branch_name: localStorage.getItem('current_branch_name')
      }));
      
      this.findings.branch.id = branchInfo.current_branch_id;
      this.findings.branch.name = branchInfo.current_branch_name;
      this.findings.login.success = true;
      this.findings.login.details = 'Successfully logged in';
      
      this.log('Login successful', 'success');
      await this.sleep(2000);
    } catch (error) {
      this.findings.login.success = false;
      this.findings.login.details = error.message;
      this.findings.issues.push({ type: 'Login Error', message: error.message });
      throw error;
    }
  }

  async checkProductsPage() {
    try {
      this.log('Checking products page...');
      await this.page.goto(`${BASE_URL}/lats/products`, { waitUntil: 'networkidle2', timeout: 15000 });
      await this.sleep(3000);
      
      // Take screenshot
      await this.page.screenshot({ path: 'report-products-page.png', fullPage: true });
      
      // Check for products in the page
      const pageAnalysis = await this.page.evaluate(() => {
        const bodyText = document.body.innerText;
        
        // Look for product table/grid elements
        const productRows = document.querySelectorAll('[class*="product-row"], tr[class*="product"], [class*="ProductCard"]');
        const productCards = document.querySelectorAll('[data-product-id]');
        const tableRows = document.querySelectorAll('table tbody tr');
        
        // Check for "no products" messages
        const hasNoProductsMessage = bodyText.toLowerCase().includes('no products') || 
                                     bodyText.toLowerCase().includes('no items') ||
                                     bodyText.includes('0 products');
        
        // Check for loading state
        const isLoading = bodyText.includes('Loading') || 
                         document.querySelector('[class*="loading"]') !== null;
        
        // Get any error messages
        const errorElements = document.querySelectorAll('[class*="error"], .text-red-500, .text-red-600');
        const errorMessages = Array.from(errorElements).map(el => el.textContent?.trim()).filter(Boolean);
        
        return {
          productRows: productRows.length,
          productCards: productCards.length,
          tableRows: tableRows.length,
          hasNoProductsMessage,
          isLoading,
          errorMessages,
          bodyTextSample: bodyText.substring(0, 500)
        };
      });
      
      this.findings.productsPage.loaded = true;
      this.findings.productsPage.productCount = Math.max(
        pageAnalysis.productRows,
        pageAnalysis.productCards,
        pageAnalysis.tableRows - 1 // Subtract header row
      );
      
      if (pageAnalysis.errorMessages.length > 0) {
        this.findings.productsPage.errors.push(...pageAnalysis.errorMessages);
        this.findings.issues.push({ 
          type: 'Products Page Errors', 
          message: pageAnalysis.errorMessages.join('; ') 
        });
      }
      
      if (pageAnalysis.hasNoProductsMessage) {
        this.findings.issues.push({ 
          type: 'No Products', 
          message: 'Page shows "No products" message' 
        });
        this.findings.recommendations.push('Create at least one product to test the products page');
      }
      
      if (this.findings.productsPage.productCount === 0 && !pageAnalysis.hasNoProductsMessage) {
        this.findings.issues.push({ 
          type: 'Products Not Displayed', 
          message: 'Products may exist but are not being rendered in the UI' 
        });
        this.findings.recommendations.push('Check browser console for JavaScript errors');
        this.findings.recommendations.push('Verify branch filtering is working correctly');
      }
      
      this.log(`Products page analysis: ${this.findings.productsPage.productCount} products found`, 
               this.findings.productsPage.productCount > 0 ? 'success' : 'warning');
      
    } catch (error) {
      this.findings.productsPage.loaded = false;
      this.findings.issues.push({ type: 'Products Page Error', message: error.message });
      this.log(`Failed to check products page: ${error.message}`, 'error');
    }
  }

  async checkAddProductPage() {
    try {
      this.log('Checking add product page...');
      await this.page.goto(`${BASE_URL}/lats/add-product`, { waitUntil: 'networkidle2', timeout: 15000 });
      await this.sleep(2000);
      
      // Take screenshot
      await this.page.screenshot({ path: 'report-add-product-page.png', fullPage: true });
      
      const formAnalysis = await this.page.evaluate(() => {
        const inputs = document.querySelectorAll('input, select, textarea');
        const buttons = document.querySelectorAll('button');
        const hasNameField = !!document.querySelector('input[name="name"], input[placeholder*="name" i], input[placeholder*="product name" i]');
        const hasSKUField = !!document.querySelector('input[name="sku"], input[placeholder*="sku" i]');
        const hasPriceField = !!document.querySelector('input[name="price"], input[placeholder*="price" i]');
        const hasVariantsSection = document.body.innerText.toLowerCase().includes('variant');
        const hasSaveButton = Array.from(buttons).some(btn => 
          btn.textContent?.toLowerCase().includes('save') || 
          btn.textContent?.toLowerCase().includes('create') ||
          btn.textContent?.toLowerCase().includes('add product')
        );
        
        return {
          totalInputs: inputs.length,
          totalButtons: buttons.length,
          hasNameField,
          hasSKUField,
          hasPriceField,
          hasVariantsSection,
          hasSaveButton
        };
      });
      
      this.findings.addProductPage.loaded = true;
      this.findings.addProductPage.formFields = formAnalysis.totalInputs;
      
      // Check for missing critical fields
      if (!formAnalysis.hasNameField || !formAnalysis.hasSKUField) {
        this.findings.issues.push({ 
          type: 'Add Product Form Incomplete', 
          message: `Missing critical fields: ${!formAnalysis.hasNameField ? 'Name ' : ''}${!formAnalysis.hasSKUField ? 'SKU' : ''}` 
        });
      }
      
      if (!formAnalysis.hasSaveButton) {
        this.findings.issues.push({ 
          type: 'No Save Button', 
          message: 'Could not find save/create button on add product page' 
        });
      }
      
      this.log(`Add product page has ${formAnalysis.totalInputs} form fields`, 'success');
      
    } catch (error) {
      this.findings.addProductPage.loaded = false;
      this.findings.issues.push({ type: 'Add Product Page Error', message: error.message });
      this.log(`Failed to check add product page: ${error.message}`, 'error');
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('                    📊 PRODUCT TESTING REPORT');
    console.log('='.repeat(80) + '\n');
    
    // Login Status
    console.log('🔐 LOGIN STATUS');
    console.log(`   Status: ${this.findings.login.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`   Details: ${this.findings.login.details}`);
    console.log(`   Branch ID: ${this.findings.branch.id || 'Not set'}`);
    console.log(`   Branch Name: ${this.findings.branch.name || 'Not set'}\n`);
    
    // Products Page
    console.log('📦 PRODUCTS PAGE');
    console.log(`   Loaded: ${this.findings.productsPage.loaded ? '✅ Yes' : '❌ No'}`);
    console.log(`   Products Found: ${this.findings.productsPage.productCount}`);
    if (this.findings.productsPage.errors.length > 0) {
      console.log(`   Errors: ${this.findings.productsPage.errors.length}`);
      this.findings.productsPage.errors.slice(0, 3).forEach((err, i) => {
        console.log(`     ${i + 1}. ${err.substring(0, 100)}`);
      });
    }
    console.log(`   Screenshot: report-products-page.png\n`);
    
    // Add Product Page
    console.log('➕ ADD PRODUCT PAGE');
    console.log(`   Loaded: ${this.findings.addProductPage.loaded ? '✅ Yes' : '❌ No'}`);
    console.log(`   Form Fields: ${this.findings.addProductPage.formFields}`);
    console.log(`   Screenshot: report-add-product-page.png\n`);
    
    // Issues
    console.log('⚠️  ISSUES FOUND');
    if (this.findings.issues.length === 0) {
      console.log('   ✅ No issues detected!\n');
    } else {
      console.log(`   Found ${this.findings.issues.length} issue(s):\n`);
      this.findings.issues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue.type}`);
        console.log(`      ${issue.message}\n`);
      });
    }
    
    // Recommendations
    if (this.findings.recommendations.length > 0) {
      console.log('💡 RECOMMENDATIONS');
      this.findings.recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
      console.log('');
    }
    
    // Next Steps
    console.log('🎯 NEXT STEPS');
    if (this.findings.productsPage.productCount === 0) {
      console.log('   1. Check if products exist in the database');
      console.log('   2. Verify branch filtering (products must belong to current branch)');
      console.log('   3. Check RLS policies (run: 🔥-FIX-PRODUCT-CREATION-RLS-COMPLETE.sql)');
      console.log('   4. Create a test product using the Add Product page');
    } else {
      console.log('   ✅ Products are displaying correctly!');
      console.log('   • Try creating a new product');
      console.log('   • Test editing an existing product');
      console.log('   • Verify variant functionality');
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
  }

  async cleanup() {
    if (this.browser) {
      await this.sleep(3000);
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.init();
      await this.login();
      await this.checkProductsPage();
      await this.checkAddProductPage();
      this.generateReport();
    } catch (error) {
      this.log(`Fatal error: ${error.message}`, 'error');
      console.error(error.stack);
    } finally {
      await this.cleanup();
    }
  }
}

// Run the reporter
const reporter = new ProductReporter();
reporter.run().catch(console.error);

