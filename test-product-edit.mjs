import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const LOGIN_EMAIL = 'care@care.com';
const LOGIN_PASSWORD = '123456';

class ProductEditTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.issues = [];
    this.consoleErrors = [];
    this.screenshots = [];
  }

  async init() {
    console.log('🚀 Initializing browser...');
    this.browser = await chromium.launch({
      headless: false,
      slowMo: 500, // Slow down for better visibility
    });
    
    const context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });
    
    this.page = await context.newPage();
    
    // Listen to console messages
    this.page.on('console', msg => {
      const text = msg.text();
      const type = msg.type();
      
      if (type === 'error') {
        console.log(`  ⚠️  Console Error: ${text}`);
        this.consoleErrors.push(text);
      }
    });
    
    // Listen to page errors
    this.page.on('pageerror', error => {
      console.log(`  ❌ Page Error: ${error.message}`);
      this.consoleErrors.push(error.message);
    });
  }

  async captureScreenshot(label) {
    try {
      const filename = `screenshots/edit-${label}-${Date.now()}.png`;
      await this.page.screenshot({ path: filename, fullPage: true });
      this.screenshots.push(filename);
      console.log(`  📸 Screenshot: ${filename}`);
      return filename;
    } catch (error) {
      console.log(`  ⚠️  Could not capture screenshot: ${error.message}`);
      return null;
    }
  }

  async login() {
    console.log('\n🔐 Step 1: Logging in...');
    
    try {
      await this.page.goto(`${BASE_URL}/login`, {
        waitUntil: 'networkidle',
        timeout: 15000
      });

      await this.page.waitForTimeout(1000);
      await this.captureScreenshot('01-login-page');
      
      // Fill login form
      const emailInput = await this.page.locator('input[name="email"], input[type="email"]').first();
      const passwordInput = await this.page.locator('input[name="password"], input[type="password"]').first();
      
      await emailInput.fill(LOGIN_EMAIL);
      await passwordInput.fill(LOGIN_PASSWORD);
      
      console.log(`  ✅ Credentials entered`);
      await this.captureScreenshot('02-login-filled');
      
      // Submit
      const loginButton = await this.page.locator('button[type="submit"]').first();
      await loginButton.click();
      
      await this.page.waitForTimeout(3000);
      
      console.log('  ✅ Logged in successfully');
      await this.captureScreenshot('03-logged-in');
      return true;
    } catch (error) {
      console.log(`  ❌ Login failed: ${error.message}`);
      this.issues.push(`Login failed: ${error.message}`);
      await this.captureScreenshot('error-login');
      return false;
    }
  }

  async navigateToInventory() {
    console.log('\n📦 Step 2: Navigating to inventory...');
    
    try {
      // Try multiple navigation strategies
      const inventorySelectors = [
        'a[href*="/lats/unified-inventory"]',
        'a[href*="/lats/inventory"]',
        'a:has-text("Inventory")',
        'button:has-text("Inventory")',
      ];
      
      let navigated = false;
      for (const selector of inventorySelectors) {
        try {
          const link = await this.page.locator(selector).first();
          if (await link.isVisible({ timeout: 2000 })) {
            await link.click();
            navigated = true;
            console.log(`  ✅ Clicked inventory link`);
            break;
          }
        } catch (e) {
          // Try next selector
        }
      }
      
      if (!navigated) {
        // Try direct navigation
        await this.page.goto(`${BASE_URL}/lats/unified-inventory`, {
          waitUntil: 'networkidle',
          timeout: 15000
        });
        console.log(`  ✅ Navigated directly to inventory`);
      }
      
      await this.page.waitForTimeout(2000);
      await this.captureScreenshot('04-inventory-page');
      
      console.log('  ✅ Inventory page loaded');
      return true;
    } catch (error) {
      console.log(`  ❌ Failed to navigate to inventory: ${error.message}`);
      this.issues.push(`Navigation failed: ${error.message}`);
      await this.captureScreenshot('error-navigation');
      return false;
    }
  }

  async findAndClickEditButton() {
    console.log('\n✏️  Step 3: Finding product to edit...');
    
    try {
      // Wait for products to load
      await this.page.waitForTimeout(2000);
      
      // Look for edit buttons (could be in a table, grid, or list)
      const editSelectors = [
        'button:has-text("Edit")',
        'a:has-text("Edit")',
        '[aria-label*="Edit"]',
        '[title*="Edit"]',
        'button[class*="edit"]',
        'a[href*="/edit"]',
      ];
      
      let editButton = null;
      for (const selector of editSelectors) {
        try {
          const buttons = await this.page.locator(selector);
          const count = await buttons.count();
          
          if (count > 0) {
            editButton = buttons.first();
            console.log(`  ✅ Found ${count} edit button(s) using selector: ${selector}`);
            break;
          }
        } catch (e) {
          // Try next selector
        }
      }
      
      if (!editButton) {
        console.log('  ⚠️  No edit buttons found, trying to click on first product row');
        // Try clicking on a product row
        const productRow = await this.page.locator('tr[class*="cursor-pointer"], div[class*="cursor-pointer"]').first();
        if (productRow) {
          await productRow.click();
          console.log('  ✅ Clicked product row');
        } else {
          throw new Error('No products or edit buttons found');
        }
      } else {
        await editButton.click();
        console.log('  ✅ Clicked edit button');
      }
      
      await this.page.waitForTimeout(2000);
      await this.captureScreenshot('05-edit-page-opened');
      
      return true;
    } catch (error) {
      console.log(`  ❌ Failed to find/click edit button: ${error.message}`);
      this.issues.push(`Edit button not found: ${error.message}`);
      await this.captureScreenshot('error-find-edit');
      return false;
    }
  }

  async testEditForm() {
    console.log('\n📝 Step 4: Testing edit form...');
    
    try {
      // Check if we're on edit page
      const currentUrl = this.page.url();
      console.log(`  Current URL: ${currentUrl}`);
      
      if (!currentUrl.includes('/edit') && !currentUrl.includes('modal')) {
        throw new Error('Not on edit page or modal');
      }
      
      // Look for form fields
      const formFields = {
        name: 'input[name="name"], input[placeholder*="Product Name" i], input[placeholder*="Name" i]',
        price: 'input[name="price"], input[placeholder*="Price" i]',
        stock: 'input[name="stockQuantity"], input[name="stock"], input[placeholder*="Stock" i]',
        category: 'select[name="categoryId"], select[name="category"]',
        description: 'textarea[name="description"], textarea[placeholder*="Description" i]',
      };
      
      const foundFields = {};
      for (const [fieldName, selector] of Object.entries(formFields)) {
        try {
          const field = await this.page.locator(selector).first();
          if (await field.isVisible({ timeout: 2000 })) {
            foundFields[fieldName] = true;
            console.log(`  ✅ Found field: ${fieldName}`);
          }
        } catch (e) {
          console.log(`  ⚠️  Field not found: ${fieldName}`);
        }
      }
      
      if (Object.keys(foundFields).length === 0) {
        throw new Error('No form fields found');
      }
      
      await this.captureScreenshot('06-form-fields-found');
      
      // Try to edit the product name (append " - EDITED" to test)
      console.log('\n  📝 Attempting to edit product name...');
      try {
        const nameInput = await this.page.locator(formFields.name).first();
        const originalValue = await nameInput.inputValue();
        console.log(`  Original name: ${originalValue}`);
        
        // Clear and enter new value
        await nameInput.fill(originalValue + ' - TEST EDIT');
        console.log(`  ✅ Changed name to: ${originalValue} - TEST EDIT`);
        
        await this.page.waitForTimeout(1000);
        await this.captureScreenshot('07-name-edited');
      } catch (e) {
        console.log(`  ⚠️  Could not edit name: ${e.message}`);
      }
      
      // Try to edit price
      console.log('\n  💰 Attempting to edit price...');
      try {
        const priceInput = await this.page.locator(formFields.price).first();
        const originalPrice = await priceInput.inputValue();
        console.log(`  Original price: ${originalPrice}`);
        
        // Change price
        await priceInput.fill('999.99');
        console.log(`  ✅ Changed price to: 999.99`);
        
        await this.page.waitForTimeout(1000);
        await this.captureScreenshot('08-price-edited');
      } catch (e) {
        console.log(`  ⚠️  Could not edit price: ${e.message}`);
      }
      
      // Look for save button
      console.log('\n  💾 Looking for save button...');
      const saveSelectors = [
        'button[type="submit"]',
        'button:has-text("Save")',
        'button:has-text("Update")',
        'button[class*="submit"]',
      ];
      
      let saveButton = null;
      for (const selector of saveSelectors) {
        try {
          const button = await this.page.locator(selector).first();
          if (await button.isVisible({ timeout: 2000 })) {
            saveButton = button;
            console.log(`  ✅ Found save button`);
            break;
          }
        } catch (e) {
          // Try next
        }
      }
      
      if (saveButton) {
        await this.captureScreenshot('09-before-save');
        console.log(`  💾 Clicking save button...`);
        
        // Check for console errors before save
        const errorsBefore = this.consoleErrors.length;
        
        await saveButton.click();
        await this.page.waitForTimeout(3000);
        
        // Check for console errors after save
        const errorsAfter = this.consoleErrors.length;
        if (errorsAfter > errorsBefore) {
          console.log(`  ⚠️  ${errorsAfter - errorsBefore} console errors occurred during save`);
          this.issues.push(`Console errors during save: ${errorsAfter - errorsBefore}`);
        }
        
        await this.captureScreenshot('10-after-save');
        console.log(`  ✅ Save button clicked`);
      } else {
        console.log(`  ⚠️  Save button not found`);
        this.issues.push('Save button not found');
      }
      
      return true;
    } catch (error) {
      console.log(`  ❌ Form testing failed: ${error.message}`);
      this.issues.push(`Form test failed: ${error.message}`);
      await this.captureScreenshot('error-form-test');
      return false;
    }
  }

  async generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST REPORT');
    console.log('='.repeat(60));
    
    console.log(`\n📸 Screenshots captured: ${this.screenshots.length}`);
    this.screenshots.forEach(s => console.log(`  - ${s}`));
    
    console.log(`\n⚠️  Console Errors: ${this.consoleErrors.length}`);
    if (this.consoleErrors.length > 0) {
      this.consoleErrors.slice(0, 10).forEach(err => {
        console.log(`  - ${err.substring(0, 100)}`);
      });
      if (this.consoleErrors.length > 10) {
        console.log(`  ... and ${this.consoleErrors.length - 10} more`);
      }
    }
    
    console.log(`\n❌ Issues Found: ${this.issues.length}`);
    if (this.issues.length > 0) {
      this.issues.forEach((issue, i) => {
        console.log(`  ${i + 1}. ${issue}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    if (this.issues.length === 0 && this.consoleErrors.length === 0) {
      console.log('✅ ALL TESTS PASSED!');
    } else {
      console.log('⚠️  ISSUES DETECTED - Review needed');
    }
    console.log('='.repeat(60) + '\n');
    
    return {
      success: this.issues.length === 0 && this.consoleErrors.length === 0,
      issues: this.issues,
      consoleErrors: this.consoleErrors,
      screenshots: this.screenshots,
    };
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
        console.log('\n❌ Cannot proceed - login failed');
        return await this.generateReport();
      }
      
      const navSuccess = await this.navigateToInventory();
      if (!navSuccess) {
        console.log('\n❌ Cannot proceed - navigation failed');
        return await this.generateReport();
      }
      
      const editSuccess = await this.findAndClickEditButton();
      if (!editSuccess) {
        console.log('\n❌ Cannot proceed - could not find edit button');
        return await this.generateReport();
      }
      
      await this.testEditForm();
      
      return await this.generateReport();
      
    } catch (error) {
      console.log(`\n❌ Test failed with error: ${error.message}`);
      this.issues.push(`Fatal error: ${error.message}`);
      await this.captureScreenshot('error-fatal');
      return await this.generateReport();
    } finally {
      await this.cleanup();
    }
  }
}

// Run the test
console.log('🧪 Product Edit Test Started\n');
console.log(`Base URL: ${BASE_URL}`);
console.log(`Login: ${LOGIN_EMAIL}`);
console.log('='.repeat(60) + '\n');

const tester = new ProductEditTester();
const report = await tester.run();

// Exit with appropriate code
process.exit(report.success ? 0 : 1);

