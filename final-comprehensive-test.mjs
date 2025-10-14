#!/usr/bin/env node

/**
 * 🧪 FINAL COMPREHENSIVE TEST
 * Complete test with extended wait times
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';

async function finalComprehensiveTest() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  
  const consoleMessages = [];
  const errorMessages = [];
  
  // Capture all console messages
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push(text);
    if (text.includes('[latsProductApi]') || text.includes('products') || text.includes('Found') || text.includes('Fetched')) {
      console.log(`📊 ${text}`);
    }
  });
  
  // Capture errors
  page.on('pageerror', error => {
    errorMessages.push(error.message);
    console.log(`❌ Page error: ${error.message}`);
  });
  
  try {
    console.log('🔍 Logging in...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.fill('input[type="email"]', 'care@care.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    
    console.log('\n📦 Navigating to inventory page...');
    await page.goto(`${BASE_URL}/lats/unified-inventory`, { waitUntil: 'networkidle', timeout: 60000 });
    
    console.log('\n⏳ Waiting for products to load (30 seconds)...');
    await page.waitForTimeout(30000);
    
    // Check for product rows
    const productRows = await page.locator('table tbody tr').count();
    console.log(`\n📋 Product rows in table: ${productRows}`);
    
    // Check for specific text
    const totalProductsText = await page.locator('text=/Total.*Products/i').count();
    console.log(`📊 "Total Products" indicators: ${totalProductsText}`);
    
    // Check if we see real product names
    const hasRealProducts = await page.locator('text=/Macbook|iPhone|JBL|HP|Dell/i').count();
    console.log(`🎯 Real product names found: ${hasRealProducts}`);
    
    // Take screenshot
    await page.screenshot({ path: './final-test-screenshot.png', fullPage: true });
    console.log('\n📸 Screenshot saved: final-test-screenshot.png');
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL TEST SUMMARY');
    console.log('='.repeat(60));
    
    if (productRows >= 60 && hasRealProducts > 0) {
      console.log('✅ SUCCESS: All products are loading correctly!');
      console.log(`   - ${productRows} product rows displayed`);
      console.log(`   - ${hasRealProducts} real product names found`);
    } else if (productRows <= 3) {
      console.log('❌ ISSUE: Still showing limited products');
      console.log(`   - Only ${productRows} rows visible`);
    } else {
      console.log('⚠️  PARTIAL SUCCESS:');
      console.log(`   - ${productRows} rows visible`);
      console.log(`   - ${hasRealProducts} real product names found`);
    }
    
    console.log('\n📝 Relevant console messages:');
    const relevantMessages = consoleMessages.filter(m => 
      m.includes('latsProductApi') || m.includes('Found') || m.includes('Fetched') || m.includes('products')
    );
    relevantMessages.slice(0, 20).forEach(msg => console.log(`   ${msg}`));
    
    if (errorMessages.length > 0) {
      console.log('\n❌ Errors encountered:');
      errorMessages.forEach(err => console.log(`   ${err}`));
    }
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
  } finally {
    console.log('\n🏁 Test complete. Press Ctrl+C to close browser.');
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

finalComprehensiveTest();
