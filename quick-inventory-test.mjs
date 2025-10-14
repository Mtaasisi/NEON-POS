#!/usr/bin/env node

/**
 * 🧪 QUICK INVENTORY TEST
 * Quick test to verify inventory is working
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';

async function quickInventoryTest() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  
  const consoleMessages = [];
  
  // Capture console messages
  page.on('console', msg => {
    if (msg.type() === 'log' && msg.text().includes('products')) {
      consoleMessages.push(msg.text());
    }
  });
  
  try {
    console.log('🔍 Quick login test...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', 'care@care.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    console.log('📦 Testing dashboard first...');
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    console.log('📦 Now testing inventory...');
    await page.goto(`${BASE_URL}/lats/unified-inventory`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    
    console.log('\n📊 Product-related console messages:');
    consoleMessages.forEach((msg, index) => {
      console.log(`${index + 1}. ${msg}`);
    });
    
    // Check if products are visible
    const productCount = await page.locator('[class*="product"], table tbody tr').count();
    console.log(`\n📋 Products visible on page: ${productCount}`);
    
    // Check for "Total Products" text
    const hasTotalProducts = await page.locator('text=Total Products').count();
    console.log(`📊 "Total Products" indicators: ${hasTotalProducts}`);
    
    // Check for sample products
    const sampleProducts = await page.locator('text=Sample').count();
    console.log(`⚠️ Sample products found: ${sampleProducts}`);
    
    // Take a screenshot
    await page.screenshot({ path: './quick-inventory-test.png', fullPage: true });
    console.log('\n📸 Screenshot saved as quick-inventory-test.png');
    
    // Summary
    console.log('\n🎯 SUMMARY:');
    if (productCount > 3 && sampleProducts === 0) {
      console.log('✅ SUCCESS: Real products are loading (not sample products)');
    } else if (productCount <= 3 && sampleProducts > 0) {
      console.log('❌ ISSUE: Still showing sample products');
    } else {
      console.log('⚠️ UNCLEAR: Need to investigate further');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

quickInventoryTest();
