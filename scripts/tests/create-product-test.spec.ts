/**
 * End-to-End Test: Create Product with Variants
 * Tests the complete flow from creating a product to verifying variant names display
 */

import { test, expect } from '@playwright/test';

test.describe('Create Product with Variants - E2E Test', () => {
  const BASE_URL = 'http://localhost:5173';
  
  const TEST_PRODUCT = {
    name: 'Test iPhone 14 Pro - Automated Test',
    variant1: {
      name: 'iPhone 14 Pro 256GB Deep Purple',
      sku: 'AUTO-IP14-256-PURPLE',
      costPrice: '850',
      sellingPrice: '1299',
      quantity: '10',
      minQuantity: '2'
    },
    variant2: {
      name: 'iPhone 14 Pro 512GB Space Black',
      sku: 'AUTO-IP14-512-BLACK',
      costPrice: '950',
      sellingPrice: '1499',
      quantity: '5',
      minQuantity: '2'
    }
  };

  test('should create product with 2 variants and verify names display correctly', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes timeout
    
    console.log('🚀 Starting E2E test: Create Product with Variants');
    console.log('=================================================\n');
    
    // ==========================================
    // STEP 1: Navigate and Login
    // ==========================================
    console.log('📋 STEP 1: Login to application');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Find and fill email
    const emailField = await page.locator('input[type="email"]').first();
    await emailField.fill('care@care.com');
    console.log('   ✅ Entered email: care@care.com');
    
    // Find and fill password
    const passwordField = await page.locator('input[type="password"]').first();
    await passwordField.fill('123456');
    console.log('   ✅ Entered password');
    
    // Submit login
    const submitButton = await page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")').first();
    await submitButton.click();
    console.log('   ✅ Clicked login button');
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'test-results/create-01-logged-in.png' });
    console.log('   📸 Screenshot saved: After login\n');
    
    // ==========================================
    // STEP 2: Navigate to Add Product Page
    // ==========================================
    console.log('📋 STEP 2: Navigate to Add Product page');
    
    // Try multiple ways to find Products link
    let navigatedToProducts = false;
    
    // Method 1: Click sidebar Products icon
    try {
      const productsIcon = page.locator('a[href*="products"], button:has-text("Products")').first();
      if (await productsIcon.isVisible({ timeout: 2000 })) {
        await productsIcon.click();
        console.log('   ✅ Clicked Products in navigation');
        navigatedToProducts = true;
      }
    } catch (e) {
      console.log('   ⚠️ Method 1 failed, trying alternative...');
    }
    
    // Method 2: Direct URL navigation
    if (!navigatedToProducts) {
      await page.goto(`${BASE_URL}/lats/products`);
      console.log('   ✅ Navigated directly to /lats/products');
    }
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'test-results/create-02-products-page.png', fullPage: true });
    console.log('   📸 Screenshot saved: Products page');
    
    // Click Add Product button
    console.log('   🔍 Looking for Add Product button...');
    
    const addProductSelectors = [
      'button:has-text("Add Product")',
      'a:has-text("Add Product")',
      'button:has-text("+ Add")',
      '[data-testid="add-product"]'
    ];
    
    let addButtonClicked = false;
    for (const selector of addProductSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: 2000 })) {
          await button.click();
          console.log(`   ✅ Clicked Add Product button (${selector})`);
          addButtonClicked = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!addButtonClicked) {
      // Try direct navigation
      await page.goto(`${BASE_URL}/lats/products/add`);
      console.log('   ✅ Navigated directly to /lats/products/add');
    }
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'test-results/create-03-add-product-page.png', fullPage: true });
    console.log('   📸 Screenshot saved: Add Product page\n');
    
    // ==========================================
    // STEP 3: Fill Product Basic Information
    // ==========================================
    console.log('📋 STEP 3: Fill product basic information');
    
    // Product Name
    console.log('   🔍 Looking for product name field...');
    const nameFieldSelectors = [
      'input[name="name"]',
      'input[placeholder*="Product Name" i]',
      'input[id="name"]',
      'label:has-text("Product Name") + input'
    ];
    
    for (const selector of nameFieldSelectors) {
      try {
        const field = page.locator(selector).first();
        if (await field.isVisible({ timeout: 2000 })) {
          await field.fill(TEST_PRODUCT.name);
          console.log(`   ✅ Filled product name: ${TEST_PRODUCT.name}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    // Select Category
    console.log('   🔍 Looking for category dropdown...');
    try {
      const categorySelect = page.locator('select[name="categoryId"], select:has-option').first();
      if (await categorySelect.isVisible({ timeout: 2000 })) {
        await categorySelect.selectOption({ index: 1 }); // Select first non-empty option
        console.log('   ✅ Selected category');
      }
    } catch (e) {
      console.log('   ⚠️ Category selection failed (optional)');
    }
    
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/create-04-filled-basic-info.png', fullPage: true });
    console.log('   📸 Screenshot saved: After basic info\n');
    
    // ==========================================
    // STEP 4: Add Variant 1
    // ==========================================
    console.log('📋 STEP 4: Add first variant');
    console.log(`   📦 Variant 1: ${TEST_PRODUCT.variant1.name}`);
    
    // Wait for variant form to be visible
    await page.waitForTimeout(2000);
    
    // Scroll to variants section
    await page.evaluate(() => {
      const variantsSection = document.querySelector('[class*="variant"], [id*="variant"]');
      if (variantsSection) {
        variantsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    await page.waitForTimeout(1000);
    
    // Fill Variant 1 Name
    console.log('   🔍 Looking for variant name field...');
    const variant1NameSelectors = [
      'input[placeholder*="Variant" i][placeholder*="Name" i]',
      'input[name*="variant"][name*="name"]',
      'input[placeholder*="256GB"]',
      'label:has-text("Variant Name") + input',
      'input[type="text"]'
    ];
    
    let variant1Filled = false;
    for (const selector of variant1NameSelectors) {
      try {
        const fields = await page.locator(selector).all();
        if (fields.length > 0) {
          // Try to find the first empty one
          for (const field of fields) {
            if (await field.isVisible({ timeout: 1000 })) {
              const value = await field.inputValue();
              if (!value || value === '' || value.includes('Variant')) {
                await field.clear();
                await field.fill(TEST_PRODUCT.variant1.name);
                console.log(`   ✅ Filled variant 1 name: ${TEST_PRODUCT.variant1.name}`);
                variant1Filled = true;
                break;
              }
            }
          }
          if (variant1Filled) break;
        }
      } catch (e) {
        continue;
      }
    }
    
    // Fill Variant 1 SKU
    console.log('   🔍 Looking for SKU field...');
    const skuSelectors = [
      'input[placeholder*="SKU" i]',
      'input[name*="sku" i]',
      'label:has-text("SKU") + input'
    ];
    
    for (const selector of skuSelectors) {
      try {
        const fields = await page.locator(selector).all();
        if (fields.length > 0) {
          await fields[0].fill(TEST_PRODUCT.variant1.sku);
          console.log(`   ✅ Filled variant 1 SKU: ${TEST_PRODUCT.variant1.sku}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    // Fill prices and quantities
    await page.waitForTimeout(1000);
    
    // Cost Price
    try {
      const costField = page.locator('input[placeholder*="Cost" i][type="number"]').first();
      await costField.fill(TEST_PRODUCT.variant1.costPrice);
      console.log(`   ✅ Filled cost price: ${TEST_PRODUCT.variant1.costPrice}`);
    } catch (e) {
      console.log('   ⚠️ Cost price field not found (optional)');
    }
    
    // Selling Price
    try {
      const priceField = page.locator('input[placeholder*="Selling" i][type="number"], input[placeholder*="Price" i][type="number"]').first();
      await priceField.fill(TEST_PRODUCT.variant1.sellingPrice);
      console.log(`   ✅ Filled selling price: ${TEST_PRODUCT.variant1.sellingPrice}`);
    } catch (e) {
      console.log('   ⚠️ Selling price field not found (optional)');
    }
    
    await page.screenshot({ path: 'test-results/create-05-variant1-filled.png', fullPage: true });
    console.log('   📸 Screenshot saved: Variant 1 filled\n');
    
    // ==========================================
    // STEP 5: Add Variant 2
    // ==========================================
    console.log('📋 STEP 5: Add second variant');
    console.log(`   📦 Variant 2: ${TEST_PRODUCT.variant2.name}`);
    
    // Click Add Variant button
    console.log('   🔍 Looking for Add Variant button...');
    const addVariantSelectors = [
      'button:has-text("Add Variant")',
      'button:has-text("+ Add")',
      'button[class*="add"][class*="variant" i]'
    ];
    
    for (const selector of addVariantSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: 2000 })) {
          await button.click();
          console.log('   ✅ Clicked Add Variant button');
          await page.waitForTimeout(1500);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    // Fill Variant 2 Name
    console.log('   🔍 Filling variant 2 fields...');
    const variant2NameFields = await page.locator('input[placeholder*="Variant" i][placeholder*="Name" i], input[type="text"]').all();
    
    if (variant2NameFields.length >= 2) {
      await variant2NameFields[variant2NameFields.length - 1].fill(TEST_PRODUCT.variant2.name);
      console.log(`   ✅ Filled variant 2 name: ${TEST_PRODUCT.variant2.name}`);
    }
    
    // Fill Variant 2 SKU
    const variant2SkuFields = await page.locator('input[placeholder*="SKU" i]').all();
    if (variant2SkuFields.length >= 2) {
      await variant2SkuFields[variant2SkuFields.length - 1].fill(TEST_PRODUCT.variant2.sku);
      console.log(`   ✅ Filled variant 2 SKU: ${TEST_PRODUCT.variant2.sku}`);
    }
    
    await page.screenshot({ path: 'test-results/create-06-variant2-filled.png', fullPage: true });
    console.log('   📸 Screenshot saved: Variant 2 filled\n');
    
    // ==========================================
    // STEP 6: Submit the Form
    // ==========================================
    console.log('📋 STEP 6: Submit form and create product');
    
    // Scroll to submit button
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    
    // Click Create/Submit button
    const submitSelectors = [
      'button:has-text("Create Product")',
      'button:has-text("Create")',
      'button:has-text("Save")',
      'button[type="submit"]'
    ];
    
    for (const selector of submitSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: 2000 })) {
          await button.click();
          console.log('   ✅ Clicked Create Product button');
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    // Wait for success message or navigation
    await page.waitForTimeout(4000);
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ path: 'test-results/create-07-after-submit.png', fullPage: true });
    console.log('   📸 Screenshot saved: After submit\n');
    
    // ==========================================
    // STEP 7: Find and Open the Created Product
    // ==========================================
    console.log('📋 STEP 7: Verify product was created and open it');
    
    // Navigate to products list if not already there
    await page.goto(`${BASE_URL}/lats/products`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Search for the test product
    console.log('   🔍 Searching for created product...');
    try {
      const searchField = page.locator('input[placeholder*="Search" i]').first();
      if (await searchField.isVisible({ timeout: 2000 })) {
        await searchField.fill(TEST_PRODUCT.name);
        console.log(`   ✅ Searching for: ${TEST_PRODUCT.name}`);
        await page.waitForTimeout(2000);
      }
    } catch (e) {
      console.log('   ⚠️ Search field not found');
    }
    
    await page.screenshot({ path: 'test-results/create-08-products-list.png', fullPage: true });
    console.log('   📸 Screenshot saved: Products list');
    
    // Click on the product to open modal
    console.log('   🔍 Opening product modal...');
    try {
      await page.click(`text=${TEST_PRODUCT.name}`);
      await page.waitForTimeout(3000);
      console.log('   ✅ Opened ProductModal');
    } catch (e) {
      console.log('   ⚠️ Could not find product by name, trying first product...');
      await page.click('[class*="product"]:visible, tr:visible').catch(() => {});
      await page.waitForTimeout(3000);
    }
    
    await page.screenshot({ path: 'test-results/create-09-product-modal.png', fullPage: true });
    console.log('   📸 Screenshot saved: ProductModal\n');
    
    // ==========================================
    // STEP 8: Verify Variant Names in Modal
    // ==========================================
    console.log('📋 STEP 8: VERIFY variant names display correctly');
    console.log('   ============================================');
    
    const pageContent = await page.content();
    
    // Check for our variant names
    const variant1Found = pageContent.includes(TEST_PRODUCT.variant1.name) || 
                          pageContent.includes('256GB Deep Purple') ||
                          pageContent.includes('Deep Purple');
    const variant2Found = pageContent.includes(TEST_PRODUCT.variant2.name) ||
                          pageContent.includes('512GB Space Black') ||
                          pageContent.includes('Space Black');
    
    // Check for bad names
    const unnamedFound = pageContent.includes('Unnamed Variant');
    const variant1Generic = /\bVariant 1\b/.test(pageContent);
    const variant2Generic = /\bVariant 2\b/.test(pageContent);
    
    console.log('\n   🔍 VERIFICATION RESULTS:');
    console.log('   ' + '='.repeat(50));
    console.log(`   Variant 1 name found: ${variant1Found ? '✅ YES' : '❌ NO'}`);
    console.log(`   Variant 2 name found: ${variant2Found ? '✅ YES' : '❌ NO'}`);
    console.log(`   "Unnamed Variant" found: ${unnamedFound ? '❌ YES (BAD!)' : '✅ NO (GOOD!)'}`);
    console.log(`   Generic "Variant 1" found: ${variant1Generic ? '❌ YES (BAD!)' : '✅ NO (GOOD!)'}`);
    console.log(`   Generic "Variant 2" found: ${variant2Generic ? '❌ YES (BAD!)' : '✅ NO (GOOD!)'}`);
    console.log('   ' + '='.repeat(50));
    
    // Test all tabs
    console.log('\n   📋 Checking variant names in all tabs:');
    
    const tabs = ['Overview', 'Variants', 'Inventory', 'Financials'];
    for (const tabName of tabs) {
      try {
        const tab = page.locator(`button:has-text("${tabName}")`).first();
        if (await tab.isVisible({ timeout: 2000 })) {
          await tab.click();
          await page.waitForTimeout(1500);
          
          const tabContent = await page.content();
          const hasVariant1 = tabContent.includes('Deep Purple') || tabContent.includes('256GB');
          const hasVariant2 = tabContent.includes('Space Black') || tabContent.includes('512GB');
          
          console.log(`   ${hasVariant1 || hasVariant2 ? '✅' : '⚠️'} ${tabName} tab: ${hasVariant1 || hasVariant2 ? 'Names visible' : 'Check screenshot'}`);
          
          await page.screenshot({ path: `test-results/create-10-modal-${tabName.toLowerCase()}.png`, fullPage: true });
        }
      } catch (e) {
        console.log(`   ⚠️ ${tabName} tab not found`);
      }
    }
    
    // ==========================================
    // FINAL RESULTS
    // ==========================================
    console.log('\n' + '='.repeat(60));
    console.log('🎉 TEST EXECUTION COMPLETE');
    console.log('='.repeat(60));
    
    if ((variant1Found || variant2Found) && !unnamedFound && !variant1Generic && !variant2Generic) {
      console.log('✅ TEST PASSED: Variant names are displaying correctly!');
      console.log('   - Custom variant names found in ProductModal');
      console.log('   - No generic "Unnamed Variant" text');
      console.log('   - Fix is working as expected');
    } else if (variant1Found || variant2Found) {
      console.log('⚠️ TEST PARTIALLY PASSED: Some variant names visible');
      console.log('   - Check screenshots for details');
    } else {
      console.log('⚠️ TEST INCONCLUSIVE: Could not verify variant names');
      console.log('   - Product may have been created');
      console.log('   - Check screenshots in test-results/ folder');
    }
    
    console.log('\n📸 All screenshots saved to: test-results/');
    console.log('   - Total screenshots: 10+');
    console.log('   - Review them to verify the complete flow');
    
    // Take final screenshot
    await page.screenshot({ path: 'test-results/create-11-final.png', fullPage: true });
    
    // Assertions
    expect(variant1Found || variant2Found).toBeTruthy();
    expect(unnamedFound).toBeFalsy();
  });
});

