#!/usr/bin/env node

/**
 * 🧪 DETAILED PRODUCT CHECK
 * Checks what products are actually being displayed
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';

async function detailedProductCheck() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  
  try {
    console.log('🔍 Logging in...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'care@care.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    console.log('📦 Navigating to inventory...');
    await page.goto(`${BASE_URL}/lats/unified-inventory`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    
    console.log('🔍 Checking product display...');
    
    // Check if we're in card view or table view
    const isCardView = await page.locator('.product-card, [data-testid="product-card"]').count() > 0;
    const isTableView = await page.locator('table tbody tr').count() > 0;
    
    console.log(`Card view: ${isCardView}, Table view: ${isTableView}`);
    
    if (isCardView) {
      // Get product names from cards
      const productCards = await page.locator('.product-card, [data-testid="product-card"]').all();
      console.log(`\n📋 Found ${productCards.length} product cards:`);
      
      for (let i = 0; i < Math.min(10, productCards.length); i++) {
        try {
          const productName = await productCards[i].locator('h3, .product-name, [data-testid="product-name"]').first().textContent();
          const productSku = await productCards[i].locator('.product-sku, [data-testid="product-sku"]').first().textContent().catch(() => 'No SKU');
          const productPrice = await productCards[i].locator('.product-price, [data-testid="product-price"]').first().textContent().catch(() => 'No Price');
          
          console.log(`  ${i + 1}. ${productName} (${productSku}) - ${productPrice}`);
        } catch (error) {
          console.log(`  ${i + 1}. Error reading product card: ${error.message}`);
        }
      }
    } else if (isTableView) {
      // Get product names from table rows
      const tableRows = await page.locator('table tbody tr').all();
      console.log(`\n📋 Found ${tableRows.length} table rows:`);
      
      for (let i = 0; i < Math.min(10, tableRows.length); i++) {
        try {
          const productName = await tableRows[i].locator('td').first().textContent();
          console.log(`  ${i + 1}. ${productName}`);
        } catch (error) {
          console.log(`  ${i + 1}. Error reading table row: ${error.message}`);
        }
      }
    } else {
      // Try to find any product-related elements
      const anyProducts = await page.locator('[class*="product"], [data-testid*="product"], [class*="item"]').count();
      console.log(`\n📋 Found ${anyProducts} product-related elements`);
      
      // Get all text content to see what's displayed
      const bodyText = await page.textContent('body');
      const hasSampleText = bodyText.includes('Sample');
      const hasRealProductNames = bodyText.includes('Macbook') || bodyText.includes('iPhone') || bodyText.includes('JBL');
      
      console.log(`Contains "Sample": ${hasSampleText}`);
      console.log(`Contains real product names: ${hasRealProductNames}`);
    }
    
    // Check summary cards
    console.log('\n📊 Checking summary cards...');
    const summaryCards = await page.locator('[class*="card"], [class*="summary"]').all();
    for (let i = 0; i < Math.min(5, summaryCards.length); i++) {
      try {
        const cardText = await summaryCards[i].textContent();
        if (cardText && cardText.includes('Total Products')) {
          console.log(`Summary card ${i + 1}: ${cardText.trim()}`);
        }
      } catch (error) {
        // Ignore errors
      }
    }
    
    // Take a screenshot
    await page.screenshot({ path: './detailed-inventory-check.png', fullPage: true });
    console.log('\n📸 Screenshot saved as detailed-inventory-check.png');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

detailedProductCheck();
