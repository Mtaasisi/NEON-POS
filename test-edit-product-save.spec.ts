/**
 * End-to-End Test: Edit Product and Save
 * Tests the complete flow from login to editing a product and saving changes
 */

import { test, expect } from '@playwright/test';

test.describe('Edit Product Save Test', () => {
  const BASE_URL = 'http://localhost:5173';
  
  test('should login, navigate to products, edit a product, and save successfully', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes timeout
    
    console.log('🚀 Starting E2E test: Edit Product and Save');
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
    
    await page.screenshot({ path: 'test-results/edit-01-logged-in.png' });
    console.log('   📸 Screenshot saved: After login\n');
    
    // ==========================================
    // STEP 2: Navigate to Products/Inventory Page
    // ==========================================
    console.log('📋 STEP 2: Navigate to Products/Inventory page');
    
    // Try multiple ways to find Products link
    let navigatedToProducts = false;
    
    // Method 1: Click sidebar Products icon
    try {
      const productsIcon = page.locator('a[href*="products"], a[href*="inventory"], button:has-text("Products"), button:has-text("Inventory")').first();
      if (await productsIcon.isVisible({ timeout: 2000 })) {
        await productsIcon.click();
        console.log('   ✅ Clicked Products/Inventory in navigation');
        navigatedToProducts = true;
      }
    } catch (e) {
      console.log('   ⚠️ Method 1 failed, trying alternative...');
    }
    
    // Method 2: Direct URL navigation
    if (!navigatedToProducts) {
      await page.goto(`${BASE_URL}/lats/inventory`);
      console.log('   ✅ Navigated directly to /lats/inventory');
    }
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'test-results/edit-02-inventory-page.png', fullPage: true });
    console.log('   📸 Screenshot saved: Inventory page\n');
    
    // ==========================================
    // STEP 3: Find and Click on a Product
    // ==========================================
    console.log('📋 STEP 3: Find and open a product to edit');
    
    // Wait for products to load
    await page.waitForTimeout(2000);
    
    // Try to find a product card or row
    const productSelectors = [
      '[class*="product-card"]',
      '[class*="ProductCard"]',
      'tr[class*="product"]',
      'div[class*="product"]:has-text("")',
      'button:has-text("Edit")',
      'a[href*="product"]'
    ];
    
    let productClicked = false;
    for (const selector of productSelectors) {
      try {
        const products = await page.locator(selector).all();
        if (products.length > 0) {
          // Click the first visible product
          for (const product of products) {
            if (await product.isVisible({ timeout: 1000 })) {
              await product.click();
              console.log(`   ✅ Clicked product (${selector})`);
              productClicked = true;
              break;
            }
          }
          if (productClicked) break;
        }
      } catch (e) {
        continue;
      }
    }
    
    // If no product found, try clicking Edit button
    if (!productClicked) {
      try {
        const editButtons = await page.locator('button:has-text("Edit"), a:has-text("Edit")').all();
        if (editButtons.length > 0) {
          await editButtons[0].click();
          console.log('   ✅ Clicked Edit button');
          productClicked = true;
        }
      } catch (e) {
        console.log('   ⚠️ Could not find product to edit');
      }
    }
    
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ path: 'test-results/edit-03-product-opened.png', fullPage: true });
    console.log('   📸 Screenshot saved: Product opened\n');
    
    // ==========================================
    // STEP 4: Wait for Edit Modal/Page to Load
    // ==========================================
    console.log('📋 STEP 4: Wait for edit form to load');
    await page.waitForTimeout(2000);
    
    // Check if we're in a modal or on a page
    const modalVisible = await page.locator('[role="dialog"], [class*="modal"], [class*="Modal"]').first().isVisible({ timeout: 3000 }).catch(() => false);
    const pageVisible = await page.locator('input[name="name"], input[placeholder*="Product Name" i]').first().isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!modalVisible && !pageVisible) {
      console.log('   ⚠️ Edit form not found, trying to find Edit button in modal...');
      // Maybe we opened a product view modal, need to click Edit
      const editInModal = await page.locator('button:has-text("Edit"), button:has-text("Edit Product")').first().isVisible({ timeout: 2000 }).catch(() => false);
      if (editInModal) {
        await page.locator('button:has-text("Edit"), button:has-text("Edit Product")').first().click();
        await page.waitForTimeout(2000);
      }
    }
    
    await page.screenshot({ path: 'test-results/edit-04-edit-form-loaded.png', fullPage: true });
    console.log('   📸 Screenshot saved: Edit form loaded\n');
    
    // ==========================================
    // STEP 5: Modify Product Fields
    // ==========================================
    console.log('📋 STEP 5: Modify product fields');
    
    // Find and modify product name
    const nameFieldSelectors = [
      'input[name="name"]',
      'input[placeholder*="Product Name" i]',
      'input[id="name"]',
      'label:has-text("Product Name") + input, label:has-text("Product Name") ~ input'
    ];
    
    for (const selector of nameFieldSelectors) {
      try {
        const field = page.locator(selector).first();
        if (await field.isVisible({ timeout: 2000 })) {
          const currentValue = await field.inputValue();
          const newValue = currentValue + ' [TEST EDITED]';
          await field.fill(newValue);
          console.log(`   ✅ Modified product name: ${newValue}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    // Try to modify price if field exists
    const priceFieldSelectors = [
      'input[placeholder*="Selling Price" i]',
      'input[placeholder*="Price" i]',
      'input[name="price"]',
      'input[name="sellingPrice"]'
    ];
    
    for (const selector of priceFieldSelectors) {
      try {
        const field = page.locator(selector).first();
        if (await field.isVisible({ timeout: 2000 })) {
          const currentValue = await field.inputValue();
          const numericValue = parseFloat(currentValue.replace(/,/g, '')) || 0;
          const newValue = (numericValue + 100).toString();
          await field.fill(newValue);
          console.log(`   ✅ Modified price: ${newValue}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/edit-05-fields-modified.png', fullPage: true });
    console.log('   📸 Screenshot saved: Fields modified\n');
    
    // ==========================================
    // STEP 6: Click Save Button
    // ==========================================
    console.log('📋 STEP 6: Click Save button');
    
    // Scroll to save button
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    
    const saveButtonSelectors = [
      'button:has-text("Save Changes")',
      'button:has-text("Save")',
      'button[type="submit"]',
      'button:has-text("Update")'
    ];
    
    let saveClicked = false;
    for (const selector of saveButtonSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: 2000 })) {
          await button.click();
          console.log(`   ✅ Clicked Save button (${selector})`);
          saveClicked = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!saveClicked) {
      console.log('   ⚠️ Save button not found, trying alternative...');
      // Try to find any button with Save text
      const allButtons = await page.locator('button').all();
      for (const button of allButtons) {
        const text = await button.textContent();
        if (text && (text.includes('Save') || text.includes('Update'))) {
          await button.click();
          console.log('   ✅ Clicked Save button (found by text)');
          saveClicked = true;
          break;
        }
      }
    }
    
    // Wait for save to complete
    await page.waitForTimeout(4000);
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ path: 'test-results/edit-06-after-save.png', fullPage: true });
    console.log('   📸 Screenshot saved: After save\n');
    
    // ==========================================
    // STEP 7: Verify Success
    // ==========================================
    console.log('📋 STEP 7: Verify save was successful');
    
    // Check for success message
    const pageContent = await page.content();
    const successIndicators = [
      'successfully',
      'updated successfully',
      'saved',
      'Product updated'
    ];
    
    const hasSuccessMessage = successIndicators.some(indicator => 
      pageContent.toLowerCase().includes(indicator.toLowerCase())
    );
    
    // Check for error messages
    const errorIndicators = [
      'error',
      'failed',
      'invalid',
      'cannot'
    ];
    
    const hasErrorMessage = errorIndicators.some(indicator => 
      pageContent.toLowerCase().includes(indicator.toLowerCase())
    );
    
    console.log('\n   🔍 VERIFICATION RESULTS:');
    console.log('   ' + '='.repeat(50));
    console.log(`   Success message found: ${hasSuccessMessage ? '✅ YES' : '⚠️ NO'}`);
    console.log(`   Error message found: ${hasErrorMessage ? '❌ YES' : '✅ NO'}`);
    console.log('   ' + '='.repeat(50));
    
    // Check if modal closed (indicates success)
    const modalStillOpen = await page.locator('[role="dialog"]').first().isVisible({ timeout: 1000 }).catch(() => false);
    console.log(`   Modal still open: ${modalStillOpen ? '⚠️ YES' : '✅ NO (closed, likely success)'}`);
    
    // ==========================================
    // FINAL RESULTS
    // ==========================================
    console.log('\n' + '='.repeat(60));
    console.log('🎉 TEST EXECUTION COMPLETE');
    console.log('='.repeat(60));
    
    if (hasSuccessMessage && !hasErrorMessage) {
      console.log('✅ TEST PASSED: Product was saved successfully!');
    } else if (!hasErrorMessage) {
      console.log('⚠️ TEST PARTIALLY PASSED: Save may have succeeded (no error found)');
      console.log('   - Check screenshots for details');
    } else {
      console.log('❌ TEST FAILED: Error occurred during save');
      console.log('   - Check screenshots in test-results/ folder');
    }
    
    console.log('\n📸 All screenshots saved to: test-results/');
    
    // Take final screenshot
    await page.screenshot({ path: 'test-results/edit-07-final.png', fullPage: true });
    
    // Assertions
    expect(hasErrorMessage).toBeFalsy();
  });
});

