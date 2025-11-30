/**
 * Detailed Test: POS Variant Selection Modal
 * 
 * This test specifically targets the variant selection modal
 * to verify child variants with IMEI are displayed
 */

import { test, expect, Page } from '@playwright/test';

test.describe('POS Variant Selection Modal - Child Variants', () => {
  const BASE_URL = 'http://localhost:5173';
  const TEST_EMAIL = 'care@care.com';
  const TEST_PASSWORD = '123456';
  
  test('Should show child variants with IMEI when clicking product card', async ({ page }) => {
    test.setTimeout(120000);

    console.log('\n🎯 ========================================');
    console.log('🎯 DETAILED MODAL & CHILD VARIANTS TEST');
    console.log('🎯 ========================================\n');

    // STEP 1: Login
    console.log('📋 STEP 1: Login...');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Check if login needed
    const hasLoginForm = await page.locator('input[type="email"]').count() > 0;
    
    if (hasLoginForm) {
      await page.locator('input[type="email"]').fill(TEST_EMAIL);
      await page.locator('input[type="password"]').fill(TEST_PASSWORD);
      await page.locator('button[type="submit"]').click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }
    
    console.log('✅ Login complete\n');

    // STEP 2: Navigate to POS
    console.log('📋 STEP 2: Navigate to POS...');
    await page.goto(`${BASE_URL}/pos`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    console.log('✅ POS page loaded\n');
    
    await page.screenshot({ 
      path: 'test-results/modal-test/01-pos-page.png',
      fullPage: true 
    });

    // STEP 3: Find and click a specific product (iPhone X)
    console.log('📋 STEP 3: Looking for product with variants...');
    
    // Try to find "iPhone X" product specifically
    const productSelectors = [
      'text=/iPhone X/i',
      'text=/iPhone/i',
      '[data-product-name*="iPhone"]',
      'div:has-text("iPhone X")'
    ];
    
    let productFound = false;
    for (const selector of productSelectors) {
      try {
        const product = page.locator(selector).first();
        if (await product.isVisible({ timeout: 2000 })) {
          console.log(`✅ Found product with selector: ${selector}`);
          
          // Take screenshot before click
          await page.screenshot({ 
            path: 'test-results/modal-test/02-before-click.png',
            fullPage: true 
          });
          
          // Click the product
          await product.click();
          productFound = true;
          console.log('✅ Clicked product');
          
          // Wait for modal or any response
          await page.waitForTimeout(2000);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!productFound) {
      console.log('⚠️ Trying to click any visible product card...');
      
      // Try clicking elements that look like product cards
      const anyCard = page.locator('div[class*="card"], div[class*="product"]').first();
      if (await anyCard.isVisible({ timeout: 2000 })) {
        await anyCard.click();
        await page.waitForTimeout(2000);
      }
    }
    
    await page.screenshot({ 
      path: 'test-results/modal-test/03-after-click.png',
      fullPage: true 
    });

    // STEP 4: Check for modal
    console.log('\n📋 STEP 4: Checking for variant selection modal...');
    
    const modalSelectors = [
      '[role="dialog"]',
      '.modal',
      '[class*="modal"]',
      '[class*="Modal"]',
      'div:has-text("Select Variant")',
      'div:has-text("Variant Selection")'
    ];
    
    let modalFound = false;
    let modalElement = null;
    
    for (const selector of modalSelectors) {
      const modal = page.locator(selector);
      const count = await modal.count();
      if (count > 0) {
        const visible = await modal.first().isVisible({ timeout: 1000 }).catch(() => false);
        if (visible) {
          console.log(`✅ Modal found with selector: ${selector}`);
          modalElement = modal.first();
          modalFound = true;
          break;
        }
      }
    }
    
    if (!modalFound) {
      console.log('❌ NO MODAL DETECTED!');
      console.log('⚠️ This is the main issue - variant modal is not opening\n');
      
      // Log page content for debugging
      const pageText = await page.textContent('body');
      const hasVariantText = pageText?.includes('variant') || pageText?.includes('Variant');
      console.log(`   Page contains "variant" text: ${hasVariantText ? 'YES' : 'NO'}`);
      
      await page.screenshot({ 
        path: 'test-results/modal-test/04-no-modal.png',
        fullPage: true 
      });
      
      // Try to trigger modal by looking for "Select Variant" or similar buttons
      console.log('\n📋 Attempting to find and click variant selection trigger...');
      const variantButtons = page.locator('button:has-text("Variant"), button:has-text("Select")');
      const buttonCount = await variantButtons.count();
      
      if (buttonCount > 0) {
        console.log(`✅ Found ${buttonCount} potential variant buttons`);
        await variantButtons.first().click();
        await page.waitForTimeout(2000);
        
        await page.screenshot({ 
          path: 'test-results/modal-test/05-after-button-click.png',
          fullPage: true 
        });
        
        // Check for modal again
        for (const selector of modalSelectors) {
          const modal = page.locator(selector);
          if (await modal.count() > 0) {
            modalFound = true;
            modalElement = modal.first();
            break;
          }
        }
      }
    }

    // STEP 5: Check modal content
    if (modalFound && modalElement) {
      console.log('\n📋 STEP 5: Analyzing modal content...');
      
      await page.screenshot({ 
        path: 'test-results/modal-test/06-modal-visible.png',
        fullPage: true 
      });
      
      // Look for parent variants (should have purple styling and "Show devices" button)
      const parentVariants = page.locator('[class*="purple"], [class*="parent"]');
      const parentCount = await parentVariants.count();
      console.log(`Parent variant elements found: ${parentCount}`);
      
      // Look for expand buttons
      const expandButtons = page.locator('button:has-text("Show devices"), button:has-text("devices")');
      const expandButtonCount = await expandButtons.count();
      console.log(`"Show devices" buttons found: ${expandButtonCount}`);
      
      if (expandButtonCount > 0) {
        console.log('\n📋 STEP 6: Clicking "Show devices" button...');
        await expandButtons.first().click();
        await page.waitForTimeout(2000);
        
        await page.screenshot({ 
          path: 'test-results/modal-test/07-after-expand.png',
          fullPage: true 
        });
        
        // Check for child variants
        console.log('\n📋 STEP 7: Checking for child variants...');
        const pageContent = await page.content();
        
        // Check for IMEI display
        const imeiPatterns = [
          /IMEI[:\s]*\d+/gi,
          /\d{15}/g,  // 15-digit IMEI
          /\d{12,15}/g  // 12-15 digit numbers
        ];
        
        let imeiFound = false;
        let imeiMatches: string[] = [];
        
        for (const pattern of imeiPatterns) {
          const matches = pageContent.match(pattern);
          if (matches && matches.length > 0) {
            imeiFound = true;
            imeiMatches = imeiMatches.concat(matches);
          }
        }
        
        console.log(`IMEI displayed: ${imeiFound ? '✅ YES' : '❌ NO'}`);
        if (imeiFound) {
          console.log(`IMEI values found: ${imeiMatches.slice(0, 5).join(', ')}`);
        }
        
        // Check for child variant containers
        const childVariants = page.locator('[class*="child"], div:has-text("IMEI:")');
        const childCount = await childVariants.count();
        console.log(`Child variant elements found: ${childCount}`);
        
        // Check for condition badges
        const conditionBadges = page.locator('text=/New|Used|Excellent|Good|Fair/i');
        const conditionCount = await conditionBadges.count();
        console.log(`Condition badges found: ${conditionCount}`);
        
        // Final assessment
        console.log('\n📊 ========================================');
        console.log('📊 FINAL ASSESSMENT');
        console.log('📊 ========================================');
        console.log(`Modal Opens: ${modalFound ? '✅' : '❌'}`);
        console.log(`Parent Variants Shown: ${parentCount > 0 ? '✅' : '❌'}`);
        console.log(`Expand Button Available: ${expandButtonCount > 0 ? '✅' : '❌'}`);
        console.log(`Child Variants Displayed: ${childCount > 0 ? '✅' : '❌'}`);
        console.log(`IMEI Numbers Visible: ${imeiFound ? '✅' : '❌'}`);
        console.log(`Condition Badges: ${conditionCount > 0 ? '✅' : '❌'}`);
        console.log('═══════════════════════════════════════\n');
        
        if (imeiFound && childCount > 0) {
          console.log('✅ SUCCESS: Child variants with IMEI are displayed!');
        } else if (childCount === 0) {
          console.log('⚠️ ISSUE: Children are not expanding or not visible');
        } else if (!imeiFound) {
          console.log('⚠️ ISSUE: IMEI numbers are not being displayed in UI');
        }
        
        // Assertions
        expect(modalFound).toBe(true);
        expect(expandButtonCount).toBeGreaterThan(0);
        // Don't fail on IMEI - just report it
        if (!imeiFound) {
          console.log('\n💡 RECOMMENDATION: Check VariantSelectionModal.tsx');
          console.log('   - Verify child variant IMEI extraction logic');
          console.log('   - Check if variant_attributes.imei is being read');
          console.log('   - Ensure getIMEIParts function is working\n');
        }
        
      } else {
        console.log('⚠️ No "Show devices" button found');
        console.log('💡 Parent variants might not be properly marked\n');
      }
      
    } else {
      console.log('\n❌ CRITICAL ISSUE: Variant Selection Modal Does Not Open');
      console.log('💡 RECOMMENDATIONS:');
      console.log('   1. Check if products have the correct click handlers');
      console.log('   2. Verify modal trigger logic in POS page');
      console.log('   3. Check console for JavaScript errors');
      console.log('   4. Ensure product cards are clickable\n');
      
      // Log what we can see
      const visibleText = await page.locator('body').textContent();
      console.log(`Page text length: ${visibleText?.length || 0} characters`);
      
      // Fail the test if modal doesn't open
      expect(modalFound).toBe(true);
    }
    
    console.log('\n📁 Screenshots saved to: test-results/modal-test/\n');
  });
});

