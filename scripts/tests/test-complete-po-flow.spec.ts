/**
 * Complete PO Flow Test: Create Product → Create PO → Receive → Verify Names
 */

import { test, expect } from '@playwright/test';

test.describe('Complete PO Flow with Variant Names', () => {
  const BASE_URL = 'http://localhost:5173';
  
  const TEST_DATA = {
    product: {
      name: 'Auto Test Product ' + Date.now(),
      variant1: {
        name: 'Red 128GB Premium',
        sku: 'TEST-RED-128-' + Date.now()
      },
      variant2: {
        name: 'Blue 256GB Ultimate', 
        sku: 'TEST-BLUE-256-' + Date.now()
      }
    }
  };

  test('complete flow: create product with variants and verify in PO receiving', async ({ page }) => {
    test.setTimeout(240000); // 4 minutes
    
    console.log('🚀 Starting Complete PO Flow Test');
    console.log('==================================\n');
    console.log('Test Data:', TEST_DATA);
    
    // STEP 1: Login
    console.log('📋 STEP 1: Login');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.locator('input[type="email"]').first().fill('care@care.com');
    await page.locator('input[type="password"]').first().fill('123456');
    await page.locator('button[type="submit"]').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    console.log('   ✅ Logged in\n');
    
    await page.screenshot({ path: 'test-results/po-flow-01-logged-in.png' });
    
    // STEP 2: Navigate to Add Product
    console.log('📋 STEP 2: Navigate to Add Product');
    await page.goto(`${BASE_URL}/lats/products/add`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    console.log('   ✅ On Add Product page\n');
    
    await page.screenshot({ path: 'test-results/po-flow-02-add-product-page.png', fullPage: true });
    
    // STEP 3: Fill Product Name
    console.log('📋 STEP 3: Fill product information');
    const productNameField = page.locator('input[name="name"], input[placeholder*="Product Name" i]').first();
    await productNameField.waitFor({ state: 'visible', timeout: 5000 });
    await productNameField.fill(TEST_DATA.product.name);
    console.log(`   ✅ Product name: ${TEST_DATA.product.name}`);
    
    // Select category
    try {
      const categorySelect = page.locator('select[name="categoryId"]').first();
      if (await categorySelect.isVisible({ timeout: 2000 })) {
        await categorySelect.selectOption({ index: 1 });
        console.log('   ✅ Category selected');
      }
    } catch (e) {
      console.log('   ⚠️ Category optional');
    }
    
    await page.waitForTimeout(2000);
    
    // STEP 4: Fill Variant 1
    console.log('\n📋 STEP 4: Add Variant 1');
    console.log(`   Variant 1 Name: ${TEST_DATA.product.variant1.name}`);
    
    // Find variant name field (first one)
    const variant1NameFields = await page.locator('input[placeholder*="Variant" i]').all();
    if (variant1NameFields.length > 0) {
      await variant1NameFields[0].fill(TEST_DATA.product.variant1.name);
      console.log('   ✅ Filled variant 1 name');
    }
    
    // Fill SKU
    const skuFields = await page.locator('input[placeholder*="SKU" i]').all();
    if (skuFields.length > 0) {
      await skuFields[0].fill(TEST_DATA.product.variant1.sku);
      console.log('   ✅ Filled variant 1 SKU');
    }
    
    await page.screenshot({ path: 'test-results/po-flow-03-variant1-filled.png', fullPage: true });
    
    // STEP 5: Add Variant 2
    console.log('\n📋 STEP 5: Add Variant 2');
    console.log(`   Variant 2 Name: ${TEST_DATA.product.variant2.name}`);
    
    // Click Add Variant
    const addVariantBtn = page.locator('button:has-text("Add Variant"), button:has-text("Add New Variant")').first();
    if (await addVariantBtn.isVisible({ timeout: 2000 })) {
      await addVariantBtn.click();
      await page.waitForTimeout(1500);
      console.log('   ✅ Clicked Add Variant');
    }
    
    // Fill variant 2
    const allVariantFields = await page.locator('input[placeholder*="Variant" i]').all();
    if (allVariantFields.length >= 2) {
      await allVariantFields[allVariantFields.length - 1].fill(TEST_DATA.product.variant2.name);
      console.log('   ✅ Filled variant 2 name');
    }
    
    const allSkuFields = await page.locator('input[placeholder*="SKU" i]').all();
    if (allSkuFields.length >= 2) {
      await allSkuFields[allSkuFields.length - 1].fill(TEST_DATA.product.variant2.sku);
      console.log('   ✅ Filled variant 2 SKU');
    }
    
    await page.screenshot({ path: 'test-results/po-flow-04-variant2-filled.png', fullPage: true });
    
    // STEP 6: Create Product
    console.log('\n📋 STEP 6: Create Product');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    
    const createBtn = page.locator('button:has-text("Create Product"), button:has-text("Create")').first();
    await createBtn.click();
    console.log('   ✅ Clicked Create Product');
    
    await page.waitForTimeout(5000);
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ path: 'test-results/po-flow-05-product-created.png', fullPage: true });
    console.log('   ✅ Product should be created\n');
    
    // STEP 7: Create PO with the new product
    console.log('📋 STEP 7: Create Purchase Order');
    await page.goto(`${BASE_URL}/lats/purchase-orders`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Click Create PO
    const createPOBtn = page.locator('button:has-text("Create"), a:has-text("Create")').first();
    if (await createPOBtn.isVisible({ timeout: 3000 })) {
      await createPOBtn.click();
      await page.waitForTimeout(2000);
      console.log('   ✅ Clicked Create PO');
    } else {
      await page.goto(`${BASE_URL}/lats/purchase-orders/create`);
      console.log('   ✅ Navigated to PO create');
    }
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'test-results/po-flow-06-po-create-page.png', fullPage: true });
    
    // Select supplier
    console.log('   🔍 Selecting supplier...');
    try {
      const supplierSelect = page.locator('select, [role="combobox"]').first();
      if (await supplierSelect.isVisible({ timeout: 2000 })) {
        await supplierSelect.click();
        await page.waitForTimeout(500);
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        console.log('   ✅ Supplier selected');
      }
    } catch (e) {
      console.log('   ⚠️ Supplier selection failed');
    }
    
    // Search for our product
    console.log(`   🔍 Searching for product: ${TEST_DATA.product.name}`);
    await page.waitForTimeout(2000);
    
    const searchField = page.locator('input[placeholder*="Search" i]').first();
    if (await searchField.isVisible({ timeout: 3000 })) {
      await searchField.fill(TEST_DATA.product.name.substring(0, 20));
      await page.waitForTimeout(2000);
      console.log('   ✅ Searched for product');
    }
    
    await page.screenshot({ path: 'test-results/po-flow-07-searched-product.png', fullPage: true });
    
    // Add product to PO
    console.log('   🔍 Adding product to PO...');
    const productCard = page.locator(`text=${TEST_DATA.product.name.substring(0, 15)}`).first();
    if (await productCard.isVisible({ timeout: 3000 })) {
      await productCard.click();
      await page.waitForTimeout(2000);
      console.log('   ✅ Clicked product');
    }
    
    await page.screenshot({ path: 'test-results/po-flow-08-product-clicked.png', fullPage: true });
    
    // CRITICAL: Check what variant names are shown in the modal
    console.log('\n📋 STEP 8: CHECK VARIANT NAMES IN PRODUCT MODAL');
    await page.waitForTimeout(2000);
    
    const modalContent = await page.content();
    const hasVariant1 = modalContent.includes('Red 128GB Premium');
    const hasVariant2 = modalContent.includes('Blue 256GB Ultimate');
    const hasDefaultVariant = modalContent.includes('Default Variant');
    
    console.log('   🔍 Variant Names in Modal:');
    console.log(`      Red 128GB Premium: ${hasVariant1 ? '✅ FOUND' : '❌ NOT FOUND'}`);
    console.log(`      Blue 256GB Ultimate: ${hasVariant2 ? '✅ FOUND' : '❌ NOT FOUND'}`);
    console.log(`      Default Variant: ${hasDefaultVariant ? '❌ FOUND (BAD)' : '✅ NOT FOUND (GOOD)'}`);
    
    await page.screenshot({ path: 'test-results/po-flow-09-variant-modal.png', fullPage: true });
    
    // Try to select a variant and add to cart
    console.log('\n   🔍 Selecting variant...');
    const selectVariantBtn = page.locator('button:has-text("Select"), button:has-text("Add")').first();
    if (await selectVariantBtn.isVisible({ timeout: 2000 })) {
      await selectVariantBtn.click();
      await page.waitForTimeout(2000);
      console.log('   ✅ Selected variant');
    }
    
    await page.screenshot({ path: 'test-results/po-flow-10-variant-selected.png', fullPage: true });
    
    // Create the PO
    console.log('\n   🔍 Creating PO...');
    await page.waitForTimeout(2000);
    const createPOSubmit = page.locator('button:has-text("Create Purchase Order"), button:has-text("Create")').last();
    if (await createPOSubmit.isVisible({ timeout: 3000 })) {
      await createPOSubmit.click();
      await page.waitForTimeout(5000);
      await page.waitForLoadState('networkidle');
      console.log('   ✅ PO Created');
    }
    
    await page.screenshot({ path: 'test-results/po-flow-11-po-created.png', fullPage: true });
    
    // STEP 9: Go to PO and try to receive
    console.log('\n📋 STEP 9: Receive Purchase Order');
    await page.waitForTimeout(3000);
    
    // Find and click Receive button
    const receiveBtn = page.locator('button:has-text("Receive")').first();
    if (await receiveBtn.isVisible({ timeout: 5000 })) {
      await receiveBtn.click();
      await page.waitForTimeout(2000);
      console.log('   ✅ Clicked Receive button');
    }
    
    await page.screenshot({ path: 'test-results/po-flow-12-receive-modal-opened.png', fullPage: true });
    
    // Select Full Receive
    const fullReceiveBtn = page.locator('button:has-text("Full Receive")').first();
    if (await fullReceiveBtn.isVisible({ timeout: 3000 })) {
      await fullReceiveBtn.click();
      await page.waitForTimeout(2000);
      console.log('   ✅ Selected Full Receive');
    }
    
    // Click Proceed
    const proceedBtn = page.locator('button:has-text("Proceed")').first();
    if (await proceedBtn.isVisible({ timeout: 2000 })) {
      await proceedBtn.click();
      await page.waitForTimeout(3000);
      console.log('   ✅ Clicked Proceed');
    }
    
    await page.screenshot({ path: 'test-results/po-flow-13-serial-number-modal.png', fullPage: true });
    
    // CRITICAL: Check variant names in receiving modal
    console.log('\n📋 STEP 10: VERIFY VARIANT NAMES IN RECEIVING MODAL');
    console.log('   ================================================');
    
    const receivingContent = await page.content();
    
    // Check for custom names
    const hasRedVariantInReceiving = receivingContent.includes('Red 128GB Premium');
    const hasBlueVariantInReceiving = receivingContent.includes('Blue 256GB Ultimate');
    const hasDefaultInReceiving = receivingContent.includes('Default Variant');
    
    console.log('\n   🔍 VERIFICATION:');
    console.log('   ' + '='.repeat(60));
    console.log(`   "Red 128GB Premium": ${hasRedVariantInReceiving ? '✅ FOUND' : '❌ NOT FOUND'}`);
    console.log(`   "Blue 256GB Ultimate": ${hasBlueVariantInReceiving ? '✅ FOUND' : '❌ NOT FOUND'}`);
    console.log(`   "Default Variant": ${hasDefaultInReceiving ? '❌ FOUND (BUG!)' : '✅ NOT FOUND'}`);
    console.log('   ' + '='.repeat(60));
    
    if (hasRedVariantInReceiving || hasBlueVariantInReceiving) {
      console.log('\n   🎉 ✅ SUCCESS! Variant names are displaying in PO receiving!');
    } else if (hasDefaultInReceiving) {
      console.log('\n   ❌ BUG STILL EXISTS: Showing "Default Variant" instead of custom names');
      console.log('   📸 Check screenshot: po-flow-13-serial-number-modal.png');
    } else {
      console.log('\n   ⚠️ INCONCLUSIVE: Check screenshots for details');
    }
    
    await page.screenshot({ path: 'test-results/po-flow-14-final-verification.png', fullPage: true });
    
    // Assertions
    expect(hasDefaultInReceiving).toBeFalsy(); // Should NOT see "Default Variant"
    expect(hasRedVariantInReceiving || hasBlueVariantInReceiving).toBeTruthy(); // Should see custom names
  });
});

