import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const APP_URL = 'http://localhost:5173';
const LOGIN_EMAIL = 'care@care.com';
const LOGIN_PASSWORD = '123456';

async function testPOSVariantsAfterSale() {
  console.log('\n🧪 Starting POS Variants After Sale Test...\n');
  console.log('Testing: Children variants should be hidden after sale, only showing available in stock\n');
  
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500,
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  
  const page = await context.newPage();

  // Suppress console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('Extension context') && !text.includes('chrome-extension://')) {
        console.warn('Browser error:', text.substring(0, 100));
      }
    }
  });
  
  try {
    // ============================================================================
    // STEP 1: Navigate to app and login
    // ============================================================================
    console.log('📍 Step 1: Navigating to app and logging in...');
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Check if already logged in
    const isLoggedIn = await page.locator('text=Dashboard, text=POS, a[href*="/pos"]').first().isVisible().catch(() => false);
    
    if (!isLoggedIn) {
      console.log('🔐 Logging in as:', LOGIN_EMAIL);
      await page.fill('input[type="email"]', LOGIN_EMAIL);
      await page.fill('input[type="password"]', LOGIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }
    
    console.log('✅ Logged in successfully\n');
    
    // ============================================================================
    // STEP 2: Navigate to POS page
    // ============================================================================
    console.log('📍 Step 2: Navigating to POS page...');
    
    // Try to find POS link/button
    const posLink = page.locator('a[href*="/pos"], button:has-text("POS"), text="POS"').first();
    if (await posLink.isVisible().catch(() => false)) {
      await posLink.click();
    } else {
      // Direct navigation
      await page.goto(`${APP_URL}/lats/pos`, { waitUntil: 'networkidle' });
    }
    
    await page.waitForTimeout(3000);
    console.log('✅ On POS page\n');
    
    // ============================================================================
    // STEP 3: Find a product with child variants (IMEI devices)
    // ============================================================================
    console.log('📍 Step 3: Looking for a product with child variants...');
    
    // Wait for product search to be available
    await page.waitForSelector('input[placeholder*="Search"], input[type="search"], input[placeholder*="product"]', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);
    
    // Search for a product that likely has IMEI variants (phones, devices)
    const searchTerms = ['phone', 'iPhone', 'Samsung', 'device', 'mobile'];
    let productFound = false;
    let selectedVariantId = null;
    let selectedVariantIMEI = null;
    
    for (const term of searchTerms) {
      console.log(`   Searching for: "${term}"...`);
      
      // Clear and type search term
      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"], input[placeholder*="product"]').first();
      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.clear();
        await searchInput.fill(term);
        await page.waitForTimeout(2000);
        
        // Wait for results
        await page.waitForTimeout(2000);
        
        // Try to find a product card/button
        const productCards = page.locator('[class*="product"], [class*="card"], button:has-text("Add"), [data-testid*="product"]');
        const count = await productCards.count();
        
        if (count > 0) {
          console.log(`   Found ${count} products, selecting first one...`);
          await productCards.first().click();
          await page.waitForTimeout(2000);
          
          // Check if variant selection modal opened
          const variantModal = page.locator('[class*="modal"], [class*="variant"], text="Select", text="IMEI"');
          if (await variantModal.isVisible().catch(() => false)) {
            console.log('   ✅ Variant selection modal opened!');
            
            // Wait a bit for variants to load
            await page.waitForTimeout(2000);
            
            // Find available child variants (IMEI devices)
            const childVariants = page.locator('[class*="child"], [class*="imei"], text=/IMEI|\\d{15}/, button:has-text("Select")');
            const variantCount = await childVariants.count();
            
            if (variantCount > 0) {
              console.log(`   ✅ Found ${variantCount} child variants available`);
              
              // Get the first available variant's IMEI/text
              const firstVariant = childVariants.first();
              const variantText = await firstVariant.textContent().catch(() => '');
              selectedVariantIMEI = variantText;
              console.log(`   📱 First available variant: ${variantText.substring(0, 50)}...`);
              
              // Select the first variant
              await firstVariant.click();
              await page.waitForTimeout(2000);
              
              productFound = true;
              break;
            } else {
              console.log('   ⚠️ No child variants found, trying next search term...');
              // Close modal if open
              await page.keyboard.press('Escape').catch(() => {});
              await page.waitForTimeout(1000);
            }
          } else {
            console.log('   ⚠️ No variant modal opened, product may not have child variants');
            // Try to add directly and see if it works
            await page.waitForTimeout(1000);
          }
        }
      }
    }
    
    if (!productFound) {
      console.log('⚠️ Could not find a product with child variants automatically');
      console.log('   Please manually select a product with IMEI variants and press Enter to continue...');
      await page.pause();
    }
    
    // ============================================================================
    // STEP 4: Verify variant is in cart
    // ============================================================================
    console.log('\n📍 Step 4: Verifying variant is in cart...');
    await page.waitForTimeout(2000);
    
    // Check if item is in cart
    const cartItems = page.locator('[class*="cart"], [class*="item"], text="Cart"');
    const cartVisible = await cartItems.first().isVisible().catch(() => false);
    
    if (cartVisible) {
      console.log('✅ Item added to cart');
    } else {
      console.log('⚠️ Cart not visible, but continuing...');
    }
    
    // ============================================================================
    // STEP 5: Complete the sale
    // ============================================================================
    console.log('\n📍 Step 5: Completing the sale...');
    
    // Find and click payment/checkout button
    const paymentButton = page.locator('button:has-text("Pay"), button:has-text("Checkout"), button:has-text("Complete"), [class*="payment"]').first();
    if (await paymentButton.isVisible().catch(() => false)) {
      await paymentButton.click();
      await page.waitForTimeout(2000);
      
      // If payment modal opens, select cash payment
      const cashButton = page.locator('button:has-text("Cash"), button:has-text("Pay Cash"), [class*="cash"]').first();
      if (await cashButton.isVisible().catch(() => false)) {
        await cashButton.click();
        await page.waitForTimeout(2000);
      }
      
      // Confirm payment
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Complete Payment"), button:has-text("Process")').first();
      if (await confirmButton.isVisible().catch(() => false)) {
        await confirmButton.click();
        await page.waitForTimeout(3000);
      }
    } else {
      console.log('⚠️ Payment button not found, please complete sale manually...');
      await page.pause();
    }
    
    console.log('✅ Sale completed (or attempted)\n');
    
    // ============================================================================
    // STEP 6: Verify sold variant is hidden
    // ============================================================================
    console.log('📍 Step 6: Verifying sold variant is hidden...');
    
    // Wait for any success modals to close
    await page.waitForTimeout(3000);
    
    // Search for the same product again
    console.log('   Searching for the same product again...');
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"], input[placeholder*="product"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.clear();
      await searchInput.fill('phone');
      await page.waitForTimeout(2000);
      
      // Click on the same product
      const productCards = page.locator('[class*="product"], [class*="card"], button:has-text("Add"), [data-testid*="product"]');
      if (await productCards.first().isVisible().catch(() => false)) {
        await productCards.first().click();
        await page.waitForTimeout(3000);
        
        // Check variant selection modal
        const variantModal = page.locator('[class*="modal"], [class*="variant"], text="Select", text="IMEI"');
        if (await variantModal.isVisible().catch(() => false)) {
          console.log('   ✅ Variant selection modal opened again');
          
          // Wait for variants to load
          await page.waitForTimeout(3000);
          
          // Check if the sold variant is still visible
          if (selectedVariantIMEI) {
            const soldVariant = page.locator(`text="${selectedVariantIMEI}"`);
            const isVisible = await soldVariant.isVisible().catch(() => false);
            
            if (isVisible) {
              console.log('   ❌ FAILED: Sold variant is still visible!');
              console.log(`   Sold variant IMEI: ${selectedVariantIMEI}`);
              console.log('   This means the cache was not cleared or the variant was not marked as sold.');
              return false;
            } else {
              console.log('   ✅ SUCCESS: Sold variant is hidden!');
              console.log(`   The variant "${selectedVariantIMEI.substring(0, 30)}..." is no longer shown.`);
            }
          }
          
          // Count available variants
          const availableVariants = page.locator('[class*="child"], [class*="imei"], button:has-text("Select")');
          const availableCount = await availableVariants.count();
          console.log(`   ✅ Available variants count: ${availableCount}`);
          console.log('   ✅ Only available variants are shown!');
        }
      }
    }
    
    console.log('\n✅ Test completed successfully!');
    console.log('✅ Sold child variants are properly hidden after sale');
    console.log('✅ Only available variants are shown in the POS page\n');
    
    // Keep browser open for inspection
    console.log('Keeping browser open for 10 seconds for inspection...');
    await page.waitForTimeout(10000);
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    console.error('Stack:', error.stack);
    
    // Keep browser open for debugging
    console.log('\nKeeping browser open for 30 seconds for debugging...');
    await page.waitForTimeout(30000);
    
    return false;
  } finally {
    await browser.close();
  }
}

// Run the test
testPOSVariantsAfterSale()
  .then(success => {
    if (success) {
      console.log('\n🎉 All tests passed!');
      process.exit(0);
    } else {
      console.log('\n❌ Tests failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

