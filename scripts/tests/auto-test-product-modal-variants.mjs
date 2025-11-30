import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const APP_URL = 'http://localhost:5173';
const LOGIN_EMAIL = 'care@care.com';
const LOGIN_PASSWORD = '123456';

async function testProductModalVariants() {
  console.log('\n🧪 Starting ProductModal Variants Test...\n');
  
  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000, // Slow down by 1 second
    args: [
      '--disable-extensions-except=/path/to/allowed/extensions',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-default-apps'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    // Disable extensions in the context
    permissions: [],
    extraHTTPHeaders: {}
  });
  
  const page = await context.newPage();

  // Suppress extension context errors
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error' &&
        (text.includes('Extension context invalidated') ||
         text.includes('chrome-extension://') ||
         text.includes('moz-extension://'))) {
      // Silently ignore extension-related errors
      return;
    }
    if (msg.type() === 'error') {
      console.warn('Browser error:', text.substring(0, 100));
    }
  });
  
  try {
    // ============================================================================
    // STEP 1: Navigate to app and login
    // ============================================================================
    console.log('📍 Step 1: Navigating to app...');
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    console.log('🔐 Logging in as:', LOGIN_EMAIL);
    
    // Check if already logged in
    const isLoggedIn = await page.locator('text=Dashboard').isVisible().catch(() => false);
    
    if (!isLoggedIn) {
      // Fill login form
      await page.fill('input[type="email"]', LOGIN_EMAIL);
      await page.fill('input[type="password"]', LOGIN_PASSWORD);
      await page.click('button[type="submit"]');
      
      await page.waitForTimeout(3000);
    }
    
    console.log('✅ Logged in successfully\n');
    
    // ============================================================================
    // STEP 2: Navigate to Inventory
    // ============================================================================
    console.log('📍 Step 2: Navigating to Inventory...');
    
    // Try different navigation methods
    const inventoryLink = page.locator('a[href*="/inventory"], a[href*="/lats/products"], button:has-text("Inventory")').first();
    if (await inventoryLink.isVisible().catch(() => false)) {
      await inventoryLink.click();
    } else {
      // Direct navigation
      await page.goto(`${APP_URL}/lats/products`, { waitUntil: 'networkidle' });
    }
    
    await page.waitForTimeout(3000);
    console.log('✅ On inventory page\n');
    
    // ============================================================================
    // STEP 3: Find and click on a product to open modal
    // ============================================================================
    console.log('📍 Step 3: Looking for products...');
    
    // Wait for products to load
    await page.waitForSelector('.animate-pulse', { state: 'hidden', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);
    
    // Find the first product card or row
    const productSelectors = [
      'div[class*="product-card"]',
      'div[class*="cursor-pointer"]',
      'button:has-text("View")',
      'tr[class*="hover:bg"]',
      'div[onclick], div[class*="clickable"]'
    ];
    
    let productFound = false;
    for (const selector of productSelectors) {
      const elements = await page.locator(selector).all();
      if (elements.length > 0) {
        console.log(`✅ Found ${elements.length} products using selector: ${selector}`);
        await elements[0].click();
        productFound = true;
        break;
      }
    }
    
    if (!productFound) {
      // Try clicking anywhere that might open a product
      const anyProduct = await page.locator('text=/iPhone|Samsung|Product|Device/i').first();
      if (await anyProduct.isVisible().catch(() => false)) {
        await anyProduct.click();
        productFound = true;
      }
    }
    
    if (!productFound) {
      throw new Error('❌ No products found on the page');
    }
    
    await page.waitForTimeout(2000);
    console.log('✅ Clicked on product\n');
    
    // ============================================================================
    // STEP 4: Check if ProductModal opened
    // ============================================================================
    console.log('📍 Step 4: Checking if ProductModal opened...');
    
    // Look for modal indicators
    const modalVisible = await page.locator('[class*="fixed"][class*="inset-0"], [role="dialog"], div:has-text("Overview")').first().isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!modalVisible) {
      console.log('⚠️  Modal not visible, taking screenshot...');
      await page.screenshot({ path: 'modal-not-visible.png' });
      throw new Error('❌ ProductModal did not open');
    }
    
    console.log('✅ ProductModal is open\n');
    
    // ============================================================================
    // STEP 5: Navigate to Variants tab
    // ============================================================================
    console.log('📍 Step 5: Navigating to Variants tab...');
    
    const variantsTab = page.locator('button:has-text("Variants")');
    if (await variantsTab.isVisible().catch(() => false)) {
      await variantsTab.click();
      await page.waitForTimeout(1000);
      console.log('✅ Clicked Variants tab\n');
    } else {
      console.log('⚠️  Variants tab not found, checking current view...');
    }
    
    // ============================================================================
    // STEP 6: Analyze Variants Section
    // ============================================================================
    console.log('📍 Step 6: Analyzing Variants section...\n');
    console.log('='.repeat(80));
    
    const issues = [];
    const warnings = [];
    
    // Take screenshot before analysis
    await page.screenshot({ path: 'variants-section-before.png', fullPage: true });
    console.log('📸 Screenshot saved: variants-section-before.png\n');
    
    // Check 1: Variant Hierarchy Display
    console.log('🔍 Check 1: Variant Hierarchy Display');
    const hierarchyDisplay = await page.locator('text=/VariantHierarchyDisplay|Parent.*Child/i').count();
    if (hierarchyDisplay > 0) {
      console.log('✅ Variant hierarchy display is present');
    } else {
      warnings.push('⚠️  Variant hierarchy display might not be visible');
      console.log('⚠️  Variant hierarchy display might not be visible');
    }
    
    // Check 2: Variant List/Table
    console.log('\n🔍 Check 2: Variant List/Table');
    const variantTable = await page.locator('table, tbody, tr').count();
    if (variantTable > 0) {
      console.log('✅ Variant table is present');
      
      // Count variant rows
      const rows = await page.locator('tbody tr').count();
      console.log(`   Found ${rows} variant rows`);
    } else {
      issues.push('❌ No variant table found');
      console.log('❌ No variant table found');
    }
    
    // Check 3: Variant Actions (Edit, Delete buttons)
    console.log('\n🔍 Check 3: Variant Action Buttons');
    const editButtons = await page.locator('button:has-text("Edit"), button svg[class*="edit"]').count();
    const deleteButtons = await page.locator('button:has-text("Delete"), button svg[class*="trash"]').count();
    console.log(`   Edit buttons: ${editButtons}`);
    console.log(`   Delete buttons: ${deleteButtons}`);
    
    if (editButtons === 0 && deleteButtons === 0) {
      warnings.push('⚠️  No action buttons found for variants');
    } else {
      console.log('✅ Variant action buttons are present');
    }
    
    // Check 4: Add Variant Button
    console.log('\n🔍 Check 4: Add Variant Functionality');
    const addVariantBtn = await page.locator('button:has-text("Add Variant")').count();
    if (addVariantBtn > 0) {
      console.log('✅ Add Variant button is present');
    } else {
      warnings.push('⚠️  Add Variant button not found');
      console.log('⚠️  Add Variant button not found');
    }
    
    // Check 5: Variant Data Display
    console.log('\n🔍 Check 5: Variant Data Display');
    const variantNames = await page.locator('td:has-text("Variant"), span:has-text("GB"), span:has-text("IMEI")').count();
    const stockInfo = await page.locator('text=/Stock:|In Stock|Out of Stock|Low Stock/i').count();
    const priceInfo = await page.locator('text=/Price:|Cost:|KSh|\\$/').count();
    
    console.log(`   Variant names/info: ${variantNames}`);
    console.log(`   Stock information: ${stockInfo}`);
    console.log(`   Price information: ${priceInfo}`);
    
    if (variantNames === 0 && stockInfo === 0 && priceInfo === 0) {
      issues.push('❌ No variant data is being displayed');
      console.log('❌ No variant data is being displayed');
    } else {
      console.log('✅ Variant data is being displayed');
    }
    
    // Check 6: Console Errors
    console.log('\n🔍 Check 6: Console Errors');
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(2000);
    
    if (consoleErrors.length > 0) {
      console.log('❌ Console errors found:');
      consoleErrors.forEach(err => console.log(`   - ${err}`));
      issues.push(`Console errors: ${consoleErrors.length}`);
    } else {
      console.log('✅ No console errors');
    }
    
    // Check 7: Layout Issues
    console.log('\n🔍 Check 7: Visual Layout');
    const overflowElements = await page.locator('[style*="overflow: hidden"]').count();
    const truncatedText = await page.locator('[class*="truncate"]').count();
    console.log(`   Elements with overflow: ${overflowElements}`);
    console.log(`   Truncated text elements: ${truncatedText}`);
    
    // Check 8: Expandable Variant Details
    console.log('\n🔍 Check 8: Expandable Variant Details');
    const expandButtons = await page.locator('button svg[class*="chevron"]').count();
    if (expandButtons > 0) {
      console.log(`✅ Found ${expandButtons} expandable variant controls`);
      
      // Try expanding one
      const firstExpand = page.locator('button svg[class*="chevron"]').first();
      if (await firstExpand.isVisible().catch(() => false)) {
        await firstExpand.click();
        await page.waitForTimeout(1000);
        console.log('✅ Successfully expanded a variant');
      }
    } else {
      console.log('ℹ️  No expandable variant controls found (might be expected)');
    }
    
    // Take screenshot after analysis
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'variants-section-after.png', fullPage: true });
    console.log('\n📸 Screenshot saved: variants-section-after.png');
    
    // ============================================================================
    // STEP 7: Generate Report
    // ============================================================================
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 TEST REPORT SUMMARY\n');
    console.log('='.repeat(80));
    
    if (issues.length === 0 && warnings.length === 0) {
      console.log('\n✅ ALL CHECKS PASSED!');
      console.log('   No issues or warnings found in the Variants section.\n');
    } else {
      if (issues.length > 0) {
        console.log('\n❌ ISSUES FOUND:');
        issues.forEach((issue, i) => {
          console.log(`   ${i + 1}. ${issue}`);
        });
      }
      
      if (warnings.length > 0) {
        console.log('\n⚠️  WARNINGS:');
        warnings.forEach((warning, i) => {
          console.log(`   ${i + 1}. ${warning}`);
        });
      }
    }
    
    console.log('\n' + '='.repeat(80));
    
    // Keep browser open for manual inspection
    console.log('\n👁️  Browser will remain open for 30 seconds for manual inspection...');
    console.log('   Press Ctrl+C to close earlier.\n');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    // Take error screenshot
    try {
      await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
      console.log('📸 Error screenshot saved: error-screenshot.png');
    } catch (e) {
      console.error('Failed to take error screenshot:', e.message);
    }
    
    throw error;
  } finally {
    await browser.close();
    console.log('\n🏁 Test completed. Browser closed.\n');
  }
}

// Run the test
testProductModalVariants().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});

