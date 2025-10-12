#!/usr/bin/env node

/**
 * 🧪 COMPREHENSIVE APP TESTING SCRIPT
 * Tests ALL features of the POS application
 * Takes screenshots of every page
 * Documents all errors and issues
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = './test-screenshots-comprehensive';
const WAIT_TIME = 3000; // 3 seconds for pages to load

// All routes to test
const ROUTES_TO_TEST = [
  // Core Pages
  { path: '/dashboard', name: 'Dashboard', category: 'Core' },
  { path: '/devices', name: 'Devices', category: 'Core' },
  { path: '/customers', name: 'Customers', category: 'Core' },
  { path: '/pos', name: 'POS System', category: 'Core' },
  
  // Appointments & Services
  { path: '/appointments', name: 'Appointments', category: 'Scheduling' },
  { path: '/services', name: 'Services', category: 'Scheduling' },
  { path: '/calendar', name: 'Calendar', category: 'Scheduling' },
  
  // Inventory & Products
  { path: '/lats/unified-inventory', name: 'Unified Inventory', category: 'Inventory' },
  { path: '/stock-value', name: 'Stock Value', category: 'Inventory' },
  { path: '/inventory-manager', name: 'Inventory Manager', category: 'Inventory' },
  { path: '/lats/serial-manager', name: 'Serial Manager', category: 'Inventory' },
  { path: '/lats/spare-parts', name: 'Spare Parts', category: 'Inventory' },
  { path: '/add-product', name: 'Add Product', category: 'Inventory' },
  
  // Purchase & Suppliers
  { path: '/lats/purchase-orders', name: 'Purchase Orders', category: 'Purchasing' },
  { path: '/supplier-management', name: 'Supplier Management', category: 'Purchasing' },
  { path: '/lats/storage-rooms', name: 'Storage Rooms', category: 'Purchasing' },
  
  // HR & Staff
  { path: '/employees', name: 'Employees', category: 'HR' },
  { path: '/attendance', name: 'Attendance', category: 'HR' },
  
  // Diagnostics & Repairs
  { path: '/diagnostics', name: 'Diagnostics', category: 'Repairs' },
  { path: '/business', name: 'Business', category: 'Analytics' },
  
  // Finance
  { path: '/finance', name: 'Finance Management', category: 'Finance' },
  { path: '/finance/payments', name: 'Payment Management', category: 'Finance' },
  { path: '/sales-reports', name: 'Sales Reports', category: 'Reports' },
  { path: '/loyalty', name: 'Customer Loyalty', category: 'Analytics' },
  { path: '/payments', name: 'Payment Tracking', category: 'Finance' },
  
  // Communication
  { path: '/lats/whatsapp-chat', name: 'WhatsApp Chat', category: 'Communication' },
  { path: '/lats/whatsapp-connection-manager', name: 'WhatsApp Connections', category: 'Communication' },
  { path: '/instagram/dm', name: 'Instagram DMs', category: 'Communication' },
  
  // Admin & Settings
  { path: '/admin-management', name: 'Admin Management', category: 'Admin' },
  { path: '/settings', name: 'Settings', category: 'Admin' },
  { path: '/ad-generator', name: 'Product Ad Generator', category: 'Marketing' },
];

class ComprehensiveTester {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.results = [];
    this.errors = [];
    this.screenshots = [];
  }

  async init() {
    console.log('🚀 Initializing comprehensive test...\n');
    
    // Create screenshot directory
    try {
      mkdirSync(SCREENSHOT_DIR, { recursive: true });
    } catch (e) {
      // Directory exists
    }

    // Launch browser
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });

    this.page = await this.context.newPage();
    
    // Set longer timeout
    this.page.setDefaultTimeout(30000);
  }

  async testRoute(route) {
    const { path, name, category } = route;
    console.log(`\n📄 Testing: ${name} (${path})`);

    try {
      const startTime = Date.now();
      
      // Navigate to the route
      const response = await this.page.goto(`${BASE_URL}${path}`, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Wait for page to stabilize
      await this.page.waitForTimeout(WAIT_TIME);

      const loadTime = Date.now() - startTime;
      
      // Check if page loaded successfully
      const status = response?.status() || 0;
      
      // Take screenshot
      const screenshotName = `${this.results.length + 1}-${name.toLowerCase().replace(/\s+/g, '-')}.png`;
      const screenshotPath = join(SCREENSHOT_DIR, screenshotName);
      await this.page.screenshot({ 
        path: screenshotPath, 
        fullPage: true 
      });

      // Check for console errors
      const errors = [];
      this.page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      // Check for visible error messages
      const hasErrorText = await this.page.evaluate(() => {
        const bodyText = document.body.textContent || '';
        return bodyText.includes('Error') || 
               bodyText.includes('Failed') || 
               bodyText.includes('Something went wrong');
      });

      // Get page title
      const title = await this.page.title();

      // Check if page has content
      const hasContent = await this.page.evaluate(() => {
        return document.body.innerHTML.length > 1000; // Basic check
      });

      const testResult = {
        name,
        path,
        category,
        status: status === 200 ? 'success' : 'warning',
        loadTime: `${loadTime}ms`,
        screenshot: screenshotName,
        hasContent,
        hasErrorText,
        httpStatus: status,
        title,
        timestamp: new Date().toISOString()
      };

      this.results.push(testResult);
      this.screenshots.push(screenshotPath);

      console.log(`  ✅ Status: ${status}`);
      console.log(`  ⏱️  Load Time: ${loadTime}ms`);
      console.log(`  📸 Screenshot: ${screenshotName}`);
      
      if (hasErrorText) {
        console.log(`  ⚠️  Warning: Page contains error text`);
      }

      return testResult;

    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
      
      const errorResult = {
        name,
        path,
        category,
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };

      this.results.push(errorResult);
      this.errors.push({ route: name, error: error.message });

      return errorResult;
    }
  }

  async runAllTests() {
    console.log(`\n${'='.repeat(60)}`);
    console.log('🧪 COMPREHENSIVE APPLICATION TESTING');
    console.log(`Testing ${ROUTES_TO_TEST.length} routes`);
    console.log(`${'='.repeat(60)}\n`);

    for (const route of ROUTES_TO_TEST) {
      await this.testRoute(route);
    }
  }

  generateReport() {
    console.log(`\n\n${'='.repeat(60)}`);
    console.log('📊 TEST SUMMARY');
    console.log(`${'='.repeat(60)}\n`);

    const successCount = this.results.filter(r => r.status === 'success').length;
    const warningCount = this.results.filter(r => r.status === 'warning').length;
    const errorCount = this.results.filter(r => r.status === 'error').length;
    const total = this.results.length;

    console.log(`Total Routes Tested: ${total}`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`⚠️  Warnings: ${warningCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📸 Screenshots: ${this.screenshots.length}`);

    // Group by category
    const byCategory = {};
    this.results.forEach(r => {
      if (!byCategory[r.category]) {
        byCategory[r.category] = [];
      }
      byCategory[r.category].push(r);
    });

    console.log(`\n📑 Results by Category:\n`);
    Object.entries(byCategory).forEach(([category, results]) => {
      const success = results.filter(r => r.status === 'success').length;
      const total = results.length;
      console.log(`  ${category}: ${success}/${total} ✅`);
    });

    // Save detailed report
    const report = {
      summary: {
        total,
        successful: successCount,
        warnings: warningCount,
        errors: errorCount,
        screenshotCount: this.screenshots.length,
        testDate: new Date().toISOString()
      },
      byCategory,
      allResults: this.results,
      errors: this.errors,
      screenshots: this.screenshots
    };

    const reportPath = join(SCREENSHOT_DIR, 'test-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved: ${reportPath}`);

    return report;
  }

  generateMarkdownReport(report) {
    const md = [];
    
    md.push('# 🧪 Comprehensive Application Test Report\n');
    md.push(`**Date:** ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n`);
    md.push(`**Total Routes Tested:** ${report.summary.total}\n`);
    md.push(`**Success Rate:** ${((report.summary.successful / report.summary.total) * 100).toFixed(1)}%\n`);
    md.push('\n---\n\n');
    
    md.push('## 📊 Summary\n\n');
    md.push(`- ✅ Successful: ${report.summary.successful}\n`);
    md.push(`- ⚠️  Warnings: ${report.summary.warnings}\n`);
    md.push(`- ❌ Errors: ${report.summary.errors}\n`);
    md.push(`- 📸 Screenshots: ${report.summary.screenshotCount}\n`);
    md.push('\n---\n\n');

    md.push('## 📁 Results by Category\n\n');
    Object.entries(report.byCategory).forEach(([category, results]) => {
      md.push(`### ${category}\n\n`);
      md.push('| Page | Status | Load Time | Screenshot |\n');
      md.push('|------|--------|-----------|------------|\n');
      
      results.forEach(r => {
        const statusIcon = r.status === 'success' ? '✅' : 
                          r.status === 'warning' ? '⚠️' : '❌';
        md.push(`| ${r.name} | ${statusIcon} ${r.status} | ${r.loadTime || 'N/A'} | ${r.screenshot || 'N/A'} |\n`);
      });
      md.push('\n');
    });

    if (report.errors.length > 0) {
      md.push('## ❌ Errors Encountered\n\n');
      report.errors.forEach((err, idx) => {
        md.push(`${idx + 1}. **${err.route}**: ${err.error}\n`);
      });
      md.push('\n');
    }

    md.push('---\n\n');
    md.push('*Generated by Comprehensive Testing Script*\n');

    const mdPath = join(SCREENSHOT_DIR, 'TEST-REPORT.md');
    writeFileSync(mdPath, md.join(''));
    console.log(`📄 Markdown report saved: ${mdPath}\n`);
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Run the tests
async function main() {
  const tester = new ComprehensiveTester();
  
  try {
    await tester.init();
    await tester.runAllTests();
    const report = tester.generateReport();
    tester.generateMarkdownReport(report);
    
    console.log('\n✅ Comprehensive testing completed!\n');
    console.log(`📁 All screenshots saved in: ${SCREENSHOT_DIR}/`);
    console.log(`📄 Report files: TEST-REPORT.md & test-report.json\n`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await tester.cleanup();
  }
}

main();

