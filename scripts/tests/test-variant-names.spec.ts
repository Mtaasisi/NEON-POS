/**
 * Automated Test: Variant Name Display in ProductModal
 * 
 * This test verifies that variant names entered during product creation
 * are correctly displayed in the ProductModal.
 */

import { test, expect } from '@playwright/test';

test.describe('Variant Name Display Test', () => {
  const BASE_URL = 'http://localhost:5173';
  const TEST_EMAIL = 'care@care.com';
  const TEST_PASSWORD = '123456';
  
  // Test data
  const TEST_PRODUCT = {
    name: 'Test Product - Variant Names',
    category: 'Electronics',
    variant1: {
      name: 'iPhone 14 Pro 256GB Blue',
      sku: 'TEST-IP14-256-BLU',
      costPrice: '800',
      sellingPrice: '1200',
      quantity: '5',
      minQuantity: '2'
    },
    variant2: {
      name: 'iPhone 14 Pro 128GB Red',
      sku: 'TEST-IP14-128-RED',
      costPrice: '700',
      sellingPrice: '1100',
      quantity: '3',
      minQuantity: '2'
    }
  };

  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto(BASE_URL);
    
    // Login
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for navigation to complete
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('should display custom variant names in ProductModal', async ({ page }) => {
    // Step 1: Navigate to Add Product page
    console.log('📋 Step 1: Navigating to Add Product page...');
    await page.click('text=Products');
    await page.click('text=Add Product');
    await page.waitForLoadState('networkidle');

    // Step 2: Fill in product details
    console.log('📋 Step 2: Filling product details...');
    await page.fill('input[name="name"]', TEST_PRODUCT.name);
    
    // Select category (you may need to adjust selector)
    await page.click('select[name="categoryId"]');
    await page.selectOption('select[name="categoryId"]', { index: 1 });

    // Step 3: Add first variant
    console.log('📋 Step 3: Adding first variant...');
    await page.fill('input[placeholder*="Variant"][placeholder*="name"]', TEST_PRODUCT.variant1.name);
    await page.fill('input[placeholder*="SKU"]', TEST_PRODUCT.variant1.sku);
    await page.fill('input[placeholder*="Cost"][type="number"]', TEST_PRODUCT.variant1.costPrice);
    await page.fill('input[placeholder*="Selling"][type="number"]', TEST_PRODUCT.variant1.sellingPrice);
    await page.fill('input[placeholder*="Quantity"][type="number"]', TEST_PRODUCT.variant1.quantity);

    // Step 4: Add second variant
    console.log('📋 Step 4: Adding second variant...');
    await page.click('button:has-text("Add Variant")');
    await page.waitForTimeout(500);
    
    // Fill second variant (adjust selectors as needed)
    const variantForms = await page.locator('div[data-variant-index], .variant-form').all();
    if (variantForms.length >= 2) {
      await variantForms[1].locator('input[placeholder*="name"]').fill(TEST_PRODUCT.variant2.name);
      await variantForms[1].locator('input[placeholder*="SKU"]').fill(TEST_PRODUCT.variant2.sku);
      await variantForms[1].locator('input[placeholder*="Cost"]').fill(TEST_PRODUCT.variant2.costPrice);
      await variantForms[1].locator('input[placeholder*="Selling"]').fill(TEST_PRODUCT.variant2.sellingPrice);
      await variantForms[1].locator('input[placeholder*="Quantity"]').fill(TEST_PRODUCT.variant2.quantity);
    }

    // Step 5: Submit the form
    console.log('📋 Step 5: Creating product...');
    await page.click('button:has-text("Create Product")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for success message

    // Step 6: Navigate to products list and find the product
    console.log('📋 Step 6: Navigating to products list...');
    await page.click('text=Products');
    await page.waitForLoadState('networkidle');

    // Search for the test product
    await page.fill('input[placeholder*="Search"]', TEST_PRODUCT.name);
    await page.waitForTimeout(1000);

    // Step 7: Open the ProductModal
    console.log('📋 Step 7: Opening ProductModal...');
    await page.click(`text=${TEST_PRODUCT.name}`);
    await page.waitForTimeout(1000);

    // Step 8: Verify variant names in Overview tab
    console.log('📋 Step 8: Verifying variant names in Overview tab...');
    const overviewTab = page.locator('button:has-text("Overview")');
    await overviewTab.click();
    await page.waitForTimeout(500);

    // Check if variant names are visible (NOT "Unnamed Variant")
    const variant1Visible = await page.locator(`text=${TEST_PRODUCT.variant1.name}`).isVisible();
    const variant2Visible = await page.locator(`text=${TEST_PRODUCT.variant2.name}`).isVisible();
    
    expect(variant1Visible).toBeTruthy();
    expect(variant2Visible).toBeTruthy();
    console.log('✅ Variant names visible in Overview tab');

    // Step 9: Check Variants tab
    console.log('📋 Step 9: Verifying variant names in Variants tab...');
    await page.click('button:has-text("Variants")');
    await page.waitForTimeout(500);

    const variant1InList = await page.locator(`text=${TEST_PRODUCT.variant1.name}`).count();
    const variant2InList = await page.locator(`text=${TEST_PRODUCT.variant2.name}`).count();
    
    expect(variant1InList).toBeGreaterThan(0);
    expect(variant2InList).toBeGreaterThan(0);
    console.log('✅ Variant names visible in Variants tab');

    // Step 10: Check Inventory tab
    console.log('📋 Step 10: Verifying variant names in Inventory tab...');
    await page.click('button:has-text("Inventory")');
    await page.waitForTimeout(500);

    const variant1InInventory = await page.locator(`text=${TEST_PRODUCT.variant1.name}`).isVisible();
    expect(variant1InInventory).toBeTruthy();
    console.log('✅ Variant names visible in Inventory tab');

    // Step 11: Check Financials tab
    console.log('📋 Step 11: Verifying variant names in Financials tab...');
    await page.click('button:has-text("Financials")');
    await page.waitForTimeout(500);

    const variant1InFinancials = await page.locator(`text=${TEST_PRODUCT.variant1.name}`).isVisible();
    expect(variant1InFinancials).toBeTruthy();
    console.log('✅ Variant names visible in Financials tab');

    // Step 12: Verify NO "Unnamed Variant" text exists
    console.log('📋 Step 12: Verifying no generic names...');
    const unnamedCount = await page.locator('text=Unnamed Variant').count();
    const variant1GenericCount = await page.locator('text=Variant 1').count();
    const variant2GenericCount = await page.locator('text=Variant 2').count();
    
    expect(unnamedCount).toBe(0);
    expect(variant1GenericCount).toBe(0);
    expect(variant2GenericCount).toBe(0);
    console.log('✅ No generic variant names found');

    // Step 13: Take screenshot for verification
    await page.screenshot({ 
      path: 'test-results/variant-names-success.png',
      fullPage: true 
    });
    console.log('📸 Screenshot saved');

    console.log('✅ TEST PASSED: All variant names display correctly!');
  });

  test('should display variant names after page refresh', async ({ page }) => {
    // Navigate to products list
    await page.click('text=Products');
    await page.waitForLoadState('networkidle');

    // Find the test product
    await page.fill('input[placeholder*="Search"]', TEST_PRODUCT.name);
    await page.waitForTimeout(1000);

    // Open ProductModal
    await page.click(`text=${TEST_PRODUCT.name}`);
    await page.waitForTimeout(1000);

    // Verify names are visible
    let variant1Visible = await page.locator(`text=${TEST_PRODUCT.variant1.name}`).isVisible();
    expect(variant1Visible).toBeTruthy();

    // Refresh the page
    console.log('🔄 Refreshing page...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Navigate back to products
    await page.click('text=Products');
    await page.waitForLoadState('networkidle');

    // Search and open again
    await page.fill('input[placeholder*="Search"]', TEST_PRODUCT.name);
    await page.waitForTimeout(1000);
    await page.click(`text=${TEST_PRODUCT.name}`);
    await page.waitForTimeout(1000);

    // Verify names still visible after refresh
    variant1Visible = await page.locator(`text=${TEST_PRODUCT.variant1.name}`).isVisible();
    const variant2Visible = await page.locator(`text=${TEST_PRODUCT.variant2.name}`).isVisible();
    
    expect(variant1Visible).toBeTruthy();
    expect(variant2Visible).toBeTruthy();
    
    console.log('✅ TEST PASSED: Variant names persist after refresh!');
  });

  test.afterAll(async ({ page }) => {
    // Optional: Clean up test product
    console.log('🧹 Test complete. You can manually delete the test product if needed.');
  });
});

