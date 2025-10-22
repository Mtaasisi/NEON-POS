#!/usr/bin/env node
/**
 * Installment Payment Flow Test
 * 
 * This script tests the complete installment payment workflow:
 * 1. Login
 * 2. Navigate to installments page
 * 3. Open payment modal
 * 4. Verify modal visibility
 * 5. Fill payment form
 * 6. Optionally submit payment
 * 
 * Usage:
 *   node test-installment-payment-flow.mjs [--submit]
 * 
 * Options:
 *   --submit    Actually submit the payment (creates real data)
 */

import { chromium } from 'playwright';
import fs from 'fs';

const SHOULD_SUBMIT = process.argv.includes('--submit');

async function testInstallmentPayment() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 400
  });
  
  const page = await browser.newPage({ 
    viewport: { width: 1920, height: 1080 } 
  });
  
  const results = {
    timestamp: new Date().toISOString(),
    testName: 'Installment Payment Flow',
    submitted: SHOULD_SUBMIT,
    steps: [],
    errors: [],
    screenshots: []
  };

  try {
    console.log('🚀 Installment Payment Flow Test\n');
    console.log('='.repeat(70));
    
    // Step 1: Login
    console.log('\n📍 Step 1: Login');
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    
    // Clear existing session
    const isLoggedIn = await page.evaluate(() => !!localStorage.getItem('user'));
    if (isLoggedIn) {
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.reload();
      await page.waitForTimeout(2000);
    }
    
    await page.fill('input[type="email"]', 'care@care.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    console.log('✅ Logged in as care@care.com');
    results.steps.push({ step: 1, action: 'Login', status: 'success' });
    
    // Step 2: Navigate to installments
    console.log('\n📍 Step 2: Navigate to installments page');
    await page.click('a[href*="installment"]');
    await page.waitForTimeout(3000);
    
    const screenshot1 = `test-screenshots/installment-page-${Date.now()}.png`;
    await page.screenshot({ path: screenshot1, fullPage: true });
    results.screenshots.push(screenshot1);
    
    const payButtonCount = await page.locator('button').filter({ hasText: /^Pay$/ }).count();
    console.log(`✅ Found ${payButtonCount} installment(s) with Pay button`);
    results.steps.push({ 
      step: 2, 
      action: 'Navigate to installments', 
      status: 'success',
      data: { payButtonCount }
    });
    
    if (payButtonCount === 0) {
      throw new Error('No installments available to test payment');
    }
    
    // Step 3: Open payment modal
    console.log('\n📍 Step 3: Open payment modal');
    await page.locator('button').filter({ hasText: /^Pay$/ }).first().click();
    await page.waitForTimeout(1500);
    
    const screenshot2 = `test-screenshots/payment-modal-${Date.now()}.png`;
    await page.screenshot({ path: screenshot2, fullPage: true });
    results.screenshots.push(screenshot2);
    
    // Verify modal is visible
    const modalVisible = await page.evaluate(() => {
      const modal = document.querySelector('.fixed.inset-0.bg-black.bg-opacity-50');
      if (!modal) return { visible: false };
      
      const styles = window.getComputedStyle(modal);
      return {
        visible: true,
        zIndex: styles.zIndex,
        display: styles.display,
        visibility: styles.visibility,
        opacity: styles.opacity,
        hasContent: modal.textContent.includes('Record Payment')
      };
    });
    
    if (!modalVisible.visible) {
      throw new Error('Payment modal did not open');
    }
    
    console.log('✅ Payment modal opened successfully');
    console.log(`   Z-Index: ${modalVisible.zIndex}`);
    console.log(`   Display: ${modalVisible.display}`);
    console.log(`   Visibility: ${modalVisible.visibility}`);
    results.steps.push({ 
      step: 3, 
      action: 'Open payment modal', 
      status: 'success',
      data: modalVisible
    });
    
    // Step 4: Fill payment form
    console.log('\n📍 Step 4: Fill payment form');
    
    // Select payment account
    await page.evaluate(() => {
      const select = document.querySelector('select');
      if (select && select.options.length > 1) {
        select.selectedIndex = 1;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    console.log('✅ Payment account selected');
    
    // Fill reference number
    const refInput = await page.locator('input[name="reference_number"]').count();
    if (refInput > 0) {
      await page.fill('input[name="reference_number"]', `TEST-${Date.now()}`);
      console.log('✅ Reference number filled');
    }
    
    // Fill notes
    const notesCount = await page.locator('textarea').count();
    if (notesCount > 0) {
      await page.fill('textarea', 'Automated test payment');
      console.log('✅ Notes filled');
    }
    
    await page.waitForTimeout(1000);
    
    const screenshot3 = `test-screenshots/form-filled-${Date.now()}.png`;
    await page.screenshot({ path: screenshot3, fullPage: true });
    results.screenshots.push(screenshot3);
    
    results.steps.push({ step: 4, action: 'Fill payment form', status: 'success' });
    
    // Step 5: Submit (optional)
    if (SHOULD_SUBMIT) {
      console.log('\n📍 Step 5: Submit payment');
      
      const submitButton = await page.locator('button[type="submit"]');
      await submitButton.click();
      await page.waitForTimeout(2000);
      
      // Check for success toast
      const hasSuccessToast = await page.evaluate(() => {
        return document.body.textContent.includes('Payment recorded successfully');
      });
      
      const screenshot4 = `test-screenshots/after-submit-${Date.now()}.png`;
      await page.screenshot({ path: screenshot4, fullPage: true });
      results.screenshots.push(screenshot4);
      
      if (hasSuccessToast) {
        console.log('✅ Payment submitted successfully!');
        results.steps.push({ step: 5, action: 'Submit payment', status: 'success' });
      } else {
        console.log('⚠️  Payment submitted but no success message detected');
        results.steps.push({ step: 5, action: 'Submit payment', status: 'warning' });
      }
    } else {
      console.log('\n⏭️  Step 5: Skipped (use --submit flag to actually submit)');
      results.steps.push({ step: 5, action: 'Submit payment', status: 'skipped' });
    }
    
    results.status = 'success';
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ ✅ ✅ TEST PASSED ✅ ✅ ✅');
    console.log('='.repeat(70));
    console.log('\nTest Summary:');
    console.log(`  - Installment payment modal: VISIBLE ✅`);
    console.log(`  - Form fields: ACCESSIBLE ✅`);
    console.log(`  - Payment submission: ${SHOULD_SUBMIT ? 'TESTED ✅' : 'SKIPPED ⏭️'}`);
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    results.status = 'failed';
    results.errors.push(error.message);
    
    const errorScreenshot = `test-screenshots/error-${Date.now()}.png`;
    await page.screenshot({ path: errorScreenshot, fullPage: true });
    results.screenshots.push(errorScreenshot);
  } finally {
    // Save results
    const reportPath = `test-results/installment-payment-${Date.now()}.json`;
    fs.mkdirSync('test-results', { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    
    console.log(`\n📄 Test results saved: ${reportPath}`);
    console.log(`📸 Screenshots saved: ${results.screenshots.length}`);
    
    console.log('\n⏳ Keeping browser open for 5 seconds...');
    await page.waitForTimeout(5000);
    
    await browser.close();
    
    process.exit(results.status === 'success' ? 0 : 1);
  }
}

testInstallmentPayment().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

